"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef } from "react"
import Editor, { type OnMount } from "@monaco-editor/react"
import type * as Monaco from "monaco-editor"

// ─── Language map ─────────────────────────────────────────────────────────────

function getLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript", mjs: "javascript",
    json: "json",
    html: "html",
    css: "css", scss: "scss", sass: "scss",
    md: "markdown", mdx: "markdown",
    yaml: "yaml", yml: "yaml",
    toml: "ini",
    vue: "html",
    py: "python",
    rs: "rust",
    go: "go",
    sh: "shell",
    env: "shell",
  }
  return map[ext] ?? "plaintext"
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  path: string
  value: string
  onChange: (value: string) => void
}

export function MonacoEditor({ path, value, onChange }: Props) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  // Keep editor value in sync when switching files
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.getValue() !== value) {
      const pos = editor.getPosition()
      editor.setValue(value)
      if (pos) editor.setPosition(pos)
    }
  }, [path]) // intentionally only on path change, not value

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // TypeScript/JavaScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Bundler,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    })

    // Focus editor on mount
    editor.focus()
  }

  return (
    <Editor
      key={path}
      language={getLanguage(path)}
      value={value}
      theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
      onChange={(val) => onChange(val ?? "")}
      onMount={handleMount}
      options={{
        fontSize: 13,
        fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineHeight: 20,
        tabSize: 2,
        insertSpaces: true,
        wordWrap: "off",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        smoothScrolling: true,
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
        formatOnPaste: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
    />
  )
}
