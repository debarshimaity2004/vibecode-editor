#!/usr/bin/env tsx
/**
 * Saves a NextAuth session cookie to .auth/session.json so the benchmark
 * runner can use it without going through OAuth.
 *
 * Usage: npm run bench:save-session
 */

import * as readline from "readline"
import * as fs from "fs"
import * as path from "path"

const AUTH_FILE = path.resolve(__dirname, ".auth", "session.json")
const DOMAIN    = (process.env.BENCH_URL ?? "https://vibecode-editor-debarshi.vercel.app")
  .replace("https://", "")
  .replace("http://", "")
  .replace(/\/$/, "")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log(`
── How to get your session cookie ─────────────────────────────
1. Open ${DOMAIN} in your normal Chrome browser
2. Sign in if you haven't already
3. Press F12 → Application tab → Cookies → click the domain
4. Find the cookie named: __Secure-authjs.session-token
5. Double-click its Value column and copy the full value
────────────────────────────────────────────────────────────────
`)

rl.question("Paste the cookie value here and press Enter:\n> ", (value) => {
  const trimmed = value.trim()
  if (!trimmed) { console.error("No value entered."); process.exit(1) }

  const session = {
    cookies: [
      {
        name: "__Secure-authjs.session-token",
        value: trimmed,
        domain: DOMAIN,
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
    origins: [],
  }

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
  fs.writeFileSync(AUTH_FILE, JSON.stringify(session, null, 2))
  console.log(`\n✓ Session saved → ${AUTH_FILE}`)
  console.log("  You can now run: npm run bench\n")
  rl.close()
})
