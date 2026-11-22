// author: Bob
import type { ResumeData } from '@/services/resumeStorageService'

export interface CloudflareShareCreatePayload {
  title: string
  content: ResumeData
  version?: number
  ttlDays?: number
}

export interface CloudflareShareCreateResponse {
  shareToken: string
  shareUrl: string
  manageToken: string
  sharedAt: string
  updatedAt: string
  expiresAt: string | null
}

export interface CloudflareShareUpdateResponse {
  shareToken: string
  shareUrl: string
  sharedAt: string
  updatedAt: string
  expiresAt: string | null
}

export interface CloudflareSharePublicResponse {
  id: string
  title: string
  content: ResumeData
  version: number
  shareToken: string
  sharedAt?: string | null
  updatedAt?: string | null
  expiresAt?: string | null
}

export class CloudflareShareUnavailableError extends Error {
  constructor(message = '当前站点未启用 Cloudflare KV 短链服务，请改用离线压缩链接分享。') {
    super(message)
    this.name = 'CloudflareShareUnavailableError'
  }
}

export class CloudflareShareNotFoundError extends Error {
  constructor(message = '该短链分享不存在或已过期。') {
    super(message)
    this.name = 'CloudflareShareNotFoundError'
  }
}

export function getCloudflareShareApiBase(): string {
  const configured = import.meta.env.VITE_CLOUDFLARE_SHARE_API?.trim()
  return (configured || '/api/shares').replace(/\/+$/, '')
}

async function readShareJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let payload: unknown = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    const serverMessage =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : ''

    if (response.status === 503 || (response.status === 404 && !serverMessage)) {
      throw new CloudflareShareUnavailableError(
        serverMessage || '当前环境未启用 Cloudflare KV 分享接口（如本地 Vite 开发模式），可使用离线压缩链接。',
      )
    }
    if (response.status === 404 && serverMessage) {
      throw new CloudflareShareNotFoundError(serverMessage)
    }
    throw new Error(serverMessage || `分享服务请求失败 (${response.status})`)
  }

  if (!payload || typeof payload !== 'object') {
    throw new CloudflareShareUnavailableError(
      '当前静态托管环境未启用分享函数接口，请改用离线压缩链接分享。',
    )
  }

  return payload as T
}

export async function createCloudflareShare(
  payload: CloudflareShareCreatePayload,
  signal?: AbortSignal,
): Promise<CloudflareShareCreateResponse> {
  const response = await fetch(getCloudflareShareApiBase(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  return readShareJsonResponse<CloudflareShareCreateResponse>(response)
}

export async function getCloudflareShare(
  shareToken: string,
  signal?: AbortSignal,
): Promise<CloudflareSharePublicResponse> {
  const response = await fetch(`${getCloudflareShareApiBase()}/${encodeURIComponent(shareToken)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  return readShareJsonResponse<CloudflareSharePublicResponse>(response)
}

export async function updateCloudflareShare(
  shareToken: string,
  manageToken: string,
  payload: CloudflareShareCreatePayload,
  signal?: AbortSignal,
): Promise<CloudflareShareUpdateResponse> {
  const response = await fetch(`${getCloudflareShareApiBase()}/${encodeURIComponent(shareToken)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Share-Manage-Token': manageToken,
    },
    body: JSON.stringify(payload),
    signal,
  })
  return readShareJsonResponse<CloudflareShareUpdateResponse>(response)
}

export async function deleteCloudflareShare(
  shareToken: string,
  manageToken: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${getCloudflareShareApiBase()}/${encodeURIComponent(shareToken)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'X-Share-Manage-Token': manageToken,
    },
    signal,
  })
  await readShareJsonResponse<{ deleted?: boolean }>(response)
}
