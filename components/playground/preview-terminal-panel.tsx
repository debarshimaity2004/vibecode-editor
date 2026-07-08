"use client"

import { cn } from "@/lib/utils"
import { Globe, Terminal } from "lucide-react"

interface Props {
  activeTab: "preview" | "terminal"
  onTabChange: (tab: "preview" | "terminal") => void
}

export function PreviewTerminalPanel({ activeTab, onTabChange }: Props) {
  return (
    <div className="h-full flex flex-col bg-background border-l">
      {/* Tab bar */}
      <div className="flex items-center border-b shrink-0 bg-muted/30">
        {(["preview", "terminal"] as const).map((tab) => (
          <button
            key={tab}
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
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <div className="h-full flex flex-col">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 shrink-0">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/50" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/50" />
              </div>
              <div className="flex-1 bg-background rounded px-2 py-0.5 text-xs text-muted-foreground border">
                localhost:5173
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <Globe className="h-10 w-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium">No preview yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click <span className="font-semibold">Run</span> to start the WebContainer and see your app live.
                </p>
              </div>
              <p className="text-xs text-muted-foreground/60">WebContainers coming in Phase 8</p>
            </div>
          </div>
        ) : (
          <div className="h-full bg-zinc-950 flex flex-col">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800 shrink-0">
              <Terminal className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-xs text-zinc-400">bash</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-6">
              <Terminal className="h-10 w-10 text-zinc-700" />
              <div>
                <p className="text-sm font-medium text-zinc-400">Terminal not connected</p>
                <p className="text-xs text-zinc-600 mt-1">
                  xterm.js + WebContainer shell coming in Phase 9.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
