import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AIGBoard from "@/components/AIGBoard"

export default async function AIGPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["CEO", "AI_GENERATOR"].includes(session.user.role)) redirect("/dashboard")

  const cards = await prisma.creative.findMany({
    where: { aigStatus: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, concept: true, briefLink: true, finishedAdLink: true,
      projectType: true, aigNotes: true, aigStatus: true,
      needsRevision: true, revisionDetails: true, revisionComplete: true,
      updatedAt: true,
      batch: { select: { name: true } },
    },
  })

  const flat = cards.map((c) => ({
    ...c,
    batchName: c.batch?.name ?? null,
    batch: undefined,
    updatedAt: c.updatedAt.toISOString(),
  }))

  return (
    <div className="-m-6 p-6 bg-zinc-900 min-h-[calc(100vh-88px)]">
      <AIGBoard cards={flat} userRole={session.user.role} />
    </div>
  )
}
