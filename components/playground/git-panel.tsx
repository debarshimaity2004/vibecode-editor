"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  GitBranch, GitCommit, Upload, Download, RefreshCw,
  Plus, Minus, FileEdit, Loader2, AlertCircle, Lock,
} from "lucide-react"
import type { GitState } from "@/hooks/use-git"

interface Props {
  state: GitState
  userEmail: string
  userName: string
  onClone: (url: string, token?: string) => void
  onCommit: (message: string, name: string, email: string) => void
  onPush: (token: string) => void
  onPull: (token?: string) => void
  onRefresh: () => void
}

const STATUS_ICON = {
  modified: <FileEdit className="h-3 w-3 text-yellow-500" />,
  added:    <Plus className="h-3 w-3 text-green-500" />,
  deleted:  <Minus className="h-3 w-3 text-red-500" />,
}

const STATUS_LABEL = { modified: "M", added: "A", deleted: "D" }
const STATUS_COLOR = {
  modified: "text-yellow-500",
  added:    "text-green-500",
  deleted:  "text-red-500",
}

export function GitPanel({
  state, userEmail, userName,
  onClone, onCommit, onPush, onPull, onRefresh,
}: Props) {
  const [cloneUrl, setCloneUrl] = useState("")
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [commitMsg, setCommitMsg] = useState("")
  const [authorName, setAuthorName] = useState(userName || "VibeCode User")
  const [authorEmail, setAuthorEmail] = useState(userEmail || "user@vibecode.dev")

  if (!state.ready) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading git…
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto text-xs">

      {/* Error banner */}
      {state.error && (
        <div className="flex items-start gap-2 mx-2 mt-2 p-2 rounded bg-destructive/10 text-destructive shrink-0">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="break-all">{state.error}</span>
        </div>
      )}

      {/* ── Clone section (shown when no repo) ── */}
      {!state.initialized && (
        <div className="p-3 space-y-2 shrink-0">
          <p className="font-medium text-foreground">Clone a repository</p>
          <input
            value={cloneUrl}
            onChange={(e) => setCloneUrl(e.target.value)}
            placeholder="https://github.com/user/repo.git"
            className="w-full bg-muted rounded px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
          />
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="GitHub token (private repos)"
              className="w-full bg-muted rounded px-2 py-1.5 pr-7 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              title={showToken ? "Hide token" : "Show token"}
            >
              <Lock className="h-3 w-3" />
            </button>
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            disabled={!cloneUrl.trim() || state.loading}
            onClick={() => onClone(cloneUrl.trim(), token.trim() || undefined)}
          >
            {state.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            {state.loading ? "Cloning…" : "Clone"}
          </Button>
        </div>
      )}

      {/* ── Repo info (shown after clone) ── */}
      {state.initialized && (
        <>
          {/* Branch + remote */}
          <div className="px-3 pt-3 pb-2 space-y-1 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                <span className="font-mono font-medium text-foreground">{state.branch}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRefresh}
                title="Refresh status"
              >
                <RefreshCw className={cn("h-3 w-3", state.loading && "animate-spin")} />
              </Button>
            </div>
            {state.remoteUrl && (
              <p className="text-muted-foreground truncate" title={state.remoteUrl}>
                {state.remoteUrl.replace("https://github.com/", "").replace(".git", "")}
              </p>
            )}
          </div>

          {/* Changed files */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {state.changedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1">
                <GitCommit className="h-6 w-6 opacity-30" />
                <p>No changes</p>
              </div>
            ) : (
              <div className="py-1">
                <p className="px-3 py-1 text-muted-foreground uppercase tracking-wide text-[10px]">
                  Changes ({state.changedFiles.length})
                </p>
                {state.changedFiles.map((f) => (
                  <div key={f.path} className="flex items-center gap-2 px-3 py-1 hover:bg-muted/40">
                    {STATUS_ICON[f.status]}
                    <span className="flex-1 truncate font-mono" title={f.path}>{f.path}</span>
                    <span className={cn("font-bold text-[10px]", STATUS_COLOR[f.status])}>
                      {STATUS_LABEL[f.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commit + push */}
          <div className="border-t p-3 space-y-2 shrink-0">
            <textarea
              value={commitMsg}
              onChange={(e) => setCommitMsg(e.target.value)}
              placeholder="Commit message…"
              rows={2}
              className="w-full resize-none bg-muted rounded px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
            />

            {/* Author fields (collapsed by default) */}
            <details className="group">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground list-none flex items-center gap-1">
                <span className="text-[10px]">Author settings</span>
              </summary>
              <div className="mt-1.5 space-y-1">
                <input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Name"
                  className="w-full bg-muted rounded px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
                />
                <input
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full bg-muted rounded px-2 py-1 text-xs outline-none placeholder:text-muted-foreground"
                />
              </div>
            </details>

            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!commitMsg.trim() || state.loading}
              onClick={() => {
                onCommit(commitMsg.trim(), authorName.trim(), authorEmail.trim())
                setCommitMsg("")
              }}
            >
              {state.loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                : <GitCommit className="h-3.5 w-3.5 mr-1.5" />}
              Commit All
            </Button>

            {/* Token for push/pull */}
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="GitHub token for push/pull"
                className="w-full bg-muted rounded px-2 py-1.5 pr-7 text-xs outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Lock className="h-3 w-3" />
              </button>
            </div>

            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                disabled={state.loading}
                onClick={() => onPull(token.trim() || undefined)}
              >
                <Download className="h-3.5 w-3.5 mr-1" /> Pull
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                disabled={!token.trim() || state.loading}
                onClick={() => onPush(token.trim())}
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Push
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
