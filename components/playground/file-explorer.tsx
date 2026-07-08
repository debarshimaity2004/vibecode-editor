"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface FileNode {
  type: "file" | "folder"
  name: string
  path: string
  children?: FileNode[]
}

function buildTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = []
  const folderMap = new Map<string, FileNode & { type: "folder"; children: FileNode[] }>()

  const sorted = Object.keys(files).sort()

  for (const filePath of sorted) {
    const parts = filePath.split("/")

    if (parts.length === 1) {
      root.push({ type: "file", name: parts[0], path: filePath })
    } else {
      let currentLevel = root
      let currentPath = ""

      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i]
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

        let folder = folderMap.get(currentPath)
        if (!folder) {
          folder = { type: "folder", name: folderName, path: currentPath, children: [] }
          folderMap.set(currentPath, folder)
          currentLevel.push(folder)
        }
        currentLevel = folder.children
      }

      currentLevel.push({ type: "file", name: parts[parts.length - 1], path: filePath })
    }
  }

  return root
}

function fileIcon(name: string) {
  const ext = name.split(".").pop() ?? ""
  if (["ts", "tsx", "js", "jsx", "mjs"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 text-sky-400 shrink-0" />
  if (["json", "yaml", "yml", "toml"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
  if (["css", "scss", "sass"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 text-pink-400 shrink-0" />
  if (["html"].includes(ext))
    return <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
  return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
}

function FileTreeNode({
  node,
  depth,
  selectedFile,
  onSelectFile,
}: {
  node: FileNode
  depth: number
  selectedFile: string | null
  onSelectFile: (path: string) => void
}) {
  const [open, setOpen] = useState(true)

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="flex w-full items-center gap-1 px-2 py-0.5 text-sm hover:bg-muted/60 transition-colors text-left"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setOpen(!open)}
        >
          {open
            ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          }
          {open
            ? <FolderOpen className="h-3.5 w-3.5 text-yellow-400/80 shrink-0" />
            : <Folder className="h-3.5 w-3.5 text-yellow-400/80 shrink-0" />
          }
          <span className="truncate text-foreground/80">{node.name}</span>
        </button>
        {open && node.children?.map((child) => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    )
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-1.5 py-0.5 text-sm transition-colors text-left",
        selectedFile === node.path
          ? "bg-primary/15 text-foreground"
          : "hover:bg-muted/60 text-foreground/70"
      )}
      style={{ paddingLeft: `${8 + depth * 12 + 16}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      {fileIcon(node.name)}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

interface Props {
  files: Record<string, string>
  selectedFile: string | null
  onSelectFile: (path: string) => void
}

export function FileExplorer({ files, selectedFile, onSelectFile }: Props) {
  const tree = buildTree(files)

  return (
    <div className="h-full flex flex-col bg-background border-r">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-5 w-5" disabled title="New file (Phase 6)">
            <FilePlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" disabled title="New folder (Phase 6)">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center">
            No files yet.
          </p>
        ) : (
          tree.map((node) => (
            <FileTreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  )
}
