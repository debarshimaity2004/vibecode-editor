# VibeCode Editor

An AI-powered web IDE built in the browser — no local setup required. Write, run, and get intelligent code suggestions entirely in-browser using Monaco Editor, WebContainers, and Groq-powered AI.

## What it does (planned)

- **Authentication** — Sign in with Google or GitHub
- **Dashboard** — Manage your coding playgrounds (create, rename, duplicate, delete, favorite)
- **Template picker** — Bootstrap projects from React, Vue, Express, Hono, Next.js, Angular templates
- **Playground** — Full in-browser IDE:
  - Monaco Editor with syntax highlighting and key bindings
  - File explorer (create / rename / delete files & folders)
  - WebContainer — runs your app entirely in the browser
  - Integrated terminal (xterm.js) — run `npm install`, `npm run dev`, etc.
  - Live preview iframe
  - AI inline autocomplete + chat assistant powered by Groq
- **Light / dark mode**

## Current state

**Phases 1–4 complete.**

- Next.js 16 + React 19 + TypeScript project initialized
- shadcn/ui component library installed (55 components, radix-nova style)
- Tailwind CSS v4 configured
- MongoDB + Prisma ORM 5 wired up — all collections live on Atlas (`User`, `Account`, `Session`, `VerificationToken`, `Project`, `Template`)
- NextAuth.js v5 with Google + GitHub OAuth — sign-in dialog on landing page, JWT session strategy
- Protected routes via `proxy.ts` (`/dashboard`, `/playground`)
- Cross-Origin-Isolation headers set (required for WebContainers)
- Landing page with hero, feature grid, CTA banner
- Dark mode (default) + light mode toggle via `next-themes`
- Dashboard with projects table, empty state, user avatar dropdown
- Full project CRUD — create, rename, duplicate, favorite, delete (all scoped to the signed-in user)
- Per-row actions menu with rename dialog and delete confirmation
- Template system with 5 starters: React + Vite, Vue + Vite, Express, Hono, Next.js
- Template picker modal with category filter (Frontend / Backend / Fullstack) and search
- Seed script (`npm run seed`) to populate templates into MongoDB
- New projects are bootstrapped with the selected template's starter files
- Playground placeholder page at `/playground/[id]` (full IDE coming in Phase 5)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, shadcn/ui, Tailwind CSS v4 |
| Icons | Lucide React |
| Database | MongoDB via Prisma ORM 5 |
| Auth | NextAuth.js v5 — Google + GitHub OAuth |
| Theme | next-themes |
| Editor | Monaco Editor (planned) |
| Runtime | WebContainers API (planned) |
| Terminal | xterm.js (planned) |
| AI | Groq API — Llama 3 / DeepSeek (planned) |

## Implementation roadmap

- [x] Phase 1 — Auth & DB schema (NextAuth v5, Prisma models, protected routes)
- [x] Phase 2 — Landing page + dark mode
- [x] Phase 3 — Dashboard (project table, CRUD, favorites)
- [x] Phase 4 — Template system (seed data, picker modal, project bootstrapping)
- [ ] Phase 5 — Playground layout (resizable 3-panel layout)
- [ ] Phase 6 — File explorer
- [ ] Phase 7 — Monaco editor + key bindings
- [ ] Phase 8 — WebContainer integration + live preview
- [ ] Phase 9 — Terminal (xterm.js + WebContainer shell)
- [ ] Phase 10 — AI features (Groq autocomplete + chat assistant)
- [ ] Phase 11 — Deployment (Render + MongoDB Atlas)

## Getting started

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.local.example` to `.env.local` and fill in:

```
DATABASE_URL=mongodb+srv://...
NEXTAUTH_SECRET=...           # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GROQ_API_KEY=gsk_...          # free at console.groq.com
```

After filling in `DATABASE_URL`, push the schema and seed templates:

```bash
npx prisma db push
npm run seed
```

## Deployment

Target: **Render** (web service) + **MongoDB Atlas** (free M0 cluster).

- Build command: `npm install && npx prisma generate && npm run build`
- Start command: `npm run start`
- Add all environment variables in the Render dashboard

> **Note:** WebContainers require `Cross-Origin-Isolation` headers (`COOP: same-origin` + `COEP: require-corp`), already configured in `next.config.ts`.
