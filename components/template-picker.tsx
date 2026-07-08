"use client"

import { useState, useMemo, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { createProject } from "@/app/actions/projects"
import { Search, Check } from "lucide-react"

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
}

interface Props {
  templates: Template[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = ["All", "Frontend", "Backend", "Fullstack"]

const CATEGORY_COLORS: Record<string, string> = {
  Frontend: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  Backend:  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Fullstack: "bg-violet-500/10 text-violet-400 border-violet-500/20",
}

const TEMPLATE_ICONS: Record<string, string> = {
  "react-+-vite": "⚛️",
  "vue-+-vite":   "💚",
  "express":      "🟡",
  "hono":         "🔥",
  "next-js":      "▲",
}

function getIcon(id: string) {
  return TEMPLATE_ICONS[id] ?? "📦"
}

export function TemplatePicker({ templates, open, onOpenChange }: Props) {
  const [category, setCategory] = useState("All")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return templates.filter((t) => {
      const matchCat = category === "All" || t.category === category
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
      return matchCat && matchSearch
    })
  }, [templates, category, search])

  function handleCreate() {
    if (!selected) return
    startTransition(() => createProject(selected))
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      setCategory("All")
      setSearch("")
      setSelected(null)
    }
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl">Choose a template</DialogTitle>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-1 mt-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-colors",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No templates match your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all hover:border-primary/50 hover:bg-muted/40 relative",
                    selected === t.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border"
                  )}
                >
                  {selected === t.id && (
                    <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getIcon(t.id)}</span>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border", CATEGORY_COLORS[t.category])}>
                        {t.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selected || pending}>
            {pending ? "Creating…" : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
