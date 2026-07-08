import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { PlaygroundLayout } from "@/components/playground/playground-layout"

export default async function PlaygroundPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!project) notFound()

  return (
    <PlaygroundLayout
      project={{
        id: project.id,
        name: project.name,
        files: (project.files as Record<string, string>) ?? {},
      }}
      user={session.user}
    />
  )
}
