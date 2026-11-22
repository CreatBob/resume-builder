// author: Bob
export type ShareSource = 'backend' | 'cloudflare' | 'offline'

export interface AppRouteInfo {
  mode: 'editor' | 'share'
  shareSource: ShareSource | null
  shareToken: string | null
  offlinePayload: string | null
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function extractOfflinePayloadFromHash(hash: string): string | null {
  const cleaned = hash.replace(/^#/, '')
  if (!cleaned) return null
  try {
    const params = new URLSearchParams(cleaned)
    const direct = params.get('d')
    if (direct && direct.trim()) return direct.trim()
  } catch {
    // 忽略异常查询串，尝试正则兜底
  }
  const match = cleaned.match(/(?:^|&)d=([^&]+)/)
  if (!match?.[1]) return null
  return safeDecodeURIComponent(match[1])
}

export function resolveAppRoute(
  pathname: string = window.location.pathname,
  hash: string = window.location.hash,
): AppRouteInfo {
  if (/^\/share\/?$/.test(pathname)) {
    const offlinePayload = extractOfflinePayloadFromHash(hash)
    return {
      mode: 'share',
      shareSource: 'offline',
      shareToken: null,
      offlinePayload: offlinePayload ?? '',
    }
  }

  const match = pathname.match(/^\/share\/([^/]+)\/?$/)
  if (match?.[1]) {
    const decoded = safeDecodeURIComponent(match[1]) ?? ''
    return {
      mode: 'share',
      shareSource: decoded.startsWith('cf_') ? 'cloudflare' : 'backend',
      shareToken: decoded,
      offlinePayload: null,
    }
  }

  return {
    mode: 'editor',
    shareSource: null,
    shareToken: null,
    offlinePayload: null,
  }
}
