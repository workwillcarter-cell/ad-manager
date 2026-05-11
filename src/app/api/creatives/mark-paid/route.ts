import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/creatives/mark-paid
// Body: { scope: "aig" | "editor" }
// CEO-only. Flips every Complete/Paid card on the chosen side where <scope>Paid=false to true.
// Excludes payment-credit cards.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") {
    return NextResponse.json({ error: "Only CEO can bulk mark paid" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const scope = body.scope === "aig" ? "aig" : body.scope === "editor" ? "editor" : null
  if (!scope) {
    return NextResponse.json({ error: "scope must be 'aig' or 'editor'" }, { status: 400 })
  }

  const result = scope === "aig"
    ? await prisma.creative.updateMany({
        where: {
          aigStatus: { in: ["COMPLETE", "ADDED_TO_EDITOR", "PAID"] },
          aigPaid: false,
          OR: [{ kind: null }, { kind: { not: "PAYMENT_CREDIT" } }],
        },
        data: { aigPaid: true },
      })
    : await prisma.creative.updateMany({
        where: {
          editorStatus: { in: ["COMPLETE", "PAID"] },
          editorPaid: false,
          OR: [{ kind: null }, { kind: { not: "PAYMENT_CREDIT" } }],
        },
        data: { editorPaid: true },
      })

  return NextResponse.json({ updated: result.count })
}
