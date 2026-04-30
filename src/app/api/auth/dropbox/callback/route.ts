import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { exchangeDropboxCode } from "@/lib/dropbox"
import { getCanonicalAppUrl } from "@/lib/app-url"

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "CEO") {
    return NextResponse.json({ error: "CEO only" }, { status: 403 })
  }

  const appUrl = getCanonicalAppUrl()
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/setup?error=${encodeURIComponent(error)}`)
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl}/dashboard/setup?error=missing_code`)
  }

  const redirectUri = `${appUrl}/api/auth/dropbox/callback`

  try {
    await exchangeDropboxCode(code, redirectUri)
    return NextResponse.redirect(`${appUrl}/dashboard/setup?connected=dropbox`)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.redirect(`${appUrl}/dashboard/setup?error=${encodeURIComponent(message)}`)
  }
}
