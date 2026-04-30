import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

function describe(name: string) {
  const value = process.env[name]
  if (value === undefined) return { name, present: false, length: 0 }
  return {
    name,
    present: true,
    length: value.length,
    head: value.slice(0, 8),
    tail: value.slice(-6),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  return NextResponse.json({
    GOOGLE_CLIENT_ID: describe("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: describe("GOOGLE_CLIENT_SECRET"),
    DROPBOX_CLIENT_ID: describe("DROPBOX_CLIENT_ID"),
    DROPBOX_CLIENT_SECRET: describe("DROPBOX_CLIENT_SECRET"),
    DATABASE_URL: { present: !!process.env.DATABASE_URL },
    NEXTAUTH_SECRET: { present: !!process.env.NEXTAUTH_SECRET },
  })
}
