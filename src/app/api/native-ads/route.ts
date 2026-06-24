import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Create a new Native Ad concept (lands in the Planning section).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { concept, briefLink } = body

  if (!concept?.trim()) return NextResponse.json({ error: "concept required" }, { status: 400 })

  const ad = await prisma.nativeAd.create({
    data: { concept: concept.trim(), briefLink: briefLink || null, createdById: session.user.id },
  })

  return NextResponse.json(ad, { status: 201 })
}
