import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const batches = await prisma.batch.findMany({
    include: {
      creatives: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(batches)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const batch = await prisma.batch.create({
    data: { name, description, createdById: session.user.id },
  })

  return NextResponse.json(batch, { status: 201 })
}
