#!/usr/bin/env tsx
/**
 * VibeCode Editor — Performance Benchmark Runner
 *
 * First-time setup:  npm run bench:save-session
 * Run benchmarks:    npm run bench
 * Generate report:   npm run bench:report
 *
 * Timing strategy (no app instrumentation needed):
 *   WC boot   — wall-clock from clicking Run → "Stop" button appears
 *   AI TTFT   — Playwright network interception: responseStart on /api/ai/complete
 *   Git clone — wall-clock from clicking Clone → branch indicator appears
 *   Git commit— wall-clock from clicking Commit All → loading spinner disappears
 */

import { chromium, type Page } from "playwright"
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

// ── Config ───────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.BENCH_URL      ?? "https://vibecode-editor-debarshi.vercel.app"
const GIT_REPO    = process.env.BENCH_GIT_REPO ?? "https://github.com/octocat/Hello-World.git"
const AUTH_FILE   = path.resolve(__dirname, ".auth", "session.json")
const RESULTS_DIR = path.resolve(__dirname, "results")

const TEMPLATES = ["React + Vite", "Vue + Vite", "Express", "Next.js"]
const WC_RUNS   = 10   // per template (50 total)
const AI_RUNS   = 15   // total runs
const GIT_RUNS  = 10   // per operation

const LONG_TIMEOUT  = 240_000   // 4 min  (WC boot, git clone)
const SHORT_TIMEOUT = 30_000    // 30 s   (AI response)

// ── Types ────────────────────────────────────────────────────────────────────

interface WCEntry  { template: string; run: number; durationMs: number; ts: number }
interface AIEntry  { run: number; ttftMs: number; ts: number }
interface GitEntry { op: "clone" | "commit"; run: number; durationMs: number; ts: number }

interface Results {
  runAt: string; url: string; machine: string; browser: string
  wc: WCEntry[]; ai: AIEntry[]; git: GitEntry[]
}

// ── Auth / login ──────────────────────────────────────────────────────────────

export async function loginAndSave() {
  const browser = await chromium.launch({ headless: false, channel: "chrome" })
  const context = await browser.newContext()
  const page    = await context.newPage()
  await page.goto(BASE_URL)
  await page.waitForURL("**/dashboard", { timeout: 300_000 })
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await context.storageState({ path: AUTH_FILE })
  console.log(`✓ Session saved → ${AUTH_FILE}`)
  await browser.close()
}

// ── Project creation (setup) ──────────────────────────────────────────────────

async function createProjectForTemplate(page: Page, templateName: string): Promise<string> {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1500)
  await page.getByRole("button", { name: "New Project" }).first().click()
  await page.waitForSelector("text=Create Project", { timeout: 10_000 })
  await page.locator("button").filter({
    has: page.locator(`p:text-is("${templateName}")`),
  }).click({ force: true })
  await page.waitForTimeout(400)
  await page.getByRole("button", { name: "Create Project" }).click()
  await page.waitForURL("**/playground/**", { timeout: 30_000 })
  return page.url()
}

async function setupProjects(page: Page): Promise<Record<string, string>> {
  const cacheFile = path.join(RESULTS_DIR, "project-urls.json")
  if (fs.existsSync(cacheFile)) {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8")) as Record<string, string>
    console.log("  ↩ Reusing cached project URLs (delete results/project-urls.json to recreate)")
    return cached
  }
  console.log("\n  Creating one project per template…")
  const urls: Record<string, string> = {}
  for (const template of TEMPLATES) {
    console.log(`    Creating: ${template}`)
    urls[template] = await createProjectForTemplate(page, template)
    console.log(`    → ${urls[template]}`)
  }
  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  fs.writeFileSync(cacheFile, JSON.stringify(urls, null, 2))
  return urls
}

// ── Benchmark 1: WebContainer boot ───────────────────────────────────────────
// Measures: click Run → "Stop" button appears (server-ready fired, status = "running")

async function runWCBench(page: Page, projectUrls: Record<string, string>): Promise<WCEntry[]> {
  const results: WCEntry[] = []

  for (const template of TEMPLATES) {
    const url = projectUrls[template]
    if (!url) { console.warn(`  No URL for ${template}, skipping`); continue }
    console.log(`\n  Template: ${template}`)

    for (let run = 1; run <= WC_RUNS; run++) {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(2000)

      // Wait for the Run button to be ready
      await page.waitForSelector('button:has-text("Run")', { timeout: 15_000 })

      const t0 = Date.now()
      await page.getByRole("button", { name: /^Run$/i }).click()

      // Server-ready is signalled by the Run button changing to "Stop"
      await page.waitForSelector('button:has-text("Stop")', { timeout: LONG_TIMEOUT })
      const durationMs = Date.now() - t0

      results.push({ template, run, durationMs, ts: Date.now() })
      console.log(`    run ${String(run).padStart(2)}/${WC_RUNS}: ${durationMs} ms`)

      // Stop before next run
      await page.getByRole("button", { name: /^Stop$/i }).click().catch(() => {})
      await page.waitForTimeout(500)
    }
  }
  return results
}

// ── Benchmark 2: AI autocomplete TTFT ────────────────────────────────────────
// Fires /api/ai/complete directly from the page context (same-origin fetch,
// so cookies are included and no CORS preflight needed). Playwright intercepts
// the response to read responseStart timing — bypasses Monaco entirely.

async function runAIBench(page: Page, anyProjectUrl: string): Promise<AIEntry[]> {
  const results: AIEntry[] = []

  await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1500)

  // Payload matching the route's expected shape: { prefix, suffix, language }
  const PAYLOAD = JSON.stringify({
    prefix: "function calculateTotal(items) {\n  ",
    suffix: "\n}",
    language: "typescript",
  })

  console.log(`\n  Direct fetch to /api/ai/complete (${AI_RUNS} runs)`)

  for (let run = 1; run <= AI_RUNS; run++) {
    // Register response listener BEFORE the fetch fires
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/api/ai/complete"),
      { timeout: SHORT_TIMEOUT }
    )

    // Fire and forget inside the page (don't await) so Playwright can intercept
    void page.evaluate((body: string) => {
      fetch("/api/ai/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      })
    }, PAYLOAD)

    try {
      const response = await responsePromise
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ttftMs = Math.round((response as any).timing().responseStart)
      results.push({ run, ttftMs, ts: Date.now() })
      console.log(`    run ${String(run).padStart(2)}/${AI_RUNS}: ${ttftMs} ms`)
    } catch {
      console.warn(`    run ${run}: timed out — skipping`)
    }

    await page.waitForTimeout(400)
  }
  return results
}

// ── Benchmark 3: Git operations ───────────────────────────────────────────────
// Clone: click Clone → branch name appears in the git panel header
// Commit: (after clone) fill msg → click Commit All → spinner disappears

async function runGitBench(page: Page, anyProjectUrl: string): Promise<GitEntry[]> {
  const results: GitEntry[] = []

  // ── Clone (GIT_RUNS runs) ──────────────────────────────────────────────────
  console.log("\n  Git op: clone")

  for (let run = 1; run <= GIT_RUNS; run++) {
    // Fresh page load resets LightningFS
    await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)

    // Switch to Git tab
    await page.getByRole("button", { name: /^Git/i }).click()
    await page.waitForTimeout(800)

    // Fill repo URL
    await page.getByPlaceholder(/github\.com\/user\/repo/i).fill(GIT_REPO)
    await page.waitForTimeout(200)

    const t0 = Date.now()
    // Two "Clone" buttons exist: the sub-tab and the shadcn action button.
    // Target the action button specifically via its data-slot attribute.
    await page.locator('[data-slot="button"]').filter({ hasText: /^Clone$/ }).click()

    // Clone success: branch name appears (initialized state shows branch + RefreshCw)
    await page.waitForSelector('[title="Refresh status"]', { timeout: LONG_TIMEOUT })
    const durationMs = Date.now() - t0

    results.push({ op: "clone", run, durationMs, ts: Date.now() })
    console.log(`    run ${String(run).padStart(2)}/${GIT_RUNS}: ${durationMs} ms`)
  }

  // ── Commit (GIT_RUNS runs — clone first, then commit) ─────────────────────
  console.log("\n  Git op: commit")

  for (let run = 1; run <= GIT_RUNS; run++) {
    await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)

    await page.getByRole("button", { name: /^Git/i }).click()
    await page.waitForTimeout(800)

    // Clone to get an initialized repo
    await page.getByPlaceholder(/github\.com\/user\/repo/i).fill(GIT_REPO)
    await page.locator('[data-slot="button"]').filter({ hasText: /^Clone$/ }).click()
    await page.waitForSelector('[title="Refresh status"]', { timeout: LONG_TIMEOUT })
    await page.waitForTimeout(500)

    // Fill commit message
    await page.getByPlaceholder(/Commit message/i).fill(`bench commit run ${run}`)

    const t0 = Date.now()
    await page.getByRole("button", { name: /Commit All/i }).click()

    // Commit done: "Commit All" button re-enables (loading spinner disappears)
    await page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")]
          .find((b) => b.textContent?.includes("Commit All"))
        return btn && !btn.disabled
      },
      { timeout: 30_000 }
    )
    const durationMs = Date.now() - t0

    results.push({ op: "commit", run, durationMs, ts: Date.now() })
    console.log(`    run ${String(run).padStart(2)}/${GIT_RUNS}: ${durationMs} ms`)
  }

  return results
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--login")) { await loginAndSave(); return }

  if (!fs.existsSync(AUTH_FILE)) {
    console.error("No saved session. Run: npm run bench:save-session")
    process.exit(1)
  }

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`  VibeCode Benchmark Runner`)
  console.log(`  Target: ${BASE_URL}`)
  console.log(`═══════════════════════════════════════════════════════\n`)

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-features=SharedArrayBuffer",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  // ── Setup ─────────────────────────────────────────────────────────────────
  console.log("── Setup: project URLs ─────────────────────────────────")
  const projectUrls = await setupProjects(page)
  const anyProjectUrl = Object.values(projectUrls)[0]!
  const runAt = new Date().toISOString()

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const outFile = path.join(RESULTS_DIR, `${runAt.replace(/[:.]/g, "-")}.json`)
  const machine = `${os.type()} ${os.arch()} / ${os.cpus()[0]?.model ?? "unknown"}`

  const save = (wc: WCEntry[], ai: AIEntry[], git: GitEntry[]) => {
    const results: Results = { runAt, url: BASE_URL, machine, browser: "Playwright Chromium (headless)", wc, ai, git }
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2))
  }

  // ── Benchmark 1 ───────────────────────────────────────────────────────────
  console.log("\n── Benchmark 1: WebContainer boot ─────────────────────")
  const wcResults = await runWCBench(page, projectUrls)
  save(wcResults, [], [])   // checkpoint after WC

  // ── Benchmark 2 ───────────────────────────────────────────────────────────
  console.log("\n── Benchmark 2: AI autocomplete latency ───────────────")
  const aiResults = await runAIBench(page, anyProjectUrl)
  save(wcResults, aiResults, [])   // checkpoint after AI

  // ── Benchmark 3 ───────────────────────────────────────────────────────────
  console.log("\n── Benchmark 3: Git operations ─────────────────────────")
  const gitResults = await runGitBench(page, anyProjectUrl)

  await browser.close()

  // ── Final save ────────────────────────────────────────────────────────────
  save(wcResults, aiResults, gitResults)

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  Summary")
  console.log("═══════════════════════════════════════════════════════\n")

  console.log("WebContainer boot (ms):")
  for (const t of TEMPLATES) {
    const times = wcResults.filter((r) => r.template === t).map((r) => r.durationMs)
    if (times.length) console.log(`  ${t.padEnd(14)}: median ${median(times)} ms  [${Math.min(...times)}–${Math.max(...times)}]`)
  }

  const aiTimes = aiResults.map((r) => r.ttftMs)
  if (aiTimes.length)
    console.log(`\nAI TTFT (ms): median ${median(aiTimes)} ms  [${Math.min(...aiTimes)}–${Math.max(...aiTimes)}]  (${aiTimes.length} runs)`)

  const cloneTimes  = gitResults.filter((r) => r.op === "clone").map((r) => r.durationMs)
  const commitTimes = gitResults.filter((r) => r.op === "commit").map((r) => r.durationMs)
  console.log("\nGit (ms):")
  if (cloneTimes.length)  console.log(`  clone : median ${median(cloneTimes)} ms  [${Math.min(...cloneTimes)}–${Math.max(...cloneTimes)}]`)
  if (commitTimes.length) console.log(`  commit: median ${median(commitTimes)} ms  [${Math.min(...commitTimes)}–${Math.max(...commitTimes)}]`)

  console.log(`\n✓ Raw results → ${outFile}`)
  console.log("  Run 'npm run bench:report' to generate RESULTS.md\n")
}

main().catch((err) => { console.error(err); process.exit(1) })
