import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createDriveFolder } from "@/lib/drive"

// Root Drive folder where per-concept brief folders are created.
// Override with BRIEF_FOLDER_ROOT_ID env var if it ever moves.
const BRIEF_FOLDER_ROOT_ID =
  process.env.BRIEF_FOLDER_ROOT_ID || "1tosL8kTKfpLXDY74oSr2fEupqMuZSgc4"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "CEO") {
    return NextResponse.json({ error: "Only CEO can create brief folders" }, { status: 403 })
  }

  const { id } = await params

  const creative = await prisma.creative.findUnique({
    where: { id },
    select: { concept: true, briefLink: true, kind: true },
  })
  if (!creative) return NextResponse.json({ error: "Creative not found" }, { status: 404 })
  if (creative.kind === "PAYMENT_CREDIT") {
    return NextResponse.json({ error: "Cannot create brief folder for a payment credit" }, { status: 400 })
  }
  if (creative.briefLink) {
    return NextResponse.json({ error: "Brief link already set — clear it first to recreate" }, { status: 409 })
  }
  const concept = creative.concept.trim()
  if (!concept) {
    return NextResponse.json({ error: "Concept is empty — name the concept before creating a brief folder" }, { status: 400 })
  }

  let folder
  try {
    folder = await createDriveFolder(concept, BRIEF_FOLDER_ROOT_ID)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Drive folder creation failed"
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  await prisma.creative.update({
    where: { id },
    data: { briefLink: folder.url },
  })

  return NextResponse.json({ briefLink: folder.url, folderId: folder.id })
}
