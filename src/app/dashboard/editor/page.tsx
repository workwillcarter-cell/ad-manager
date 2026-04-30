import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import EditorBoard from "@/components/EditorBoard"

export default async function EditorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["CEO", "EDITOR"].includes(session.user.role)) redirect("/dashboard")

  const cards = await prisma.creative.findMany({
    where: { editorStatus: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, concept: true, briefLink: true,
      editorDriveLink: true, editorNotes: true, editorStatus: true,
      editorNeedsRevision: true, editorRevisionDetails: true, editorRevisionComplete: true,
      usedInAd: true, adNumber: true,
      transferStatus: true, transferError: true, transferredAt: true, dropboxPath: true,
      updatedAt: true,
      batch: { select: { name: true } },
    },
  })

  const flat = cards.map((c) => ({
    ...c,
    batchName: c.batch?.name ?? null,
    batch: undefined,
    transferredAt: c.transferredAt?.toISOString() ?? null,
    updatedAt: c.updatedAt.toISOString(),
  }))

  return (
    <div className="-m-6 p-6 bg-zinc-900 min-h-[calc(100vh-88px)]">
      <EditorBoard cards={flat} userRole={session.user.role} />
    </div>
  )
}
