"use client"

import { useState } from "react"
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels"
import { PlaygroundHeader } from "./playground-header"
import { FileExplorer } from "./file-explorer"
import { EditorPanel } from "./editor-panel"
import { PreviewTerminalPanel } from "./preview-terminal-panel"

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
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [openFiles, setOpenFiles] = useState<string[]>([])
  const [activeRightTab, setActiveRightTab] = useState<"preview" | "terminal">("preview")
  const [isRunning, setIsRunning] = useState(false)

  function handleSelectFile(path: string) {
    setSelectedFile(path)
    setOpenFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
  }

  function handleCloseFile(path: string) {
    const next = openFiles.filter((f) => f !== path)
    setOpenFiles(next)
    if (selectedFile === path) {
      setSelectedFile(next[next.length - 1] ?? null)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PlaygroundHeader
        project={project}
        user={user}
        isRunning={isRunning}
        onRun={() => setIsRunning(true)}
        onStop={() => setIsRunning(false)}
      />

      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        {/* File explorer */}
        <Panel defaultSize={20} minSize={14} maxSize={35}>
          <FileExplorer
            files={project.files}
            selectedFile={selectedFile}
            onSelectFile={handleSelectFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

        {/* Editor */}
        <Panel defaultSize={50} minSize={25}>
          <EditorPanel
            files={project.files}
            openFiles={openFiles}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            onCloseFile={handleCloseFile}
          />
        </Panel>

        <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors" />

        {/* Preview + Terminal */}
        <Panel defaultSize={30} minSize={20} maxSize={50}>
          <PreviewTerminalPanel
            activeTab={activeRightTab}
            onTabChange={setActiveRightTab}
          />
        </Panel>
      </PanelGroup>
    </div>
  )
}
