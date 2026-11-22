// author: Bob
import {
  CloudflareShareNotFoundError,
  createCloudflareShare,
  deleteCloudflareShare,
  getCloudflareShare,
  updateCloudflareShare,
} from '@/api/cloudflareShareApi'
import {
  toAbsoluteResumeShareUrl,
  type ResumeData,
  type SharedResumeDocument,
} from '@/services/resumeStorageService'

export interface LocalCloudflareShareRecord {
  documentId: string
  shareToken: string
  manageToken: string
  shareUrl: string
  ttlDays: number
  expiresAt: string | null
  updatedAt: string
}

const LOCAL_SHARE_STORAGE_KEY = 'resume-builder-local-shares'

function readLocalShareMap(): Record<string, LocalCloudflareShareRecord> {
  const raw = localStorage.getItem(LOCAL_SHARE_STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, LocalCloudflareShareRecord>) : {}
  } catch {
    return {}
  }
}

function writeLocalShareMap(map: Record<string, LocalCloudflareShareRecord>) {
  localStorage.setItem(LOCAL_SHARE_STORAGE_KEY, JSON.stringify(map))
}

export function getLocalCloudflareShare(documentId: string): LocalCloudflareShareRecord | null {
  if (!documentId) return null
  const map = readLocalShareMap()
  const record = map[documentId]
  if (!record) return null
  return {
    ...record,
    shareUrl: toAbsoluteResumeShareUrl(record.shareUrl),
  }
}

export async function publishLocalCloudflareShare(params: {
  documentId: string
  title: string
  content: ResumeData
  version: number
  ttlDays: number
}): Promise<LocalCloudflareShareRecord> {
  const existing = getLocalCloudflareShare(params.documentId)
  let record: LocalCloudflareShareRecord

  if (existing && existing.shareToken && existing.manageToken) {
    try {
      const updated = await updateCloudflareShare(existing.shareToken, existing.manageToken, {
        title: params.title,
        content: params.content,
        version: params.version,
        ttlDays: params.ttlDays,
      })
      record = {
        documentId: params.documentId,
        shareToken: updated.shareToken,
        manageToken: existing.manageToken,
        shareUrl: toAbsoluteResumeShareUrl(updated.shareUrl),
        ttlDays: params.ttlDays,
        expiresAt: updated.expiresAt,
        updatedAt: updated.updatedAt,
      }
      const map = readLocalShareMap()
      map[params.documentId] = record
      writeLocalShareMap(map)
      return record
    } catch (error) {
      if (!(error instanceof CloudflareShareNotFoundError)) {
        throw error
      }
    }
  }

  const created = await createCloudflareShare({
    title: params.title,
    content: params.content,
    version: params.version,
    ttlDays: params.ttlDays,
  })

  record = {
    documentId: params.documentId,
    shareToken: created.shareToken,
    manageToken: created.manageToken,
    shareUrl: toAbsoluteResumeShareUrl(created.shareUrl),
    ttlDays: params.ttlDays,
    expiresAt: created.expiresAt,
    updatedAt: created.updatedAt,
  }

  const map = readLocalShareMap()
  map[params.documentId] = record
  writeLocalShareMap(map)
  return record
}

export async function revokeLocalCloudflareShare(documentId: string): Promise<void> {
  const existing = getLocalCloudflareShare(documentId)
  if (!existing) return
  try {
    await deleteCloudflareShare(existing.shareToken, existing.manageToken)
  } catch (error) {
    if (!(error instanceof CloudflareShareNotFoundError)) {
      throw error
    }
  }
  const map = readLocalShareMap()
  delete map[documentId]
  writeLocalShareMap(map)
}

export async function cleanupLocalCloudflareShareForDeletedResume(documentId: string): Promise<void> {
  if (!documentId) return
  const existing = getLocalCloudflareShare(documentId)
  if (existing && existing.shareToken && existing.manageToken) {
    try {
      await deleteCloudflareShare(existing.shareToken, existing.manageToken)
    } catch {
      // 删除本地简历时尽力清理远端 KV 短链，不阻断本地删除与凭据回收
    }
  }
  const map = readLocalShareMap()
  if (documentId in map) {
    delete map[documentId]
    writeLocalShareMap(map)
  }
}

export async function getCloudflareSharedResumeDocument(shareToken: string): Promise<SharedResumeDocument> {
  const resp = await getCloudflareShare(shareToken)
  return {
    id: resp.id,
    title: resp.title,
    content: resp.content,
    version: resp.version,
    shareToken: resp.shareToken,
    sharedAt: resp.sharedAt ?? null,
    updatedAt: resp.updatedAt ?? null,
  }
}
