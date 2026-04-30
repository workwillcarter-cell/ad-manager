"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { Role } from "@/generated/prisma/client"

type Card = {
  id: string
  concept: string
  briefLink: string | null
  finishedAdLink: string | null
  projectType: string | null
  aigNotes: string | null
  aigStatus: string | null
  needsRevision: boolean
  revisionDetails: string | null
  revisionComplete: boolean
  batchName: string | null
}

type RevisionItem = { id: string; text: string; complete: boolean }

function parseRevisions(raw: string | null): RevisionItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return [{ id: "legacy", text: raw, complete: false }]
}

function serializeRevisions(items: RevisionItem[]): string | null {
  return items.length === 0 ? null : JSON.stringify(items)
}

function newRevId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

const AIG_COLUMNS = [
  { id: "ASSIGNED",        label: "Assigned",        color: "bg-blue-50 border-blue-200",     badge: "bg-blue-100 text-blue-700" },
  { id: "CREATED",         label: "Created",          color: "bg-indigo-50 border-indigo-200", badge: "bg-indigo-100 text-indigo-700" },
  { id: "REVISION",        label: "Revision",         color: "bg-red-50 border-red-200",       badge: "bg-red-100 text-red-700" },
  { id: "COMPLETE",        label: "Complete",         color: "bg-green-50 border-green-200",   badge: "bg-green-100 text-green-700" },
  { id: "ADDED_TO_EDITOR", label: "Added to Editor",  color: "bg-purple-50 border-purple-200", badge: "bg-purple-100 text-purple-700" },
  { id: "PAID",            label: "Paid",             color: "bg-gray-50 border-gray-200",     badge: "bg-gray-100 text-gray-600" },
]

const PROJECT_TYPE_COLORS: Record<string, string> = {
  "Script Shotlist": "bg-orange-100 text-orange-700",
  "Perfect UGC":     "bg-pink-100 text-pink-700",
  "Cartoon":         "bg-yellow-100 text-yellow-700",
  "UGC":             "bg-teal-100 text-teal-700",
  "Image":           "bg-sky-100 text-sky-700",
  "Clip Refresh":    "bg-violet-100 text-violet-700",
  "No Gen":          "bg-slate-200 text-slate-700",
}

const PROJECT_TYPES = ["Script Shotlist", "Perfect UGC", "Cartoon", "UGC", "Image", "Clip Refresh", "No Gen"]

export default function AIGBoard({ cards: initialCards, userRole }: { cards: Card[]; userRole: Role }) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [selected, setSelected] = useState<Card | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const [confirmMove, setConfirmMove] = useState<{ cardId: string; colId: string } | null>(null)

  useEffect(() => { setCards(initialCards) }, [initialCards])

  const byStatus = AIG_COLUMNS.reduce((acc, col) => {
    acc[col.id] = cards.filter((c) => c.aigStatus === col.id)
    return acc
  }, {} as Record<string, Card[]>)

  async function performMove(cardId: string, colId: string) {
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, aigStatus: colId } : c))
    await fetch(`/api/creatives/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aigStatus: colId }),
    })
    router.refresh()
  }

  async function dropOnCol(colId: string) {
    const id = dragIdRef.current
    setDraggingId(null)
    setDragOverColId(null)
    dragIdRef.current = null
    if (!id) return
    const card = cards.find((c) => c.id === id)
    if (!card || card.aigStatus === colId) return
    if (colId === "ADDED_TO_EDITOR") {
      if (userRole !== "CEO") return
      setConfirmMove({ cardId: id, colId })
      return
    }
    await performMove(id, colId)
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">AIG Board</h1>
          <p className="text-sm text-zinc-400 mt-0.5">AI generation pipeline</p>
        </div>
        <div className="text-sm text-zinc-400">{cards.length} projects</div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-4 min-w-max">
          {AIG_COLUMNS.map((col) => {
            const colCards = byStatus[col.id] ?? []
            const isOver = dragOverColId === col.id
            return (
              <div
                key={col.id}
                className={`w-72 flex-shrink-0 rounded-xl transition-colors ${isOver ? "bg-blue-50/60" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverColId(col.id) }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColId(null) }}
                onDrop={() => dropOnCol(col.id)}
              >
                <div className={`flex items-center justify-between mb-3 px-3 py-2 rounded-xl border ${col.color}`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.badge}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">{colCards.length}</span>
                </div>
                <div className="space-y-3 min-h-[80px]">
                  {colCards.map((card) => (
                    <AIGCard
                      key={card.id}
                      card={card}
                      isDragging={draggingId === card.id}
                      onClick={() => setSelected(card)}
                      onDragStart={() => { dragIdRef.current = card.id; setDraggingId(card.id) }}
                      onDragEnd={() => { setDraggingId(null); setDragOverColId(null); dragIdRef.current = null }}
                    />
                  ))}
                  {colCards.length === 0 && (
                    <div className={`border-2 border-dashed rounded-xl h-20 flex items-center justify-center transition-colors ${isOver ? "border-blue-300" : "border-gray-200"}`}>
                      <span className="text-xs text-gray-300">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {selected && (
        <CardModal
          card={selected}
          userRole={userRole}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => setSelected(updated)}
          onMoveToEditor={(cardId) => setConfirmMove({ cardId, colId: "ADDED_TO_EDITOR" })}
        />
      )}

      {confirmMove && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Move to Editor Board?</h3>
            <p className="text-sm text-gray-500">
              This will create a card on the Editor Board. The card will stay in the
              Added to Editor column here and cannot be moved back automatically.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmMove(null)}
                className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { cardId, colId } = confirmMove
                  setConfirmMove(null)
                  await performMove(cardId, colId)
                }}
                className="text-sm bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Yes, move to Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AIGCard({ card, isDragging, onClick, onDragStart, onDragEnd }: {
  card: Card
  isDragging: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const revisions = parseRevisions(card.revisionDetails)
  const openRevisions = revisions.filter((r) => !r.complete)

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart() }}
      onDragEnd={onDragEnd}
      className={`bg-white border border-gray-200 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none ${isDragging ? "opacity-40 scale-95" : ""}`}
    >
      {/* Project type badge — top of card */}
      {card.projectType ? (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${PROJECT_TYPE_COLORS[card.projectType] ?? "bg-gray-100 text-gray-600"}`}>
          {card.projectType}
        </span>
      ) : (
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 mb-2">
          No type
        </span>
      )}

      <p className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{card.concept}</p>

      {card.batchName && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 mb-2 inline-block">{card.batchName}</span>
      )}

      <div className="flex flex-wrap gap-2 text-xs mt-1">
        {card.briefLink && (
          <a href={card.briefLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-600 hover:underline">
            Brief ↗
          </a>
        )}
        {card.finishedAdLink && (
          <a href={card.finishedAdLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-green-600 hover:underline">
            Drive ↗
          </a>
        )}
      </div>

      {openRevisions.length > 0 && (
        <div className="mt-2 text-xs text-red-600 font-medium">⚠ {openRevisions.length} revision{openRevisions.length > 1 ? "s" : ""} needed</div>
      )}
      {card.needsRevision && openRevisions.length === 0 && revisions.length > 0 && (
        <div className="mt-2 text-xs text-green-600 font-medium">✓ All revisions complete</div>
      )}
    </div>
  )
}

function CardModal({ card, userRole, onClose, onUpdate, onMoveToEditor }: {
  card: Card
  userRole: Role
  onClose: () => void
  onUpdate: (c: Card) => void
  onMoveToEditor: (cardId: string) => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [fields, setFields] = useState({
    projectType:    card.projectType ?? "",
    finishedAdLink: card.finishedAdLink ?? "",
    aigNotes:       card.aigNotes ?? "",
  })
  const [revisions, setRevisions] = useState<RevisionItem[]>(() => parseRevisions(card.revisionDetails))
  const [newRevText, setNewRevText] = useState("")

  function addRevision() {
    const text = newRevText.trim()
    if (!text) return
    setRevisions((r) => [...r, { id: newRevId(), text, complete: false }])
    setNewRevText("")
  }

  const isCEO = userRole === "CEO"
  const isAIG = userRole === "AI_GENERATOR"

  async function patch(data: Record<string, unknown>) {
    setSaving(true)
    await fetch(`/api/creatives/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    router.refresh()
    setSaving(false)
  }

  async function saveFields() {
    const serialized = serializeRevisions(revisions)
    const hasOpenRevisions = revisions.some((r) => !r.complete)
    const allComplete = revisions.length > 0 && revisions.every((r) => r.complete)
    await patch({
      projectType:      fields.projectType || null,
      finishedAdLink:   fields.finishedAdLink || null,
      aigNotes:         fields.aigNotes || null,
      needsRevision:    revisions.length > 0,
      revisionDetails:  serialized,
      revisionComplete: allComplete,
    })
    onUpdate({
      ...card,
      projectType:      fields.projectType || null,
      finishedAdLink:   fields.finishedAdLink || null,
      aigNotes:         fields.aigNotes || null,
      needsRevision:    revisions.length > 0,
      revisionDetails:  serialized,
      revisionComplete: allComplete,
    })
    onClose()
    void hasOpenRevisions
  }

  async function moveCard(status: string) {
    await patch({ aigStatus: status })
    onClose()
  }

  async function deleteCard() {
    if (!confirm(`Delete "${card.concept}"? This will remove it from all boards and cannot be undone.`)) return
    setSaving(true)
    await fetch(`/api/creatives/${card.id}`, { method: "DELETE" })
    router.refresh()
    onClose()
  }

  const currentColIndex = AIG_COLUMNS.findIndex((c) => c.id === card.aigStatus)
  const nextCol = AIG_COLUMNS[currentColIndex + 1]
  const prevCol = AIG_COLUMNS[currentColIndex - 1]

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">{card.batchName ?? "No batch"}</p>
              <h2 className="font-semibold text-gray-900">{card.concept}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">✕</button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {(() => {
              const col = AIG_COLUMNS.find((c) => c.id === card.aigStatus)
              return col ? <span className={`text-xs px-2 py-0.5 rounded-full ${col.badge}`}>{col.label}</span> : null
            })()}
            {card.projectType && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROJECT_TYPE_COLORS[card.projectType] ?? "bg-gray-100 text-gray-600"}`}>
                {card.projectType}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">

          <Field label="Project Type">
            {isCEO ? (
              <select
                value={fields.projectType}
                onChange={(e) => setFields((f) => ({ ...f, projectType: e.target.value }))}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-bloom bg-white"
              >
                <option value="">— Select type</option>
                {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className={`text-xs px-2 py-0.5 rounded-full ${fields.projectType ? (PROJECT_TYPE_COLORS[fields.projectType] ?? "bg-gray-100 text-gray-600") : "text-gray-400"}`}>
                {fields.projectType || "Not set"}
              </span>
            )}
          </Field>

          <Field label="Brief">
            {card.briefLink
              ? <a href={card.briefLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{card.briefLink}</a>
              : <span className="text-sm text-gray-400">No brief attached</span>
            }
          </Field>

          <Field label="Completed Drive Link">
            <input
              type="url"
              value={fields.finishedAdLink}
              onChange={(e) => setFields((f) => ({ ...f, finishedAdLink: e.target.value }))}
              placeholder="https://drive.google.com/..."
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-bloom"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={fields.aigNotes}
              onChange={(e) => setFields((f) => ({ ...f, aigNotes: e.target.value }))}
              rows={3}
              placeholder="Instructions, special notes..."
              className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-bloom resize-none"
            />
          </Field>

          {/* Revisions */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Revisions{revisions.length > 0 && (
                <span className="text-gray-400 normal-case font-normal ml-1">
                  ({revisions.filter((r) => r.complete).length}/{revisions.length} done)
                </span>
              )}
            </p>

            {revisions.length === 0 && (
              <p className="text-xs text-gray-400">
                {isCEO ? "No revisions yet." : "No revisions requested."}
              </p>
            )}

            <div className="space-y-2">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${rev.complete ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}
                >
                  {/* Circle checkmark — AIG only */}
                  {isAIG && (
                    <button
                      onClick={() => setRevisions((r) => r.map((x) => x.id === rev.id ? { ...x, complete: !x.complete } : x))}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        rev.complete
                          ? "bg-green-500 border-green-500"
                          : "border-gray-300 hover:border-green-400 bg-white"
                      }`}
                    >
                      {rev.complete && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  )}
                  {/* CEO: read-only status dot */}
                  {isCEO && (
                    <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${rev.complete ? "bg-green-500" : "bg-gray-200"}`}>
                      {rev.complete && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                  <p className={`flex-1 text-sm ${rev.complete ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {rev.text}
                  </p>
                  {isCEO && (
                    <button
                      onClick={() => setRevisions((r) => r.filter((x) => x.id !== rev.id))}
                      className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* CEO: add revision input */}
            {isCEO && (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newRevText}
                  onChange={(e) => setNewRevText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRevision() } }}
                  placeholder="Add a revision note..."
                  className="flex-1 text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-bloom"
                />
                <button
                  onClick={addRevision}
                  disabled={!newRevText.trim()}
                  className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {prevCol && (
              <button onClick={() => moveCard(prevCol.id)} disabled={saving} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                ← {prevCol.label}
              </button>
            )}
            {nextCol && (nextCol.id !== "ADDED_TO_EDITOR" || userRole === "CEO") && (
              <button
                onClick={() => {
                  if (nextCol.id === "ADDED_TO_EDITOR") {
                    onClose()
                    onMoveToEditor(card.id)
                  } else {
                    moveCard(nextCol.id)
                  }
                }}
                disabled={saving}
                className="text-xs bg-bloom text-white px-3 py-1.5 rounded-lg hover:bg-bloom-dark disabled:opacity-50"
              >
                {nextCol.label} →
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {userRole === "CEO" && (
              <button
                onClick={deleteCard}
                disabled={saving}
                className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}
            <button onClick={saveFields} disabled={saving} className="text-sm bg-gray-900 text-white px-4 py-1.5 rounded-lg hover:bg-gray-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
      {children}
    </div>
  )
}
