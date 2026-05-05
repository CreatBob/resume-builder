// author: Bob
import {
  createResume,
  createResumeShare,
  deleteResume,
  getResume,
  getSharedResume,
  getResumes,
  updateResume,
} from '@/api/resumeApi'
import { getResumeStorageMode, type ResumeStorageMode } from '@/config/resumeStorageMode'

export interface ResumeDocument {
  id: string
  title: string
  content: ResumeData
  version: number
  shareToken?: string | null
  shareEnabled?: boolean
  sharedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ResumeDocumentPayload {
  title: string
  content: ResumeData
  version?: number
}

export interface ResumeData {
  modules: unknown[]
  selectedTemplateKey?: string
  selectedTemplateId?: string
  layoutSettings?: Record<string, unknown>
  basicInfo?: Record<string, unknown>
  educationList?: unknown[]
  skills?: string
  workList?: unknown[]
  projectList?: unknown[]
  awardList?: unknown[]
  selfIntro?: string
}

export interface SharedResumeDocument {
  id: string
  title: string
  content: ResumeData
  version: number
  shareToken: string
  sharedAt?: string | null
  updatedAt?: string | null
}

export interface ResumeShareInfo {
  documentId: string
  shareToken: string
  shareUrl: string
  sharedAt?: string | null
}

export type ResumeStorageKind = 'local' | 'remote'

interface ResumeStorageDriver {
  list(defaultContent: ResumeData): Promise<ResumeDocument[]>
  get(id: string): Promise<ResumeDocument>
  create(payload: ResumeDocumentPayload): Promise<ResumeDocument>
  update(id: string, payload: ResumeDocumentPayload): Promise<ResumeDocument>
  delete(id: string): Promise<void>
  getStorageKind(): ResumeStorageKind
  getCurrentId(): string | null
  setCurrentId(id: string): void
}

const LEGACY_STORAGE_KEY = 'resume-builder-data'
const LOCAL_INDEX_KEY = 'resume-builder-resume-index'
const LOCAL_CURRENT_ID_KEY = 'resume-builder-current-id'
const LOCAL_DOCUMENT_KEY_PREFIX = 'resume-builder-resume:'
const AUTO_REMOTE_PROBE_RETRY_DELAYS = [300, 1000]

export class ResumeStorageConflictError extends Error {
  constructor(message = '简历已被其他页面更新，请刷新后再编辑') {
    super(message)
    this.name = 'ResumeStorageConflictError'
  }
}

class LocalResumeStorageDriver implements ResumeStorageDriver {
  async list(defaultContent: ResumeData): Promise<ResumeDocument[]> {
    this.migrateLegacyResume(defaultContent)
    const docs = this.readIndex().map((meta) => this.readDocument(meta.id)).filter(isResumeDocument)
    if (docs.length > 0) return docs

    const created = this.createLocalDocument('我的简历', defaultContent)
    this.writeDocument(created)
    this.writeIndex([this.toMeta(created)])
    this.setCurrentId(created.id)
    return [created]
  }

  async get(id: string): Promise<ResumeDocument> {
    const doc = this.readDocument(id)
    if (!doc) throw new Error('未找到简历')
    return doc
  }

  async create(payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    const doc = this.createLocalDocument(payload.title, payload.content)
    const index = this.readIndex()
    this.writeIndex([this.toMeta(doc), ...index])
    this.writeDocument(doc)
    this.setCurrentId(doc.id)
    return doc
  }

  async update(id: string, payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    const current = this.readDocument(id)
    if (!current) throw new Error('未找到简历')
    const now = new Date().toISOString()
    const doc: ResumeDocument = {
      ...current,
      title: normalizeTitle(payload.title),
      content: payload.content,
      version: current.version + 1,
      updatedAt: now,
    }
    this.writeDocument(doc)
    this.writeIndex(this.readIndex().map((item) => (item.id === id ? this.toMeta(doc) : item)))
    return doc
  }

  async delete(id: string): Promise<void> {
    localStorage.removeItem(this.documentKey(id))
    const nextIndex = this.readIndex().filter((item) => item.id !== id)
    this.writeIndex(nextIndex)
    if (this.getCurrentId() === id) {
      const next = nextIndex[0]
      if (next) this.setCurrentId(next.id)
      else localStorage.removeItem(LOCAL_CURRENT_ID_KEY)
    }
  }

  getStorageKind(): ResumeStorageKind {
    return 'local'
  }

  getCurrentId(): string | null {
    return localStorage.getItem(LOCAL_CURRENT_ID_KEY)
  }

  setCurrentId(id: string): void {
    localStorage.setItem(LOCAL_CURRENT_ID_KEY, id)
  }

  private migrateLegacyResume(defaultContent: ResumeData) {
    if (localStorage.getItem(LOCAL_INDEX_KEY)) return

    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    const content = parseResumeData(raw) ?? defaultContent
    const doc = this.createLocalDocument('我的简历', content)
    this.writeDocument(doc)
    this.writeIndex([this.toMeta(doc)])
    this.setCurrentId(doc.id)
  }

  private createLocalDocument(title: string, content: ResumeData): ResumeDocument {
    const now = new Date().toISOString()
    return {
      id: `resume_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      title: normalizeTitle(title),
      content,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }
  }

  private readIndex(): ResumeDocumentMeta[] {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.filter(isResumeDocumentMeta) : []
    } catch {
      return []
    }
  }

  private writeIndex(index: ResumeDocumentMeta[]) {
    localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(index))
  }

  private readDocument(id: string): ResumeDocument | null {
    const raw = localStorage.getItem(this.documentKey(id))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw)
      return isResumeDocument(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  private writeDocument(doc: ResumeDocument) {
    localStorage.setItem(this.documentKey(doc.id), JSON.stringify(doc))
  }

  private toMeta(doc: ResumeDocument): ResumeDocumentMeta {
    return {
      id: doc.id,
      title: doc.title,
      version: doc.version,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  }

  private documentKey(id: string): string {
    return `${LOCAL_DOCUMENT_KEY_PREFIX}${id}`
  }
}

class RemoteResumeStorageDriver implements ResumeStorageDriver {
  async list(): Promise<ResumeDocument[]> {
    return getResumes()
  }

  async get(id: string): Promise<ResumeDocument> {
    return getResume(id)
  }

  async create(payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    return createResume(payload)
  }

  async update(id: string, payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    try {
      return await updateResume(id, payload)
    } catch (error) {
      if (error instanceof Error && error.name === 'ResumeVersionConflictError') {
        throw new ResumeStorageConflictError(error.message)
      }
      throw error
    }
  }

  async delete(id: string): Promise<void> {
    await deleteResume(id)
  }

  getStorageKind(): ResumeStorageKind {
    return 'remote'
  }

  getCurrentId(): string | null {
    return localStorage.getItem(LOCAL_CURRENT_ID_KEY)
  }

  setCurrentId(id: string): void {
    localStorage.setItem(LOCAL_CURRENT_ID_KEY, id)
  }
}

class AutoResumeStorageDriver implements ResumeStorageDriver {
  private resolvedDriver: ResumeStorageDriver | null = null

  async list(defaultContent: ResumeData): Promise<ResumeDocument[]> {
    const driver = await this.resolveDriver(defaultContent)
    return driver.list(defaultContent)
  }

  async get(id: string): Promise<ResumeDocument> {
    return this.requireResolvedDriver().get(id)
  }

  async create(payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    return this.requireResolvedDriver().create(payload)
  }

  async update(id: string, payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    return this.requireResolvedDriver().update(id, payload)
  }

  async delete(id: string): Promise<void> {
    await this.requireResolvedDriver().delete(id)
  }

  getStorageKind(): ResumeStorageKind {
    return this.resolvedDriver?.getStorageKind() ?? 'local'
  }

  getCurrentId(): string | null {
    return this.resolvedDriver?.getCurrentId() ?? localStorage.getItem(LOCAL_CURRENT_ID_KEY)
  }

  setCurrentId(id: string): void {
    this.requireResolvedDriver().setCurrentId(id)
  }

  private async resolveDriver(defaultContent: ResumeData): Promise<ResumeStorageDriver> {
    if (this.resolvedDriver) return this.resolvedDriver

    const remoteDriver = new RemoteResumeStorageDriver()
    const remoteDocuments = await this.probeRemoteDocuments(remoteDriver)
    if (remoteDocuments) {
      this.resolvedDriver = new ProbedRemoteResumeStorageDriver(remoteDriver, remoteDocuments)
      return this.resolvedDriver
    }

    console.warn('后端简历存储暂不可用，当前页面会话使用本地存储')
    this.resolvedDriver = new LocalResumeStorageDriver()
    await this.resolvedDriver.list(defaultContent)
    return this.resolvedDriver
  }

  private async probeRemoteDocuments(remoteDriver: RemoteResumeStorageDriver): Promise<ResumeDocument[] | null> {
    for (let attempt = 0; attempt <= AUTO_REMOTE_PROBE_RETRY_DELAYS.length; attempt += 1) {
      try {
        return await remoteDriver.list()
      } catch (error) {
        if (attempt >= AUTO_REMOTE_PROBE_RETRY_DELAYS.length) {
          console.warn('后端简历存储探测失败，准备临时回退本地存储', error)
          return null
        }
        await delay(AUTO_REMOTE_PROBE_RETRY_DELAYS[attempt] ?? 0)
      }
    }
    return null
  }

  private requireResolvedDriver(): ResumeStorageDriver {
    if (!this.resolvedDriver) {
      throw new Error('简历存储尚未初始化')
    }
    return this.resolvedDriver
  }
}

class ProbedRemoteResumeStorageDriver implements ResumeStorageDriver {
  private initialDocuments: ResumeDocument[] | null

  constructor(
    private readonly remoteDriver: RemoteResumeStorageDriver,
    initialDocuments: ResumeDocument[]
  ) {
    this.initialDocuments = initialDocuments
  }

  async list(): Promise<ResumeDocument[]> {
    if (this.initialDocuments) {
      const documents = this.initialDocuments
      this.initialDocuments = null
      return documents
    }
    return this.remoteDriver.list()
  }

  get(id: string): Promise<ResumeDocument> {
    return this.remoteDriver.get(id)
  }

  create(payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    return this.remoteDriver.create(payload)
  }

  update(id: string, payload: ResumeDocumentPayload): Promise<ResumeDocument> {
    return this.remoteDriver.update(id, payload)
  }

  delete(id: string): Promise<void> {
    return this.remoteDriver.delete(id)
  }

  getStorageKind(): ResumeStorageKind {
    return 'remote'
  }

  getCurrentId(): string | null {
    return this.remoteDriver.getCurrentId()
  }

  setCurrentId(id: string): void {
    this.remoteDriver.setCurrentId(id)
  }
}

interface ResumeDocumentMeta {
  id: string
  title: string
  version: number
  createdAt: string
  updatedAt: string
}

function parseResumeData(raw: string | null): ResumeData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as ResumeData) : null
  } catch {
    return null
  }
}

function normalizeTitle(title: string): string {
  const safeTitle = title.trim()
  return safeTitle || '未命名简历'
}

function isResumeDocumentMeta(value: unknown): value is ResumeDocumentMeta {
  const item = value as Partial<ResumeDocumentMeta>
  return Boolean(item && typeof item.id === 'string' && typeof item.title === 'string')
}

function isResumeDocument(value: unknown): value is ResumeDocument {
  const item = value as Partial<ResumeDocument>
  return Boolean(
    item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      item.content &&
      typeof item.content === 'object'
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function createResumeStorageService(mode: ResumeStorageMode = getResumeStorageMode()): ResumeStorageDriver {
  if (mode === 'remote') return new RemoteResumeStorageDriver()
  if (mode === 'local') return new LocalResumeStorageDriver()
  return new AutoResumeStorageDriver()
}

export function toAbsoluteResumeShareUrl(shareUrl: string): string {
  if (/^https?:\/\//i.test(shareUrl)) return shareUrl
  const normalizedPath = shareUrl.startsWith('/') ? shareUrl : `/${shareUrl}`
  return `${window.location.origin}${normalizedPath}`
}

export async function enableResumeShare(id: string): Promise<ResumeShareInfo> {
  const response = await createResumeShare(id)
  return {
    documentId: response.documentId,
    shareToken: response.shareToken,
    shareUrl: toAbsoluteResumeShareUrl(response.shareUrl),
    sharedAt: response.sharedAt ?? null,
  }
}

export async function getSharedResumeDocument(shareToken: string): Promise<SharedResumeDocument> {
  const response = await getSharedResume(shareToken)
  return {
    id: response.id,
    title: response.title,
    content: response.content,
    version: response.version,
    shareToken: response.shareToken,
    sharedAt: response.sharedAt ?? null,
    updatedAt: response.updatedAt ?? null,
  }
}
