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

  const [updated] = await prisma.$transaction([
    prisma.creative.update({ where: { id }, data: { stage: next } }),
    prisma.stageHistory.create({
      data: { creativeId: id, fromStage: creative.stage, toStage: next, changedById: session.user.id, note },
    }),
  ])

  return NextResponse.json(updated)
}
