import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  ArrowRight,
  Code2,
  Terminal,
  Sparkles,
  Layers,
  ExternalLink,
} from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Terminal className="h-5 w-5" />
            VibeCode
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/api/auth/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-4 pt-28 pb-16">
        <Badge variant="secondary" className="mb-6 px-3 py-1 text-xs">
          Open Source · AI-Powered · Browser-Native
        </Badge>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight max-w-3xl mb-6 leading-tight">
          Code. Run. Ship.
          <br />
          <span className="text-muted-foreground">All in the Browser.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mb-10">
          A full-featured web IDE with Monaco Editor, WebContainers, an
          integrated terminal, and Groq-powered AI suggestions — no local setup
          required.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Start Coding <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/debarshimaity2004/vibecode-editor"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      {/* Code preview */}
      <div className="mx-auto w-full max-w-3xl px-4 mb-24">
        <div className="rounded-xl border bg-card shadow-xl overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
            <span className="h-3 w-3 rounded-full bg-green-400/70" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">
              App.tsx
            </span>
          </div>
          {/* Code */}
          <pre className="p-6 text-sm font-mono leading-7 overflow-x-auto text-left">
            <code>
              <span className="text-muted-foreground">{"// ✦ AI suggestion accepted"}</span>
              {"\n"}
              <span className="text-primary/70">{"import"}</span>
              {" { useState } "}
              <span className="text-primary/70">{"from"}</span>
              <span className="text-emerald-500 dark:text-emerald-400">{" 'react'"}</span>
              {"\n\n"}
              <span className="text-primary/70">{"export default function"}</span>
              <span className="text-sky-500 dark:text-sky-400">{" Counter"}</span>
              {"() {\n"}
              {"  "}
              <span className="text-primary/70">{"const"}</span>
              {" [count, setCount] = useState("}
              <span className="text-orange-400">{"0"}</span>
              {")\n\n"}
              {"  "}
              <span className="text-primary/70">{"return"}</span>
              {" (\n"}
              {"    "}
              <span className="text-sky-500 dark:text-sky-400">{"<div"}</span>
              <span className="text-primary/80">{' className'}</span>
              <span className="text-emerald-500 dark:text-emerald-400">{"=\"flex gap-4 items-center\""}</span>
              <span className="text-sky-500 dark:text-sky-400">{">"}</span>
              {"\n"}
              {"      "}
              <span className="text-sky-500 dark:text-sky-400">{"<button"}</span>
              {" onClick={() => setCount(c => c - 1)}"}
              <span className="text-sky-500 dark:text-sky-400">{">"}</span>
              {" − "}
              <span className="text-sky-500 dark:text-sky-400">{"</button>"}</span>
              {"\n"}
              {"      "}
              <span className="text-sky-500 dark:text-sky-400">{"<span>"}</span>
              {"{count}"}
              <span className="text-sky-500 dark:text-sky-400">{"</span>"}</span>
              {"\n"}
              {"      "}
              <span className="text-sky-500 dark:text-sky-400">{"<button"}</span>
              {" onClick={() => setCount(c => c + 1)}"}
              <span className="text-sky-500 dark:text-sky-400">{">"}</span>
              {" + "}
              <span className="text-sky-500 dark:text-sky-400">{"</button>"}</span>
              {"\n"}
              {"    "}
              <span className="text-sky-500 dark:text-sky-400">{"</div>"}</span>
              {"\n"}
              {"  )\n}"}
            </code>
          </pre>
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 w-full">
        <h2 className="text-center text-3xl font-bold mb-12">
          Everything you need to code in the browser
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 flex flex-col gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-4 pb-24 w-full">
        <div className="rounded-2xl border bg-muted/50 p-10 flex flex-col items-center text-center gap-6">
          <h2 className="text-3xl font-bold">Ready to start building?</h2>
          <p className="text-muted-foreground max-w-md">
            Sign in with Google or GitHub and spin up your first playground in
            seconds.
          </p>
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Get Started for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-sm text-muted-foreground">
          <span>VibeCode Editor</span>
          <a
            href="https://github.com/debarshimaity2004/vibecode-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: Code2,
    title: "Monaco Editor",
    description:
      "The same editor that powers VS Code. Syntax highlighting, IntelliSense, and key bindings out of the box.",
  },
  {
    icon: Terminal,
    title: "WebContainers",
    description:
      "Run Node.js directly in the browser. npm install, npm run dev — all without a server.",
  },
  {
    icon: Sparkles,
    title: "AI Autocomplete",
    description:
      "Inline code suggestions powered by Groq. Fast, free for users, and always on in production.",
  },
  {
    icon: Layers,
    title: "Project Templates",
    description:
      "Bootstrap with React, Vue, Express, Hono, or Next.js. Pick a template and start coding immediately.",
  },
]
