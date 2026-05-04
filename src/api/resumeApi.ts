// author: jf
import { API_BASE_PATH } from './apiBase'
import type { ResumeDocument, ResumeDocumentPayload } from '@/services/resumeStorageService'

export function getResumesEndpoint(): string {
  return `${API_BASE_PATH}/resumes`
}

export function getResumeEndpoint(id: string): string {
  return `${API_BASE_PATH}/resumes/${encodeURIComponent(id)}`
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
