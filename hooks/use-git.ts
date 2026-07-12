"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import git from "isomorphic-git"
import http from "isomorphic-git/http/web"

export type FileStatus = "modified" | "added" | "deleted"

export interface GitFile { path: string; status: FileStatus }

export interface GitState {
  ready: boolean        // LightningFS loaded
  initialized: boolean  // .git dir exists
  branch: string
  remoteUrl: string
  changedFiles: GitFile[]
  loading: boolean
  error: string | null
}

const DIR = "/"

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGit(
  projectId: string,
  getFiles: () => Record<string, string>,
  onFilesLoaded: (files: Record<string, string>) => Promise<void>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fsRef = useRef<any>(null)
  const [state, setState] = useState<GitState>({
    ready: false,
    initialized: false,
    branch: "main",
    remoteUrl: "",
    changedFiles: [],
    loading: false,
    error: null,
  })

  // Dynamically import LightningFS (browser/IndexedDB only)
  useEffect(() => {
    import("@isomorphic-git/lightning-fs").then(({ default: LightningFS }) => {
      const fs = new LightningFS(`vibecode-${projectId}`)
      fsRef.current = fs
      // Check if repo already exists
      git.currentBranch({ fs, dir: DIR })
        .then(async (branch) => {
          if (!branch) { setState((s) => ({ ...s, ready: true })); return }
          const remotes = await git.listRemotes({ fs, dir: DIR }).catch(() => [])
          setState((s) => ({
            ...s,
            ready: true,
            initialized: true,
            branch: branch ?? "main",
            remoteUrl: remotes[0]?.url ?? "",
          }))
          await refreshStatus(fs)
        })
        .catch(() => setState((s) => ({ ...s, ready: true })))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  async function readAllFiles(fs: unknown): Promise<Record<string, string>> {
    const out: Record<string, string> = {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function walk(path: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const entries: string[] = await (fs as any).promises.readdir(path)
      for (const name of entries) {
        if (name === ".git") continue
        const full = path === "/" ? `/${name}` : `${path}/${name}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stat = await (fs as any).promises.stat(full)
        if (stat.isDirectory()) {
          await walk(full)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const content = await (fs as any).promises.readFile(full, { encoding: "utf8" }) as string
          out[full.slice(1)] = content // strip leading /
        }
      }
    }
    await walk(DIR)
    return out
  }

  async function writeEditorFilesToFs(fs: unknown, files: Record<string, string>) {
    const dirs = new Set<string>()
    for (const p of Object.keys(files)) {
      const parts = p.split("/")
      for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"))
    }
    for (const d of [...dirs].sort()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (fs as any).promises.mkdir(`/${d}`).catch(() => {})
    }
    for (const [path, content] of Object.entries(files)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (fs as any).promises.writeFile(`/${path}`, content, { encoding: "utf8" })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function refreshStatus(fs: any) {
    try {
      const matrix = await git.statusMatrix({ fs, dir: DIR })
      const changedFiles: GitFile[] = []
      for (const [filepath, head, workdir] of matrix) {
        if (head === 0 && workdir === 2) changedFiles.push({ path: filepath, status: "added" })
        else if (head === 1 && workdir === 0) changedFiles.push({ path: filepath, status: "deleted" })
        else if (head === 1 && workdir === 2) changedFiles.push({ path: filepath, status: "modified" })
      }
      setState((s) => ({ ...s, changedFiles }))
    } catch { /* not initialized */ }
  }

  // ─── Operations ──────────────────────────────────────────────────────────────

  const initRepo = useCallback(async (remoteUrl: string) => {
    const fs = fsRef.current
    if (!fs) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      await git.init({ fs, dir: DIR, defaultBranch: "main" })
      if (remoteUrl.trim()) {
        await git.addRemote({ fs, dir: DIR, remote: "origin", url: remoteUrl.trim() })
      }
      // Write current editor files into the new repo
      const currentFiles = getFiles()
      await writeEditorFilesToFs(fs, currentFiles)
      setState((s) => ({
        ...s,
        initialized: true,
        branch: "main",
        remoteUrl: remoteUrl.trim(),
        loading: false,
      }))
      await refreshStatus(fs)
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Init failed",
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFiles])

  const clone = useCallback(async (url: string, token?: string) => {
    const fs = fsRef.current
    if (!fs) return
    setState((s) => ({ ...s, loading: true, error: null }))
    const _t0 = performance.now()
    try {
      // Wipe existing FS data for a fresh clone
      const existing = await fs.promises.readdir("/").catch(() => []) as string[]
      for (const entry of existing) {
        await fs.promises.rm(`/${entry}`, { recursive: true }).catch(() => {})
      }

      await git.clone({
        fs,
        http,
        dir: DIR,
        url,
        corsProxy: "/api/git",
        singleBranch: true,
        depth: 10,
        onAuth: token ? () => ({ username: token, password: "" }) : undefined,
        onMessage: (msg) => console.log("[git]", msg),
      })

      if (process.env.NEXT_PUBLIC_BENCH_MODE) {
        const durationMs = Math.round(performance.now() - _t0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__ = (window as any).__BENCH_GIT__ ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__.push({ op: "clone", durationMs, ts: Date.now() })
      }

      const files = await readAllFiles(fs)
      await onFilesLoaded(files)

      const branch = await git.currentBranch({ fs, dir: DIR }) ?? "main"
      const remotes = await git.listRemotes({ fs, dir: DIR }).catch(() => [])
      setState((s) => ({
        ...s,
        initialized: true,
        branch,
        remoteUrl: remotes[0]?.url ?? url,
        loading: false,
      }))
      await refreshStatus(fs)
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Clone failed",
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilesLoaded])

  const commit = useCallback(async (message: string, authorName: string, authorEmail: string) => {
    const fs = fsRef.current
    if (!fs) return
    setState((s) => ({ ...s, loading: true, error: null }))
    const _t0 = performance.now()
    try {
      // Sync editor → FS
      const files = getFiles()
      await writeEditorFilesToFs(fs, files)

      // Stage all changes
      const matrix = await git.statusMatrix({ fs, dir: DIR })
      for (const [filepath, , workdir] of matrix) {
        if (workdir !== 0) await git.add({ fs, dir: DIR, filepath })
        else await git.remove({ fs, dir: DIR, filepath })
      }

      await git.commit({
        fs,
        dir: DIR,
        message,
        author: { name: authorName, email: authorEmail },
      })
      if (process.env.NEXT_PUBLIC_BENCH_MODE) {
        const durationMs = Math.round(performance.now() - _t0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__ = (window as any).__BENCH_GIT__ ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__.push({ op: "commit", durationMs, ts: Date.now() })
      }
      await refreshStatus(fs)
      setState((s) => ({ ...s, loading: false }))
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Commit failed",
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFiles])

  const push = useCallback(async (token: string) => {
    const fs = fsRef.current
    if (!fs) return
    setState((s) => ({ ...s, loading: true, error: null }))
    const _t0 = performance.now()
    try {
      await git.push({
        fs,
        http,
        dir: DIR,
        corsProxy: "/api/git",
        onAuth: () => ({ username: token, password: "" }),
      })
      if (process.env.NEXT_PUBLIC_BENCH_MODE) {
        const durationMs = Math.round(performance.now() - _t0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__ = (window as any).__BENCH_GIT__ ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__BENCH_GIT__.push({ op: "push", durationMs, ts: Date.now() })
      }
      setState((s) => ({ ...s, loading: false }))
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Push failed",
      }))
    }
  }, [])

  const pull = useCallback(async (token?: string) => {
    const fs = fsRef.current
    if (!fs) return
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      await git.pull({
        fs,
        http,
        dir: DIR,
        corsProxy: "/api/git",
        onAuth: token ? () => ({ username: token, password: "" }) : undefined,
        author: { name: "VibeCode", email: "vibecode@editor.dev" },
      })
      const files = await readAllFiles(fs)
      await onFilesLoaded(files)
      await refreshStatus(fs)
      setState((s) => ({ ...s, loading: false }))
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Pull failed",
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilesLoaded])

  const refresh = useCallback(() => {
    if (fsRef.current) refreshStatus(fsRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, initRepo, clone, commit, push, pull, refresh }
}
