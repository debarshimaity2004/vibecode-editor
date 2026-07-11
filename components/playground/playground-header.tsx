"use client"

import { useState, useTransition, useRef } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardNav } from "@/components/dashboard-nav"
import { renameProject } from "@/app/actions/projects"
import { ChevronLeft, Play, Square, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WCStatus } from "@/hooks/use-web-container"

interface Props {
  project: { id: string; name: string }
  user: { name?: string | null; email?: string | null; image?: string | null }
  wcStatus: WCStatus
  onRun: () => void
  onStop: () => void
}

export function PlaygroundHeader({ project, user, wcStatus, onRun, onStop }: Props) {
  const isRunning = wcStatus === "running"
  const isLoading = wcStatus === "booting" || wcStatus === "installing" || wcStatus === "starting"
  const [name, setName] = useState(project.name)
  const [editing, setEditing] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleNameCommit() {
    setEditing(false)
    const trimmed = name.trim()
    if (!trimmed) { setName(project.name); return }
    if (trimmed === project.name) return
    startTransition(() => renameProject(project.id, trimmed))
  }

  return (
    <header className="h-11 border-b bg-background flex items-center justify-between px-3 shrink-0 gap-3">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
          <Link href="/dashboard">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>

        <span className="text-muted-foreground text-xs hidden sm:block shrink-0">VibeCode</span>
        <span className="text-muted-foreground text-xs hidden sm:block shrink-0">/</span>

        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameCommit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameCommit()
              if (e.key === "Escape") { setName(project.name); setEditing(false) }
            }}
            className="text-sm font-medium bg-transparent border-b border-primary outline-none min-w-0 max-w-[200px]"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="text-sm font-medium hover:text-muted-foreground transition-colors truncate max-w-[200px]"
            title="Click to rename"
          >
            {name}
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          disabled
          title="AI autocomplete (Phase 10)"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">AI</span>
        </Button>

        <Button
          size="sm"
          className={cn("h-7 gap-1.5 text-xs", isRunning ? "bg-destructive hover:bg-destructive/90" : "")}
          onClick={isRunning ? onStop : onRun}
          disabled={isLoading}
          title={isLoading ? "Starting…" : isRunning ? "Stop the dev server" : "Run in WebContainer"}
        >
          {isLoading ? (
            <><Loader2 className="h-3 w-3 animate-spin" /> Starting…</>
          ) : isRunning ? (
            <><Square className="h-3 w-3" /> Stop</>
          ) : (
            <><Play className="h-3 w-3" /> Run</>
          )}
        </Button>

        <ThemeToggle />
        <DashboardNav user={user} />
      </div>
    </header>
  )
}
