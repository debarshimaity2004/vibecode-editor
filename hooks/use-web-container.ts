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

async function pipeToCallback(stream: ReadableStream<string>, onData: (data: string) => void) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      onData(value)
    }
  } finally {
    reader.releaseLock()
  }
}

export function useWebContainer() {
  const [status, setStatus] = useState<WCStatus>("idle")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const wcRef = useRef<WebContainer | null>(null)
  // Callback registered by XTermPanel so npm output streams into the terminal
  const termWriteRef = useRef<((data: string) => void) | null>(null)

  const registerTermWrite = useCallback((fn: ((data: string) => void) | null) => {
    termWriteRef.current = fn
  }, [])

  const spawnShell = useCallback(async (cols: number, rows: number) => {
    const wc = await bootOnce()
    wcRef.current = wc
    return wc.spawn("jsh", { terminal: { cols, rows }, env: { TERM: "xterm-256color" } })
  }, [])

  const start = useCallback(async (files: Record<string, string>) => {
    setPreviewUrl(null)
    setStatus("booting")

    try {
      const wc = await bootOnce()
      wcRef.current = wc

      setStatus("installing")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wc.mount(toFileSystemTree(files) as any)

      const write = (d: string) => termWriteRef.current?.(d)
      write("\r\n\x1b[34m▶ npm install\x1b[0m\r\n")

      const install = await wc.spawn("npm", ["install"])
      pipeToCallback(install.output, write)
      const installCode = await install.exit

      if (installCode !== 0) {
        write("\r\n\x1b[31m✖ npm install failed\x1b[0m\r\n")
        setStatus("error")
        return
      }

      setStatus("starting")
      write("\r\n\x1b[34m▶ npm run dev\x1b[0m\r\n")
      const dev = await wc.spawn("npm", ["run", "dev"])
      pipeToCallback(dev.output, write)

      wc.on("server-ready", (_port, url) => {
        write(`\r\n\x1b[32m✔ Server ready → ${url}\x1b[0m\r\n`)
        setPreviewUrl(url)
        setStatus("running")
      })
    } catch (err) {
      termWriteRef.current?.(`\r\n\x1b[31m✖ ${err instanceof Error ? err.message : String(err)}\x1b[0m\r\n`)
      setStatus("error")
    }
  }, [])

  const stop = useCallback(() => {
    setStatus("idle")
    setPreviewUrl(null)
  }, [])

  const writeFile = useCallback(async (path: string, content: string) => {
    const wc = wcRef.current
    if (!wc) return
    try {
      const dir = path.includes("/") ? path.split("/").slice(0, -1).join("/") : null
      if (dir) await wc.fs.mkdir(dir, { recursive: true })
      await wc.fs.writeFile(path, content)
    } catch {
      // ignore — WC might not be fully ready
    }
  }, [])

  return { status, previewUrl, start, stop, writeFile, spawnShell, registerTermWrite }
}
