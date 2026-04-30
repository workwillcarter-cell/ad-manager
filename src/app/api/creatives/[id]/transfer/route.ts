import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runTransfer } from "@/lib/transfer"

export const maxDuration = 300
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
  if (creative.transferStatus === "IN_PROGRESS") {
    return NextResponse.json({ error: "Transfer already in progress" }, { status: 409 })
  }

  try {
    await runTransfer(id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
