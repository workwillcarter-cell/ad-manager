import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import CEOBoard from "@/components/CEOBoard"
import { STAGE_LABELS, STAGES } from "@/lib/pipeline"
import Link from "next/link"
import type { Stage } from "@/generated/prisma/client"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  if (session.user.role === "CEO") {
    const CREATIVE_SELECT = {
      id: true, concept: true, briefLink: true, adNumber: true,
      extraInfo: true, launchDate: true, result: true, learnings: true,
      spend: true, roas: true, stage: true, ceoStatus: true,
      projectType: true, style: true,
      editorDriveLink: true,
    }

    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creatives: {
          orderBy: { createdAt: "asc" },
          select: CREATIVE_SELECT,
        },
      },
    })

    const unassigned = await prisma.creative.findMany({
      where: { batchId: null },
      orderBy: { createdAt: "asc" },
      select: CREATIVE_SELECT,
    })

    return <CEOBoard batches={batches} unassigned={unassigned} />
  }

  // Non-CEO: batch grid
  const batches = await prisma.batch.findMany({
    include: { creatives: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Batches</h1>
          <p className="text-sm text-bloom-soft/80 mt-0.5">All ad launch batches</p>
        </div>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-20 text-bloom-soft/60">
          <p className="text-lg">No batches yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const total = batch.creatives.length
            const stageCounts = STAGES.reduce(
              (acc, s) => { acc[s] = batch.creatives.filter((c) => c.stage === s).length; return acc },
              {} as Record<Stage, number>,
            )
            const completed = stageCounts["COMPLETED"]
            const launched = stageCounts["LAUNCHED"] + stageCounts["PERFORMANCE_REVIEW"] + completed

            return (
              <Link
                key={batch.id}
                href={`/dashboard/batches/${batch.id}`}
                className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 text-base">{batch.name}</h2>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>{total} creative{total !== 1 ? "s" : ""}</span>
                  <span>·</span>
                  <span>{launched} launched</span>
                  <span>·</span>
                  <span>{completed} completed</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {STAGES.filter((s) => stageCounts[s] > 0).map((s) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {stageCounts[s]} {STAGE_LABELS[s]}
                    </span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
