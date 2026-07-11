"use client"

import { useState, useEffect, useCallback } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { PlaygroundHeader } from "./playground-header"
import { FileExplorer } from "./file-explorer"
import { EditorPanel } from "./editor-panel"
import { PreviewTerminalPanel } from "./preview-terminal-panel"
import { saveProjectFiles } from "@/app/actions/projects"
import { useWebContainer } from "@/hooks/use-web-container"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  files: Record<string, string>
}

interface User {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface Props {
  project: Project
  user: User
}

export function PlaygroundLayout({ project, user }: Props) {
  const [files, setFiles] = useState<Record<string, string>>(project.files)
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(project.files)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [activeRightTab, setActiveRightTab] = useState<"preview" | "terminal">("preview")

  const { status: wcStatus, previewUrl, start, stop, writeFile, spawnShell, registerTermWrite } = useWebContainer()

  function handleSelectFile(path: string) {
    setSelectedFile(path)
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
  }

  function handleCloseFile(path: string) {
    const next = openFiles.filter((f) => f !== path)
    setOpenFiles(next)
    if (selectedFile === path) setSelectedFile(next[next.length - 1] ?? null)
  }

  function handleUpdateContent(path: string, content: string) {
    setFiles((prev) => ({ ...prev, [path]: content }))
    // Sync to WebContainer FS live so HMR picks up changes
    writeFile(path, content)
  }

  async function handleCreateFile(path: string) {
    const next = { ...files, [path]: "" }
    setFiles(next)
    setSavedFiles(next)
    handleSelectFile(path)
    try { await saveProjectFiles(project.id, next) } catch { toast.error("Failed to save") }
  }

  async function handleRename(oldPath: string, newPath: string, isFolder: boolean) {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(files)) {
      if (isFolder) {
        next[k.startsWith(oldPath + "/") ? newPath + k.slice(oldPath.length) : k] = v
      } else {
        next[k === oldPath ? newPath : k] = v
      }
    }
    setFiles(next)
    setSavedFiles(next)
    setOpenFiles((prev) =>
      prev.map((f) => {
        if (isFolder && f.startsWith(oldPath + "/")) return newPath + f.slice(oldPath.length)
        return f === oldPath ? newPath : f
      })
    )
    setSelectedFile((prev) => {
      if (!prev) return prev
      if (isFolder && prev.startsWith(oldPath + "/")) return newPath + prev.slice(oldPath.length)
      return prev === oldPath ? newPath : prev
    })
    try { await saveProjectFiles(project.id, next) } catch { toast.error("Failed to save") }
  }

  async function handleDelete(path: string, isFolder: boolean) {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(files)) {
      const skip = isFolder ? k === path || k.startsWith(path + "/") : k === path
      if (!skip) next[k] = v
    }
    setFiles(next)
    setSavedFiles(next)
    setOpenFiles((prev) =>
      prev.filter((f) => isFolder ? f !== path && !f.startsWith(path + "/") : f !== path)
    )
    setSelectedFile((prev) => {
      if (!prev) return prev
      const removed = isFolder ? (prev === path || prev.startsWith(path + "/")) : prev === path
      return removed ? null : prev
    })
    try { await saveProjectFiles(project.id, next) } catch { toast.error("Failed to save") }
  }

  const handleSave = useCallback(async () => {
    try {
      await saveProjectFiles(project.id, files)
      setSavedFiles(files)
      toast.success("Saved")
    } catch {
      toast.error("Failed to save")
    }
  }, [project.id, files])

  // Ctrl+S
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleSave])

  function handleRun() {
    setActiveRightTab("terminal")
    start(files)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PlaygroundHeader
        project={project}
        user={user}
        wcStatus={wcStatus}
        onRun={handleRun}
        onStop={stop}
      />

      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* File explorer */}
        <Panel defaultSize={20} minSize={14} maxSize={35}>
          <FileExplorer
            files={files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
            onCreateFile={handleCreateFile}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

        {/* Editor */}
        <Panel defaultSize={50} minSize={25}>
          <EditorPanel
            files={files}
            savedFiles={savedFiles}
            openFiles={openFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onCloseFile={handleCloseFile}
            onUpdateContent={handleUpdateContent}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

        {/* Preview + Terminal */}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <PreviewTerminalPanel
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
            status={wcStatus}
            previewUrl={previewUrl}
            spawnShell={spawnShell}
            registerTermWrite={registerTermWrite}
          />
        </Panel>
      </PanelGroup>
    </div>
  )
}
