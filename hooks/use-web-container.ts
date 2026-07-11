"use client"

import { useRef, useState, useCallback } from "react"
import type { WebContainer } from "@webcontainer/api"

export type WCStatus = "idle" | "booting" | "installing" | "starting" | "running" | "error"

// WebContainer can only be booted once per page load
let singleton: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

async function bootOnce(): Promise<WebContainer> {
  if (singleton) return singleton
  if (bootPromise) return bootPromise
  const { WebContainer } = await import("@webcontainer/api")
  bootPromise = WebContainer.boot()
  singleton = await bootPromise
  return singleton
}

function toFileSystemTree(files: Record<string, string>): Record<string, unknown> {
  const tree: Record<string, unknown> = {}
  for (const [path, content] of Object.entries(files)) {
    const parts = path.split("/")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: Record<string, any> = tree
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { directory: {} }
      node = node[parts[i]].directory
    }
    node[parts[parts.length - 1]] = { file: { contents: content } }
  }
  return tree
}

function stripAnsi(str: string): string {
  return str
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\x1b\][^\x07]*\x07/g, "")
}

async function pipeToLog(stream: ReadableStream<string>, onLine: (line: string) => void) {
  const reader = stream.getReader()
  let buffer = ""
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        const clean = stripAnsi(line).trim()
        if (clean) onLine(clean)
      }
    }
    const clean = stripAnsi(buffer).trim()
    if (clean) onLine(clean)
  } finally {
    reader.releaseLock()
  }
}

export function useWebContainer() {
  const [status, setStatus] = useState<WCStatus>("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const wcRef = useRef<WebContainer | null>(null)

  function addLog(line: string) {
    setLogs((prev) => [...prev, line])
  }

  const start = useCallback(async (files: Record<string, string>) => {
    setLogs([])
    setPreviewUrl(null)
    setStatus("booting")

    try {
      addLog("⚡ Booting WebContainer…")
      const wc = await bootOnce()
      wcRef.current = wc

      addLog("📁 Mounting project files…")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wc.mount(toFileSystemTree(files) as any)

      setStatus("installing")
      addLog("📦 Running npm install…")
      const install = await wc.spawn("npm", ["install"])
      pipeToLog(install.output, addLog)
      const installCode = await install.exit

      if (installCode !== 0) {
        addLog("❌ npm install failed — check the logs above")
        setStatus("error")
        return
      }
      addLog("✅ Dependencies installed")

      setStatus("starting")
      addLog("🚀 Starting dev server…")
      const dev = await wc.spawn("npm", ["run", "dev"])
      pipeToLog(dev.output, addLog)

      wc.on("server-ready", (_port, url) => {
        addLog(`✅ Server ready → ${url}`)
        setPreviewUrl(url)
        setStatus("running")
      })
    } catch (err) {
      addLog(`❌ ${err instanceof Error ? err.message : String(err)}`)
      setStatus("error")
    }
  }, [])

  const stop = useCallback(() => {
    // WebContainer can't be killed, but we clear the UI state
    setStatus("idle")
    setPreviewUrl(null)
    setLogs([])
  }, [])

  const writeFile = useCallback(async (path: string, content: string) => {
    const wc = wcRef.current
    if (!wc) return
    try {
      const dir = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null
      if (dir) await wc.fs.mkdir(dir, { recursive: true })
      await wc.fs.writeFile(path, content)
    } catch {
      // WC might not be fully ready; silently ignore
    }
  }, [])

  return { status, previewUrl, logs, start, stop, writeFile }
}
