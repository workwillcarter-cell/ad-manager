import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const creative = await prisma.creative.findUnique({
    where: { id },
    include: {
      history: { include: { changedBy: { select: { name: true } } }, orderBy: { changedAt: "desc" } },
      batch: { select: { name: true, id: true } },
    },
  })

  if (!creative) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(creative)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { concept, briefLink, finishedAdLink, learnings } = await req.json()

  const creative = await prisma.creative.update({
    where: { id },
    data: {
      ...(concept !== undefined && { concept }),
      ...(briefLink !== undefined && { briefLink }),
      ...(finishedAdLink !== undefined && { finishedAdLink }),
      ...(learnings !== undefined && { learnings }),
    },
  })

  return NextResponse.json(creative)
}
