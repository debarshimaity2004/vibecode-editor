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

// Module-level — provider is registered once; these survive component remounts (key changes)
let inlineProviderRegistered = false
const _inlineEnabledRef = { current: false }

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  path: string
  value: string
  inlineEnabled: boolean
  onChange: (value: string) => void
  insertFnRef?: React.RefObject<((code: string) => void) | null>
}

export function MonacoEditor({ path, value, inlineEnabled, onChange, insertFnRef }: Props) {
  const { resolvedTheme } = useTheme()
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  // Keep module-level ref in sync so the registered provider closure always sees latest value
  useEffect(() => { _inlineEnabledRef.current = inlineEnabled }, [inlineEnabled])

  // Null out insert fn when this editor instance unmounts
  useEffect(() => {
    return () => { if (insertFnRef) insertFnRef.current = null }
  }, [insertFnRef])

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

    // Expose insert-at-cursor to parent; updated on each remount so it targets the live editor
    if (insertFnRef) {
      insertFnRef.current = (code: string) => {
        const pos = editor.getPosition()
        if (!pos) return
        editor.executeEdits("ai-insert", [{
          range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
          text: code,
        }])
        editor.focus()
      }
    }

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

    // Register inline completions provider once
    if (!inlineProviderRegistered) {
      inlineProviderRegistered = true
      monaco.languages.registerInlineCompletionsProvider("*", {
        provideInlineCompletions: async (
          model: Monaco.editor.ITextModel,
          position: Monaco.Position,
          _context: Monaco.languages.InlineCompletionContext,
          token: Monaco.CancellationToken,
        ) => {
          if (!_inlineEnabledRef.current) return { items: [] }

          const offset = model.getOffsetAt(position)
          const text = model.getValue()
          const prefix = text.slice(0, offset)
          const suffix = text.slice(offset)

          try {
            const _t0 = performance.now()
            const res = await fetch("/api/ai/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prefix,
                suffix,
                language: model.getLanguageId(),
              }),
              signal: AbortSignal.timeout(8000),
            })
            if (token.isCancellationRequested || !res.ok) return { items: [] }
            if (process.env.NEXT_PUBLIC_BENCH_MODE) {
              const ttftMs = Math.round(performance.now() - _t0)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(window as any).__BENCH_AI__ = (window as any).__BENCH_AI__ ?? []
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ;(window as any).__BENCH_AI__.push({ ttftMs, ts: Date.now() })
            }
            const { completion } = await res.json() as { completion: string }
            if (!completion) return { items: [] }
            return {
              items: [{
                insertText: completion,
                range: new monaco.Range(
                  position.lineNumber, position.column,
                  position.lineNumber, position.column,
                ),
              }],
            }
          } catch {
            return { items: [] }
          }
        },
        freeInlineCompletions: () => {},
      })
    }

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
        inlineSuggest: { enabled: true },
      }}
    />
  )
}
