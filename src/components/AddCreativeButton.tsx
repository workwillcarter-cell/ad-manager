"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AddCreativeButton({ batchId }: { batchId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [concept, setConcept] = useState("")
  const [briefLink, setBriefLink] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!concept.trim()) return
    setLoading(true)
    await fetch("/api/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept: concept.trim(), briefLink: briefLink.trim() || undefined, batchId }),
    })
    router.refresh()
    setConcept("")
    setBriefLink("")
    setOpen(false)
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Add Creative
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 mb-4">Add Creative</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concept</label>
                <textarea
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Describe the creative concept..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brief Link (optional)</label>
                <input
                  type="url"
                  value={briefLink}
                  onChange={(e) => setBriefLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !concept.trim()}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Creative"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
