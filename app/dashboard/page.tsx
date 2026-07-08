import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ProjectActionsMenu } from "@/components/project-actions-menu"
import { FavoriteButton } from "@/components/favorite-button"
import { NewProjectButton } from "@/components/new-project-button"
import { FolderOpen } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/")

  const [projects, templates] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
    }),
    db.template.findMany({ orderBy: { category: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewProjectButton templates={templates} />
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24 text-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first project to get started.
            </p>
          </div>
          <NewProjectButton templates={templates} />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Template</TableHead>
                <TableHead className="hidden md:table-cell">Last updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => {
                const template = templates.find((t) => t.id === project.templateId)
                return (
                  <TableRow key={project.id} className="group">
                    <TableCell className="py-0">
                      <FavoriteButton
                        projectId={project.id}
                        isFavorite={project.isFavorite}
                      />
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/playground/${project.id}`}
                        className="font-medium hover:underline underline-offset-4"
                      >
                        {project.name}
                      </Link>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {template ? (
                        <Badge variant="secondary" className="text-xs">
                          {template.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(project.updatedAt), {
                        addSuffix: true,
                      })}
                    </TableCell>

                    <TableCell className="py-0 text-right">
                      <ProjectActionsMenu
                        project={{
                          id: project.id,
                          name: project.name,
                          isFavorite: project.isFavorite,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
