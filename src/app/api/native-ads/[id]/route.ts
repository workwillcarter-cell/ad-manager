import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Delete a NativeBatch if it has no ads left (keeps the board tidy).
async function pruneBatchIfEmpty(batchId: string | null | undefined) {
  if (!batchId) return
  const remaining = await prisma.nativeAd.count({ where: { batchId } })
  if (remaining === 0) await prisma.nativeBatch.delete({ where: { id: batchId } }).catch(() => {})
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const { concept, briefLink, adNumber, status, style, extraInfo, learnings, launchDate, result, spend, roas } = body

  const existing = await prisma.nativeAd.findUnique({
    where: { id },
    select: { adNumber: true, status: true, launchDate: true, batchId: true },
  })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Name the ad the first time it reaches Ready (or Launched) — native3, native4, …
  let autoAdNumber: string | undefined = undefined
  if ((status === "READY" || status === "LAUNCHED") && !existing.adNumber && adNumber === undefined) {
    const named = await prisma.nativeAd.findMany({
      where: { adNumber: { startsWith: "native" } },
      select: { adNumber: true },
    })
    const pattern = /^native(\d+)$/
    const maxNum = named.reduce((max, a) => {
      const m = a.adNumber?.match(pattern)
      if (!m) return max
      const n = parseInt(m[1], 10)
      return Number.isNaN(n) ? max : Math.max(max, n)
    }, 2) // floor 2 → first assigned name is native3
    autoAdNumber = `native${maxNum + 1}`
  }

  // Launch handling: stamp a launch date and group into that calendar day's batch.
  let autoLaunchDate: Date | undefined = undefined
  let batchUpdate: string | null | undefined = undefined // undefined = leave batch as-is
  if (status === "LAUNCHED") {
    const launchSource =
      launchDate !== undefined
        ? (launchDate ? new Date(launchDate) : new Date())
        : (existing.launchDate ?? new Date())
    if (existing.launchDate == null && launchDate === undefined) autoLaunchDate = launchSource

    const dayStart = new Date(Date.UTC(
      launchSource.getUTCFullYear(), launchSource.getUTCMonth(), launchSource.getUTCDate(),
    ))
    let batch = await prisma.nativeBatch.findFirst({ where: { launchDate: dayStart } })
    if (!batch) {
      const count = await prisma.nativeBatch.count()
      const label = dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      batch = await prisma.nativeBatch.create({
        data: { name: `Launched ${label}`, number: count + 1, launchDate: dayStart, createdById: session.user.id },
      })
    }
    batchUpdate = batch.id
  } else if (status !== undefined && existing.status === "LAUNCHED") {
    // Moved out of Launched → pull it back out of its day batch (un-batched again)
    batchUpdate = null
  }

  const ad = await prisma.nativeAd.update({
    where: { id },
    data: {
      ...(concept !== undefined && { concept }),
      ...(briefLink !== undefined && { briefLink: briefLink || null }),
      ...(adNumber !== undefined && { adNumber: adNumber || null }),
      ...(status !== undefined && { status: status || null }),
      ...(style !== undefined && { style: style || null }),
      ...(extraInfo !== undefined && { extraInfo: extraInfo || null }),
      ...(learnings !== undefined && { learnings: learnings || null }),
      ...(launchDate !== undefined && { launchDate: launchDate ? new Date(launchDate) : null }),
      ...(result !== undefined && { result: result || null }),
      ...(spend !== undefined && { spend: spend !== null ? Number(spend) : null }),
      ...(roas !== undefined && { roas: roas !== null ? Number(roas) : null }),
      ...(autoAdNumber !== undefined && { adNumber: autoAdNumber }),
      ...(autoLaunchDate !== undefined && { launchDate: autoLaunchDate }),
      ...(batchUpdate !== undefined && { batchId: batchUpdate }),
    },
  })

  // If the ad left a batch, clean that batch up when it's now empty.
  if (batchUpdate !== undefined && existing.batchId && existing.batchId !== batchUpdate) {
    await pruneBatchIfEmpty(existing.batchId)
  }

  return NextResponse.json(ad)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const existing = await prisma.nativeAd.findUnique({ where: { id }, select: { batchId: true } })
  await prisma.nativeAd.delete({ where: { id } })
  await pruneBatchIfEmpty(existing?.batchId)

  return NextResponse.json({ ok: true })
}
