import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Rename a launched-day batch.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const batch = await prisma.nativeBatch.update({ where: { id }, data: { name: name.trim() } })
  return NextResponse.json(batch)
}
