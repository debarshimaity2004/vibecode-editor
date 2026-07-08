"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { db } from "@/lib/db"

async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")
  return session.user.id
}

export async function createProject(templateId?: string) {
  const userId = await requireUser()

  let files = {}
  let name = "Untitled Project"

  if (templateId) {
    const template = await db.template.findUnique({ where: { id: templateId } })
    if (template) {
      files = template.files as object
      name = `My ${template.name} App`
    }
  }

  const project = await db.project.create({
    data: { name, userId, templateId: templateId ?? null, files },
  })

  revalidatePath("/dashboard")
  redirect(`/playground/${project.id}`)
}

export async function renameProject(id: string, name: string) {
  const userId = await requireUser()
  const trimmed = name.trim()
  if (!trimmed) return

  await db.project.updateMany({
    where: { id, userId },
    data: { name: trimmed },
  })

  revalidatePath("/dashboard")
}

export async function duplicateProject(id: string) {
  const userId = await requireUser()

  const source = await db.project.findFirst({ where: { id, userId } })
  if (!source) return

  await db.project.create({
    data: {
      name: `${source.name} (copy)`,
      userId,
      templateId: source.templateId,
      files: source.files ?? {},
      isFavorite: false,
    },
  })

  revalidatePath("/dashboard")
}

export async function toggleFavorite(id: string, current: boolean) {
  const userId = await requireUser()

  await db.project.updateMany({
    where: { id, userId },
    data: { isFavorite: !current },
  })

  revalidatePath("/dashboard")
}

export async function deleteProject(id: string) {
  const userId = await requireUser()

  await db.project.deleteMany({ where: { id, userId } })
  revalidatePath("/dashboard")
}
