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
  const body = await req.json()

  const {
    concept, briefLink, finishedAdLink, learnings,
    adNumber, launchDate, result, spend, roas, extraInfo, ceoStatus,
    aigStatus, projectType, aigNotes, needsRevision, revisionDetails, revisionComplete,
    editorStatus, editorNotes, editorNeedsRevision, editorRevisionDetails, editorRevisionComplete,
    editorDriveLink, usedInAd,
  } = body

  // Auto-set launch date when CEO marks Launched
  let autoLaunchDate: Date | undefined = undefined
  if (ceoStatus === "LAUNCHED" && launchDate === undefined) {
    const existing = await prisma.creative.findUnique({ where: { id }, select: { launchDate: true } })
    if (!existing?.launchDate) autoLaunchDate = new Date()
  }

  // Auto-assign to AIG board when CEO marks Moved to AIG
  let autoAigStatus: string | undefined = undefined
  if (ceoStatus === "MOVED_TO_AIG") {
    const existing = await prisma.creative.findUnique({ where: { id }, select: { aigStatus: true } })
    if (!existing?.aigStatus) autoAigStatus = "ASSIGNED"
  }

  // Auto-assign to Editor board when CEO marks Moved to Editor OR when AIG moves to Added to Editor
  let autoEditorStatus: string | undefined = undefined
  if (ceoStatus === "MOVED_TO_EDITOR") {
    const existing = await prisma.creative.findUnique({ where: { id }, select: { editorStatus: true } })
    if (!existing?.editorStatus) autoEditorStatus = "ASSIGNED"
  }
  if (aigStatus === "ADDED_TO_EDITOR") {
    const existing = await prisma.creative.findUnique({ where: { id }, select: { editorStatus: true } })
    if (!existing?.editorStatus) autoEditorStatus = "ASSIGNED"
  }

  // Auto-mark CEO Ready when Editor finishes (COMPLETE)
  let autoCeoStatus: string | undefined = undefined
  if (editorStatus === "COMPLETE" && ceoStatus === undefined) {
    const existing = await prisma.creative.findUnique({ where: { id }, select: { ceoStatus: true } })
    if (existing?.ceoStatus !== "READY" && existing?.ceoStatus !== "LAUNCHED") {
      autoCeoStatus = "READY"
    }
  }

  const effectiveCeoStatus = autoCeoStatus ?? ceoStatus

  // When effectively READY, auto-assign batch + ad name
  let batchId: string | undefined = undefined
  let autoAdNumber: string | undefined = undefined
  if (effectiveCeoStatus === "READY") {
    const existing = await prisma.creative.findUnique({
      where: { id },
      select: { batchId: true, adNumber: true },
    })

    if (!existing?.batchId) {
      const openBatch = await prisma.batch.findFirst({
        where: { sealed: false },
        include: { _count: { select: { creatives: true } } },
        orderBy: { createdAt: "asc" },
      })
      if (!openBatch || openBatch._count.creatives >= 10) {
        const batchCount = await prisma.batch.count()
        const batchNumber = batchCount + 1
        const newBatch = await prisma.batch.create({
          data: { name: `Batch ${batchNumber}`, number: batchNumber, sealed: false, createdById: session.user.id },
        })
        batchId = newBatch.id
      } else {
        batchId = openBatch.id
      }
    }

    if (!existing?.adNumber && adNumber === undefined) {
      const named = await prisma.creative.findMany({
        where: { adNumber: { startsWith: "Bloom" } },
        select: { adNumber: true },
      })
      const maxNum = named.reduce((max, c) => {
        const m = c.adNumber?.match(/^Bloom(\d+)$/)
        if (!m) return max
        const n = parseInt(m[1], 10)
        return Number.isNaN(n) ? max : Math.max(max, n)
      }, 99)
      autoAdNumber = `Bloom${maxNum + 1}`
    }
  }

  const creative = await prisma.creative.update({
    where: { id },
    data: {
      ...(concept !== undefined && { concept }),
      ...(briefLink !== undefined && { briefLink: briefLink || null }),
      ...(finishedAdLink !== undefined && { finishedAdLink: finishedAdLink || null }),
      ...(learnings !== undefined && { learnings: learnings || null }),
      ...(adNumber !== undefined && { adNumber: adNumber || null }),
      ...(launchDate !== undefined && { launchDate: launchDate ? new Date(launchDate) : null }),
      ...(result !== undefined && { result: result || null }),
      ...(spend !== undefined && { spend: spend !== null ? Number(spend) : null }),
      ...(roas !== undefined && { roas: roas !== null ? Number(roas) : null }),
      ...(extraInfo !== undefined && { extraInfo: extraInfo || null }),
      ...(ceoStatus !== undefined && { ceoStatus: ceoStatus || null }),
      ...(aigStatus !== undefined && { aigStatus: aigStatus || null }),
      ...(projectType !== undefined && { projectType: projectType || null }),
      ...(aigNotes !== undefined && { aigNotes: aigNotes || null }),
      ...(needsRevision !== undefined && { needsRevision }),
      ...(revisionDetails !== undefined && { revisionDetails: revisionDetails || null }),
      ...(revisionComplete !== undefined && { revisionComplete }),
      ...(editorStatus !== undefined && { editorStatus: editorStatus || null }),
      ...(editorNotes !== undefined && { editorNotes: editorNotes || null }),
      ...(editorNeedsRevision !== undefined && { editorNeedsRevision }),
      ...(editorRevisionDetails !== undefined && { editorRevisionDetails: editorRevisionDetails || null }),
      ...(editorRevisionComplete !== undefined && { editorRevisionComplete }),
      ...(editorDriveLink !== undefined && { editorDriveLink: editorDriveLink || null }),
      ...(usedInAd !== undefined && { usedInAd: usedInAd || null }),
      ...(batchId !== undefined && { batchId }),
      ...(autoLaunchDate !== undefined && { launchDate: autoLaunchDate }),
      ...(autoAigStatus !== undefined && { aigStatus: autoAigStatus }),
      ...(autoEditorStatus !== undefined && { editorStatus: autoEditorStatus }),
      ...(autoCeoStatus !== undefined && { ceoStatus: autoCeoStatus }),
      ...(autoAdNumber !== undefined && { adNumber: autoAdNumber }),
    },
  })

  if (batchId) {
    const count = await prisma.creative.count({ where: { batchId } })
    if (count >= 10) {
      await prisma.batch.update({ where: { id: batchId }, data: { sealed: true } })
    }
  }

  return NextResponse.json(creative)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params

  await prisma.$transaction([
    prisma.stageHistory.deleteMany({ where: { creativeId: id } }),
    prisma.creative.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
