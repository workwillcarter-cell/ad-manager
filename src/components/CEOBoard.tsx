"use client"

import { useState, useRef, Fragment } from "react"
import { useRouter } from "next/navigation"
import type { Stage, Result } from "@/generated/prisma/client"

type Creative = {
  id: string
  concept: string
  briefLink: string | null
  adNumber: string | null
  extraInfo: string | null
  launchDate: Date | string | null
  result: Result | null
  learnings: string | null
  spend: number | null
  roas: number | null
  stage: Stage
  ceoStatus: string | null
  projectType: string | null
  style: string | null
  editorDriveLink: string | null
}

type Batch = {
  id: string
  name: string
  number: number | null
  sealed: boolean
  creatives: Creative[]
}

const CEO_STATUSES = [
  { value: "BRIEF_COMPLETE",  label: "Brief Complete" },
  { value: "MOVED_TO_AIG",    label: "Moved to AIG" },
  { value: "MOVED_TO_EDITOR", label: "Moved to Editor" },
  { value: "READY",           label: "Ready" },
  { value: "LAUNCHED",        label: "Launched" },
]

const CEO_STATUS_COLORS: Record<string, string> = {
  BRIEF_COMPLETE:   "bg-yellow-100 text-yellow-700",
  MOVED_TO_AIG:     "bg-purple-100 text-purple-700",
  MOVED_TO_EDITOR:  "bg-blue-100 text-blue-700",
  READY:            "bg-green-100 text-green-700",
  LAUNCHED:         "bg-pink-100 text-pink-700",
}

const PROJECT_TYPES = ["Script Shotlist", "Perfect UGC", "Cartoon", "UGC", "Image", "Clip Refresh", "No Gen"]

const PROJECT_TYPE_COLORS: Record<string, string> = {
  "Script Shotlist": "bg-orange-100 text-orange-700",
  "Perfect UGC":     "bg-pink-100 text-pink-700",
  "Cartoon":         "bg-yellow-100 text-yellow-700",
  "UGC":             "bg-teal-100 text-teal-700",
  "Image":           "bg-sky-100 text-sky-700",
  "Clip Refresh":    "bg-violet-100 text-violet-700",
  "No Gen":          "bg-slate-200 text-slate-700",
}

const STYLES = ["Net New", "Iteration", "Shotgun/Random"]

const STYLE_COLORS: Record<string, string> = {
  "Net New":        "bg-emerald-100 text-emerald-700",
  "Iteration":      "bg-indigo-100 text-indigo-700",
  "Shotgun/Random": "bg-amber-100 text-amber-700",
}

const RESULT_LABELS: Record<Result, string> = {
  FAILED: "Failed",
  WINNER: "Winner",
  BIG_WINNER: "BIG WINNER",
  SPENT_BUT_POOR_PERFORMANCE: "Spent (Poor Perf)",
}

const RESULT_COLORS: Record<Result, string> = {
  FAILED: "bg-red-100 text-red-700",
  WINNER: "bg-green-100 text-green-700",
  BIG_WINNER: "bg-emerald-100 text-emerald-800 font-semibold",
  SPENT_BUT_POOR_PERFORMANCE: "bg-orange-100 text-orange-700",
}

const COL_SPAN = 13
const TOTAL_COLS = 12 // navigable columns: 0=concept 1=brief 2=projectType 3=style 4=status 5=adNumber 6=extraInfo 7=launchDate 8=result 9=learnings 10=spend 11=roas

type NavDir = "tab" | "shift-tab" | "enter"

export default function CEOBoard({ batches, unassigned }: { batches: Batch[]; unassigned: Creative[] }) {
  const router = useRouter()
  const [addingConcept, setAddingConcept] = useState(false)
  const [newConcept, setNewConcept] = useState("")
  const [saving, setSaving] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  // Flat ordered list of all rows (unassigned first, then batches newest→oldest)
  const allRows = [...unassigned, ...batches.flatMap((b) => b.creatives)]

  function navigate(rowIndex: number, colIndex: number, dir: NavDir) {
    let r = rowIndex
    let c = colIndex
    if (dir === "tab")       { c++; if (c >= TOTAL_COLS) { c = 0; r++ } }
    if (dir === "shift-tab") { c--; if (c < 0) { c = TOTAL_COLS - 1; r-- } }
    if (dir === "enter")     { r++ }
    if (r < 0 || r >= allRows.length) return
    const el = document.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`)
    el?.click()
  }

  async function addConcept() {
    if (!newConcept.trim() || saving) return
    setSaving(true)
    await fetch("/api/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept: newConcept.trim() }),
    })
    setNewConcept("")
    setAddingConcept(false)
    setSaving(false)
    router.refresh()
  }

  async function updateField(id: string, field: string, value: unknown) {
    await fetch(`/api/creatives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  async function deleteCreative(id: string, concept: string) {
    if (!confirm(`Delete "${concept}"? This cannot be undone.`)) return
    await fetch(`/api/creatives/${id}`, { method: "DELETE" })
    router.refresh()
  }

  async function renameBatch(id: string, name: string) {
    await fetch(`/api/batches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    router.refresh()
  }

  const totalConcepts = allRows.length

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CEO Board</h1>
          <p className="text-sm text-bloom-soft/80 mt-0.5">Creative concept tracking</p>
        </div>
        <div className="text-sm text-bloom-soft/70">
          {totalConcepts} concepts · {batches.length} batches
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-zinc-900">
              <th className="px-3 py-2.5 text-left w-8 rounded-tl-xl border-b border-zinc-700">#</th>
              <th className="px-3 py-2.5 text-left min-w-[240px] border-b border-zinc-700">Concept</th>
              <th className="px-3 py-2.5 text-left w-20 border-b border-zinc-700">Brief</th>
              <th className="px-3 py-2.5 text-left w-32 border-b border-zinc-700">Project Type</th>
              <th className="px-3 py-2.5 text-left w-32 border-b border-zinc-700">Style</th>
              <th className="px-3 py-2.5 text-left w-36 border-b border-zinc-700">Status</th>
              <th className="px-3 py-2.5 text-left w-24 border-b border-zinc-700">Ad #</th>
              <th className="px-3 py-2.5 text-left w-48 border-b border-zinc-700">Extra Info</th>
              <th className="px-3 py-2.5 text-left w-28 border-b border-zinc-700">Launch Date</th>
              <th className="px-3 py-2.5 text-left w-36 border-b border-zinc-700">Result</th>
              <th className="px-3 py-2.5 text-left min-w-[140px] border-b border-zinc-700">Learnings</th>
              <th className="px-3 py-2.5 text-left w-24 border-b border-zinc-700">Spend</th>
              <th className="px-3 py-2.5 text-left w-20 rounded-tr-xl border-b border-zinc-700">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {/* Planning section */}
            <tr>
              <td colSpan={COL_SPAN} className="bg-zinc-900 px-4 py-2 border-y border-zinc-700">
                <span className="font-bold text-gray-100 text-sm">Planning</span>
                <span className="ml-3 text-xs text-gray-400 font-normal">
                  {unassigned.length} concept{unassigned.length !== 1 ? "s" : ""}
                </span>
              </td>
            </tr>
            {unassigned.map((creative, i) => (
              <CreativeRow
                key={creative.id}
                creative={creative}
                index={i + 1}
                rowIndex={i}
                onUpdate={updateField}
                onDelete={deleteCreative}
                onNav={navigate}
              />
            ))}
            <tr>
              <td colSpan={COL_SPAN} className="px-3 py-2 border-b border-zinc-700">
                {addingConcept ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={addInputRef}
                      autoFocus
                      type="text"
                      value={newConcept}
                      onChange={(e) => setNewConcept(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addConcept()
                        if (e.key === "Escape") { setAddingConcept(false); setNewConcept("") }
                      }}
                      onBlur={() => { if (!newConcept.trim()) setAddingConcept(false) }}
                      placeholder="Describe the concept..."
                      className="flex-1 text-sm text-gray-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-600 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-bloom"
                    />
                    <button onClick={addConcept} disabled={saving || !newConcept.trim()} className="text-sm bg-bloom text-white px-3 py-1.5 rounded-lg hover:bg-bloom-dark disabled:opacity-50">
                      {saving ? "Adding..." : "Add"}
                    </button>
                    <button onClick={() => { setAddingConcept(false); setNewConcept("") }} className="text-sm text-gray-400 hover:text-gray-200">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setAddingConcept(true)} className="text-sm text-gray-400 hover:text-bloom-leaf flex items-center gap-1 transition-colors">
                    <span className="text-base leading-none font-light">+</span>
                    <span>Add concept</span>
                  </button>
                )}
              </td>
            </tr>

            {/* Batched ads — newest first */}
            {batches.map((batch) => {
              const batchStartRow = unassigned.length + batches
                .slice(0, batches.indexOf(batch))
                .reduce((n, b) => n + b.creatives.length, 0)
              return (
                <Fragment key={batch.id}>
                  <tr>
                    <td colSpan={COL_SPAN} className="bg-zinc-900 px-4 py-2 border-y border-zinc-700">
                      <BatchNameCell name={batch.name} onSave={(n) => renameBatch(batch.id, n)} />
                      <span className="ml-3 text-xs text-gray-400 font-normal">{batch.creatives.length} / 10</span>
                      {batch.sealed && (
                        <span className="ml-2 text-xs bg-zinc-700 text-gray-300 px-1.5 py-0.5 rounded-full">complete</span>
                      )}
                    </td>
                  </tr>
                  {batch.creatives.map((creative, i) => (
                    <CreativeRow
                      key={creative.id}
                      creative={creative}
                      index={i + 1}
                      rowIndex={batchStartRow + i}
                      onUpdate={updateField}
                      onDelete={deleteCreative}
                      onNav={navigate}
                    />
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreativeRow({
  creative, index, rowIndex, onUpdate, onDelete, onNav,
}: {
  creative: Creative
  index: number
  rowIndex: number
  onUpdate: (id: string, field: string, value: unknown) => void
  onDelete: (id: string, concept: string) => void
  onNav: (row: number, col: number, dir: NavDir) => void
}) {
  const nav = (col: number) => (dir: NavDir) => onNav(rowIndex, col, dir)

  return (
    <tr className="group hover:bg-zinc-700/50 transition-colors border-b border-zinc-700 last:border-0">
      <td className="px-3 py-1.5 text-gray-500 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDelete(creative.id, creative.concept)}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none"
            title="Delete concept"
          >
            ×
          </button>
          <span>{index}</span>
        </div>
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-0`} value={creative.concept} onSave={(v) => onUpdate(creative.id, "concept", v)} multiline onNav={nav(0)} className="font-medium text-gray-100 min-w-[220px]" />
      </td>
      <td className="px-2 py-1">
        <BriefCell cellId={`${rowIndex}-1`} value={creative.briefLink} onSave={(v) => onUpdate(creative.id, "briefLink", v)} onNav={nav(1)} />
      </td>
      <td className="px-1 py-1">
        <ProjectTypeCell cellId={`${rowIndex}-2`} value={creative.projectType} onSave={(v) => onUpdate(creative.id, "projectType", v)} onNav={nav(2)} />
      </td>
      <td className="px-1 py-1">
        <StyleCell cellId={`${rowIndex}-3`} value={creative.style} onSave={(v) => onUpdate(creative.id, "style", v)} onNav={nav(3)} />
      </td>
      <td className="px-1 py-1">
        <CEOStatusCell cellId={`${rowIndex}-4`} value={creative.ceoStatus} onSave={(v) => onUpdate(creative.id, "ceoStatus", v)} onNav={nav(4)} />
      </td>
      <td className="px-1 py-1">
        <AdNumberCell cellId={`${rowIndex}-5`} value={creative.adNumber} driveLink={creative.editorDriveLink} onSave={(v) => onUpdate(creative.id, "adNumber", v)} onNav={nav(5)} />
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-6`} value={creative.extraInfo ?? ""} onSave={(v) => onUpdate(creative.id, "extraInfo", v || null)} placeholder="—" onNav={nav(6)} className="text-gray-300 text-xs" />
      </td>
      <td className="px-1 py-1">
        <DateCell cellId={`${rowIndex}-7`} value={creative.launchDate} onSave={(v) => onUpdate(creative.id, "launchDate", v)} onNav={nav(7)} />
      </td>
      <td className="px-1 py-1">
        <ResultCell cellId={`${rowIndex}-8`} value={creative.result} onSave={(v) => onUpdate(creative.id, "result", v)} onNav={nav(8)} />
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-9`} value={creative.learnings ?? ""} onSave={(v) => onUpdate(creative.id, "learnings", v || null)} placeholder="—" multiline onNav={nav(9)} className="text-gray-300 text-xs" />
      </td>
      <td className="px-1 py-1">
        <NumberCell cellId={`${rowIndex}-10`} value={creative.spend} onSave={(v) => onUpdate(creative.id, "spend", v)} prefix="$" onNav={nav(10)} />
      </td>
      <td className="px-1 py-1">
        <NumberCell cellId={`${rowIndex}-11`} value={creative.roas} onSave={(v) => onUpdate(creative.id, "roas", v)} decimals={2} onNav={nav(11)} />
      </td>
    </tr>
  )
}

function BatchNameCell({ name, onSave }: { name: string; onSave: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onSave(trimmed)
    else setDraft(name)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit() }
          if (e.key === "Escape") { setDraft(name); setEditing(false) }
        }}
        className="font-bold text-gray-100 text-sm bg-zinc-800 border border-bloom rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-bloom/40"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(name); setEditing(true) }}
      className="font-bold text-gray-100 text-sm hover:text-bloom-leaf transition-colors"
      title="Click to rename"
    >
      {name}
    </button>
  )
}

function ProjectTypeCell({ value, onSave, cellId, onNav }: { value: string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value ?? ""}
        onChange={(e) => { onSave(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); setEditing(false); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { setEditing(false); onNav("enter") }
          if (e.key === "Escape") setEditing(false)
        }}
        className="text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      >
        <option value="">— No type</option>
        {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)} className="cursor-pointer min-h-[28px] px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all">
      {value
        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${PROJECT_TYPE_COLORS[value] ?? "bg-gray-100 text-gray-600"}`}>{value}</span>
        : <span className="text-xs text-gray-500 italic">—</span>
      }
    </div>
  )
}

function StyleCell({ value, onSave, cellId, onNav }: { value: string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value ?? ""}
        onChange={(e) => { onSave(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); setEditing(false); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { setEditing(false); onNav("enter") }
          if (e.key === "Escape") setEditing(false)
        }}
        className="text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      >
        <option value="">— No style</option>
        {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)} className="cursor-pointer min-h-[28px] px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all">
      {value
        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STYLE_COLORS[value] ?? "bg-gray-100 text-gray-600"}`}>{value}</span>
        : <span className="text-xs text-gray-500 italic">—</span>
      }
    </div>
  )
}

function CEOStatusCell({ value, onSave, cellId, onNav }: { value: string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)
  const current = CEO_STATUSES.find((s) => s.value === value)

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={value ?? ""}
        onChange={(e) => { onSave(e.target.value || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); setEditing(false); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { setEditing(false); onNav("enter") }
          if (e.key === "Escape") setEditing(false)
        }}
        className="text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      >
        <option value="">— No status</option>
        {CEO_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)} className="cursor-pointer min-h-[28px] px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all">
      {current
        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${CEO_STATUS_COLORS[current.value]}`}>{current.label}</span>
        : <span className="text-xs text-gray-500 italic">— Set status</span>
      }
    </div>
  )
}

function EditableCell({ value, onSave, placeholder = "—", multiline = false, className = "", cellId, onNav }: {
  value: string; onSave: (value: string) => void; placeholder?: string; multiline?: boolean; className?: string; cellId: string; onNav: (d: NavDir) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() { setDraft(value); setEditing(true) }
  function commit() { setEditing(false); if (draft !== value) onSave(draft) }
  function cancel() { setEditing(false); setDraft(value) }

  if (editing) {
    const sharedKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
      if (e.key === "Escape") cancel()
    }
    if (multiline) {
      return (
        <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={sharedKeyDown} rows={2}
          className="w-full text-sm text-gray-900 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 resize-none bg-white"
        />
      )
    }
    return (
      <input autoFocus type="text" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => { sharedKeyDown(e); if (!e.defaultPrevented && e.key === "Enter") { commit(); onNav("enter") } }}
        className="w-full text-sm text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  return (
    <div data-cell={cellId} onClick={startEdit}
      className={`min-h-[28px] px-2 py-1 rounded-lg cursor-text hover:bg-zinc-700/60 transition-all ${className} ${!value ? "text-gray-500 italic" : ""}`}
    >
      {value || placeholder}
    </div>
  )
}

function AdNumberCell({ value, driveLink, onSave, cellId, onNav }: {
  value: string | null
  driveLink: string | null
  onSave: (v: string | null) => void
  cellId: string
  onNav: (d: NavDir) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== (value ?? "")) onSave(trimmed || null)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { commit(); onNav("enter") }
          if (e.key === "Escape") { setEditing(false); setDraft(value ?? "") }
        }}
        className="w-full text-xs font-mono text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  if (value && driveLink) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={driveLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-mono text-blue-400 hover:text-blue-300 hover:underline"
        >
          {value} ↗
        </a>
        <button data-cell={cellId} onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
      </div>
    )
  }

  return (
    <button
      data-cell={cellId}
      onClick={() => setEditing(true)}
      className={`w-full text-left text-xs font-mono px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all min-h-[28px] ${value ? "text-gray-200" : "text-gray-500 italic"}`}
    >
      {value || "—"}
    </button>
  )
}

function BriefCell({ value, onSave, cellId, onNav }: { value: string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== (value ?? "")) onSave(trimmed || null)
  }

  if (editing) {
    return (
      <input autoFocus type="url" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { commit(); onNav("enter") }
          if (e.key === "Escape") { setEditing(false); setDraft(value ?? "") }
        }}
        placeholder="https://..."
        className="w-full text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  if (value) {
    return (
      <div className="flex items-center gap-1">
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline" onClick={(e) => e.stopPropagation()}>
          Brief ↗
        </a>
        <button data-cell={cellId} onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
      </div>
    )
  }

  return (
    <button data-cell={cellId} onClick={() => setEditing(true)} className="text-xs text-gray-500 italic hover:text-bloom-leaf px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all min-h-[28px]">
      + link
    </button>
  )
}

function DateCell({ value, onSave, cellId, onNav }: { value: Date | string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)
  const formatted = value ? new Date(value).toISOString().split("T")[0] : ""
  const display = value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null

  if (editing) {
    return (
      <input autoFocus type="date" defaultValue={formatted}
        onBlur={(e) => { onSave(e.target.value || null); setEditing(false) }}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); onSave((e.target as HTMLInputElement).value || null); setEditing(false); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { onSave((e.target as HTMLInputElement).value || null); setEditing(false); onNav("enter") }
          if (e.key === "Escape") setEditing(false)
        }}
        className="text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)}
      className={`min-h-[28px] px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-700/60 transition-all text-xs ${display ? "text-gray-200" : "text-gray-500 italic"}`}
    >
      {display ?? "—"}
    </div>
  )
}

function ResultCell({ value, onSave, cellId, onNav }: { value: Result | null; onSave: (v: Result | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <select autoFocus defaultValue={value ?? ""}
        onChange={(e) => { onSave((e.target.value as Result) || null); setEditing(false) }}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); setEditing(false); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { setEditing(false); onNav("enter") }
          if (e.key === "Escape") setEditing(false)
        }}
        className="text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      >
        <option value="">—</option>
        <option value="FAILED">Failed</option>
        <option value="WINNER">Winner</option>
        <option value="BIG_WINNER">BIG WINNER</option>
        <option value="SPENT_BUT_POOR_PERFORMANCE">Spent (Poor Perf)</option>
      </select>
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)} className="cursor-pointer min-h-[28px] px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all">
      {value
        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${RESULT_COLORS[value]}`}>{RESULT_LABELS[value]}</span>
        : <span className="text-xs text-gray-500 italic">—</span>
      }
    </div>
  )
}

function NumberCell({ value, onSave, prefix = "", decimals = 0, cellId, onNav }: {
  value: number | null; onSave: (v: number | null) => void; prefix?: string; decimals?: number; cellId: string; onNav: (d: NavDir) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value !== null ? String(value) : "")

  function commit() {
    setEditing(false)
    const parsed = parseFloat(draft)
    const newVal = isNaN(parsed) ? null : parsed
    if (newVal !== value) onSave(newVal)
  }

  const display = value !== null
    ? `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
    : null

  if (editing) {
    return (
      <input autoFocus type="number" step="any" value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
          if (e.key === "Enter") { commit(); onNav("enter") }
          if (e.key === "Escape") { setEditing(false); setDraft(value !== null ? String(value) : "") }
        }}
        className="w-full text-xs text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  return (
    <div data-cell={cellId} onClick={() => { setDraft(value !== null ? String(value) : ""); setEditing(true) }}
      className={`min-h-[28px] px-2 py-1 rounded-lg cursor-pointer hover:bg-zinc-700/60 transition-all text-xs ${display ? "text-gray-200" : "text-gray-500 italic"}`}
    >
      {display ?? "—"}
    </div>
  )
}
