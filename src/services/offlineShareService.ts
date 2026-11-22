// author: Bob
import type { ResumeData, SharedResumeDocument } from '@/services/resumeStorageService'

export interface OfflineShareEncodeResult {
  shareUrl: string
  urlLength: number
  avatarStripped: boolean
  isLongUrl: boolean
}

interface OfflineShareEnvelope {
  v: 1
  title: string
  updatedAt: string
  content: ResumeData
}

const MAX_ENCODED_CHARS = 128_000
const MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024

class OfflineShareFatalError extends Error {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUint8(encoded: string): Uint8Array {
  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(normalized + padding)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

async function compressDeflateRaw(text: string): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') {
    throw new OfflineShareFatalError('当前浏览器不支持 CompressionStream，请使用新版浏览器或导出 PDF 分享。')
  }
  const input = new Blob([new TextEncoder().encode(text)]).stream()
  const compressedStream = input.pipeThrough(new CompressionStream('deflate-raw'))
  const buffer = await new Response(compressedStream).arrayBuffer()
  return new Uint8Array(buffer)
}

async function decompressDeflateRawBounded(bytes: Uint8Array, maxBytes: number): Promise<string> {
  if (typeof DecompressionStream === 'undefined') {
    throw new OfflineShareFatalError('当前浏览器不支持解码离线压缩简历链接，请升级浏览器后打开。')
  }
  const copy = new Uint8Array(bytes)
  const input = new Blob([copy.buffer]).stream()
  const decompressedStream = input.pipeThrough(new DecompressionStream('deflate-raw'))
  const reader = decompressedStream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined)
        throw new OfflineShareFatalError('离线分享解压数据超过 2MB 安全上限，已中止加载。')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}

function prepareContentForOfflineShare(
  content: ResumeData,
  stripLargeAvatar: boolean,
): { cleaned: ResumeData; avatarStripped: boolean } {
  const cloned = JSON.parse(JSON.stringify(content)) as ResumeData
  let avatarStripped = false

  if (stripLargeAvatar && cloned.basicInfo && typeof cloned.basicInfo.avatar === 'string') {
    const rawAvatar = cloned.basicInfo.avatar
    if (rawAvatar.startsWith('data:') && rawAvatar.length > 1024) {
      cloned.basicInfo.avatar = ''
      avatarStripped = true
    }
  }

  return { cleaned: cloned, avatarStripped }
}

export async function encodeOfflineSharePayload(
  doc: { title: string; content: ResumeData; updatedAt?: string },
  options: { stripLargeAvatar?: boolean } = {},
): Promise<OfflineShareEncodeResult> {
  const stripLargeAvatar = options.stripLargeAvatar ?? true
  const { cleaned, avatarStripped } = prepareContentForOfflineShare(doc.content, stripLargeAvatar)
  const envelope: OfflineShareEnvelope = {
    v: 1,
    title: doc.title.trim() || '我的简历',
    updatedAt: doc.updatedAt || new Date().toISOString(),
    content: cleaned,
  }

  const compressed = await compressDeflateRaw(JSON.stringify(envelope))
  const encoded = uint8ToBase64Url(compressed)
  const shareUrl = `${window.location.origin}/share#d=${encoded}`

  return {
    shareUrl,
    urlLength: shareUrl.length,
    avatarStripped,
    isLongUrl: shareUrl.length > 6000,
  }
}

export async function decodeOfflineSharePayload(encoded: string): Promise<SharedResumeDocument> {
  const cleaned = encoded.trim()
  if (!cleaned) {
    throw new Error('离线分享链接参数为空，请重新生成分享链接。')
  }
  if (cleaned.length > MAX_ENCODED_CHARS) {
    throw new Error('离线分享链接长度超出安全上限（128KB），请精简内容后重试。')
  }

  let parsed: unknown
  try {
    const bytes = base64UrlToUint8(cleaned)
    const jsonText = await decompressDeflateRawBounded(bytes, MAX_DECOMPRESSED_BYTES)
    parsed = JSON.parse(jsonText)
  } catch (err: unknown) {
    if (err instanceof OfflineShareFatalError) {
      throw new Error(err.message)
    }
    throw new Error('离线分享链接已损坏或被截断，请让发送方重新复制完整链接。')
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.content)) {
    throw new Error('离线分享数据格式无效。')
  }

  const updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null
  return {
    id: 'offline-share',
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '分享简历',
    content: parsed.content as unknown as ResumeData,
    version: 1,
    shareToken: 'offline',
    sharedAt: updatedAt,
    updatedAt,
  }
}
