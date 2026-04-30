import { prisma } from "@/lib/prisma"
import {
  extractDriveFolderId,
  listDriveFolderFiles,
  downloadDriveFile,
  getFileExtension,
} from "@/lib/drive"
import {
  dropboxFolderExists,
  uploadStreamToDropbox,
} from "@/lib/dropbox"

export const EXPECTED_FILE_COUNT = 3
const DROPBOX_TARGET_FOLDER = "/Ads"

export async function runTransfer(creativeId: string) {
  const creative = await prisma.creative.findUnique({ where: { id: creativeId } })
  if (!creative) throw new Error("Creative not found")
  if (!creative.adNumber) throw new Error("No ad number assigned yet")
  if (!creative.editorDriveLink) throw new Error("No editor Drive link on this ad")
  if (creative.editorStatus !== "COMPLETE") throw new Error("Editor hasn't marked this ad Complete")

  const folderId = extractDriveFolderId(creative.editorDriveLink)
  if (!folderId) throw new Error("Couldn't read folder ID from editor's Drive link")

  const adName = creative.adNumber

  await prisma.creative.update({
    where: { id: creativeId },
    data: { transferStatus: "IN_PROGRESS", transferError: null },
  })

  try {
    const files = await listDriveFolderFiles(folderId)
    if (files.length !== EXPECTED_FILE_COUNT) {
      throw new Error(
        `Expected ${EXPECTED_FILE_COUNT} files in the editor's Drive folder, found ${files.length}.`,
      )
    }

    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))

    const targetPaths = sorted.map((file, i) => {
      const ext = getFileExtension(file.name)
      return `${DROPBOX_TARGET_FOLDER}/${adName}V${i + 1}.${ext}`
    })

    for (const path of targetPaths) {
      if (await dropboxFolderExists(path)) {
        throw new Error(`Dropbox already has ${path}. Move or rename it, then retry.`)
      }
    }

    for (let i = 0; i < sorted.length; i++) {
      const stream = await downloadDriveFile(sorted[i].id)
      await uploadStreamToDropbox(stream, targetPaths[i])
    }

    await prisma.creative.update({
      where: { id: creativeId },
      data: {
        transferStatus: "DONE",
        transferredAt: new Date(),
        dropboxPath: DROPBOX_TARGET_FOLDER,
        transferError: null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.creative.update({
      where: { id: creativeId },
      data: { transferStatus: "FAILED", transferError: message },
    })
    throw err
  }
}
