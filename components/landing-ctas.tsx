"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SignInDialog } from "@/components/sign-in-dialog"
import { ArrowRight } from "lucide-react"

interface Props {
  variant?: "outline" | "default"
  size?: "sm" | "lg"
  label?: string
}

export function SignInButton({ variant = "outline", size = "sm", label }: Props) {
  const [open, setOpen] = useState(false)

  const text = label ?? (size === "lg" ? "Get Started for Free" : "Sign In")

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {text}
        {size === "lg" && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
      <SignInDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
