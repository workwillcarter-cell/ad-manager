"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import type { Role } from "@/generated/prisma/client"

const ROLE_LABELS: Record<Role, string> = {
  CEO: "CEO",
  AI_GENERATOR: "AI Generator",
  EDITOR: "Editor",
}

export default function Navbar({ user }: { user: { name?: string | null; role: Role } }) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-gray-900 text-base">
          Ad Manager
        </Link>
        {user.role === "CEO" && (
          <Link href="/dashboard/team" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Team
          </Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
