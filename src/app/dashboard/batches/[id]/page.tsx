import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { STAGES, STAGE_LABELS, STAGE_COLORS, canView } from "@/lib/pipeline"
import type { Stage } from "@/generated/prisma/client"
import CreativeCard from "@/components/CreativeCard"
import AddCreativeButton from "@/components/AddCreativeButton"
import Link from "next/link"

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { id } = await params

  const batch = await prisma.batch.findUnique({
    where: { id },
    include: {
      creatives: {
        include: {
          history: {
            include: { changedBy: { select: { name: true } } },
            orderBy: { changedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!batch) redirect("/dashboard")

  const visibleStages = STAGES.filter((s) => canView(s, session.user.role))
  const visibleCreatives = batch.creatives.filter((c) => canView(c.stage, session.user.role))

  const byStage = visibleStages.reduce(
    (acc, s) => {
      acc[s] = visibleCreatives.filter((c) => c.stage === s)
      return acc
    },
    {} as Record<Stage, typeof visibleCreatives>,
  )

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          Batches
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{batch.name}</h1>
        {session.user.role === "CEO" && (
          <div className="ml-auto">
            <AddCreativeButton batchId={batch.id} />
          </div>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {visibleStages.map((stage) => {
            const cards = byStage[stage] ?? []
            return (
              <div key={stage} className="w-72 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STAGE_COLORS[stage]}`}>
                    {STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-gray-400">{cards.length}</span>
                </div>
                <div className="space-y-3">
                  {cards.map((creative) => (
                    <CreativeCard
                      key={creative.id}
                      creative={creative}
                      userRole={session.user.role}
                      userId={session.user.id}
                    />
                  ))}
                  {cards.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                      <span className="text-xs text-gray-300">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
