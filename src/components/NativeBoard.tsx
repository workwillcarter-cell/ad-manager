"use client"

import { useState, useRef, Fragment } from "react"
import { useRouter } from "next/navigation"
import type { Result } from "@/generated/prisma/client"

// A self-contained board: native ads never touch the AIG/Editor boards or Dropbox.
// Ready ads sit un-batched (unlimited); marking one Launched groups it with the
// other ads launched that same day into a batch below.

type NativeAd = {
  id: string
  concept: string
  briefLink: string | null
  adNumber: string | null
  status: string | null
  style: string | null
  extraInfo: string | null
  learnings: string | null
  launchDate: Date | string | null
  result: Result | null
  spend: number | null
  roas: number | null
}

type NativeBatch = {
  id: string
  name: string
  number: number | null
  launchDate: Date | string | null
  ads: NativeAd[]
}

const STATUSES = [
  { value: "SCRIPT_COMPLETE", label: "Script Complete" },
  { value: "IMAGE_COMPLETE",  label: "Image Complete" },
  { value: "READY",           label: "Ready" },
  { value: "LAUNCHED",        label: "Launched" },
]

const STATUS_COLORS: Record<string, string> = {
  SCRIPT_COMPLETE: "bg-yellow-100 text-yellow-700",
  IMAGE_COMPLETE:  "bg-blue-100 text-blue-700",
  READY:           "bg-green-100 text-green-700",
  LAUNCHED:        "bg-pink-100 text-pink-700",
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

const COL_SPAN = 12
const TOTAL_COLS = 11 // 0=concept 1=brief 2=style 3=status 4=adNumber 5=extraInfo 6=launchDate 7=result 8=learnings 9=spend 10=roas

type NavDir = "tab" | "shift-tab" | "enter"

export default function NativeBoard({
  planning,
  ready,
  batches,
}: {
  planning: NativeAd[]
  ready: NativeAd[]
  batches: NativeBatch[]
}) {
  const router = useRouter()
  const [addingConcept, setAddingConcept] = useState(false)
  const [newConcept, setNewConcept] = useState("")
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState("")
  const addInputRef = useRef<HTMLInputElement>(null)

  // Search filter — matches across the ad's text fields
  const q = query.trim().toLowerCase()
  const matches = (a: NativeAd) =>
    !q ||
    [a.concept, a.extraInfo, a.learnings, a.adNumber, a.style, a.result]
      .some((v) => v != null && String(v).toLowerCase().includes(q))

  const planningRows = planning.filter(matches)
  const readyRows = ready.filter(matches)
  const filteredBatches = q
    ? batches.map((b) => ({ ...b, ads: b.ads.filter(matches) })).filter((b) => b.ads.length > 0)
    : batches

  // Flat ordered list of all rows for keyboard navigation
  const allRows = [...planningRows, ...readyRows, ...filteredBatches.flatMap((b) => b.ads)]

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
    await fetch("/api/native-ads", {
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
    await fetch(`/api/native-ads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    router.refresh()
  }

  async function deleteAd(id: string, concept: string) {
    if (!confirm(`Delete "${concept}"? This cannot be undone.`)) return
    await fetch(`/api/native-ads/${id}`, { method: "DELETE" })
    router.refresh()
  }

  async function renameBatch(id: string, name: string) {
    await fetch(`/api/native-batches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    router.refresh()
  }

  const totalAds = allRows.length

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Native Ads</h1>
          <p className="text-sm text-bloom-soft/80 mt-0.5">Self-contained native ad tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search native ads..."
              className="text-sm text-gray-100 placeholder-zinc-500 bg-zinc-900 border border-zinc-600 rounded-lg pl-3 pr-8 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-bloom"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-gray-200 text-base leading-none"
                title="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-sm text-bloom-soft/70 whitespace-nowrap">
            {totalAds} ad{totalAds !== 1 ? "s" : ""} · {filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide bg-zinc-900">
              <th className="px-3 py-2.5 text-left w-8 rounded-tl-xl border-b border-zinc-700">#</th>
              <th className="px-3 py-2.5 text-left min-w-[200px] border-b border-zinc-700">Concept</th>
              <th className="px-3 py-2.5 text-left w-24 border-b border-zinc-700">Brief / Ad</th>
              <th className="px-3 py-2.5 text-left w-32 border-b border-zinc-700">Style</th>
              <th className="px-3 py-2.5 text-left w-36 border-b border-zinc-700">Status</th>
              <th className="px-3 py-2.5 text-left w-24 border-b border-zinc-700">Ad #</th>
              <th className="px-3 py-2.5 text-left w-72 border-b border-zinc-700">Extra Info</th>
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
                  {planningRows.length} ad{planningRows.length !== 1 ? "s" : ""}
                </span>
              </td>
            </tr>
            {!q && <tr>
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
                      placeholder="Describe the native ad..."
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
                    <span>Add native ad</span>
                  </button>
                )}
              </td>
            </tr>}
            {planningRows.map((ad, i) => (
              <NativeRow
                key={ad.id}
                ad={ad}
                index={i + 1}
                rowIndex={i}
                onUpdate={updateField}
                onDelete={deleteAd}
                onNav={navigate}
              />
            ))}

            {/* Ready section — un-batched, unlimited */}
            <tr>
              <td colSpan={COL_SPAN} className="bg-zinc-900 px-4 py-2 border-y border-zinc-700">
                <span className="font-bold text-gray-100 text-sm">Ready</span>
                <span className="ml-3 text-xs text-gray-400 font-normal">
                  {readyRows.length} ad{readyRows.length !== 1 ? "s" : ""}
                </span>
              </td>
            </tr>
            {readyRows.map((ad, i) => (
              <NativeRow
                key={ad.id}
                ad={ad}
                index={i + 1}
                rowIndex={planningRows.length + i}
                onUpdate={updateField}
                onDelete={deleteAd}
                onNav={navigate}
              />
            ))}

            {/* Launched — grouped by day, newest first */}
            {filteredBatches.map((batch) => {
              const batchStartRow = planningRows.length + readyRows.length + filteredBatches
                .slice(0, filteredBatches.indexOf(batch))
                .reduce((n, b) => n + b.ads.length, 0)
              return (
                <Fragment key={batch.id}>
                  <tr>
                    <td colSpan={COL_SPAN} className="bg-zinc-900 px-4 py-2 border-y border-zinc-700">
                      <div className="flex items-center gap-3 flex-wrap">
                        <BatchNameCell name={batch.name} onSave={(n) => renameBatch(batch.id, n)} />
                        <span className="text-xs text-gray-400 font-normal">{batch.ads.length} launched</span>
                      </div>
                    </td>
                  </tr>
                  {batch.ads.map((ad, i) => (
                    <NativeRow
                      key={ad.id}
                      ad={ad}
                      index={i + 1}
                      rowIndex={batchStartRow + i}
                      onUpdate={updateField}
                      onDelete={deleteAd}
                      onNav={navigate}
                    />
                  ))}
                </Fragment>
              )
            })}

            {q && allRows.length === 0 && (
              <tr>
                <td colSpan={COL_SPAN} className="px-4 py-8 text-center text-sm text-gray-500">
                  No native ads match “{query}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NativeRow({
  ad, index, rowIndex, onUpdate, onDelete, onNav,
}: {
  ad: NativeAd
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
            onClick={() => onDelete(ad.id, ad.concept)}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm leading-none"
            title="Delete native ad"
          >
            ×
          </button>
          <span>{index}</span>
        </div>
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-0`} value={ad.concept} onSave={(v) => onUpdate(ad.id, "concept", v)} multiline onNav={nav(0)} className="font-medium text-gray-100 min-w-[180px]" />
      </td>
      <td className="px-2 py-1">
        <BriefCell cellId={`${rowIndex}-1`} value={ad.briefLink} concept={ad.concept} nativeAdId={ad.id} onSave={(v) => onUpdate(ad.id, "briefLink", v)} onNav={nav(1)} />
      </td>
      <td className="px-1 py-1">
        <StyleCell cellId={`${rowIndex}-2`} value={ad.style} onSave={(v) => onUpdate(ad.id, "style", v)} onNav={nav(2)} />
      </td>
      <td className="px-1 py-1">
        <StatusCell cellId={`${rowIndex}-3`} value={ad.status} onSave={(v) => onUpdate(ad.id, "status", v)} onNav={nav(3)} />
      </td>
      <td className="px-1 py-1">
        <AdNumberCell cellId={`${rowIndex}-4`} value={ad.adNumber} driveLink={ad.briefLink} onSave={(v) => onUpdate(ad.id, "adNumber", v)} onNav={nav(4)} />
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-5`} value={ad.extraInfo ?? ""} onSave={(v) => onUpdate(ad.id, "extraInfo", v || null)} placeholder="—" multiline onNav={nav(5)} className="text-gray-300 text-xs" />
      </td>
      <td className="px-1 py-1">
        <DateCell cellId={`${rowIndex}-6`} value={ad.launchDate} onSave={(v) => onUpdate(ad.id, "launchDate", v)} onNav={nav(6)} />
      </td>
      <td className="px-1 py-1">
        <ResultCell cellId={`${rowIndex}-7`} value={ad.result} onSave={(v) => onUpdate(ad.id, "result", v)} onNav={nav(7)} />
      </td>
      <td className="px-1 py-1">
        <EditableCell cellId={`${rowIndex}-8`} value={ad.learnings ?? ""} onSave={(v) => onUpdate(ad.id, "learnings", v || null)} placeholder="—" multiline onNav={nav(8)} className="text-gray-300 text-xs" />
      </td>
      <td className="px-1 py-1">
        <NumberCell cellId={`${rowIndex}-9`} value={ad.spend} onSave={(v) => onUpdate(ad.id, "spend", v)} prefix="$" onNav={nav(9)} />
      </td>
      <td className="px-1 py-1">
        <NumberCell cellId={`${rowIndex}-10`} value={ad.roas} onSave={(v) => onUpdate(ad.id, "roas", v)} decimals={2} onNav={nav(10)} />
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

function StatusCell({ value, onSave, cellId, onNav }: { value: string | null; onSave: (v: string | null) => void; cellId: string; onNav: (d: NavDir) => void }) {
  const [editing, setEditing] = useState(false)
  const current = STATUSES.find((s) => s.value === value)

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
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    )
  }

  return (
    <div data-cell={cellId} onClick={() => setEditing(true)} className="cursor-pointer min-h-[28px] px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all">
      {current
        ? <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLORS[current.value]}`}>{current.label}</span>
        : <span className="text-xs text-gray-500 italic">— Set status</span>
      }
    </div>
  )
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

function renderWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(URL_PATTERN)
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-400 hover:text-blue-300 hover:underline break-all"
        >
          {part}
        </a>
      )
    }
    return part
  })
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
    if (multiline) {
      return (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
            else if (e.key === "Escape") cancel()
            else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
              e.preventDefault(); commit(); onNav("enter")
            }
          }}
          rows={3}
          className="w-full text-sm text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 resize-y bg-zinc-900 whitespace-pre-wrap"
        />
      )
    }
    return (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Tab") { e.preventDefault(); commit(); onNav(e.shiftKey ? "shift-tab" : "tab") }
          else if (e.key === "Escape") cancel()
          else if (e.key === "Enter") { commit(); onNav("enter") }
        }}
        className="w-full text-sm text-gray-100 border border-bloom rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-bloom/40 bg-zinc-900"
      />
    )
  }

  return (
    <div data-cell={cellId} onClick={startEdit}
      className={`min-h-[28px] px-2 py-1 rounded-lg cursor-text hover:bg-zinc-700/60 transition-all whitespace-pre-wrap break-words ${className} ${!value ? "text-gray-500 italic" : ""}`}
    >
      {value ? renderWithLinks(value) : placeholder}
    </div>
  )
}

// Ad # links out to the brief/ad link (the brief doubles as the finished ad).
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

// The brief link IS the finished-ad link on this board.
// Like the CEO board, an empty cell offers a one-click "create Drive folder"
// (named after the concept) as well as a paste-a-link option.
function BriefCell({ value, concept, nativeAdId, onSave, cellId, onNav }: {
  value: string | null
  concept: string
  nativeAdId: string
  onSave: (v: string | null) => void
  cellId: string
  onNav: (d: NavDir) => void
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [creating, setCreating] = useState(false)

  function commit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== (value ?? "")) onSave(trimmed || null)
  }

  async function createFolder() {
    if (creating) return
    if (!concept.trim()) {
      alert("Add a concept name first, then click again to create the brief folder.")
      return
    }
    setCreating(true)
    try {
      const res = await fetch(`/api/native-ads/${nativeAdId}/create-brief-folder`, { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(json.error ?? `Failed to create folder (${res.status})`)
        return
      }
      router.refresh()
    } finally {
      setCreating(false)
    }
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
          Open ↗
        </a>
        <button data-cell={cellId} onClick={() => setEditing(true)} className="text-gray-500 hover:text-gray-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <button
        data-cell={cellId}
        onClick={createFolder}
        disabled={creating}
        title="Create a Drive folder named after this concept"
        className="text-xs text-gray-400 italic hover:text-bloom-leaf px-2 py-1 rounded-lg hover:bg-zinc-700/60 transition-all min-h-[28px] disabled:opacity-50"
      >
        {creating ? "Creating…" : "📁 + folder"}
      </button>
      <button
        onClick={() => setEditing(true)}
        title="Paste a link instead"
        className="text-gray-500 hover:text-gray-200 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ✎
      </button>
    </div>
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
