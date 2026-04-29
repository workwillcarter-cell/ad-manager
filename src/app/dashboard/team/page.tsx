import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import AddUserButton from "@/components/AddUserButton"
import type { Role } from "@/generated/prisma/client"

const ROLE_LABELS: Record<Role, string> = {
  CEO: "CEO",
  AI_GENERATOR: "AI Generator",
  EDITOR: "Editor",
}

const ROLE_COLORS: Record<Role, string> = {
  CEO: "bg-blue-100 text-blue-700",
  AI_GENERATOR: "bg-purple-100 text-purple-700",
  EDITOR: "bg-orange-100 text-orange-700",
}

export default async function TeamPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CEO") redirect("/dashboard")

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-sm text-bloom-soft/80 mt-0.5">Manage your team members</p>
        </div>
        <AddUserButton />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {users.map((user, i) => (
          <div
            key={user.id}
            className={`flex items-center justify-between px-5 py-4 ${i !== 0 ? "border-t border-gray-100" : ""}`}
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
