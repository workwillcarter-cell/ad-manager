import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { concept, briefLink, batchId } = await req.json()
  if (!concept || !batchId) return NextResponse.json({ error: "concept and batchId required" }, { status: 400 })

  const creative = await prisma.creative.create({
    data: { concept, briefLink, batchId, createdById: session.user.id },
  })

  await prisma.stageHistory.create({
    data: { creativeId: creative.id, toStage: "IDEATION", changedById: session.user.id },
  })

  return NextResponse.json(creative, { status: 201 })
}
