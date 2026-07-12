import { type NextRequest, NextResponse } from "next/server"

// CORS proxy for isomorphic-git — forwards git smart HTTP to GitHub
// isomorphic-git calls: /api/git/<protocol>/<host>/<path>
// e.g.  /api/git/https:/github.com/user/repo.git/info/refs

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cross-Origin-Resource-Policy": "cross-origin",
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

async function proxy(req: NextRequest, params: { path: string[] }) {
  const parts = params.path
  // Reconstruct target URL — Next.js collapses https:// → https:/ in path params
  const protocol = parts[0].endsWith(":") ? `${parts[0]}//` : "https://"
  const rest = parts.slice(1).join("/")
  const targetUrl = `${protocol}${rest}${req.nextUrl.search}`

  const headers = new Headers()
  // Forward auth and content-type headers only
  const auth = req.headers.get("authorization")
  if (auth) headers.set("authorization", auth)
  const ct = req.headers.get("content-type")
  if (ct) headers.set("content-type", ct)
  headers.set("user-agent", "git/2.0 (isomorphic-git/vibecode)")

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === "POST" ? req.body : undefined,
      // @ts-expect-error — Node.js fetch needs duplex for streaming POST
      duplex: "half",
    })

    const resHeaders = new Headers(CORS_HEADERS)
    const forwardHeaders = ["content-type", "content-length", "cache-control"]
    for (const h of forwardHeaders) {
      const val = upstream.headers.get(h)
      if (val) resHeaders.set(h, val)
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502, headers: CORS_HEADERS })
  }
}

export const GET = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p))

export const POST = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p))
