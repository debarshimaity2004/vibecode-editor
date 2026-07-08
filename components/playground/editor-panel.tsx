"use client"

import { cn } from "@/lib/utils"
import { FileCode2, X } from "lucide-react"

interface Props {
  files: Record<string, string>
  openFiles: string[]
  selectedFile: string | null
  onSelectFile: (path: string) => void
  onCloseFile: (path: string) => void
}

export function EditorPanel({ files, openFiles, selectedFile, onSelectFile, onCloseFile }: Props) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Tabs */}
      {openFiles.length > 0 && (
        <div className="flex items-end border-b overflow-x-auto shrink-0 bg-muted/30">
          {openFiles.map((path) => {
            const name = path.split("/").pop() ?? path
            const active = path === selectedFile
            return (
              <div
                key={path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-xs border-r cursor-pointer shrink-0 group",
                  active
                    ? "bg-background text-foreground border-t-2 border-t-primary"
                    : "text-muted-foreground hover:bg-muted/50"
                )}
                onClick={() => onSelectFile(path)}
              >
                <span>{name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onCloseFile(path) }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor area */}
      {selectedFile ? (
        <div className="flex-1 overflow-auto">
          {/* Path breadcrumb */}
          <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-muted/20 text-xs text-muted-foreground">
            {selectedFile.split("/").map((part, i, arr) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span>/</span>}
                <span className={i === arr.length - 1 ? "text-foreground" : ""}>{part}</span>
              </span>
            ))}
          </div>

          {/* File content — plain text until Monaco (Phase 7) */}
          <pre className="p-4 text-xs font-mono leading-relaxed text-foreground/85 whitespace-pre overflow-x-auto">
            {files[selectedFile] ?? ""}
          </pre>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <div className="h-12 w-12 rounded-xl border bg-muted flex items-center justify-center">
            <FileCode2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No file open</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select a file from the explorer to view it.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Monaco Editor coming in Phase 7
          </p>
        </div>
      )}
    </div>
  )
}
