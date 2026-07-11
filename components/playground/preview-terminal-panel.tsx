"use client"

import { cn } from "@/lib/utils"
import { Globe, Terminal, Loader2, RefreshCw } from "lucide-react"
import { XTermPanel } from "./xterm-panel"
import type { WCStatus } from "@/hooks/use-web-container"

interface Props {
  activeTab: "preview" | "terminal"
  onTabChange: (tab: "preview" | "terminal") => void
  status: WCStatus
  previewUrl: string | null
  spawnShell: (cols: number, rows: number) => Promise<unknown>
  registerTermWrite: (fn: ((data: string) => void) | null) => void
}

export function PreviewTerminalPanel({
  activeTab, onTabChange, status, previewUrl, spawnShell, registerTermWrite,
}: Props) {
  const isLoading = status === "booting" || status === "installing" || status === "starting"

  function reloadIframe(e: React.MouseEvent<HTMLButtonElement>) {
    const iframe = (e.currentTarget.closest("[data-preview]") as HTMLElement)
      ?.querySelector("iframe") as HTMLIFrameElement | null
    if (iframe) iframe.src = iframe.src
  }

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
            {tab === "preview" ? <Globe className="h-3.5 w-3.5" /> : <Terminal className="h-3.5 w-3.5" />}
            {tab === "preview" ? "Preview" : "Terminal"}
            {tab === "terminal" && isLoading && (
              <Loader2 className="h-3 w-3 animate-spin ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* ── Preview ── */}
      <div data-preview className={cn("flex-1 flex-col overflow-hidden", activeTab === "preview" ? "flex" : "hidden")}>
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
              onClick={reloadIframe}
            >
              <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {previewUrl ? (
          <iframe
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
                  <p className="text-xs text-muted-foreground mt-1">See output in the Terminal tab</p>
                </div>
              </>
            ) : status === "error" ? (
              <>
                <Globe className="h-10 w-10 text-destructive/30" />
                <p className="text-sm font-medium text-destructive">Failed to start</p>
                <p className="text-xs text-muted-foreground">See output in the Terminal tab</p>
              </>
            ) : (
              <>
                <Globe className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium">No preview yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <span className="font-semibold">Run</span> to start
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Terminal ── */}
      <div className={cn("flex-1 overflow-hidden bg-[#09090b]", activeTab === "terminal" ? "block" : "hidden")}>
        <XTermPanel spawnShell={spawnShell} registerTermWrite={registerTermWrite} />
      </div>
    </div>
  )
}
