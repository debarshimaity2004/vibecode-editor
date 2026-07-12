"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { PlaygroundHeader } from "./playground-header"
import { FileExplorer } from "./file-explorer"
import { GitPanel } from "./git-panel"
import { EditorPanel } from "./editor-panel"
import { PreviewTerminalPanel } from "./preview-terminal-panel"
import { AIChatPanel } from "./ai-chat-panel"
import { saveProjectFiles } from "@/app/actions/projects"
import { useWebContainer } from "@/hooks/use-web-container"
import { useGit } from "@/hooks/use-git"
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
  const [inlineEnabled, setInlineEnabled] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(320)
  const [leftTab, setLeftTab] = useState<"files" | "git">("files")
  const editorInsertFnRef = useRef<((code: string) => void) | null>(null)
  const filesRef = useRef(files)
  useEffect(() => { filesRef.current = files }, [files])

  const { status: wcStatus, previewUrl, start, stop, writeFile, spawnShell, registerTermWrite } = useWebContainer()

  // Bulk-load files after a git clone/pull — replaces all editor state
  const handleLoadFiles = useCallback(async (newFiles: Record<string, string>) => {
    setFiles(newFiles)
    setSavedFiles(newFiles)
    setOpenFiles([])
    setSelectedFile(null)
    for (const [path, content] of Object.entries(newFiles)) {
      await writeFile(path, content)
    }
    await saveProjectFiles(project.id, newFiles).catch(() => {})
    const first = Object.keys(newFiles)[0]
    if (first) { setSelectedFile(first); setOpenFiles([first]) }
  }, [project.id, writeFile])

  const git = useGit(project.id, () => filesRef.current, handleLoadFiles)

  function handleChatResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = chatWidth
    const onMouseMove = (ev: MouseEvent) => {
      setChatWidth(Math.max(240, Math.min(600, startWidth + startX - ev.clientX)))
    }
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
  }

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

  async function handleDownloadZip() {
    const { default: JSZip } = await import("jszip")
    const zip = new JSZip()
    for (const [path, content] of Object.entries(files)) zip.file(path, content)
    const blob = await zip.generateAsync({ type: "blob" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${project.name.replace(/\s+/g, "-")}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileContext = selectedFile && files[selectedFile] !== undefined
    ? { path: selectedFile, content: files[selectedFile] }
    : null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PlaygroundHeader
        project={project}
        user={user}
        wcStatus={wcStatus}
        inlineEnabled={inlineEnabled}
        chatOpen={chatOpen}
        onInlineToggle={() => setInlineEnabled((v) => !v)}
        onChatToggle={() => setChatOpen((v) => !v)}
        onDownload={handleDownloadZip}
        onRun={handleRun}
        onStop={stop}
      />

      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left panel: Files / Git tabs */}
          <Panel defaultSize={20} minSize={14} maxSize={35}>
            <div className="h-full flex flex-col">
              {/* Tab bar */}
              <div className="flex border-b shrink-0">
                {(["files", "git"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`flex-1 py-1.5 text-[11px] uppercase tracking-wide transition-colors ${
                      leftTab === tab
                        ? "border-b-2 border-primary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "git" && git.state.changedFiles.length > 0
                      ? `Git (${git.state.changedFiles.length})`
                      : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {/* Panel content */}
              <div className="flex-1 overflow-hidden">
                {leftTab === "files" ? (
                  <FileExplorer
                    files={files}
                    selectedFile={selectedFile}
                    onSelectFile={handleSelectFile}
                    onCreateFile={handleCreateFile}
                    onRename={handleRename}
                    onDelete={handleDelete}
                  />
                ) : (
                  <GitPanel
                    state={git.state}
                    userName={user.name ?? ""}
                    userEmail={user.email ?? ""}
                    onInit={git.initRepo}
                    onClone={git.clone}
                    onCommit={git.commit}
                    onPush={git.push}
                    onPull={git.pull}
                    onRefresh={git.refresh}
                  />
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

          {/* Editor */}
          <Panel defaultSize={50} minSize={25}>
            <EditorPanel
              files={files}
              savedFiles={savedFiles}
              openFiles={openFiles}
              selectedFile={selectedFile}
              inlineEnabled={inlineEnabled}
              insertFnRef={editorInsertFnRef}
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

        {/* AI chat sidebar — outside PanelGroup so it doesn't compress the resizable layout */}
        {chatOpen && (
          <>
            <div
              className="w-1 cursor-col-resize bg-border hover:bg-primary/50 transition-colors shrink-0"
              onMouseDown={handleChatResizeStart}
            />
            <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: chatWidth }}>
              <AIChatPanel
                onClose={() => setChatOpen(false)}
                fileContext={fileContext}
                onInsertCode={(code) => {
                  if (!editorInsertFnRef.current) { toast.error("Open a file to insert into"); return }
                  editorInsertFnRef.current(code)
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
