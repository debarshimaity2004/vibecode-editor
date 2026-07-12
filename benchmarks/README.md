# VibeCode Editor — Performance Benchmarks

Measures three production flows against the **live Vercel deployment** using Playwright + Chromium:

1. **WebContainer cold-boot time** — per template, 10 runs each
2. **AI autocomplete latency (TTFT)** — Groq response, 15 runs
3. **Git clone & commit time** — isomorphic-git in-browser, 10 runs each

All headline figures are **medians**. Every raw run is saved in `results/` as JSON so results are fully reproducible and defensible.

---

## Prerequisites

```bash
# Install Playwright (one-time)
npx playwright install chromium
```

---

## Step 1 — Enable bench mode on Vercel

In your Vercel dashboard → **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_BENCH_MODE = true
```

Then redeploy. This gates timing instrumentation behind the flag so it never ships to real users by default.

Alternatively, to benchmark locally:

```bash
# .env.local
NEXT_PUBLIC_BENCH_MODE=true
```

Then run `npm run dev` and set `BENCH_URL=http://localhost:3000`.

---

## Step 2 — Save your login session (one-time)

```bash
npm run bench:login
```

A real browser opens. Sign in with Google or GitHub, wait until you're on the dashboard, then close the terminal prompt. Your session is saved to `benchmarks/.auth/session.json` (gitignored).

---

## Step 3 — Run the benchmarks

```bash
npm run bench
```

This takes **~30–45 minutes** for the full suite (50 WC runs + 15 AI runs + 20 Git runs). Progress is printed to the terminal. Raw results are saved to `benchmarks/results/<timestamp>.json`.

### Optional env vars

| Variable | Default | Description |
|---|---|---|
| `BENCH_URL` | `https://vibecode-editor-debarshi.vercel.app` | Target deployment URL |
| `BENCH_GIT_REPO` | `https://github.com/octocat/Hello-World.git` | Repo used for git clone/commit benchmarks |

---

## Step 4 — Generate RESULTS.md

```bash
npm run bench:report
```

Reads all JSON files in `results/`, aggregates medians + percentiles, and writes `benchmarks/RESULTS.md`.

---

## Re-running later

The benchmark script caches project URLs in `results/project-urls.json` so it doesn't recreate projects on every run. If you want a clean slate, delete that file and re-run `npm run bench`.

Raw JSON result files are cumulative — `bench:report` always aggregates **all** of them. Delete old files from `results/` if you want a fresh baseline.

---

## Output files

```
benchmarks/
  run.ts               # Playwright runner
  report.ts            # Aggregator → RESULTS.md
  RESULTS.md           # Generated summary (commit this)
  results/
    project-urls.json  # Cached playground URLs (gitignored)
    .gitkeep
    <timestamp>.json   # Raw run data (commit these — your evidence)
  .auth/
    session.json       # Saved browser session (gitignored — keep private)
```
