"use client"

import "@xterm/xterm/css/xterm.css"
import { useEffect, useRef } from "react"

interface Props {
  spawnShell: (cols: number, rows: number) => Promise<unknown>
  registerTermWrite: (fn: ((data: string) => void) | null) => void
}

export function XTermPanel({ spawnShell, registerTermWrite }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let disposed = false
    let removePasteListener: (() => void) | null = null

    async function init() {
      const [{ Terminal }, { FitAddon }, { WebLinksAddon }] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ])

      if (disposed || !containerRef.current) return

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
        lineHeight: 1.5,
        theme: {
          background: "#09090b",
          foreground: "#d4d4d8",
          cursor: "#a1a1aa",
          selectionBackground: "#3f3f46",
          black: "#18181b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#e4e4e7",
          brightBlack: "#52525b",
          brightRed: "#fca5a5",
          brightGreen: "#86efac",
          brightYellow: "#fde047",
          brightBlue: "#93c5fd",
          brightMagenta: "#d8b4fe",
          brightCyan: "#67e8f9",
          brightWhite: "#fafafa",
        },
        convertEol: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.loadAddon(new WebLinksAddon())
      term.open(containerRef.current!)

      // Register write function so npm output can stream into this terminal
      registerTermWrite((data) => term.write(data))

      // Wait a frame for the DOM to have real dimensions before fitting
      await new Promise<void>((r) => requestAnimationFrame(() => r()))
      fitAddon.fit()

      // Spawn the jsh shell
      let shellProcess: Awaited<ReturnType<typeof spawnShell>>
      try {
        shellProcess = await spawnShell(term.cols, term.rows)
      } catch {
        term.writeln("\r\n\x1b[33mClick \x1b[1mRun\x1b[0m\x1b[33m to boot the WebContainer, then the shell will be ready.\x1b[0m")
        return
      }

      if (disposed) return

      // Shell stdout → terminal
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const proc = shellProcess as any
      pipeToTerm(proc.output, (data: string) => term.write(data))

      // Terminal keystrokes → shell stdin
      const input = proc.input.getWriter()
      term.onData((data: string) => input.write(data))

      // Paste: intercept in capture phase so xterm's own paste listener never fires.
      // This prevents double-paste (once from our handler, once from xterm's onData).
      const handlePaste = (e: ClipboardEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const text = e.clipboardData?.getData("text")
        if (text) input.write(text)
      }
      containerRef.current!.addEventListener("paste", handlePaste, true)
      removePasteListener = () => containerRef.current?.removeEventListener("paste", handlePaste, true)

      term.attachCustomKeyEventHandler((e) => {
        // Suppress Ctrl+V / Cmd+V keydown so xterm doesn't write \x16 to shell —
        // actual paste text is handled by the container's capture-phase paste listener above.
        if ((e.ctrlKey || e.metaKey) && e.key === "v") return false
        // Backspace: write once on keydown, suppress all event types so xterm's
        // keypress handler can't also fire onData and double-delete.
        if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (e.type === "keydown") input.write("\x7f")
          return false
        }
        return true
      })

      // Resize terminal when the panel is resized
      const ro = new ResizeObserver(() => {
        fitAddon.fit()
        try { proc.resize({ cols: term.cols, rows: term.rows }) } catch { /* ignore */ }
      })
      ro.observe(containerRef.current!)

      if (disposed) {
        ro.disconnect()
        registerTermWrite(null)
        term.dispose()
      }
    }

    init().catch(console.error)

    return () => {
      disposed = true
      registerTermWrite(null)
      removePasteListener?.()
    }
  // spawnShell and registerTermWrite are stable useCallback refs — safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />
}

async function pipeToTerm(stream: ReadableStream<string>, write: (d: string) => void) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      write(value)
    }
  } finally {
    reader.releaseLock()
  }
}
