#!/usr/bin/env tsx
/**
 * VibeCode Editor — Performance Benchmark Runner
 *
 * First-time setup:  npm run bench:login
 * Run benchmarks:    npm run bench
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

const TEMPLATES = ["React + Vite", "Vue + Vite", "Express", "Hono", "Next.js"]
const WC_RUNS   = 10   // per template (50 total)
const AI_RUNS   = 15   // total runs
const GIT_RUNS  = 10   // per operation

const LONG_TIMEOUT  = 180_000   // 3 min  (WC boot, git clone)
const SHORT_TIMEOUT = 30_000    // 30 s   (AI response)

// ── Types ────────────────────────────────────────────────────────────────────

interface WCEntry  { template: string; run: number; durationMs: number; ts: number }
interface AIEntry  { run: number; ttftMs: number; ts: number }
interface GitEntry { op: "clone" | "commit"; run: number; durationMs: number; ts: number }

interface Results {
  runAt: string
  url: string
  machine: string
  browser: string
  wc: WCEntry[]
  ai: AIEntry[]
  git: GitEntry[]
}

// ── Auth / login flow ────────────────────────────────────────────────────────

export async function loginAndSave() {
  console.log("\n── Auth setup ──────────────────────────────────────────────")
  console.log("A browser window will open. Sign in with Google or GitHub,")
  console.log("then navigate to the dashboard. The session will be saved automatically.\n")

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page    = await context.newPage()

  await page.goto(BASE_URL)

  // Wait until user lands on /dashboard (they signed in)
  await page.waitForURL("**/dashboard", { timeout: 300_000 })
  console.log("✓ Signed in. Saving session…")

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  await context.storageState({ path: AUTH_FILE })
  console.log(`✓ Session saved → ${AUTH_FILE}`)
  await browser.close()
}

// ── Project creation helper ───────────────────────────────────────────────────

async function createProjectForTemplate(page: Page, templateName: string): Promise<string> {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1000)

  // Open template picker
  await page.getByRole("button", { name: "New Project" }).first().click()
  await page.waitForSelector("text=Create Project", { timeout: 10_000 })

  // Select template by name
  await page.getByText(templateName, { exact: true }).first().click()
  await page.waitForTimeout(300)

  // Create
  await page.getByRole("button", { name: "Create Project" }).click()

  // Wait for redirect to playground
  await page.waitForURL("**/playground/**", { timeout: 30_000 })
  return page.url()
}

// ── Setup: one project URL per template ──────────────────────────────────────

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

// ── WC Benchmark ─────────────────────────────────────────────────────────────

async function runWCBench(page: Page, projectUrls: Record<string, string>): Promise<WCEntry[]> {
  const results: WCEntry[] = []

  for (const template of TEMPLATES) {
    const url = projectUrls[template]
    if (!url) { console.warn(`  No URL for ${template}, skipping`); continue }
    console.log(`\n  Template: ${template}`)

    for (let run = 1; run <= WC_RUNS; run++) {
      // Hard reload → fresh singleton + fresh __BENCH_WC__ array
      await page.goto(url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(1500)

      const countBefore = await page.evaluate(
        () => Array.isArray((window as any).__BENCH_WC__) ? (window as any).__BENCH_WC__.length : 0
      )

      // Click Run
      await page.getByRole("button", { name: /^Run$/i }).click()

      // Wait for the bench entry to appear (server-ready fired)
      const handle = await page.waitForFunction(
        (n: number) => {
          const arr = (window as any).__BENCH_WC__
          return Array.isArray(arr) && arr.length > n ? arr[arr.length - 1] : null
        },
        countBefore,
        { timeout: LONG_TIMEOUT }
      )
      const val = await handle.jsonValue() as { durationMs: number; ts: number }
      results.push({ template, run, durationMs: val.durationMs, ts: val.ts })
      console.log(`    run ${String(run).padStart(2)}/${WC_RUNS}: ${val.durationMs} ms`)

      // Stop before next run
      await page.getByRole("button", { name: /^Stop$/i }).click().catch(() => {})
      await page.waitForTimeout(500)
    }
  }
  return results
}

// ── AI Benchmark ─────────────────────────────────────────────────────────────

async function runAIBench(page: Page, anyProjectUrl: string): Promise<AIEntry[]> {
  const results: AIEntry[] = []

  await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
  await page.waitForTimeout(2000)

  // Enable inline AI (⚡ Inline toggle button)
  const inlineBtn = page.getByRole("button", { name: /Inline/i })
  await inlineBtn.click()
  await page.waitForTimeout(500)

  // Click into Monaco editor
  const editor = page.locator(".monaco-editor").first()
  await editor.click()
  await page.waitForTimeout(500)

  // Fixed trigger snippet — same every run for comparability
  const TRIGGER = "function calculateTotal(items"

  console.log(`\n  AI trigger snippet: "${TRIGGER}"`)

  for (let run = 1; run <= AI_RUNS; run++) {
    // Clear editor content
    await page.keyboard.press("Control+a")
    await page.keyboard.press("Delete")
    await page.waitForTimeout(300)

    const countBefore = await page.evaluate(
      () => Array.isArray((window as any).__BENCH_AI__) ? (window as any).__BENCH_AI__.length : 0
    )

    // Type trigger to fire inline suggestion
    await page.keyboard.type(TRIGGER, { delay: 40 })

    // Wait for Groq to return and bench entry to appear
    try {
      const handle = await page.waitForFunction(
        (n: number) => {
          const arr = (window as any).__BENCH_AI__
          return Array.isArray(arr) && arr.length > n ? arr[arr.length - 1] : null
        },
        countBefore,
        { timeout: SHORT_TIMEOUT }
      )
      const val = await handle.jsonValue() as { ttftMs: number; ts: number }
      results.push({ run, ttftMs: val.ttftMs, ts: val.ts })
      console.log(`    run ${String(run).padStart(2)}/${AI_RUNS}: ${val.ttftMs} ms`)
    } catch {
      console.warn(`    run ${run}: timed out — skipping`)
    }

    await page.keyboard.press("Escape")
    await page.waitForTimeout(600)
  }
  return results
}

// ── Git Benchmark ─────────────────────────────────────────────────────────────

async function runGitBench(page: Page, anyProjectUrl: string): Promise<GitEntry[]> {
  const results: GitEntry[] = []

  // ── Clone (10 runs) ────────────────────────────────────────
  console.log("\n  Git op: clone")
  for (let run = 1; run <= GIT_RUNS; run++) {
    // Fresh page load resets LightningFS state
    await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)

    // Switch to Git tab
    await page.getByRole("button", { name: /^Git/i }).click()
    await page.waitForTimeout(800)

    // Fill repo URL
    await page.getByPlaceholder(/github\.com\/user\/repo/i).fill(GIT_REPO)

    const countBefore = await page.evaluate(() => {
      const arr = (window as any).__BENCH_GIT__
      return Array.isArray(arr) ? arr.filter((e: any) => e.op === "clone").length : 0
    })

    await page.getByRole("button", { name: /^Clone$/i }).click()

    const handle = await page.waitForFunction(
      (n: number) => {
        const arr = (window as any).__BENCH_GIT__
        if (!Array.isArray(arr)) return null
        const clones = arr.filter((e: any) => e.op === "clone")
        return clones.length > n ? clones[clones.length - 1] : null
      },
      countBefore,
      { timeout: LONG_TIMEOUT }
    )
    const val = await handle.jsonValue() as { durationMs: number; ts: number }
    results.push({ op: "clone", run, durationMs: val.durationMs, ts: val.ts })
    console.log(`    run ${String(run).padStart(2)}/${GIT_RUNS}: ${val.durationMs} ms`)
  }

  // ── Commit (10 runs — requires clone first each time) ──────
  console.log("\n  Git op: commit")
  for (let run = 1; run <= GIT_RUNS; run++) {
    await page.goto(anyProjectUrl, { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(2000)

    await page.getByRole("button", { name: /^Git/i }).click()
    await page.waitForTimeout(800)

    // Clone first so we have an initialized repo
    await page.getByPlaceholder(/github\.com\/user\/repo/i).fill(GIT_REPO)
    await page.getByRole("button", { name: /^Clone$/i }).click()
    // Wait for clone to complete (branch indicator appears)
    await page.waitForFunction(
      () => !!(window as any).__BENCH_GIT__?.some((e: any) => e.op === "clone"),
      { timeout: LONG_TIMEOUT }
    )
    await page.waitForTimeout(800)

    // Now fill commit message and commit
    const msgArea = page.getByPlaceholder(/Commit message/i)
    await msgArea.fill(`bench run ${run}`)

    const countBefore = await page.evaluate(() => {
      const arr = (window as any).__BENCH_GIT__
      return Array.isArray(arr) ? arr.filter((e: any) => e.op === "commit").length : 0
    })

    await page.getByRole("button", { name: /Commit All/i }).click()

    try {
      const handle = await page.waitForFunction(
        (n: number) => {
          const arr = (window as any).__BENCH_GIT__
          if (!Array.isArray(arr)) return null
          const commits = arr.filter((e: any) => e.op === "commit")
          return commits.length > n ? commits[commits.length - 1] : null
        },
        countBefore,
        { timeout: 30_000 }
      )
      const val = await handle.jsonValue() as { durationMs: number; ts: number }
      results.push({ op: "commit", run, durationMs: val.durationMs, ts: val.ts })
      console.log(`    run ${String(run).padStart(2)}/${GIT_RUNS}: ${val.durationMs} ms`)
    } catch {
      console.warn(`    run ${run}: timed out — skipping`)
    }
  }

  return results
}

// ── Stats helper ─────────────────────────────────────────────────────────────

function median(arr: number[]): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? Math.round((s[m - 1] + s[m]) / 2) : s[m]
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // First-time login
  if (process.argv.includes("--login")) {
    await loginAndSave()
    return
  }

  if (!fs.existsSync(AUTH_FILE)) {
    console.error("No saved session found. Run: npm run bench:login")
    process.exit(1)
  }

  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`  VibeCode Benchmark Runner`)
  console.log(`  Target: ${BASE_URL}`)
  console.log(`═══════════════════════════════════════════════════════\n`)

  const browser = await chromium.launch({
    headless: true,
    args: ["--enable-features=SharedArrayBuffer"],
  })
  const context = await browser.newContext({
    storageState: AUTH_FILE,
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  // ── Setup ────────────────────────────────────────────────
  console.log("── Setup: project URLs ─────────────────────────────────")
  const projectUrls = await setupProjects(page)

  const anyProjectUrl = Object.values(projectUrls)[0]!
  const runAt = new Date().toISOString()

  // ── Benchmark 1: WebContainer boot ───────────────────────
  console.log("\n── Benchmark 1: WebContainer boot ─────────────────────")
  const wcResults = await runWCBench(page, projectUrls)

  // ── Benchmark 2: AI autocomplete TTFT ───────────────────
  console.log("\n── Benchmark 2: AI autocomplete latency ───────────────")
  const aiResults = await runAIBench(page, anyProjectUrl)

  // ── Benchmark 3: Git operations ──────────────────────────
  console.log("\n── Benchmark 3: Git operations ─────────────────────────")
  const gitResults = await runGitBench(page, anyProjectUrl)

  await browser.close()

  // ── Save raw results ─────────────────────────────────────
  const results: Results = {
    runAt,
    url: BASE_URL,
    machine: `${os.type()} ${os.arch()} / ${os.cpus()[0]?.model ?? "unknown"}`,
    browser: "Playwright Chromium",
    wc: wcResults,
    ai: aiResults,
    git: gitResults,
  }

  fs.mkdirSync(RESULTS_DIR, { recursive: true })
  const outFile = path.join(RESULTS_DIR, `${runAt.replace(/[:.]/g, "-")}.json`)
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2))

  // ── Print summary ─────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════")
  console.log("  Summary")
  console.log("═══════════════════════════════════════════════════════\n")

  console.log("WebContainer boot (ms):")
  for (const template of TEMPLATES) {
    const runs = wcResults.filter((r) => r.template === template).map((r) => r.durationMs)
    if (runs.length) console.log(`  ${template.padEnd(14)}: median ${median(runs)} ms  [${Math.min(...runs)}–${Math.max(...runs)}]`)
  }

  const aiTimes = aiResults.map((r) => r.ttftMs)
  if (aiTimes.length) {
    console.log(`\nAI TTFT (ms): median ${median(aiTimes)} ms  [${Math.min(...aiTimes)}–${Math.max(...aiTimes)}]  (${aiTimes.length} runs)`)
  }

  const cloneTimes  = gitResults.filter((r) => r.op === "clone").map((r) => r.durationMs)
  const commitTimes = gitResults.filter((r) => r.op === "commit").map((r) => r.durationMs)
  console.log("\nGit operations (ms):")
  if (cloneTimes.length)  console.log(`  clone :  median ${median(cloneTimes)} ms   [${Math.min(...cloneTimes)}–${Math.max(...cloneTimes)}]`)
  if (commitTimes.length) console.log(`  commit:  median ${median(commitTimes)} ms   [${Math.min(...commitTimes)}–${Math.max(...commitTimes)}]`)

  console.log(`\n✓ Raw results → ${outFile}`)
  console.log("  Run 'npm run bench:report' to regenerate RESULTS.md\n")
}

main().catch((err) => { console.error(err); process.exit(1) })
