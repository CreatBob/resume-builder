// author: Bob
interface CfFunctionContext {
  request: Request
}

const MAX_PROXY_BODY_BYTES = 256 * 1024

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function isSameOriginBrowserRequest(request: Request): boolean {
  const secFetchSite = request.headers.get('Sec-Fetch-Site')?.trim().toLowerCase()
  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'none') {
    return false
  }

  const originHeader = request.headers.get('Origin')?.trim()
  if (!originHeader) {
    return false
  }

  try {
    return new URL(originHeader).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function isBlockedPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.+$/, '').replace(/^\[|\]$/g, '')
  if (!host) return true

  // 禁止裸 IPv6 字面量（涵盖 ::1、fe80::/10、fc00::/7、::ffff:127.0.0.1 等 SSRF 变体）
  if (host.includes(':')) return true

  if (
    host === 'localhost'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || host.endsWith('.arpa')
    || host.endsWith('.svc')
    || !host.includes('.')
  ) {
    return true
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4Match) return false

  const octets = ipv4Match.slice(1).map((segment) => Number(segment))
  if (octets.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) {
    return true
  }

  const [a = 0, b = 0, c = 0] = octets
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
  if (a === 192 && b === 88 && c === 99) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 198 && b === 51 && c === 100) return true
  if (a === 203 && b === 0 && c === 113) return true
  if (a >= 224) return true
  return false
}

function validateUpstreamUrl(rawUrl: string | null): URL | null {
  if (!rawUrl) return null
  try {
    const parsed = new URL(rawUrl.trim())
    if (parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
    if (parsed.port && parsed.port !== '443') return null
    if (isBlockedPrivateHost(parsed.hostname)) return null

    const normalizedPath = parsed.pathname.replace(/\/+$/, '').toLowerCase()
    if (!normalizedPath.endsWith('/chat/completions') || normalizedPath.includes('..')) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

class PayloadTooLargeError extends Error {}

async function readRequestTextBounded(request: Request, maxBytes: number): Promise<string> {
  const declaredLen = request.headers.get('Content-Length')
  if (declaredLen !== null && Number.isFinite(Number(declaredLen)) && Number(declaredLen) > maxBytes) {
    throw new PayloadTooLargeError('单次代理请求体超过 256KB 限制。')
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
        throw new PayloadTooLargeError('单次代理请求体超过 256KB 限制。')
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

export async function onRequest(context: CfFunctionContext): Promise<Response> {
  const { request } = context

  if (request.method === 'OPTIONS') {
    if (!isSameOriginBrowserRequest(request)) {
      return jsonError(403, '边缘代理仅允许同源页面预检请求。')
    }
    const requestOrigin = new URL(request.url).origin
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': requestOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Target-Base-Url',
        Vary: 'Origin',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (request.method !== 'POST') {
    return jsonError(405, '仅支持 POST 请求。')
  }

  if (!isSameOriginBrowserRequest(request)) {
    return jsonError(403, '边缘代理仅接受当前站点的同源调用。')
  }

  const targetUrl = validateUpstreamUrl(request.headers.get('X-Target-Base-Url'))
  if (!targetUrl) {
    return jsonError(400, '目标接口地址非法：边缘代理仅允许转发合法的公网 HTTPS /chat/completions 地址。')
  }

  let bodyText = ''
  try {
    bodyText = await readRequestTextBounded(request, MAX_PROXY_BODY_BYTES)
  } catch (err: unknown) {
    if (err instanceof PayloadTooLargeError) {
      return jsonError(413, err.message)
    }
    return jsonError(400, '读取请求体失败。')
  }

  const forwardHeaders = new Headers()
  forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json')
  const auth = request.headers.get('Authorization')
  if (auth) forwardHeaders.set('Authorization', auth)
  const accept = request.headers.get('Accept')
  if (accept) forwardHeaders.set('Accept', accept)

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: forwardHeaders,
      body: bodyText,
      redirect: 'manual',
    })

    if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
      return jsonError(502, '拒绝上游重定向响应（防止开放转发与 SSRF 绕过）。')
    }

    const responseHeaders = new Headers()
    responseHeaders.set(
      'Content-Type',
      upstreamResponse.headers.get('Content-Type') || 'application/json; charset=utf-8',
    )
    responseHeaders.set('Cache-Control', 'no-store')

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    })
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : '上游请求失败'
    return jsonError(502, `边缘代理连接上游模型接口失败：${detail}`)
  }
}
