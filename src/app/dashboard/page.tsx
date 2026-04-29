import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { STAGE_LABELS, STAGES } from "@/lib/pipeline"
import Link from "next/link"
import type { Stage } from "@/generated/prisma/client"
import CreateBatchButton from "@/components/CreateBatchButton"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  const batches = await prisma.batch.findMany({
    include: { creatives: true, createdBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">All ad launch batches</p>
        </div>
        {session.user.role === "CEO" && <CreateBatchButton />}
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No batches yet.</p>
          {session.user.role === "CEO" && <p className="text-sm mt-1">Create your first batch to get started.</p>}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const total = batch.creatives.length
            const stageCounts = STAGES.reduce(
              (acc, s) => {
                acc[s] = batch.creatives.filter((c) => c.stage === s).length
                return acc
              },
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
                {batch.description && <p className="text-sm text-gray-500 mb-3">{batch.description}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>{total} creative{total !== 1 ? "s" : ""}</span>
                  <span>Â·</span>
                  <span>{launched} launched</span>
                  <span>Â·</span>
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
