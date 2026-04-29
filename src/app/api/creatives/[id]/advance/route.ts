import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nextStage, canAdvance } from "@/lib/pipeline"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { note } = await req.json().catch(() => ({ note: undefined }))

  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!canAdvance(creative.stage, session.user.role)) {
    return NextResponse.json({ error: "Not allowed to advance this stage" }, { status: 403 })
  }

  const next = nextStage(creative.stage)
  if (!next) return NextResponse.json({ error: "Already at final stage" }, { status: 400 })

  // Auto-assign to a batch when marked Ready
  let batchId = creative.batchId
  if (next === "READY") {
    const openBatch = await prisma.batch.findFirst({
      where: { sealed: false },
      include: { _count: { select: { creatives: true } } },
      orderBy: { createdAt: "desc" },
    })

    if (!openBatch || openBatch._count.creatives >= 10) {
      const batchCount = await prisma.batch.count()
      const batchNumber = batchCount + 1
      const newBatch = await prisma.batch.create({
        data: { name: `Batch ${batchNumber}`, number: batchNumber, sealed: false, createdById: session.user.id },
      })
      batchId = newBatch.id
    } else {
      batchId = openBatch.id
    }
  }

  const [updated] = await prisma.$transaction([
    prisma.creative.update({ where: { id }, data: { stage: next, ...(batchId !== creative.batchId && { batchId }) } }),
    prisma.stageHistory.create({
      data: { creativeId: id, fromStage: creative.stage, toStage: next, changedById: session.user.id, note },
    }),
  ])

  // Seal batch if it now has 10 creatives
  if (next === "READY" && batchId) {
    const count = await prisma.creative.count({ where: { batchId } })
    if (count >= 10) {
      await prisma.batch.update({ where: { id: batchId }, data: { sealed: true } })
    }
  }

  return NextResponse.json(updated)
}
