import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDropboxAuthUrl } from "@/lib/dropbox"
import { getCanonicalAppUrl } from "@/lib/app-url"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const redirectUri = `${getCanonicalAppUrl()}/api/auth/dropbox/callback`
  const authUrl = await getDropboxAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
