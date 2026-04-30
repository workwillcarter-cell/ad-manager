"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import type { Role } from "@/generated/prisma/client"

const ROLE_LABELS: Record<Role, string> = {
  CEO: "CEO",
  AI_GENERATOR: "AI Generator",
  EDITOR: "Editor",
}

export default function Navbar({ user }: { user: { name?: string | null; role: Role } }) {
  const path = usePathname()

  const navLink = (href: string, label: string) => {
    const active = path === href
    return (
      <Link
        href={href}
        className={`text-sm transition-colors relative py-1 ${
          active
            ? "text-bloom-charcoal font-semibold"
            : "text-gray-500 hover:text-bloom-charcoal"
        }`}
      >
        {label}
        {active && (
          <span className="absolute -bottom-[14px] left-0 right-0 h-[2px] bg-bloom rounded-full" />
        )}
      </Link>
    )
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-7">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/bloomacare-logo.png"
            alt="BloomaCare"
            width={280}
            height={80}
            priority
            className="h-16 w-auto"
          />
        </Link>
        {(user.role === "CEO" || user.role === "AI_GENERATOR" || user.role === "EDITOR") && navLink("/dashboard", "CEO Board")}
        {(user.role === "CEO" || user.role === "AI_GENERATOR") && navLink("/dashboard/aig", "AIG Board")}
        {(user.role === "CEO" || user.role === "EDITOR") && navLink("/dashboard/editor", "Editor Board")}
        {user.role === "CEO" && navLink("/dashboard/team", "Team")}
        {user.role === "CEO" && navLink("/dashboard/setup", "Setup")}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-bloom-charcoal">{user.name}</p>
          <p className="text-xs text-gray-400">{ROLE_LABELS[user.role]}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-bloom-charcoal transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
