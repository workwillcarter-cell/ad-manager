import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import NativeBoard from "@/components/NativeBoard"

const AD_SELECT = {
  id: true, concept: true, briefLink: true, adNumber: true, status: true,
  style: true, extraInfo: true, learnings: true, launchDate: true,
  result: true, spend: true, roas: true,
}

export default async function NativeAdsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "CEO") redirect("/dashboard")

  // Planning: un-batched ads that aren't Ready yet (status null / Script / Image)
  const planning = await prisma.nativeAd.findMany({
    where: { batchId: null, OR: [{ status: null }, { status: { notIn: ["READY", "LAUNCHED"] } }] },
    orderBy: { createdAt: "asc" },
    select: AD_SELECT,
  })

  // Ready: un-batched ads marked Ready (unlimited, not yet launched)
  const ready = await prisma.nativeAd.findMany({
    where: { batchId: null, status: "READY" },
    orderBy: { createdAt: "asc" },
    select: AD_SELECT,
  })

  // Launched: grouped into per-day batches, newest day first
  const batchesRaw = await prisma.nativeBatch.findMany({
    orderBy: { launchDate: "desc" },
    include: { ads: { orderBy: { createdAt: "asc" }, select: AD_SELECT } },
  })
  const batches = batchesRaw
    .filter((b) => b.ads.length > 0)
    .map((b) => ({ id: b.id, name: b.name, number: b.number, launchDate: b.launchDate, ads: b.ads }))

  return <NativeBoard planning={planning} ready={ready} batches={batches} />
}
