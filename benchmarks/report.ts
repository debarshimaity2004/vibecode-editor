#!/usr/bin/env tsx
/**
 * Aggregates all JSON result files in benchmarks/results/ into RESULTS.md
 * Usage: npm run bench:report
 */

import * as fs from "fs"
import * as path from "path"

const RESULTS_DIR = path.resolve(__dirname, "results")
const OUT_FILE    = path.resolve(__dirname, "RESULTS.md")

interface WCEntry  { template: string; run: number; durationMs: number; ts: number }
interface AIEntry  { run: number; ttftMs: number; ts: number }
interface GitEntry { op: "clone" | "commit"; run: number; durationMs: number; ts: number }

interface ResultFile {
  runAt: string
  url: string
  machine: string
  browser: string
  wc: WCEntry[]
  ai: AIEntry[]
  git: GitEntry[]
}

function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m]
}
function p25(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length * 0.25)] ?? 0
}
function p75(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length * 0.75)] ?? 0
}

function loadResults(): ResultFile[] {
  if (!fs.existsSync(RESULTS_DIR)) return []
  return fs.readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "project-urls.json")
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf8")) as ResultFile)
}

function generate() {
  const files = loadResults()
  if (!files.length) {
    console.error("No result files found. Run: npm run bench")
    process.exit(1)
  }

  // Merge all runs across result files
  const allWC:  WCEntry[]  = files.flatMap((f) => f.wc)
  const allAI:  AIEntry[]  = files.flatMap((f) => f.ai)
  const allGit: GitEntry[] = files.flatMap((f) => f.git)

  const latest = files[files.length - 1]!
  const totalRuns = files.length

  const TEMPLATES = ["React + Vite", "Vue + Vite", "Express", "Hono", "Next.js"]

  // ── WC table ──────────────────────────────────────────────────────────────
  let wcTable = `| Template | Median (ms) | p25 | p75 | Min | Max | Runs |\n`
  wcTable    += `|---|---|---|---|---|---|---|\n`
  for (const t of TEMPLATES) {
    const times = allWC.filter((r) => r.template === t).map((r) => r.durationMs)
    if (!times.length) continue
    wcTable += `| ${t} | **${median(times)}** | ${p25(times)} | ${p75(times)} | ${Math.min(...times)} | ${Math.max(...times)} | ${times.length} |\n`
  }

  // ── AI table ──────────────────────────────────────────────────────────────
  const aiTimes = allAI.map((r) => r.ttftMs)
  const aiTable = aiTimes.length
    ? `| Metric | Value |\n|---|---|\n| Median TTFT | **${median(aiTimes)} ms** |\n| p25 | ${p25(aiTimes)} ms |\n| p75 | ${p75(aiTimes)} ms |\n| Min | ${Math.min(...aiTimes)} ms |\n| Max | ${Math.max(...aiTimes)} ms |\n| Runs | ${aiTimes.length} |\n`
    : "_No AI results yet._\n"

  // ── Git table ─────────────────────────────────────────────────────────────
  const gitOps = ["clone", "commit"] as const
  let gitTable = `| Operation | Median (ms) | p25 | p75 | Min | Max | Runs |\n`
  gitTable    += `|---|---|---|---|---|---|---|\n`
  for (const op of gitOps) {
    const times = allGit.filter((r) => r.op === op).map((r) => r.durationMs)
    if (!times.length) continue
    gitTable += `| ${op} | **${median(times)}** | ${p25(times)} | ${p75(times)} | ${Math.min(...times)} | ${Math.max(...times)} | ${times.length} |\n`
  }

  // ── Headline numbers (for resume copy-paste) ───────────────────────────────
  const wcMedians = TEMPLATES.map((t) => {
    const times = allWC.filter((r) => r.template === t).map((r) => r.durationMs)
    return times.length ? median(times) : null
  }).filter((n): n is number => n !== null)

  const overallWCMedian = wcMedians.length ? median(wcMedians) : 0
  const aiMedian   = aiTimes.length   ? median(aiTimes) : 0
  const cloneTimes = allGit.filter((r) => r.op === "clone").map((r) => r.durationMs)
  const cloneMedian = cloneTimes.length ? median(cloneTimes) : 0

  const headlines = [
    overallWCMedian  ? `WebContainer cold-boot time: **${overallWCMedian} ms** median across all 5 templates (${allWC.length} runs)` : null,
    aiMedian         ? `AI autocomplete latency (TTFT): **${aiMedian} ms** median (${aiTimes.length} runs against Groq \`llama-3.3-70b-versatile\`)` : null,
    cloneMedian      ? `Git clone (in-browser, isomorphic-git): **${cloneMedian} ms** median (${cloneTimes.length} runs, octocat/Hello-World)` : null,
  ].filter(Boolean).join("\n- ")

  // ── Write RESULTS.md ──────────────────────────────────────────────────────
  const md = `# VibeCode Editor — Benchmark Results

> Numbers measured against the **live Vercel deployment** using Playwright + Chromium.
> All figures are **medians** across multiple runs — not single-shot results.
> Raw JSON files in \`results/\` contain every individual run for full reproducibility.

## Headline Numbers

- ${headlines}

---

## 1 · WebContainer Cold-Boot Time

Time from clicking **Run** to the \`server-ready\` event firing inside WebContainer.
Includes: WC API boot, file mount, \`npm install\`, \`npm run dev\`, and dev server startup.

${wcTable}
> First run per template may be slower due to CDN/network caching. All runs included.

---

## 2 · AI Autocomplete Latency (TTFT)

Time from sending the request to \`/api/ai/complete\` to receiving the full response.
Provider: Groq \`llama-3.3-70b-versatile\`. Trigger: fixed partial function signature.

${aiTable}

---

## 3 · Git Operations (isomorphic-git, in-browser)

All git operations run entirely in the browser via isomorphic-git + LightningFS (IndexedDB).
Test repo: \`${latest.url.includes("localhost") ? "octocat/Hello-World" : "octocat/Hello-World"}\` (public, ~1 KB).

${gitTable}

---

## Run Conditions

| Field | Value |
|---|---|
| Target URL | ${latest.url} |
| Last run | ${new Date(latest.runAt).toUTCString()} |
| Machine | ${latest.machine} |
| Browser | ${latest.browser} |
| Result files | ${totalRuns} |

---

*To re-run: \`npm run bench\` — then \`npm run bench:report\` to refresh this file.*
`

  fs.writeFileSync(OUT_FILE, md)
  console.log(`✓ RESULTS.md written → ${OUT_FILE}`)
  console.log("\nHeadline numbers for resume:")
  console.log(`  WebContainer boot:  ${overallWCMedian} ms median`)
  console.log(`  AI TTFT:            ${aiMedian} ms median`)
  console.log(`  Git clone:          ${cloneMedian} ms median`)
}

generate()
