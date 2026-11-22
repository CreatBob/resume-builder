// author: Bob
import { DEFAULT_RESUME_AVATAR } from '@/config/defaultAvatar'

const ALLOWED_HTML_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'code',
  'del',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'ins',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'span',
  'strong',
  'sub',
  'sup',
  'u',
  'ul',
])

const DROP_SUBTREE_TAGS = new Set([
  'base',
  'button',
  'embed',
  'form',
  'iframe',
  'input',
  'link',
  'math',
  'meta',
  'noscript',
  'object',
  'script',
  'select',
  'style',
  'svg',
  'template',
  'textarea',
  'title',
])

const FONT_SIZE_ALLOW_TAGS = new Set(['div', 'li', 'p', 'span'])
const SAFE_FONT_SIZE_RE = /^\d{1,3}(?:\.\d{1,2})?(?:px|pt|em|rem|%)$/i
const SAFE_RASTER_DATA_URI_RE = /^data:image\/(?:png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i

function escapeBasicHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function sanitizePlainText(raw: unknown): string {
  return typeof raw === 'string' ? raw : ''
}

function stripControlChars(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code > 0x1f && code !== 0x7f) {
      out += value[i]
    }
  }
  return out
}

export function sanitizeSafeHref(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const cleaned = stripControlChars(raw).trim()
  if (!cleaned) return ''
  if (cleaned.startsWith('//') || cleaned.startsWith('#') || cleaned.startsWith('/')) {
    return ''
  }

  // 若用户仅输入域名或路径（无冒号，或首个斜杠前无冒号），自动补全 https://
  const colonIdx = cleaned.indexOf(':')
  const slashIdx = cleaned.indexOf('/')
  const hasExplicitScheme = colonIdx > 0 && (slashIdx === -1 || colonIdx < slashIdx)
  const candidate = hasExplicitScheme ? cleaned : `https://${cleaned}`

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (parsed.username || parsed.password) return ''
      return parsed.toString()
    }
    if (parsed.protocol === 'mailto:' || parsed.protocol === 'tel:') {
      return parsed.toString()
    }
    return ''
  } catch {
    return ''
  }
}

export function sanitizeSafeAvatar(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const cleaned = stripControlChars(raw).trim()
  if (!cleaned) return ''
  if (cleaned === DEFAULT_RESUME_AVATAR) return cleaned
  if (SAFE_RASTER_DATA_URI_RE.test(cleaned)) return cleaned

  try {
    const parsed = new URL(cleaned)
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) {
      return parsed.toString()
    }
    return ''
  } catch {
    return ''
  }
}

function sanitizeDomNode(node: Node, targetDoc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDoc.createTextNode(node.textContent ?? '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const el = node as HTMLElement
  const tag = el.tagName.toLowerCase()
  if (DROP_SUBTREE_TAGS.has(tag)) {
    return null
  }

  if (!ALLOWED_HTML_TAGS.has(tag)) {
    const fragment = targetDoc.createDocumentFragment()
    el.childNodes.forEach((child) => {
      const sanitizedChild = sanitizeDomNode(child, targetDoc)
      if (sanitizedChild) fragment.appendChild(sanitizedChild)
    })
    return fragment
  }

  if (tag === 'a') {
    const safeHref = sanitizeSafeHref(el.getAttribute('href'))
    if (!safeHref) {
      const span = targetDoc.createElement('span')
      el.childNodes.forEach((child) => {
        const sanitizedChild = sanitizeDomNode(child, targetDoc)
        if (sanitizedChild) span.appendChild(sanitizedChild)
      })
      return span
    }
    const anchor = targetDoc.createElement('a')
    anchor.setAttribute('href', safeHref)
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
    el.childNodes.forEach((child) => {
      const sanitizedChild = sanitizeDomNode(child, targetDoc)
      if (sanitizedChild) anchor.appendChild(sanitizedChild)
    })
    return anchor
  }

  const cleanEl = targetDoc.createElement(tag)
  if (FONT_SIZE_ALLOW_TAGS.has(tag)) {
    const fontSize = el.style?.fontSize?.trim() ?? ''
    if (fontSize && SAFE_FONT_SIZE_RE.test(fontSize)) {
      cleanEl.style.fontSize = fontSize
    }
  }

  el.childNodes.forEach((child) => {
    const sanitizedChild = sanitizeDomNode(child, targetDoc)
    if (sanitizedChild) cleanEl.appendChild(sanitizedChild)
  })
  return cleanEl
}

export function sanitizeRichHtml(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  if (typeof DOMParser === 'undefined') {
    return escapeBasicHtml(trimmed)
  }

  const parser = new DOMParser()
  const parsedDoc = parser.parseFromString(trimmed, 'text/html')
  const container = parsedDoc.createElement('div')
  parsedDoc.body.childNodes.forEach((child) => {
    const sanitized = sanitizeDomNode(child, parsedDoc)
    if (sanitized) container.appendChild(sanitized)
  })
  return container.innerHTML
}
