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

export async function runTransfer(creativeId: string) {
  const creative = await prisma.creative.findUnique({ where: { id: creativeId } })
  if (!creative) throw new Error("Creative not found")
  if (!creative.adNumber) throw new Error("No ad number assigned yet")
  if (!creative.editorDriveLink) throw new Error("No editor Drive link on this ad")
  if (creative.editorStatus !== "COMPLETE") throw new Error("Editor hasn't marked this ad Complete")

  const folderId = extractDriveFolderId(creative.editorDriveLink)
  if (!folderId) throw new Error("Couldn't read folder ID from editor's Drive link")

  const adName = creative.adNumber
  const dropboxFolder = `/Ads/${adName}`

  await prisma.creative.update({
    where: { id: creativeId },
    data: { transferStatus: "IN_PROGRESS", transferError: null },
  })

  try {
    if (await dropboxFolderExists(dropboxFolder)) {
      throw new Error(`Dropbox folder ${dropboxFolder} already exists. Move or rename it first, then retry.`)
    }

    const files = await listDriveFolderFiles(folderId)
    if (files.length !== EXPECTED_FILE_COUNT) {
      throw new Error(
        `Expected ${EXPECTED_FILE_COUNT} files in the editor's Drive folder, found ${files.length}.`,
      )
    }

    const sorted = [...files].sort((a, b) => a.name.localeCompare(b.name))

    for (let i = 0; i < sorted.length; i++) {
      const file = sorted[i]
      const ext = getFileExtension(file.name)
      const targetName = `${adName}V${i + 1}.${ext}`
      const targetPath = `${dropboxFolder}/${targetName}`
      const stream = await downloadDriveFile(file.id)
      await uploadStreamToDropbox(stream, targetPath)
    }

    await prisma.creative.update({
      where: { id: creativeId },
      data: {
        transferStatus: "DONE",
        transferredAt: new Date(),
        dropboxPath: dropboxFolder,
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
