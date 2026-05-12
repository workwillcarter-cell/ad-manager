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

  const creative = await prisma.creative.findUnique({ where: { id } })
  if (!creative) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  if (creative.transferStatus === "DONE") {
    return NextResponse.json({ error: "Already transferred — won't reset" }, { status: 400 })
  }

  await prisma.creative.update({
    where: { id },
    data: { transferStatus: null, transferError: null },
  })

  return NextResponse.json({ ok: true })
}
