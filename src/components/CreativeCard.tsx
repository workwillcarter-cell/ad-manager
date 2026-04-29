"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { STAGE_LABELS, canAdvance, nextStage } from "@/lib/pipeline"
import type { Stage, Role } from "@/generated/prisma/client"

type Creative = {
  id: string
  concept: string
  briefLink: string | null
  finishedAdLink: string | null
  learnings: string | null
  stage: Stage
  history: { changedBy: { name: string }; changedAt: Date }[]
}

export default function CreativeCard({
  creative,
  userRole,
  userId,
}: {
  creative: Creative
  userRole: Role
  userId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [advancing, setAdvancing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [fields, setFields] = useState({
    briefLink: creative.briefLink ?? "",
    finishedAdLink: creative.finishedAdLink ?? "",
    learnings: creative.learnings ?? "",
  })
  const [saving, setSaving] = useState(false)

  const canMove = canAdvance(creative.stage, userRole)
  const next = nextStage(creative.stage)

  async function advance() {
    setAdvancing(true)
    await fetch(`/api/creatives/${creative.id}/advance`, { method: "POST" })
    router.refresh()
    setAdvancing(false)
    setOpen(false)
  }

  async function save() {
    setSaving(true)
    await fetch(`/api/creatives/${creative.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    router.refresh()
    setSaving(false)
    setEditing(false)
  }

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-shadow"
        onClick={() => setOpen(true)}
      >
        <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{creative.concept}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {creative.briefLink && (
            <a
              href={creative.briefLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 hover:underline"
            >
              Brief
            </a>
          )}
          {creative.finishedAdLink && (
            <a
              href={creative.finishedAdLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-green-600 hover:underline"
            >
              Ad
            </a>
          )}
        </div>
        {creative.history[0] && (
          <p className="text-xs text-gray-400 mt-2">
            {creative.history[0].changedBy.name} Â· {new Date(creative.history[0].changedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => { setOpen(false); setEditing(false) }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-gray-900 text-base">{creative.concept}</h2>
                <button onClick={() => { setOpen(false); setEditing(false) }} className="text-gray-400 hover:text-gray-600 shrink-0">
                  âœ•
                </button>
              </div>
              <span className="text-xs text-gray-400 mt-1 inline-block">{STAGE_LABELS[creative.stage]}</span>
            </div>

            <div className="p-6 space-y-4">
              {editing ? (
                <>
                  <Field label="Brief Link">
                    <input
                      type="url"
                      value={fields.briefLink}
                      onChange={(e) => setFields((f) => ({ ...f, briefLink: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://drive.google.com/..."
                    />
                  </Field>
                  <Field label="Finished Ad Link">
                    <input
                      type="url"
                      value={fields.finishedAdLink}
                      onChange={(e) => setFields((f) => ({ ...f, finishedAdLink: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Learnings">
                    <textarea
                      value={fields.learnings}
                      onChange={(e) => setFields((f) => ({ ...f, learnings: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="What did we learn from this ad?"
                    />
                  </Field>
                </>
              ) : (
                <>
                  {creative.briefLink && (
                    <Field label="Brief">
                      <a href={creative.briefLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                        {creative.briefLink}
                      </a>
                    </Field>
                  )}
                  {creative.finishedAdLink && (
                    <Field label="Finished Ad">
                      <a href={creative.finishedAdLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                        {creative.finishedAdLink}
                      </a>
                    </Field>
                  )}
                  {creative.learnings && (
                    <Field label="Learnings">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{creative.learnings}</p>
                    </Field>
                  )}
                  {!creative.briefLink && !creative.finishedAdLink && !creative.learnings && (
                    <p className="text-sm text-gray-400">No additional details yet.</p>
                  )}
                </>
              )}
            </div>

            <div className="px-6 pb-6 flex items-center gap-3 justify-end">
              {editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="text-sm text-gray-500 hover:text-gray-700">
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg">
                    Edit
                  </button>
                  {canMove && next && (
                    <button
                      onClick={advance}
                      disabled={advancing}
                      className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {advancing ? "Moving..." : `Mark Done â†’ ${STAGE_LABELS[next]}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
