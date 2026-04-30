import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDriveAuthUrl } from "@/lib/drive"
import { getCanonicalAppUrl } from "@/lib/app-url"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const redirectUri = `${getCanonicalAppUrl()}/api/auth/google/callback`
  const authUrl = getDriveAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
