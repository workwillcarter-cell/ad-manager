import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { runTransfer } from "@/lib/transfer"

export const maxDuration = 800
export const dynamic = "force-dynamic"

type TransferResult = {
  id: string
  adNumber: string | null
  status: "transferred" | "skipped" | "failed"
  reason?: string
}

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
    include: { creatives: { orderBy: { createdAt: "asc" } } },
  })
  if (!batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 })
  }

  const results: TransferResult[] = []

  for (const creative of batch.creatives) {
    if (creative.transferStatus === "DONE") {
      results.push({ id: creative.id, adNumber: creative.adNumber, status: "skipped", reason: "Already transferred" })
      continue
    }
    if (creative.transferStatus === "IN_PROGRESS") {
      results.push({ id: creative.id, adNumber: creative.adNumber, status: "skipped", reason: "Transfer already in progress" })
      continue
    }
    const isImage = creative.projectType === "Image"
    const sourceLink = isImage ? creative.finishedAdLink : creative.editorDriveLink
    const editorReady = isImage || creative.editorStatus === "COMPLETE" || creative.editorStatus === "PAID"
    if (!sourceLink || !editorReady || !creative.adNumber) {
      results.push({
        id: creative.id,
        adNumber: creative.adNumber,
        status: "skipped",
        reason: !creative.adNumber
          ? "No ad number assigned yet"
          : !sourceLink
          ? isImage
            ? "No AIG Completed Drive link on this ad"
            : "No editor Drive link on this ad"
          : "Editor hasn't marked this ad Complete or Paid",
      })
      continue
    }

    try {
      await runTransfer(creative.id)
      results.push({ id: creative.id, adNumber: creative.adNumber, status: "transferred" })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      results.push({ id: creative.id, adNumber: creative.adNumber, status: "failed", reason: message })
    }
  }

  const transferred = results.filter((r) => r.status === "transferred").length
  const failed = results.filter((r) => r.status === "failed").length
  const skipped = results.filter((r) => r.status === "skipped").length

  return NextResponse.json({ ok: failed === 0, transferred, failed, skipped, results })
}
