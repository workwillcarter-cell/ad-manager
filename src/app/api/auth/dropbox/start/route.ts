import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getDropboxAuthUrl } from "@/lib/dropbox"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const redirectUri = new URL("/api/auth/dropbox/callback", req.url).toString()
  const authUrl = await getDropboxAuthUrl(redirectUri)
  return NextResponse.redirect(authUrl)
}
