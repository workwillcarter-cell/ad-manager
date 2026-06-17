import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Reassign everything this user created/changed to the CEO performing the
  // delete, so their logged projects/batches/history stay intact on the boards
  // (createdById/changedById are required foreign keys — a plain delete fails).
  await prisma.$transaction([
    prisma.creative.updateMany({ where: { createdById: id }, data: { createdById: session.user.id } }),
    prisma.batch.updateMany({ where: { createdById: id }, data: { createdById: session.user.id } }),
    prisma.stageHistory.updateMany({ where: { changedById: id }, data: { changedById: session.user.id } }),
    prisma.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
