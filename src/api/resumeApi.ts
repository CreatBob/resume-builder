// author: Bob
import { API_BASE_PATH } from './apiBase'
import type { ResumeDocument, ResumeDocumentPayload } from '@/services/resumeStorageService'

export interface ResumeShareResponse {
  documentId: string
  shareToken: string
  shareUrl: string
  sharedAt?: string | null
}

export interface ResumeSharePublicResponse {
  id: string
  title: string
  content: ResumeDocument['content']
  version: number
  shareToken: string
  sharedAt?: string | null
  updatedAt?: string | null
}

export function getResumesEndpoint(): string {
  return `${API_BASE_PATH}/resumes`
}

export function getResumeEndpoint(id: string): string {
  return `${API_BASE_PATH}/resumes/${encodeURIComponent(id)}`
}

export function getResumeShareEndpoint(id: string): string {
  return `${getResumeEndpoint(id)}/share`
}

export function getSharedResumeEndpoint(shareToken: string): string {
  return `${getResumesEndpoint()}/shared/${encodeURIComponent(shareToken)}`
}

export async function getResumes(signal?: AbortSignal): Promise<ResumeDocument[]> {
  const response = await fetch(getResumesEndpoint(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  return readJsonResponse<ResumeDocument[]>(response)
}

export async function getResume(id: string, signal?: AbortSignal): Promise<ResumeDocument> {
  const response = await fetch(getResumeEndpoint(id), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  return readJsonResponse<ResumeDocument>(response)
}

export async function createResume(payload: ResumeDocumentPayload, signal?: AbortSignal): Promise<ResumeDocument> {
  const response = await fetch(getResumesEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  return readJsonResponse<ResumeDocument>(response)
}

export async function updateResume(
  id: string,
  payload: ResumeDocumentPayload,
  signal?: AbortSignal
): Promise<ResumeDocument> {
  const response = await fetch(getResumeEndpoint(id), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })
  return readJsonResponse<ResumeDocument>(response)
}

export async function deleteResume(id: string, signal?: AbortSignal): Promise<void> {
  const response = await fetch(getResumeEndpoint(id), {
    method: 'DELETE',
    signal,
  })
  if (!response.ok) {
    await readJsonResponse<unknown>(response)
  }
}

export async function createResumeShare(id: string, signal?: AbortSignal): Promise<ResumeShareResponse> {
  const response = await fetch(getResumeShareEndpoint(id), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    signal,
  })
  return readJsonResponse<ResumeShareResponse>(response)
}

export async function getSharedResume(shareToken: string, signal?: AbortSignal): Promise<ResumeSharePublicResponse> {
  const response = await fetch(getSharedResumeEndpoint(shareToken), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })
  return readJsonResponse<ResumeSharePublicResponse>(response)
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as { message?: unknown }).message)
      : '请求失败'
    const error = new Error(message)
    error.name = response.status === 409 ? 'ResumeVersionConflictError' : 'ResumeApiError'
    throw error
  }

  return payload as T
}
