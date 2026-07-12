import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const { messages, fileContext } = await req.json()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return new Response(
      'data: {"choices":[{"delta":{"content":"No GROQ_API_KEY set. Add it to .env.local to enable AI chat."}}]}\ndata: [DONE]\n\n',
      { headers: { "Content-Type": "text/event-stream" } }
    )
  }

  const systemContent = fileContext
    ? `You are a helpful coding assistant inside VibeCode Editor, an in-browser web IDE. ` +
      `The user is editing "${fileContext.path}":\n\`\`\`\n${fileContext.content.slice(0, 4000)}\n\`\`\`\n` +
      `Answer concisely. Use markdown code blocks when showing code.`
    : `You are a helpful coding assistant inside VibeCode Editor. Answer concisely. Use markdown code blocks when showing code.`

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemContent }, ...messages],
      stream: true,
      max_tokens: 1024,
      temperature: 0.5,
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.text()
    return new Response(
      `data: {"choices":[{"delta":{"content":"Groq error: ${err.slice(0, 200)}"}}]}\ndata: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } }
    )
  }

  // Stream the Groq SSE response straight to the client
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
