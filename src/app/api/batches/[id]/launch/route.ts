import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const { id } = await ctx.params

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: { creatives: true },
  })
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 })
  }

  const now = new Date()

  await prisma.$transaction(
    batch.creatives.map((c) =>
      prisma.creative.update({
        where: { id: c.id },
        data: {
          ceoStatus: "LAUNCHED",
          ...(c.launchDate ? {} : { launchDate: now }),
        },
      }),
    ),
  )

  return NextResponse.json({ ok: true, launched: batch.creatives.length })
}
