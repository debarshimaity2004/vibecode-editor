"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { toggleFavorite } from "@/app/actions/projects"
import { cn } from "@/lib/utils"

interface Props {
  projectId: string
  isFavorite: boolean
}

export function FavoriteButton({ projectId, isFavorite }: Props) {
  const [, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => startTransition(() => toggleFavorite(projectId, isFavorite))}
    >
      <Star
        className={cn(
          "h-4 w-4",
          isFavorite
            ? "fill-yellow-400 text-yellow-400"
            : "text-muted-foreground"
        )}
      />
      <span className="sr-only">{isFavorite ? "Unfavorite" : "Favorite"}</span>
    </Button>
  )
}
