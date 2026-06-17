"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(
      `Remove ${userName}? They'll lose access immediately. Any projects, batches, or history they logged stay on the boards (reassigned to you). This can't be undone.`,
    )) return

    setLoading(true)
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || "Failed to remove user")
      setLoading(false)
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Removing…" : "Remove"}
    </button>
  )
}
