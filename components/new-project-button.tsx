"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TemplatePicker } from "@/components/template-picker"
import { Plus } from "lucide-react"

interface Template {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
}

interface Props {
  templates: Template[]
}

export function NewProjectButton({ templates }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New Project
      </Button>
      <TemplatePicker templates={templates} open={open} onOpenChange={setOpen} />
    </>
  )
}
