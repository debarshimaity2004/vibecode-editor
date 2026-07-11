"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Globe, Terminal, Loader2, RefreshCw } from "lucide-react"
import type { WCStatus } from "@/hooks/use-web-container"

interface Props {
  activeTab: "preview" | "terminal"
  onTabChange: (tab: "preview" | "terminal") => void
  status: WCStatus
  previewUrl: string | null
  logs: string[]
}

export function PreviewTerminalPanel({ activeTab, onTabChange, status, previewUrl, logs }: Props) {
  const logsEndRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const isLoading = status === "booting" || status === "installing" || status === "starting"

  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Tab bar */}
      <div className="flex items-center border-b shrink-0 bg-muted/30">
        {(["preview", "terminal"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-r transition-colors",
              activeTab === tab
                ? "bg-background text-foreground border-t-2 border-t-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab === "preview"
              ? <Globe className="h-3.5 w-3.5" />
              : <Terminal className="h-3.5 w-3.5" />
            }
            {tab === "preview" ? "Preview" : "Terminal"}
            {tab === "terminal" && isLoading && (
              <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* ── Preview ── */}
        <div className={cn("h-full flex-col", activeTab === "preview" ? "flex" : "hidden")}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 shrink-0">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
            </div>
            <div className="flex-1 bg-background rounded px-2 py-0.5 text-xs text-muted-foreground border truncate">
              {previewUrl ?? (status === "idle" ? "not running" : "starting…")}
            </div>
            {previewUrl && (
              <button
                type="button"
                title="Reload preview"
                className="p-0.5 rounded hover:bg-muted transition-colors"
                onClick={() => { if (iframeRef.current) iframeRef.current.src = iframeRef.current.src }}
              >
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Preview area */}
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="flex-1 w-full border-0 bg-white"
              title="App preview"
              allow="cross-origin-isolated"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              {isLoading ? (
                <>
                  <Loader2 className="h-8 w-8 text-muted-foreground/50 animate-spin" />
                  <div>
                    <p className="text-sm font-medium">
                      {status === "booting" && "Booting WebContainer…"}
                      {status === "installing" && "Installing dependencies…"}
                      {status === "starting" && "Starting dev server…"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Check the Terminal tab for logs</p>
                  </div>
                </>
              ) : status === "error" ? (
                <>
                  <Globe className="h-10 w-10 text-destructive/30" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Failed to start</p>
                    <p className="text-xs text-muted-foreground mt-1">Check the Terminal tab for details</p>
                  </div>
                </>
              ) : (
                <>
                  <Globe className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium">No preview yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click <span className="font-semibold">Run</span> to start the WebContainer
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Terminal (log output, replaced by xterm.js in Phase 9) ── */}
        <div className={cn("h-full flex-col bg-zinc-950", activeTab === "terminal" ? "flex" : "hidden")}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800 shrink-0">
            <Terminal className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-xs text-zinc-400">output</span>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />}
          </div>
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
            {logs.length === 0 ? (
              <p className="text-zinc-600">Run your project to see output here.</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={cn(
                  "whitespace-pre-wrap break-all",
                  line.startsWith("❌") ? "text-red-400" :
                  line.startsWith("✅") ? "text-green-400" :
                  line.startsWith("⚡") || line.startsWith("📁") || line.startsWith("📦") || line.startsWith("🚀")
                    ? "text-blue-400"
                    : "text-zinc-300"
                )}>
                  {line}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  )
}
