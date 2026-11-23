// author: Bob
import MarkdownIt from 'markdown-it'
import { resolveAppRoute } from '@/router/appRouteResolver'
import { getCloudflareSharedResumeDocument } from '@/services/localResumeShareService'
import { decodeOfflineSharePayload } from '@/services/offlineShareService'
import {
  getSharedResumeDocument,
  type ResumeData,
} from '@/services/resumeStorageService'
import {
  getResumeTemplateByKey,
  normalizeResumeTemplateKey,
} from '@/templates/resume'

export type ResumeImportSourceType = 'json-text' | 'json-file' | 'offline-link' | 'share-link'

export interface ImportResumeContentParams {
  content: ResumeData
  title?: string
  mode: 'create' | 'overwrite'
  preserveTemplateIfMissing?: boolean
  preserveLayoutIfMissing?: boolean
}

export interface ResumeImportSummary {
  title: string
  name: string
  jobTitle: string
  templateKey: string
  templateName: string
  educationCount: number
  workCount: number
  projectCount: number
  awardCount: number
  hasSkills: boolean
  hasSelfIntro: boolean
}

export interface ParsedResumeImportResult {
  sourceType: ResumeImportSourceType
  suggestedTitle: string
  data: ResumeData
  hasTemplateKey: boolean
  hasLayoutSettings: boolean
  warnings: string[]
  summary: ResumeImportSummary
}

interface StandardModuleDef {
  key: string
  label: string
  icon: string
  defaultVisible: boolean
}

const STANDARD_MODULES: StandardModuleDef[] = [
  { key: 'basicInfo', label: '基本信息', icon: '👤', defaultVisible: true },
  { key: 'education', label: '教育经历', icon: '🎓', defaultVisible: true },
  { key: 'skills', label: '专业技能', icon: '⚡', defaultVisible: true },
  { key: 'workExperience', label: '工作经历', icon: '💼', defaultVisible: true },
  { key: 'projectExperience', label: '项目经历', icon: '📁', defaultVisible: true },
  { key: 'awards', label: '荣誉奖项', icon: '🏆', defaultVisible: false },
  { key: 'selfIntro', label: '个人简介', icon: '📝', defaultVisible: false },
]

const RESUME_CONTENT_KEYS = [
  'modules',
  'basicInfo',
  'educationList',
  'skills',
  'workList',
  'projectList',
  'awardList',
  'selfIntro',
] as const

const BLOCKED_HTML_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'MATH',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'LINK',
  'META',
  'BASE',
  'NOSCRIPT',
  'TEMPLATE',
])

const ALLOWED_HTML_TAGS = new Set([
  'P',
  'BR',
  'UL',
  'OL',
  'LI',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'S',
  'DEL',
  'CODE',
  'PRE',
  'SPAN',
  'DIV',
  'A',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'BLOCKQUOTE',
])

const markdownRenderer = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

let importIdCounter = 0

function createImportId(prefix: string): string {
  importIdCounter += 1
  return `${prefix}_${Date.now()}_${importIdCounter}`
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeSafeUrl(raw: unknown): string {
  const trimmed = asString(raw).trim()
  if (!trimmed) return ''
  if (/^(javascript|vbscript|data):/i.test(trimmed)) {
    return ''
  }
  return trimmed
}

function normalizeSafeAnchorHref(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  let candidate = trimmed
  if (!/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    candidate = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      ? `mailto:${trimmed}`
      : `https://${trimmed}`
  }
  try {
    const parsed = new URL(candidate)
    if (['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return parsed.href
    }
  } catch {
    return ''
  }
  return ''
}

function normalizeSafeAvatar(raw: unknown): string {
  const trimmed = asString(raw).trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed) || /^data:image\/[a-z0-9.+-]+/i.test(trimmed)) {
    return trimmed
  }
  return ''
}

function hasAnyResumeContentField(obj: Record<string, unknown>): boolean {
  return RESUME_CONTENT_KEYS.some((key) => key in obj)
}

function unwrapResumeEnvelope(rawObj: Record<string, unknown>): {
  payload: Record<string, unknown>
  envelopeTitle: string
} {
  if (isPlainObject(rawObj.content) && hasAnyResumeContentField(rawObj.content)) {
    return {
      payload: rawObj.content,
      envelopeTitle: asString(rawObj.title).trim(),
    }
  }
  return {
    payload: rawObj,
    envelopeTitle: asString(rawObj.title).trim(),
  }
}

function sanitizeDomNode(node: Node, targetDoc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return targetDoc.createTextNode(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }

  const element = node as Element
  const tagName = element.tagName.toUpperCase()

  if (BLOCKED_HTML_TAGS.has(tagName)) {
    return null
  }

  if (!ALLOWED_HTML_TAGS.has(tagName)) {
    const fragment = targetDoc.createDocumentFragment()
    element.childNodes.forEach((child) => {
      const cleaned = sanitizeDomNode(child, targetDoc)
      if (cleaned) fragment.appendChild(cleaned)
    })
    return fragment
  }

  if (tagName === 'A') {
    const safeHref = normalizeSafeAnchorHref(element.getAttribute('href') ?? '')
    if (!safeHref) {
      const fragment = targetDoc.createDocumentFragment()
      element.childNodes.forEach((child) => {
        const cleaned = sanitizeDomNode(child, targetDoc)
        if (cleaned) fragment.appendChild(cleaned)
      })
      return fragment
    }
    const anchor = targetDoc.createElement('a')
    anchor.setAttribute('href', safeHref)
    anchor.setAttribute('target', '_blank')
    anchor.setAttribute('rel', 'noopener noreferrer')
    element.childNodes.forEach((child) => {
      const cleaned = sanitizeDomNode(child, targetDoc)
      if (cleaned) anchor.appendChild(cleaned)
    })
    return anchor
  }

  const cleanElement = targetDoc.createElement(tagName.toLowerCase())
  element.childNodes.forEach((child) => {
    const cleaned = sanitizeDomNode(child, targetDoc)
    if (cleaned) cleanElement.appendChild(cleaned)
  })
  return cleanElement
}

/**
 * 清洗并转换导入的富文本字段：
 * 若为纯文本或 Markdown 则先转为简洁 HTML，再执行标签白名单与 XSS 过滤。
 */
export function sanitizeResumeRichHtml(raw: unknown): {
  html: string
  convertedFromPlainText: boolean
} {
  const rawText = asString(raw).trim()
  if (!rawText) {
    return { html: '', convertedFromPlainText: false }
  }

  const containsHtmlTag = /<\/?[a-z][\w-]*(?:\s[^>]*)?>/i.test(rawText)
  const htmlCandidate = containsHtmlTag ? rawText : markdownRenderer.render(rawText)
  const convertedFromPlainText = !containsHtmlTag

  if (typeof DOMParser === 'undefined') {
    return {
      html: htmlCandidate.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim(),
      convertedFromPlainText,
    }
  }

  const parser = new DOMParser()
  const parsedDoc = parser.parseFromString(htmlCandidate, 'text/html')
  const container = parsedDoc.createElement('div')
  parsedDoc.body.childNodes.forEach((child) => {
    const cleaned = sanitizeDomNode(child, parsedDoc)
    if (cleaned) container.appendChild(cleaned)
  })

  return {
    html: container.innerHTML.trim(),
    convertedFromPlainText,
  }
}

function tryParsePlainJsonObject(candidate: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(candidate)
    return isPlainObject(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * 从用户粘贴的文本中提取合法 JSON 对象。
 * 兼容直接 JSON、Markdown ```json 代码块以及带前后解释语的 AI 回复。
 */
export function extractJsonObjectText(raw: string): string {
  const cleaned = raw.replace(/^\uFEFF/, '').trim()
  if (!cleaned) {
    throw new Error('请先输入或粘贴简历 JSON 内容。')
  }

  const directParsed = tryParsePlainJsonObject(cleaned)
  if (directParsed) {
    return cleaned
  }

  // 若顶层本身是合法 JSON 但不是对象（如数组或字符串），明确提示结构错误
  try {
    const rawValue = JSON.parse(cleaned)
    if (!isPlainObject(rawValue)) {
      throw new Error('JSON 顶层必须是对象结构（以 { 开头），不支持数组或纯文本。')
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('顶层必须是对象')) {
      throw err
    }
  }

  const fenceRegex = /```(?:json|jsonc)?\s*\r?\n?([\s\S]*?)```/gi
  let fallbackBlock = ''
  let fenceMatch: RegExpExecArray | null = fenceRegex.exec(cleaned)
  while (fenceMatch) {
    const blockContent = (fenceMatch[1] ?? '').trim()
    if (blockContent) {
      const parsedBlock = tryParsePlainJsonObject(blockContent)
      if (parsedBlock) {
        const { payload } = unwrapResumeEnvelope(parsedBlock)
        if (hasAnyResumeContentField(payload)) {
          return blockContent
        }
        if (!fallbackBlock) fallbackBlock = blockContent
      }
    }
    fenceMatch = fenceRegex.exec(cleaned)
  }
  if (fallbackBlock) {
    return fallbackBlock
  }

  let fallbackSlice = ''
  for (let start = 0; start < cleaned.length; start += 1) {
    if (cleaned[start] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false

    for (let end = start; end < cleaned.length; end += 1) {
      const ch = cleaned[end]
      if (inString) {
        if (escaped) {
          escaped = false
        } else if (ch === '\\') {
          escaped = true
        } else if (ch === '"') {
          inString = false
        }
        continue
      }

      if (ch === '"') {
        inString = true
      } else if (ch === '{') {
        depth += 1
      } else if (ch === '}') {
        depth -= 1
        if (depth === 0) {
          const candidate = cleaned.slice(start, end + 1)
          const parsedSlice = tryParsePlainJsonObject(candidate)
          if (parsedSlice) {
            const { payload } = unwrapResumeEnvelope(parsedSlice)
            if (hasAnyResumeContentField(payload)) {
              return candidate
            }
            if (!fallbackSlice) fallbackSlice = candidate
          }
          break
        }
      }
    }
  }
  if (fallbackSlice) {
    return fallbackSlice
  }

  throw new Error('未能识别有效的简历 JSON 对象，请确认已复制完整的大括号 { ... } 内容。')
}

function normalizeBasicLinkField(value: unknown): { text: string; url: string } {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return {
      text: trimmed,
      url: normalizeSafeUrl(trimmed),
    }
  }
  if (isPlainObject(value)) {
    return {
      text: asString(value.text).trim(),
      url: normalizeSafeUrl(value.url),
    }
  }
  return { text: '', url: '' }
}

function normalizeCustomItemsField(value: unknown, seenIds: Set<string>): Array<{ id: string; label: string; value: string }> {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => isPlainObject(item))
    .map((item) => {
      const rawId = asString(item.id).trim()
      const id = rawId && !seenIds.has(rawId) ? rawId : createImportId('custom')
      seenIds.add(id)
      return {
        id,
        label: asString(item.label).trim(),
        value: asString(item.value).trim(),
      }
    })
}

function hasTextInHtml(html: string): boolean {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0
}

function pickUniqueId(rawId: unknown, prefix: string, seenIds: Set<string>): string {
  const candidate = asString(rawId).trim()
  if (candidate && !seenIds.has(candidate)) {
    seenIds.add(candidate)
    return candidate
  }
  const generated = createImportId(prefix)
  seenIds.add(generated)
  return generated
}

function normalizeModulesField(
  rawModules: unknown,
  presence: Record<string, boolean>,
): Array<{ key: string; label: string; icon: string; visible: boolean }> {
  const standardMap = new Map(STANDARD_MODULES.map((m) => [m.key, m]))

  if (!Array.isArray(rawModules) || rawModules.length === 0) {
    const hasAnyContent = Object.values(presence).some(Boolean)
    return STANDARD_MODULES.map((mod) => ({
      key: mod.key,
      label: mod.label,
      icon: mod.icon,
      visible: hasAnyContent ? Boolean(presence[mod.key]) : mod.defaultVisible,
    }))
  }

  const incomingMap = new Map<string, Record<string, unknown>>()
  const orderedKeys: string[] = ['basicInfo']

  rawModules.forEach((item) => {
    if (!isPlainObject(item)) return
    const key = asString(item.key).trim()
    if (!key || !standardMap.has(key)) return
    incomingMap.set(key, item)
    if (key !== 'basicInfo' && !orderedKeys.includes(key)) {
      orderedKeys.push(key)
    }
  })

  STANDARD_MODULES.forEach((mod) => {
    if (!orderedKeys.includes(mod.key)) {
      orderedKeys.push(mod.key)
    }
  })

  return orderedKeys.map((key) => {
    const base = standardMap.get(key)!
    const incoming = incomingMap.get(key)
    return {
      key: base.key,
      label: asString(incoming?.label).trim() || base.label,
      icon: asString(incoming?.icon).trim() || base.icon,
      visible: typeof incoming?.visible === 'boolean'
        ? incoming.visible
        : base.key === 'basicInfo'
          ? true
          : Boolean(presence[base.key] ?? base.defaultVisible),
    }
  })
}

/**
 * 将任意解析后的对象规范化为可安全导入的 ResumeData 与摘要信息。
 */
export function normalizeImportedResumeData(
  rawObject: unknown,
  options: { sourceType: ResumeImportSourceType; fallbackTitle?: string },
): ParsedResumeImportResult {
  if (!isPlainObject(rawObject)) {
    throw new Error('简历数据必须是 JSON 对象结构。')
  }

  const { payload, envelopeTitle } = unwrapResumeEnvelope(rawObject)
  if (!hasAnyResumeContentField(payload)) {
    throw new Error('JSON 中缺少有效的简历数据字段（如 basicInfo、workList、educationList 等）。')
  }

  let convertedFromPlainText = false
  const sanitizeField = (value: unknown): string => {
    const result = sanitizeResumeRichHtml(value)
    if (result.convertedFromPlainText) convertedFromPlainText = true
    return result.html
  }

  const seenIds = new Set<string>()
  const rawBasic = isPlainObject(payload.basicInfo) ? payload.basicInfo : {}

  const basicInfo: Record<string, unknown> = {
    name: asString(rawBasic.name).trim(),
    phone: asString(rawBasic.phone).trim(),
    email: asString(rawBasic.email).trim(),
    age: asString(rawBasic.age).trim(),
    gender: asString(rawBasic.gender).trim(),
    location: asString(rawBasic.location).trim(),
    jobTitle: asString(rawBasic.jobTitle).trim(),
    educationLevel: asString(rawBasic.educationLevel).trim(),
    avatar: normalizeSafeAvatar(rawBasic.avatar),
    workYears: asString(rawBasic.workYears).trim(),
    currentStatus: asString(rawBasic.currentStatus).trim(),
    expectedLocation: asString(rawBasic.expectedLocation).trim(),
    expectedSalary: asString(rawBasic.expectedSalary).trim(),
    website: normalizeBasicLinkField(rawBasic.website),
    wechat: asString(rawBasic.wechat).trim(),
    currentCity: asString(rawBasic.currentCity).trim(),
    github: normalizeBasicLinkField(rawBasic.github),
    blog: normalizeBasicLinkField(rawBasic.blog),
    customItems: normalizeCustomItemsField(rawBasic.customItems, seenIds),
  }

  const educationList = Array.isArray(payload.educationList)
    ? payload.educationList
        .filter((item) => isPlainObject(item))
        .map((item) => ({
          id: pickUniqueId(item.id, 'edu', seenIds),
          school: asString(item.school).trim(),
          college: asString(item.college).trim(),
          major: asString(item.major).trim(),
          degree: asString(item.degree).trim(),
          startDate: asString(item.startDate).trim(),
          endDate: asString(item.endDate).trim(),
          gpa: asString(item.gpa).trim(),
          description: sanitizeField(item.description),
          type: asString(item.type).trim(),
          location: asString(item.location).trim(),
        }))
    : []

  const workList = Array.isArray(payload.workList)
    ? payload.workList
        .filter((item) => isPlainObject(item))
        .map((item) => ({
          id: pickUniqueId(item.id, 'work', seenIds),
          company: asString(item.company).trim(),
          department: asString(item.department).trim(),
          position: asString(item.position).trim(),
          startDate: asString(item.startDate).trim(),
          endDate: asString(item.endDate).trim(),
          location: asString(item.location).trim(),
          description: sanitizeField(item.description),
        }))
    : []

  const projectList = Array.isArray(payload.projectList)
    ? payload.projectList
        .filter((item) => isPlainObject(item))
        .map((item) => ({
          id: pickUniqueId(item.id, 'proj', seenIds),
          name: asString(item.name).trim(),
          role: asString(item.role).trim(),
          startDate: asString(item.startDate).trim(),
          endDate: asString(item.endDate).trim(),
          link: normalizeSafeUrl(item.link),
          introduction: sanitizeField(item.introduction),
          mainWork: sanitizeField(item.mainWork),
        }))
    : []

  const awardList = Array.isArray(payload.awardList)
    ? payload.awardList
        .filter((item) => isPlainObject(item))
        .map((item) => ({
          id: pickUniqueId(item.id, 'award', seenIds),
          name: asString(item.name).trim(),
          date: asString(item.date).trim(),
          description: sanitizeField(item.description),
        }))
    : []

  const skillsHtml = sanitizeField(payload.skills)
  const selfIntroHtml = sanitizeField(payload.selfIntro)

  const modules = normalizeModulesField(payload.modules, {
    basicInfo: true,
    education: educationList.length > 0,
    skills: hasTextInHtml(skillsHtml),
    workExperience: workList.length > 0,
    projectExperience: projectList.length > 0,
    awards: awardList.length > 0,
    selfIntro: hasTextInHtml(selfIntroHtml),
  })

  const rawTemplateKey = asString(payload.selectedTemplateKey ?? payload.selectedTemplateId).trim()
  const hasTemplateKey = Boolean(rawTemplateKey)
  const resolvedTemplateKey = normalizeResumeTemplateKey(rawTemplateKey)
  const resolvedTemplateDef = getResumeTemplateByKey(resolvedTemplateKey)

  const hasLayoutSettings =
    isPlainObject(payload.layoutSettings) && Object.keys(payload.layoutSettings).length > 0

  const normalizedData: ResumeData = {
    modules,
    ...(hasTemplateKey ? { selectedTemplateKey: resolvedTemplateKey } : {}),
    ...(hasLayoutSettings ? { layoutSettings: payload.layoutSettings as Record<string, unknown> } : {}),
    basicInfo,
    educationList,
    skills: skillsHtml,
    workList,
    projectList,
    awardList,
    selfIntro: selfIntroHtml,
  }

  const warnings: string[] = []
  if (convertedFromPlainText) {
    warnings.push('检测到纯文本或 Markdown 格式描述，已自动转换为富文本格式。')
  }
  if (!hasTemplateKey || !hasLayoutSettings) {
    warnings.push('导入内容未包含模板或排版配置，将沿用系统默认或当前排版配置。')
  }

  const name = asString(basicInfo.name)
  const jobTitle = asString(basicInfo.jobTitle)
  const fallbackTitle = options.fallbackTitle?.trim() ?? ''
  const suggestedTitle =
    fallbackTitle ||
    envelopeTitle ||
    (name && jobTitle ? `${name}-${jobTitle}` : name || jobTitle || '导入的简历')

  return {
    sourceType: options.sourceType,
    suggestedTitle,
    data: normalizedData,
    hasTemplateKey,
    hasLayoutSettings,
    warnings,
    summary: {
      title: suggestedTitle,
      name,
      jobTitle,
      templateKey: resolvedTemplateKey,
      templateName: hasTemplateKey ? resolvedTemplateDef.name : '沿用当前 / 默认模板',
      educationCount: educationList.length,
      workCount: workList.length,
      projectCount: projectList.length,
      awardCount: awardList.length,
      hasSkills: hasTextInHtml(skillsHtml),
      hasSelfIntro: hasTextInHtml(selfIntroHtml),
    },
  }
}

/**
 * 解析粘贴的 JSON 文本或上传的 JSON 文件文本。
 */
export function parseResumeFromJsonText(
  rawText: string,
  options: { sourceType?: 'json-text' | 'json-file'; fallbackTitle?: string } = {},
): ParsedResumeImportResult {
  const jsonText = extractJsonObjectText(rawText)
  const parsed = JSON.parse(jsonText) as unknown
  return normalizeImportedResumeData(parsed, {
    sourceType: options.sourceType ?? 'json-text',
    fallbackTitle: options.fallbackTitle,
  })
}

function extractHashOfflinePayload(rawHash: string): string | null {
  const cleaned = rawHash.replace(/^#/, '').trim()
  if (!cleaned) return null
  try {
    const params = new URLSearchParams(cleaned)
    const direct = params.get('d')
    if (direct && direct.trim()) return direct.trim()
  } catch {
    // 忽略异常查询串并回退正则匹配
  }
  const match = cleaned.match(/(?:^|&)d=([^&]+)/)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1]).trim()
  } catch {
    return match[1].trim()
  }
}

/**
 * 解析分享链接并转换为可导入的标准化简历结构。
 * 支持离线压缩长链（/share#d=... 或 #d=...）及同站 Cloudflare/后端分享短链。
 */
export async function parseResumeFromShareLink(rawLink: string): Promise<ParsedResumeImportResult> {
  const trimmed = rawLink.trim()
  if (!trimmed) {
    throw new Error('请先输入或粘贴分享链接。')
  }

  if (trimmed.startsWith('#d=') || trimmed.startsWith('d=')) {
    const payload = extractHashOfflinePayload(trimmed)
    if (!payload) {
      throw new Error('未能从链接片段中识别压缩数据，请检查是否复制完整。')
    }
    const sharedDoc = await decodeOfflineSharePayload(payload)
    return normalizeImportedResumeData(sharedDoc.content, {
      sourceType: 'offline-link',
      fallbackTitle: sharedDoc.title,
    })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(trimmed, window.location.origin)
  } catch {
    throw new Error('链接格式无效，请粘贴完整的分享 URL 或以 #d= 开头的离线链接。')
  }

  const route = resolveAppRoute(parsedUrl.pathname, parsedUrl.hash)
  if (route.mode === 'share' && route.shareSource === 'offline') {
    const payload = route.offlinePayload || extractHashOfflinePayload(parsedUrl.hash) || ''
    if (!payload) {
      throw new Error('离线压缩链接缺少数据参数（#d=...），请确认复制了完整链接。')
    }
    const sharedDoc = await decodeOfflineSharePayload(payload)
    return normalizeImportedResumeData(sharedDoc.content, {
      sourceType: 'offline-link',
      fallbackTitle: sharedDoc.title,
    })
  }

  const fallbackOfflinePayload = extractHashOfflinePayload(parsedUrl.hash)
  if (fallbackOfflinePayload) {
    const sharedDoc = await decodeOfflineSharePayload(fallbackOfflinePayload)
    return normalizeImportedResumeData(sharedDoc.content, {
      sourceType: 'offline-link',
      fallbackTitle: sharedDoc.title,
    })
  }

  if (route.mode === 'share' && (route.shareSource === 'cloudflare' || route.shareSource === 'backend')) {
    if (parsedUrl.origin !== window.location.origin) {
      throw new Error(
        '该短链来自其他站点域名，受浏览器跨域策略限制无法直接拉取；请使用本站点分享链接，或让对方通过「导出可导入长链 / 复制 JSON 文本」分享给你。',
      )
    }

    const token = route.shareToken ?? ''
    if (!token) {
      throw new Error('分享短链缺少有效标识，请检查链接是否完整。')
    }

    const sharedDoc =
      route.shareSource === 'cloudflare'
        ? await getCloudflareSharedResumeDocument(token)
        : await getSharedResumeDocument(token)

    return normalizeImportedResumeData(sharedDoc.content, {
      sourceType: 'share-link',
      fallbackTitle: sharedDoc.title,
    })
  }

  throw new Error('未能识别为有效的简历分享链接，请粘贴包含 /share#d=... 的长链或本站分享短链。')
}

/**
 * 构建用于复制到剪贴板的便携 JSON 文本，自动剔除超长本地 Base64 头像以免剪贴板过载。
 */
export function buildPortableResumeJsonText(data: ResumeData): {
  jsonText: string
  avatarStripped: boolean
} {
  const cloned = JSON.parse(JSON.stringify(data)) as ResumeData
  let avatarStripped = false

  if (cloned.basicInfo && typeof cloned.basicInfo.avatar === 'string') {
    const rawAvatar = cloned.basicInfo.avatar
    if (rawAvatar.startsWith('data:') && rawAvatar.length > 1024) {
      cloned.basicInfo.avatar = ''
      avatarStripped = true
    }
  }

  return {
    jsonText: JSON.stringify(cloned, null, 2),
    avatarStripped,
  }
}

/**
 * 为“新建简历导入”组装完整内容，在导入数据缺失模板或排版配置时可按需沿用当前配置。
 */
export function buildImportCreateResumePayload<
  TLayout extends Record<string, unknown>,
>(params: {
  content: ResumeData
  currentTemplateKey: string
  currentLayoutSettings: TLayout
  defaultLayoutSettings: TLayout
  preserveTemplateIfMissing?: boolean
  preserveLayoutIfMissing?: boolean
}): ResumeData {
  const hasTemplate = Boolean(params.content.selectedTemplateKey || params.content.selectedTemplateId)
  const hasLayout = Boolean(
    params.content.layoutSettings && Object.keys(params.content.layoutSettings).length > 0,
  )

  const selectedTemplateKey = hasTemplate
    ? normalizeResumeTemplateKey(params.content.selectedTemplateKey ?? params.content.selectedTemplateId)
    : params.preserveTemplateIfMissing
      ? normalizeResumeTemplateKey(params.currentTemplateKey)
      : 'default'

  const layoutSettings = hasLayout
    ? { ...params.defaultLayoutSettings, ...params.content.layoutSettings }
    : params.preserveLayoutIfMissing
      ? { ...params.currentLayoutSettings }
      : { ...params.defaultLayoutSettings }

  return {
    ...params.content,
    selectedTemplateKey,
    layoutSettings,
  }
}
