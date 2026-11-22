// author: Bob
interface CfKVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' }): Promise<unknown>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface CfShareEnv {
  RESUME_SHARES?: CfKVNamespace
}

interface CfShareContext {
  request: Request
  env: CfShareEnv
  params: { path?: string | string[] }
}

interface StoredShareRecord {
  id: string
  title: string
  content: Record<string, unknown>
  version: number
  shareToken: string
  sharedAt: string
  updatedAt: string
  expiresAt: string | null
  manageTokenHash: string
}

const MAX_SHARE_PAYLOAD_BYTES = 200 * 1024
const SHARE_TOKEN_PREFIX = 'cf_'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function kvKey(token: string): string {
  return `share:${token}`
}

function randomBase64Url(byteCount: number): string {
  const bytes = new Uint8Array(byteCount)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256Hex(raw: string): Promise<string> {
  const encoded = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function resolveTtlSeconds(ttlDays: unknown): { ttlSeconds?: number; expiresAt: string | null } {
  const days = typeof ttlDays === 'number' && Number.isFinite(ttlDays) ? ttlDays : 30
  if (days <= 0) {
    return { ttlSeconds: undefined, expiresAt: null }
  }
  const clampedDays = Math.min(365, Math.max(1, Math.round(days)))
  const ttlSeconds = clampedDays * 86400
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  return { ttlSeconds, expiresAt }
}

function preserveExistingTtl(expiresAt: string | null): { ttlSeconds?: number; expiresAt: string | null } {
  if (!expiresAt) {
    return { ttlSeconds: undefined, expiresAt: null }
  }
  const targetMs = new Date(expiresAt).getTime()
  if (!Number.isFinite(targetMs)) {
    return { ttlSeconds: undefined, expiresAt: null }
  }
  const remainingSec = Math.max(60, Math.round((targetMs - Date.now()) / 1000))
  return {
    ttlSeconds: remainingSec,
    expiresAt: new Date(Date.now() + remainingSec * 1000).toISOString(),
  }
}

function extractSharePath(params: CfShareContext['params']): { token: string; hasExtraSegments: boolean } {
  if (Array.isArray(params.path)) {
    const cleaned = params.path.map((part) => String(part).trim()).filter(Boolean)
    return {
      token: cleaned[0] ?? '',
      hasExtraSegments: cleaned.length > 1,
    }
  }
  const single = typeof params.path === 'string' ? params.path.trim() : ''
  return {
    token: single,
    hasExtraSegments: single.includes('/'),
  }
}

class PayloadTooLargeError extends Error {}

async function readRequestTextBounded(request: Request, maxBytes: number): Promise<string> {
  const declaredLen = request.headers.get('Content-Length')
  if (declaredLen !== null && Number.isFinite(Number(declaredLen)) && Number(declaredLen) > maxBytes) {
    throw new PayloadTooLargeError('分享简历大小超过 200KB 上限，建议压缩头像后再分享。')
  }

  if (!request.body) return ''
  const reader = request.body.getReader()
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
        throw new PayloadTooLargeError('分享简历大小超过 200KB 上限，建议压缩头像后再分享。')
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

function toPublicRecord(record: StoredShareRecord) {
  return {
    id: record.id,
    title: record.title,
    content: record.content,
    version: record.version,
    shareToken: record.shareToken,
    sharedAt: record.sharedAt,
    updatedAt: record.updatedAt,
    expiresAt: record.expiresAt,
  }
}

export async function onRequest(context: CfShareContext): Promise<Response> {
  const { request, env, params } = context

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Share-Manage-Token',
      },
    })
  }

  const kv = env.RESUME_SHARES
  if (!kv) {
    return jsonResponse(503, {
      message: '当前部署未绑定 Cloudflare KV（RESUME_SHARES），请改用离线压缩链接分享。',
    })
  }

  const { token, hasExtraSegments } = extractSharePath(params)
  if (hasExtraSegments) {
    return jsonResponse(404, { message: '分享接口路径不存在。' })
  }

  try {
    if (request.method === 'POST' && !token) {
      let rawBody = ''
      try {
        rawBody = await readRequestTextBounded(request, MAX_SHARE_PAYLOAD_BYTES)
      } catch (err: unknown) {
        if (err instanceof PayloadTooLargeError) {
          return jsonResponse(413, { message: err.message })
        }
        return jsonResponse(400, { message: '读取请求体失败。' })
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        return jsonResponse(400, { message: '请求体必须为合法 JSON。' })
      }

      if (!isPlainObject(parsed) || !isPlainObject(parsed.content)) {
        return jsonResponse(400, { message: '缺少合法的简历内容对象 content。' })
      }

      let shareToken = ''
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const candidate = `${SHARE_TOKEN_PREFIX}${randomBase64Url(12)}`
        const existing = await kv.get(kvKey(candidate))
        if (!existing) {
          shareToken = candidate
          break
        }
      }
      if (!shareToken) {
        return jsonResponse(500, { message: '生成唯一短链令牌失败，请稍后重试。' })
      }

      const manageToken = randomBase64Url(24)
      const manageTokenHash = await sha256Hex(manageToken)
      const now = new Date().toISOString()
      const { ttlSeconds, expiresAt } = resolveTtlSeconds(parsed.ttlDays)

      const record: StoredShareRecord = {
        id: shareToken,
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : '我的简历',
        content: parsed.content,
        version: typeof parsed.version === 'number' && Number.isFinite(parsed.version) ? parsed.version : 1,
        shareToken,
        sharedAt: now,
        updatedAt: now,
        expiresAt,
        manageTokenHash,
      }

      await kv.put(kvKey(shareToken), JSON.stringify(record), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined)

      return jsonResponse(201, {
        shareToken,
        shareUrl: `/share/${shareToken}`,
        manageToken,
        sharedAt: now,
        updatedAt: now,
        expiresAt,
      })
    }

    if (!token || !/^cf_[A-Za-z0-9_-]{8,36}$/.test(token)) {
      return jsonResponse(400, { message: '分享令牌格式不合法。' })
    }

    if (request.method === 'GET') {
      const stored = (await kv.get(kvKey(token), { type: 'json' })) as StoredShareRecord | null
      if (!isPlainObject(stored) || !isPlainObject(stored.content)) {
        return jsonResponse(404, { message: '该分享链接不存在或已过期。' })
      }
      return jsonResponse(200, toPublicRecord(stored as unknown as StoredShareRecord))
    }

    const manageToken = request.headers.get('X-Share-Manage-Token')?.trim() ?? ''
    if (!manageToken) {
      return jsonResponse(401, { message: '缺少分享管理令牌（仅原发布浏览器可修改或撤回）。' })
    }

    const stored = (await kv.get(kvKey(token), { type: 'json' })) as StoredShareRecord | null
    if (!isPlainObject(stored) || !isPlainObject(stored.content)) {
      return jsonResponse(404, { message: '该分享链接不存在或已过期。' })
    }

    const storedHash = typeof stored.manageTokenHash === 'string' ? stored.manageTokenHash : ''
    const incomingHash = await sha256Hex(manageToken)
    if (!storedHash || storedHash.length !== 64 || !constantTimeEqual(incomingHash, storedHash)) {
      return jsonResponse(403, { message: '分享管理令牌校验失败，无权操作此分享。' })
    }

    if (request.method === 'DELETE') {
      await kv.delete(kvKey(token))
      return jsonResponse(200, { deleted: true })
    }

    if (request.method === 'PUT') {
      let rawBody = ''
      try {
        rawBody = await readRequestTextBounded(request, MAX_SHARE_PAYLOAD_BYTES)
      } catch (err: unknown) {
        if (err instanceof PayloadTooLargeError) {
          return jsonResponse(413, { message: err.message })
        }
        return jsonResponse(400, { message: '读取请求体失败。' })
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(rawBody)
      } catch {
        return jsonResponse(400, { message: '请求体必须为合法 JSON。' })
      }

      if (!isPlainObject(parsed) || !isPlainObject(parsed.content)) {
        return jsonResponse(400, { message: '缺少合法的简历内容对象 content。' })
      }

      const typedStored = stored as unknown as StoredShareRecord
      const now = new Date().toISOString()
      const { ttlSeconds, expiresAt } =
        parsed.ttlDays === undefined
          ? preserveExistingTtl(typedStored.expiresAt)
          : resolveTtlSeconds(parsed.ttlDays)

      const updated: StoredShareRecord = {
        ...typedStored,
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : typedStored.title,
        content: parsed.content,
        version: (typeof typedStored.version === 'number' ? typedStored.version : 1) + 1,
        updatedAt: now,
        expiresAt,
      }

      await kv.put(kvKey(token), JSON.stringify(updated), ttlSeconds ? { expirationTtl: ttlSeconds } : undefined)

      return jsonResponse(200, {
        shareToken: updated.shareToken,
        shareUrl: `/share/${updated.shareToken}`,
        sharedAt: updated.sharedAt,
        updatedAt: updated.updatedAt,
        expiresAt: updated.expiresAt,
      })
    }

    return jsonResponse(405, { message: '不支持的请求方法。' })
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'KV 存储访问异常'
    return jsonResponse(500, { message: `分享服务内部错误：${detail}` })
  }
}
