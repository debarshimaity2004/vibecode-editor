import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prefix, suffix, language } = await req.json()

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ completion: "" })

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a code completion engine. Complete the code at <CURSOR>. " +
              "Return ONLY the completion text — no markdown, no explanation, no fence blocks. " +
              "Keep it short (one expression or a few lines at most).",
          },
          {
            role: "user",
            content: `Language: ${language}\n\n${prefix}<CURSOR>${suffix}`,
          },
        ],
        max_tokens: 120,
        temperature: 0.1,
        stop: ["\n\n", "```"],
      }),
    })

    if (!res.ok) return NextResponse.json({ completion: "" })
    const data = await res.json()
    const completion: string = data.choices?.[0]?.message?.content ?? ""
    return NextResponse.json({ completion: completion.trim() })
  } catch {
    return NextResponse.json({ completion: "" })
  }
}
