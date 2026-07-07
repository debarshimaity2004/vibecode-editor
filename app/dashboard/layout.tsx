import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { DashboardNav } from "@/components/dashboard-nav"
import { Terminal } from "lucide-react"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <Terminal className="h-5 w-5" />
            VibeCode
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DashboardNav user={session.user} />
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">
        {children}
      </main>
    </div>
  )
}
