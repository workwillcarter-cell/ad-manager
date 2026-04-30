import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { exchangeDriveCode } from "@/lib/drive"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(error)}`, req.url))
  }
  if (!code) {
    return NextResponse.redirect(new URL("/setup?error=missing_code", req.url))
  }

  const redirectUri = new URL("/api/auth/google/callback", req.url).toString()

  try {
    await exchangeDriveCode(code, redirectUri)
    return NextResponse.redirect(new URL("/setup?connected=drive", req.url))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(message)}`, req.url))
  }
}
