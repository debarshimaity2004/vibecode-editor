"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import {
  ChevronRight, ChevronDown,
  FileCode, FileText, Folder, FolderOpen,
  FilePlus, FolderPlus, Pencil, Trash2,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileNode {
  type: "file" | "folder"
  name: string
  path: string
  children?: FileNode[]
}

export interface FileExplorerProps {
  files: Record<string, string>
  selectedFile: string | null
  onSelectFile: (path: string) => void
  onCreateFile: (path: string) => void
  onRename: (oldPath: string, newPath: string, isFolder: boolean) => void
  onDelete: (path: string, isFolder: boolean) => void
}

// depth → paddingLeft class for folder rows (8 + depth * 14)
const FOLDER_PL = [
  "pl-2",       // 8px  depth 0
  "pl-[22px]",  // 22px depth 1
  "pl-9",       // 36px depth 2
  "pl-[50px]",  // 50px depth 3
  "pl-16",      // 64px depth 4
  "pl-[78px]",  // 78px depth 5
  "pl-[92px]",  // 92px depth 6
  "pl-[106px]", // 106px depth 7
] as const

// depth → paddingLeft class for nested create inputs (8 + depth * 14 + 14)
const INPUT_PL = [
  "pl-[22px]",  // 22px depth 0
  "pl-9",       // 36px depth 1
  "pl-[50px]",  // 50px depth 2
  "pl-16",      // 64px depth 3
  "pl-[78px]",  // 78px depth 4
  "pl-[92px]",  // 92px depth 5
  "pl-[106px]", // 106px depth 6
  "pl-[120px]", // 120px depth 7
] as const

// depth → paddingLeft class for file rows (8 + depth * 14 + 16)
const FILE_PL = [
  "pl-6",       // 24px depth 0
  "pl-[38px]",  // 38px depth 1
  "pl-[52px]",  // 52px depth 2
  "pl-[66px]",  // 66px depth 3
  "pl-20",      // 80px depth 4
  "pl-[94px]",  // 94px depth 5
  "pl-[108px]", // 108px depth 6
  "pl-[122px]", // 122px depth 7
] as const

function clamp(n: number, max: number) { return Math.min(n, max) }

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(files: Record<string, string>): FileNode[] {
  const root: FileNode[] = []
  const folderMap = new Map<string, FileNode & { type: "folder"; children: FileNode[] }>()

  for (const filePath of Object.keys(files).sort()) {
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

// ─── File icon ────────────────────────────────────────────────────────────────

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop() ?? ""
  if (["ts", "tsx"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-sky-400 shrink-0" />
  if (["js", "jsx", "mjs"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
  if (["json", "yaml", "yml", "toml"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-orange-300 shrink-0" />
  if (["css", "scss", "sass"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-pink-400 shrink-0" />
  if (["html"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-orange-400 shrink-0" />
  if (["vue"].includes(ext)) return <FileCode className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
  return <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
}

// ─── Inline input ─────────────────────────────────────────────────────────────

function InlineInput({
  defaultValue = "",
  placeholder = "filename",
  onCommit,
  onCancel,
}: {
  defaultValue?: string
  placeholder?: string
  onCommit: (val: string) => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus(); ref.current?.select() }, [])

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full bg-muted border border-primary rounded-sm px-1 py-0.5 text-xs outline-none font-mono"
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onCommit(ref.current!.value.trim()) }
        if (e.key === "Escape") onCancel()
      }}
      onBlur={() => onCommit(ref.current!.value.trim())}
    />
  )
}

// ─── Tree node ───────────────────────────────────────────────────────────────

type EditState =
  | { type: "idle" }
  | { type: "renaming"; path: string; isFolder: boolean }
  | { type: "new-file"; parentPath: string }
  | { type: "new-folder"; parentPath: string }

function TreeNode({
  node, depth, selectedFile, editState,
  onSelectFile, onSetEdit, onCommitRename, onCancelEdit,
  onDeleteRequest,
}: {
  node: FileNode
  depth: number
  selectedFile: string | null
  editState: EditState
  onSelectFile: (path: string) => void
  onSetEdit: (s: EditState) => void
  onCommitRename: (oldPath: string, newName: string, isFolder: boolean) => void
  onCancelEdit: () => void
  onDeleteRequest: (path: string, isFolder: boolean) => void
}) {
  const [open, setOpen] = useState(true)
  const d = clamp(depth, FOLDER_PL.length - 1)
  const isRenaming = editState.type === "renaming" && editState.path === node.path

  if (node.type === "folder") {
    return (
      <div>
        <div
          className={cn(
            "group flex items-center gap-1 py-0.5 pr-1 hover:bg-muted/60 cursor-pointer text-sm",
            FOLDER_PL[d]
          )}
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          {open ? <FolderOpen className="h-3.5 w-3.5 text-yellow-400/80 shrink-0" />
                : <Folder className="h-3.5 w-3.5 text-yellow-400/80 shrink-0" />}

          {isRenaming ? (
            <InlineInput
              defaultValue={node.name}
              placeholder="folder name"
              onCommit={(val) => val && onCommitRename(node.path, val, true)}
              onCancel={onCancelEdit}
            />
          ) : (
            <span className="flex-1 truncate text-foreground/80">{node.name}</span>
          )}

          {!isRenaming && (
            <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                className="p-0.5 rounded hover:bg-background"
                onClick={(e) => { e.stopPropagation(); onSetEdit({ type: "new-file", parentPath: node.path }) }}
                title="New file in folder"
              ><FilePlus className="h-3 w-3" /></button>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-background"
                onClick={(e) => { e.stopPropagation(); onSetEdit({ type: "renaming", path: node.path, isFolder: true }) }}
                title="Rename"
              ><Pencil className="h-3 w-3" /></button>
              <button
                type="button"
                className="p-0.5 rounded hover:bg-background text-destructive"
                onClick={(e) => { e.stopPropagation(); onDeleteRequest(node.path, true) }}
                title="Delete folder"
              ><Trash2 className="h-3 w-3" /></button>
            </span>
          )}
        </div>

        {open && (
          <div>
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedFile={selectedFile}
                editState={editState}
                onSelectFile={onSelectFile}
                onSetEdit={onSetEdit}
                onCommitRename={onCommitRename}
                onCancelEdit={onCancelEdit}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
            {editState.type === "new-file" && editState.parentPath === node.path && (
              <div className={cn("py-0.5 pr-2", INPUT_PL[d])}>
                <InlineInput
                  placeholder="filename.ts"
                  onCommit={(val) => {
                    if (val) onCommitRename("", `${node.path}/${val}`, false)
                    onCancelEdit()
                  }}
                  onCancel={onCancelEdit}
                />
              </div>
            )}
            {editState.type === "new-folder" && editState.parentPath === node.path && (
              <div className={cn("py-0.5 pr-2", INPUT_PL[d])}>
                <InlineInput
                  placeholder="folder name"
                  onCommit={(val) => {
                    if (val) onCommitRename("", `${node.path}/${val}/.gitkeep`, false)
                    onCancelEdit()
                  }}
                  onCancel={onCancelEdit}
                />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // File node
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 py-0.5 pr-1 cursor-pointer text-sm",
        FILE_PL[d],
        selectedFile === node.path ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-foreground/70"
      )}
      onClick={() => onSelectFile(node.path)}
    >
      <FileIcon name={node.name} />

      {isRenaming ? (
        <InlineInput
          defaultValue={node.name}
          placeholder="filename"
          onCommit={(val) => val && onCommitRename(node.path, val, false)}
          onCancel={onCancelEdit}
        />
      ) : (
        <span className="flex-1 truncate">{node.name}</span>
      )}

      {!isRenaming && (
        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); onSetEdit({ type: "renaming", path: node.path, isFolder: false }) }}
            title="Rename"
          ><Pencil className="h-3 w-3" /></button>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted text-destructive"
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(node.path, false) }}
            title="Delete"
          ><Trash2 className="h-3 w-3" /></button>
        </span>
      )}
    </div>
  )
}

// ─── File Explorer ────────────────────────────────────────────────────────────

export function FileExplorer({
  files, selectedFile,
  onSelectFile, onCreateFile, onRename, onDelete,
}: FileExplorerProps) {
  const [editState, setEditState] = useState<EditState>({ type: "idle" })
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; isFolder: boolean } | null>(null)
  const tree = buildTree(files)

  function handleCommitRename(oldPath: string, newNameOrPath: string, isFolder: boolean) {
    setEditState({ type: "idle" })
    if (!oldPath) {
      onCreateFile(newNameOrPath)
      return
    }
    const parentPath = oldPath.includes("/") ? oldPath.split("/").slice(0, -1).join("/") : ""
    const newPath = parentPath ? `${parentPath}/${newNameOrPath}` : newNameOrPath
    if (newPath !== oldPath) onRename(oldPath, newPath, isFolder)
  }

  function handleCommitNew(nameOrPath: string) {
    setEditState({ type: "idle" })
    if (!nameOrPath) return
    onCreateFile(nameOrPath)
  }

  return (
    <div className="h-full flex flex-col bg-background border-r overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="New file"
            onClick={() => setEditState({ type: "new-file", parentPath: "" })}
          ><FilePlus className="h-3.5 w-3.5" /></button>
          <button
            type="button"
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="New folder"
            onClick={() => setEditState({ type: "new-folder", parentPath: "" })}
          ><FolderPlus className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* New file/folder input at root level */}
      {(editState.type === "new-file" || editState.type === "new-folder") && editState.parentPath === "" && (
        <div className="px-2 py-1 border-b">
          <InlineInput
            placeholder={editState.type === "new-folder" ? "folder name" : "filename.ts"}
            onCommit={(val) => {
              if (val) handleCommitNew(
                editState.type === "new-folder" ? `${val}/.gitkeep` : val
              )
              else setEditState({ type: "idle" })
            }}
            onCancel={() => setEditState({ type: "idle" })}
          />
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 text-sm">
        {tree.length === 0 && editState.type === "idle" ? (
          <p className="text-xs text-muted-foreground px-3 py-4 text-center">No files yet.</p>
        ) : (
          tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedFile={selectedFile}
              editState={editState}
              onSelectFile={onSelectFile}
              onSetEdit={setEditState}
              onCommitRename={handleCommitRename}
              onCancelEdit={() => setEditState({ type: "idle" })}
              onDeleteRequest={(path, isFolder) => setDeleteTarget({ path, isFolder })}
            />
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &ldquo;{deleteTarget?.path.split("/").pop()}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isFolder
                ? "This will delete the folder and all files inside it."
                : "This will permanently delete the file."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.path, deleteTarget.isFolder)
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
