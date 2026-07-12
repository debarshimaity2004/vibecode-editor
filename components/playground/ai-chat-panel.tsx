"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { X, Send, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface FileContext {
  path: string
  content: string
}

interface Props {
  onClose: () => void
  fileContext: FileContext | null
  onInsertCode?: (code: string) => void
}

export function AIChatPanel({ onClose, fileContext, onInsertCode }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return

    const userMsg: Message = { role: "user", content: text }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: "assistant", content: "" }])
    setInput("")
    setStreaming(true)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, fileContext }),
      })

      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6).trim()
          if (data === "[DONE]") break
          try {
            const json = JSON.parse(data)
            const token: string = json.choices?.[0]?.delta?.content ?? ""
            if (token) {
              setMessages((prev) => {
                const last = prev[prev.length - 1]
                return [...prev.slice(0, -1), { ...last, content: last.content + token }]
              })
            }
          } catch { /* partial chunk */ }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return [
          ...prev.slice(0, -1),
          { ...last, content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` },
        ]
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-medium">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* File context badge */}
      {fileContext && (
        <div className="px-3 py-1.5 border-b shrink-0">
          <span className="text-xs text-muted-foreground">
            Context: <span className="font-mono text-foreground/70">{fileContext.path}</span>
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 text-sm">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-muted-foreground">
            <Sparkles className="h-8 w-8 opacity-20" />
            <p className="text-xs">Ask anything about your code.<br />Shift+Enter for new line.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-3 w-3 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {msg.content
                ? <MessageContent content={msg.content} onInsert={msg.role === "assistant" ? onInsertCode : undefined} />
                : streaming && i === messages.length - 1
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : null}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your code…"
            rows={1}
            className="flex-1 resize-none bg-muted rounded-md px-3 py-2 text-xs outline-none placeholder:text-muted-foreground min-h-[36px] max-h-[120px] leading-relaxed"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget
              t.style.height = "auto"
              t.style.height = `${Math.min(t.scrollHeight, 120)}px`
            }}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || streaming}
          >
            {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ code, onInsert }: { code: string; onInsert?: (code: string) => void }) {
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)
  return (
    <div className="relative mt-1.5 mb-1.5 group/code">
      <pre className="bg-background/60 rounded p-2 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre">
        {code}
      </pre>
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover/code:opacity-100 transition-opacity">
        <button
          onClick={() => {
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
        {onInsert && (
          <button
            onClick={() => {
              onInsert(code)
              setInserted(true)
              setTimeout(() => setInserted(false), 1500)
            }}
            className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          >
            {inserted ? "Inserted!" : "Insert"}
          </button>
        )}
      </div>
    </div>
  )
}

function MessageContent({ content, onInsert }: { content: string; onInsert?: (code: string) => void }) {
  const parts = content.split(/(```[\s\S]*?```)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const newline = part.indexOf("\n")
          const code = newline === -1 ? part.slice(3, -3) : part.slice(newline + 1, -3)
          return <CodeBlock key={i} code={code} onInsert={onInsert} />
        }
        return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
      })}
    </>
  )
}
