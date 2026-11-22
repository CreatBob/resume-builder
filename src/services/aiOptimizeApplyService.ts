// author: Bob
import MarkdownIt from 'markdown-it'
import type { AwardEntry, ProjectEntry, WorkEntry } from '@/stores/resume'
import type { useResumeStore } from '@/stores/resume'
import { getModuleLabel } from '@/services/aiService'

export interface ApplyUndoSnapshot {
  resumeId: string
  previousContent: string
  previousWorkDescriptions?: string[]
  previousWorkDescriptionsById?: Record<string, string>
  previousProjectIntroductions?: string[]
  previousProjectMainWorks?: string[]
  previousProjectById?: Record<string, { introduction: string; mainWork: string }>
  previousAwards?: AwardEntry[]
  previousIntroduction?: string
  hadEntry?: boolean
  createdAwardId?: string
}

export interface DiffLine {
  type: 'unchanged' | 'removed' | 'added'
  text: string
}

export interface SelectableOptimizedEntry {
  index: number
  title: string
  previewText: string
}

type PreferredListType = 'ordered' | 'unordered'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})

const COMMON_TECH_KEYWORDS = [
  'Vue 3',
  'Vue',
  'React',
  'TypeScript',
  'JavaScript',
  'Vite',
  'Pinia',
  'Webpack',
  'Tailwind CSS',
  'Playwright',
  'Spring Boot',
  'SpringBoot',
  'Spring Cloud',
  'Spring AI',
  'MyBatis-Plus',
  'FastAPI',
  'Python',
  'Go',
  'Java',
  'MySQL',
  'PostgreSQL',
  'pgvector',
  'Redis',
  'Redisson',
  'Kafka',
  'RabbitMQ',
  'RocketMQ',
  'Elasticsearch',
  'Nginx',
  'Docker',
  'Kubernetes',
  'K8s',
  'Cloudflare',
  'SSE',
  'WebSocket',
  'RAG',
  'LLM',
  'GraphQL',
  'gRPC',
  '分布式锁',
  '缓存预热',
  '覆盖索引',
  '限流降级',
  '异步编排',
  '性能优化',
  '首屏加载',
  '高可用',
  '微服务',
] as const

const METRIC_PHRASE_REGEX =
  /从\s*\d+(?:\.\d+)?\s*(?:ms|s|秒|分钟|小时|天|周|月|年|QPS|TPS|%|倍|个|次|项|万|亿|KB|MB)?\s*(?:左右)?\s*(?:降至|降低到|下降到|减少到|优化到|提升至|提升到|提高到|缩短至)\s*\d+(?:\.\d+)?\s*(?:ms|s|秒|分钟|小时|天|周|月|年|QPS|TPS|%|倍|个|次|项|万|亿|KB|MB)?/gi
const METRIC_UNIT_REGEX =
  /\d+(?:\.\d+)?\s*(?:ms|s|秒|分钟|小时|天|周|月|年|QPS|TPS|%|倍|个|次|项|w|W|万|亿|KB|MB|GB|条\/s|次\/s)/g

export const APPLY_SUPPORTED_MODULES = new Set([
  'skills',
  'selfIntro',
  'workExperience',
  'projectExperience',
  'awards',
])

export function renderMarkdownHtml(mdText: string): string {
  return markdown.render(mdText || '')
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function removeLeadingModuleTitle(markdownText: string, moduleKey: string): string {
  const label = getModuleLabel(moduleKey).trim()
  if (!label) return markdownText.trim()

  const lines = markdownText.split(/\r?\n/)
  let start = 0
  const plainTitle = new RegExp(`^${escapeRegExp(label)}[：:]?$`)
  const mdHeading = new RegExp(`^#{1,6}\\s*${escapeRegExp(label)}[：:]?$`)
  const boldTitle = new RegExp(`^\\*\\*\\s*${escapeRegExp(label)}\\s*\\*\\*[：:]?$`)

  while (start < lines.length && !lines[start]?.trim()) start++
  while (start < lines.length) {
    const current = lines[start]?.trim() ?? ''
    if (plainTitle.test(current) || mdHeading.test(current) || boldTitle.test(current)) {
      start++
      while (start < lines.length && !lines[start]?.trim()) start++
      continue
    }
    break
  }

  return lines.slice(start).join('\n').trim()
}

function stripMarkdownDecorators(line: string): string {
  return line
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^\s*[*_]+\s*/, '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/^\\+#{1,6}(?:\s+|(?=\S))/, '')
    .replace(/^#{1,6}(?:\s+|(?=\S))/, '')
    .replace(/\s*#{1,6}\s*$/, '')
    .replace(/^\s*[*_]+/, '')
    .replace(/[*_]+\s*$/, '')
    .trim()
}

function normalizeListMarkerSpacing(line: string): string {
  return line
    .replace(/^(#{1,6})(?=\S)/, '$1 ')
    .replace(/^([-*+])(?=\S)/, '$1 ')
    .replace(/^(\d+)\.(?=\S)/, '$1. ')
}

function normalizeHeadingLineCandidate(line: string): string {
  return normalizeListMarkerSpacing(line.trim())
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^\s*[*_]+\s*/, '')
    .replace(/^\\+(#{1,6})(?=\S)/, '$1 ')
    .replace(/^\\+(#{1,6})\s+/, '$1 ')
    .replace(/^(#{1,6})(?=\S)/, '$1 ')
}

function normalizeMarkdownListContent(markdownText: string): string {
  const lines = markdownText.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let lastListIndex = -1

  for (const rawLine of lines) {
    const trimmed = normalizeListMarkerSpacing(rawLine.trim())
    if (!trimmed) continue

    const plain = stripMarkdownDecorators(trimmed).replace(/[：:]$/, '')
    const headingCandidate = normalizeHeadingLineCandidate(trimmed)
    const isSectionHeading =
      /^#{1,6}\s*/.test(headingCandidate)
      || /^\*\*[^*]+[:：]?\*\*$/.test(trimmed)
      || /^(项目介绍|项目简介|主要工作|核心职责|工作内容|职责|成果|技术栈)$/.test(plain)
    if (isSectionHeading) {
      out.push(trimmed)
      lastListIndex = -1
      continue
    }

    if (/^([-*+]\s+|\d+\.\s+)/.test(trimmed)) {
      out.push(trimmed)
      lastListIndex = out.length - 1
      continue
    }

    if (lastListIndex >= 0) {
      out[lastListIndex] = `${out[lastListIndex]} ${trimmed}`.replace(/\s+/g, ' ').trim()
    } else {
      out.push(trimmed)
    }
  }

  return out.join('\n').trim()
}

function renumberOrderedMarkdownList(markdownText: string): string {
  const lines = markdownText.replace(/\r\n/g, '\n').split('\n')
  let index = 1
  return lines
    .map((line) => {
      const match = line.match(/^(\s*)\d+\.\s+(.+)$/)
      if (!match) return line
      return `${match[1] ?? ''}${index++}. ${match[2] ?? ''}`
    })
    .join('\n')
}

function mergeShortSkillsListItems(markdownText: string): string {
  const lines = markdownText.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  const levelRegex = /^(掌握|熟悉|了解)\s*/

  const getItemInfo = (line: string) => {
    const match = line.match(/^(\s*(?:[-*+]\s+|\d+\.\s+))(.*)$/)
    if (!match) return null
    const marker = match[1] ?? ''
    const body = (match[2] ?? '').trim()
    const level = body.match(levelRegex)?.[1] ?? ''
    const bodyWithoutLevel = level ? body.replace(levelRegex, '').trim() : body
    const shortScore = stripMarkdownDecorators(bodyWithoutLevel).replace(/[，。；、,.;:\s]/g, '').length
    return { marker, body, level, shortScore }
  }

  for (const rawLine of lines) {
    const current = rawLine.trim()
    if (!current) continue
    const currentInfo = getItemInfo(current)
    if (!currentInfo || out.length === 0) {
      out.push(current)
      continue
    }
    const prevIndex = out.length - 1
    const prevInfo = getItemInfo(out[prevIndex] ?? '')
    if (!prevInfo) {
      out.push(current)
      continue
    }
    const sameListType = /^(\s*[-*+]\s+)/.test(prevInfo.marker) === /^(\s*[-*+]\s+)/.test(currentInfo.marker)
    const sameLevel = Boolean(prevInfo.level) && prevInfo.level === currentInfo.level
    const shouldMerge = prevInfo.shortScore <= 24 || currentInfo.shortScore <= 24
    const mergedLen = stripMarkdownDecorators(`${prevInfo.body}${currentInfo.body}`).replace(/\s+/g, '').length
    if (!sameListType || !sameLevel || !shouldMerge || mergedLen > 90) {
      out.push(current)
      continue
    }
    const currentNoLevel = currentInfo.level ? currentInfo.body.replace(levelRegex, '').trim() : currentInfo.body
    const prevBody = prevInfo.body.replace(/[，。；;]\s*$/, '')
    out[prevIndex] = `${prevInfo.marker}${prevBody}；${currentNoLevel}`
  }

  return renumberOrderedMarkdownList(out.join('\n').trim())
}

function createBoldToken(raw: string, tokenMap: Record<string, string>): string {
  const key = `@@BOLD_TOKEN_${Object.keys(tokenMap).length}@@`
  tokenMap[key] = raw
  return key
}

function enhanceLineHighlights(lineBody: string): string {
  const tokenMap: Record<string, string> = {}
  let working = lineBody.replace(/\*\*[^*]+\*\*/g, (match) => createBoldToken(match, tokenMap))
  working = working.replace(METRIC_PHRASE_REGEX, (match) => createBoldToken(`**${match}**`, tokenMap))
  working = working.replace(METRIC_UNIT_REGEX, (match) => createBoldToken(`**${match}**`, tokenMap))

  const sortedKeywords = [...COMMON_TECH_KEYWORDS].sort((a, b) => b.length - a.length)
  for (const keyword of sortedKeywords) {
    const escaped = escapeRegExp(keyword)
    const prefix = /^[A-Za-z0-9]/.test(keyword) ? '(?<![A-Za-z0-9_])' : ''
    const suffix = /[A-Za-z0-9]$/.test(keyword) ? '(?![A-Za-z0-9_])' : ''
    const regex = new RegExp(`${prefix}${escaped}${suffix}`, 'gi')
    working = working.replace(regex, (match) => createBoldToken(`**${match}**`, tokenMap))
  }

  for (const [token, raw] of Object.entries(tokenMap)) {
    working = working.split(token).join(raw)
  }
  return working
}

function enhanceProjectMainWorkBold(markdownText: string): string {
  return markdownText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      const match = line.match(/^(\s*(?:[-*+]\s+|\d+\.\s+))(.*)$/)
      if (!match || !(match[2] ?? '').trim()) return line
      return `${match[1] ?? ''}${enhanceLineHighlights(match[2] ?? '')}`
    })
    .join('\n')
}

function normalizeProjectIntroductionSingleLine(markdownText: string): string {
  const noStrong = markdownText
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/建设目标[:：]?\s*/g, '')
    .replace(/建设目的[:：]?\s*/g, '')
  return noStrong
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseProjectOptimizedContent(markdownText: string): { introduction: string; mainWork: string } {
  const lines = markdownText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !/^(项目名称|项目名|角色|岗位|时间|项目链接|链接)\s*[:：]/.test(stripMarkdownDecorators(line)))

  const isIntroHeading = (line: string) => {
    const plain = stripMarkdownDecorators(line).replace(/[：:]$/, '')
    return plain === '项目介绍' || plain === '项目简介'
  }
  const isWorkHeading = (line: string) => {
    const plain = stripMarkdownDecorators(line).replace(/[：:]$/, '')
    return plain === '主要工作' || plain === '核心职责' || plain === '工作内容' || plain === '职责'
  }

  const introIdx = lines.findIndex(isIntroHeading)
  const workIdx = lines.findIndex(isWorkHeading)
  let introRaw = ''
  let workRaw = ''

  if (introIdx >= 0 && workIdx >= 0) {
    if (introIdx < workIdx) {
      introRaw = lines.slice(introIdx + 1, workIdx).join('\n').trim()
      workRaw = lines.slice(workIdx + 1).join('\n').trim()
    } else {
      workRaw = lines.slice(workIdx + 1, introIdx).join('\n').trim()
      introRaw = lines.slice(introIdx + 1).join('\n').trim()
    }
  } else if (workIdx >= 0) {
    introRaw = lines.slice(0, workIdx).join('\n').trim()
    workRaw = lines.slice(workIdx + 1).join('\n').trim()
  } else {
    const firstListIdx = lines.findIndex((line) => /^([-*+]\s+|\d+\.\s+)/.test(line.trim()))
    if (firstListIdx > 0) {
      introRaw = lines.slice(0, firstListIdx).join('\n').trim()
      workRaw = lines.slice(firstListIdx).join('\n').trim()
    } else {
      workRaw = lines.join('\n').trim()
    }
  }

  return {
    introduction: normalizeMarkdownListContent(introRaw),
    mainWork: normalizeMarkdownListContent(workRaw),
  }
}

function detectSectionStartIndexes(lines: string[], names: string[], kindLabel: '项目经历' | '工作经历'): number[] {
  const indexes: number[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]?.trim()
    if (!raw) continue
    const plain = stripMarkdownDecorators(raw)
    const hasName = names.some((name) => plain.includes(name))
    const isNameOnly = names.some((name) => plain === name)
    const hasDateRange = /(?:19|20)\d{2}[./-]\d{1,2}\s*(?:[~～\-—–至到]+\s*(?:(?:19|20)\d{2}[./-]\d{1,2}|至今|现在))/.test(plain)
    const hasSep = /[|｜•·]/.test(plain)
    const headingCandidate = normalizeHeadingLineCandidate(raw)
    const headingRegex = new RegExp(`^#{1,6}\\s*${kindLabel}\\s*\\d+`, 'i')
    const plainRegex = new RegExp(`^${kindLabel}\\s*\\d+[：:]?$`, 'i')
    if (headingRegex.test(headingCandidate) || plainRegex.test(plain) || (hasName && (isNameOnly || hasDateRange || hasSep || /^#{1,6}\s*/.test(headingCandidate)))) {
      indexes.push(i)
    }
  }
  return Array.from(new Set(indexes)).sort((a, b) => a - b)
}

function preprocessSplitLines(markdownText: string): string[] {
  return markdownText
    .replace(/\r\n/g, '\n')
    .replace(/(^|\n)\s*\\+(#{1,6})(?=\S)/g, '$1$2 ')
    .replace(/(^|\n)\s*\\+(#{1,6})\s+/g, '$1$2 ')
    .replace(/([^\n])\s+(#{1,6})\s*(?=\S)/g, '$1\n$2 ')
    .split('\n')
}

function parseProjectOptimizedSections(markdownText: string, projectList: ProjectEntry[]) {
  const lines = preprocessSplitLines(markdownText)
  const names = projectList.map((p) => p.name.trim()).filter(Boolean)
  const starts = detectSectionStartIndexes(lines, names, '项目经历')
  if (starts.length === 0) {
    const single = parseProjectOptimizedContent(markdownText)
    return single.introduction || single.mainWork ? [single] : []
  }

  const sections: Array<{ introduction: string; mainWork: string }> = []
  for (let i = 0; i < starts.length; i += 1) {
    const block = lines.slice(starts[i], starts[i + 1] ?? lines.length)
    let start = 0
    while (start < block.length) {
      const curr = block[start]?.trim() ?? ''
      if (!curr) {
        start += 1
        continue
      }
      const plain = stripMarkdownDecorators(curr).replace(/[：:]$/, '').trim()
      const isMeta =
        /^项目经历\s*\d+$/i.test(plain)
        || /^(项目名称|项目名|角色|岗位|时间|项目链接|链接)\s*[:：]/.test(plain)
        || (names.some((name) => plain.includes(name)) && (names.includes(plain) || /[|｜•·]/.test(plain) || /^#{1,6}\s*/.test(curr)))
      if (!isMeta) break
      start += 1
    }
    const parsed = parseProjectOptimizedContent(block.slice(start).join('\n'))
    if (parsed.introduction || parsed.mainWork) sections.push(parsed)
  }
  return sections
}

function parseWorkOptimizedContent(markdownText: string, workList: WorkEntry[]): string[] {
  const lines = preprocessSplitLines(markdownText)
  const names = workList.map((w) => w.company.trim()).filter(Boolean)
  const starts = detectSectionStartIndexes(lines, names, '工作经历')
  if (starts.length === 0) {
    const single = normalizeMarkdownListContent(markdownText)
    return single ? [single] : []
  }

  const sections: string[] = []
  for (let i = 0; i < starts.length; i += 1) {
    const block = lines.slice(starts[i], starts[i + 1] ?? lines.length)
    let start = 0
    while (start < block.length) {
      const curr = block[start]?.trim() ?? ''
      if (!curr) {
        start += 1
        continue
      }
      const plain = stripMarkdownDecorators(curr).replace(/[：:]$/, '').trim()
      const isMeta =
        /^工作经历\s*\d+$/i.test(plain)
        || /^(公司|单位|部门|职位|岗位|任职时间|时间)\s*[:：]/.test(plain)
        || (names.some((name) => plain.includes(name)) && (names.includes(plain) || /[|｜•·]/.test(plain) || /^#{1,6}\s*/.test(curr)))
      if (!isMeta) break
      start += 1
    }
    const normalized = normalizeMarkdownListContent(block.slice(start).join('\n'))
    if (normalized) sections.push(normalized)
  }
  return sections
}

function normalizeAwardDate(rawDate: string): string {
  const trimmed = rawDate.trim()
  if (!trimmed) return ''
  const strict = trimmed.match(/^((?:19|20)\d{2})-(0[1-9]|1[0-2])$/)
  if (strict) return strict[0]
  const loose = trimmed.match(/((?:19|20)\d{2})\s*[年./-]\s*(0?[1-9]|1[0-2])(?:\s*月)?/)
  if (loose?.[1] && loose?.[2]) return `${loose[1]}-${loose[2].padStart(2, '0')}`
  return ''
}

function parseAwardOptimizedSections(markdownText: string) {
  const lines = markdownText.replace(/\r\n/g, '\n').split('\n')
  const sections: Array<{ name: string; date: string; description: string }> = []
  let current = { name: '', date: '', description: '' }

  const flush = () => {
    if (current.name.trim() || current.date.trim() || stripMarkdownDecorators(current.description).trim()) {
      sections.push({
        name: current.name.trim(),
        date: current.date.trim(),
        description: current.description.trim(),
      })
    }
    current = { name: '', date: '', description: '' }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const plain = stripMarkdownDecorators(line).trim()
    if (/^[-=]{3,}$/.test(line) || (/^#{1,6}\s*/.test(line) && /^(奖项|荣誉)/.test(plain))) {
      flush()
      continue
    }
    const nameMatch = plain.match(/^(?:奖项名称|奖项|名称)\s*[：:]\s*(.+)$/)
    if (nameMatch?.[1]) {
      if (current.name.trim()) flush()
      current.name = nameMatch[1].trim()
      continue
    }
    const dateMatch = plain.match(/^(?:获奖时间|时间|日期)\s*[：:]\s*(.+)$/)
    if (dateMatch?.[1]) {
      const normalized = normalizeAwardDate(dateMatch[1])
      if (normalized) current.date = normalized
      continue
    }
    const descMatch = plain.match(/^(?:描述|说明|奖项描述)\s*[：:]\s*(.*)$/)
    if (descMatch) {
      const val = descMatch[1]?.trim() ?? ''
      if (val) current.description = current.description ? `${current.description}\n${val}` : val
      continue
    }
    current.description = current.description ? `${current.description}\n${line}` : line
  }
  flush()
  return sections
}

function renderWithOriginalStyle(
  sectionMarkdown: string,
  originalHtml: string,
  fallbackType: PreferredListType,
): string {
  const firstTag = originalHtml.match(/<(ol|ul)\b/i)?.[1]?.toLowerCase()
  const preferredType: PreferredListType = firstTag === 'ol' ? 'ordered' : firstTag === 'ul' ? 'unordered' : fallbackType
  const lines = sectionMarkdown.replace(/\r\n/g, '\n').split('\n')
  let orderedIndex = 1
  const normalized = lines
    .map((line) => {
      const indent = line.match(/^\s*/)?.[0] ?? ''
      const trimmed = line.trim()
      const match = trimmed.match(/^(?:[-*+]|\d+\.)\s+(.+)$/)
      if (!match?.[1]) return line
      return preferredType === 'ordered' ? `${indent}${orderedIndex++}. ${match[1]}` : `${indent}- ${match[1]}`
    })
    .join('\n')

  let rendered = markdown.render(normalized)
  rendered =
    preferredType === 'ordered'
      ? rendered.replace(/<ul(\s|>)/gi, '<ol$1').replace(/<\/ul>/gi, '</ol>')
      : rendered.replace(/<ol(\s|>)/gi, '<ul$1').replace(/<\/ol>/gi, '</ul>')

  const fontSizeMatch = originalHtml.match(/font-size\s*:\s*([^;"']+)/i)?.[1]?.trim()
  if (fontSizeMatch && /^\d+(\.\d+)?(px|rem|em|%)$/i.test(fontSizeMatch)) {
    return `<div data-ai-preserved-font-size="true" style="font-size:${fontSizeMatch};">${rendered}</div>`
  }
  return rendered
}

export function extractSelectableEntries(
  moduleKey: string,
  rawOptimizedText: string,
  resumeStore: ReturnType<typeof useResumeStore>,
  targetEntryIndex: number | null,
): SelectableOptimizedEntry[] {
  if (targetEntryIndex !== null) return []
  const cleaned = removeLeadingModuleTitle(rawOptimizedText, moduleKey).trim()
  if (!cleaned) return []

  if (moduleKey === 'workExperience' && resumeStore.workList.length > 1) {
    const sections = parseWorkOptimizedContent(cleaned, resumeStore.workList)
    if (sections.length <= 1) return []
    return sections.map((sec, idx) => ({
      index: idx,
      title: resumeStore.workList[idx]?.company.trim() || `工作经历 ${idx + 1}`,
      previewText: sec,
    }))
  }

  if (moduleKey === 'projectExperience' && resumeStore.projectList.length > 1) {
    const sections = parseProjectOptimizedSections(cleaned, resumeStore.projectList)
    if (sections.length <= 1) return []
    return sections.map((sec, idx) => ({
      index: idx,
      title: resumeStore.projectList[idx]?.name.trim() || `项目经历 ${idx + 1}`,
      previewText: [sec.introduction, sec.mainWork].filter(Boolean).join('\n'),
    }))
  }

  return []
}

export function buildBeforePreviewText(
  moduleKey: string,
  resumeStore: ReturnType<typeof useResumeStore>,
  targetEntryIndex: number | null,
): string {
  switch (moduleKey) {
    case 'skills':
      return htmlToPlainText(resumeStore.skills)
    case 'selfIntro':
      return htmlToPlainText(resumeStore.selfIntro)
    case 'workExperience': {
      const list =
        targetEntryIndex !== null && resumeStore.workList[targetEntryIndex]
          ? [resumeStore.workList[targetEntryIndex]!]
          : resumeStore.workList
      return list
        .map((w) => [w.company ? `### ${w.company}` : '', htmlToPlainText(w.description)].filter(Boolean).join('\n'))
        .filter(Boolean)
        .join('\n\n')
    }
    case 'projectExperience': {
      const list =
        targetEntryIndex !== null && resumeStore.projectList[targetEntryIndex]
          ? [resumeStore.projectList[targetEntryIndex]!]
          : resumeStore.projectList
      return list
        .map((p) =>
          [
            p.name ? `### ${p.name}` : '',
            p.introduction ? htmlToPlainText(p.introduction) : '',
            p.mainWork ? htmlToPlainText(p.mainWork) : '',
          ]
            .filter(Boolean)
            .join('\n'),
        )
        .filter(Boolean)
        .join('\n\n')
    }
    case 'awards':
      return resumeStore.awardList
        .map((a) => [a.name, a.date, htmlToPlainText(a.description)].filter(Boolean).join(' · '))
        .filter(Boolean)
        .join('\n')
    default:
      return ''
  }
}

export function computeLineDiff(beforeText: string, afterText: string): DiffLine[] {
  const beforeLines = beforeText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).filter(Boolean)
  const afterLines = afterText.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).filter(Boolean)
  const m = beforeLines.length
  const n = afterLines.length
  if (m === 0 && n === 0) return []
  if (m * n > 20000) {
    return [
      ...beforeLines.map((text): DiffLine => ({ type: 'removed', text })),
      ...afterLines.map((text): DiffLine => ({ type: 'added', text })),
    ]
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        beforeLines[i] === afterLines[j]
          ? (dp[i + 1]![j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0)
    }
  }

  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (beforeLines[i] === afterLines[j]) {
      result.push({ type: 'unchanged', text: beforeLines[i]! })
      i += 1
      j += 1
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      result.push({ type: 'removed', text: beforeLines[i]! })
      i += 1
    } else {
      result.push({ type: 'added', text: afterLines[j]! })
      j += 1
    }
  }
  while (i < m) result.push({ type: 'removed', text: beforeLines[i++]! })
  while (j < n) result.push({ type: 'added', text: afterLines[j++]! })
  return result
}

export function applyOptimizedModuleContent(params: {
  moduleKey: string
  rawOptimizedText: string
  resumeStore: ReturnType<typeof useResumeStore>
  targetEntryIndex: number | null
  selectedEntryIndexes?: number[] | null
}): { applied: boolean; snapshot: ApplyUndoSnapshot | null; error?: string } {
  const { moduleKey, rawOptimizedText, resumeStore, targetEntryIndex, selectedEntryIndexes } = params
  const optimizedContent = removeLeadingModuleTitle(rawOptimizedText, moduleKey).trim()
  if (!optimizedContent) {
    return {
      applied: false,
      snapshot: null,
      error: `「${getModuleLabel(moduleKey)}」暂无可应用的有效优化内容。`,
    }
  }
  if (
    targetEntryIndex === null
    && Array.isArray(selectedEntryIndexes)
    && selectedEntryIndexes.length === 0
    && (
      (moduleKey === 'workExperience' && resumeStore.workList.length > 1)
      || (moduleKey === 'projectExperience' && resumeStore.projectList.length > 1)
    )
  ) {
    return {
      applied: false,
      snapshot: null,
      error: `请至少勾选一条要应用的「${getModuleLabel(moduleKey)}」记录。`,
    }
  }

  const renderedHtml = markdown.render(optimizedContent)
  const currentResumeId = resumeStore.currentResumeId
  let applied = false
  let snapshot: ApplyUndoSnapshot | null = null

  if (moduleKey === 'skills') {
    const mergedSkillsHtml = markdown.render(mergeShortSkillsListItems(optimizedContent)).trim()
    if (mergedSkillsHtml) {
      snapshot = { resumeId: currentResumeId, previousContent: resumeStore.skills }
      resumeStore.skills = mergedSkillsHtml
      applied = true
    }
  } else if (moduleKey === 'selfIntro') {
    if (renderedHtml.trim()) {
      snapshot = { resumeId: currentResumeId, previousContent: resumeStore.selfIntro }
      resumeStore.selfIntro = renderedHtml
      applied = true
    }
  } else if (moduleKey === 'workExperience' && resumeStore.workList.length > 0) {
    const byId: Record<string, string> = {}
    resumeStore.workList.forEach((w) => {
      if (w.id) byId[w.id] = w.description
    })
    snapshot = {
      resumeId: currentResumeId,
      previousContent: resumeStore.workList[0]?.description ?? '',
      previousWorkDescriptions: resumeStore.workList.map((w) => w.description),
      previousWorkDescriptionsById: byId,
    }
    if (targetEntryIndex !== null && resumeStore.workList[targetEntryIndex]) {
      const target = resumeStore.workList[targetEntryIndex]!
      const sections = parseWorkOptimizedContent(optimizedContent, [target])
      const section = sections[0]?.trim() || optimizedContent
      target.description = renderWithOriginalStyle(section, target.description, 'unordered')
      applied = true
    } else {
      const sections = parseWorkOptimizedContent(optimizedContent, resumeStore.workList)
      const selectedSet = Array.isArray(selectedEntryIndexes) ? new Set(selectedEntryIndexes) : null
      const maxCount = Math.min(sections.length, resumeStore.workList.length)
      for (let i = 0; i < maxCount; i += 1) {
        if (selectedSet && !selectedSet.has(i)) continue
        const section = sections[i]?.trim()
        const target = resumeStore.workList[i]
        if (!section || !target) continue
        target.description = renderWithOriginalStyle(section, target.description, 'unordered')
        applied = true
      }
      if (!applied && !selectedSet && renderedHtml.trim() && resumeStore.workList[0]) {
        resumeStore.workList[0].description = renderWithOriginalStyle(optimizedContent, resumeStore.workList[0].description, 'unordered')
        applied = true
      }
    }
  } else if (moduleKey === 'projectExperience' && resumeStore.projectList.length > 0) {
    const byId: Record<string, { introduction: string; mainWork: string }> = {}
    resumeStore.projectList.forEach((p) => {
      if (p.id) byId[p.id] = { introduction: p.introduction, mainWork: p.mainWork }
    })
    snapshot = {
      resumeId: currentResumeId,
      previousContent: resumeStore.projectList[0]?.mainWork ?? '',
      previousIntroduction: resumeStore.projectList[0]?.introduction ?? '',
      previousProjectIntroductions: resumeStore.projectList.map((p) => p.introduction),
      previousProjectMainWorks: resumeStore.projectList.map((p) => p.mainWork),
      previousProjectById: byId,
    }
    if (targetEntryIndex !== null && resumeStore.projectList[targetEntryIndex]) {
      const project = resumeStore.projectList[targetEntryIndex]!
      const sections = parseProjectOptimizedSections(optimizedContent, [project])
      const section = sections[0]
      if (section?.introduction) {
        const intro = normalizeProjectIntroductionSingleLine(section.introduction)
        if (intro) project.introduction = markdown.render(intro)
        applied = true
      }
      if (section?.mainWork) {
        project.mainWork = renderWithOriginalStyle(enhanceProjectMainWorkBold(section.mainWork), project.mainWork, 'ordered')
        applied = true
      }
      if (!applied && renderedHtml.trim()) {
        project.mainWork = renderWithOriginalStyle(enhanceProjectMainWorkBold(optimizedContent), project.mainWork, 'ordered')
        applied = true
      }
    } else {
      const sections = parseProjectOptimizedSections(optimizedContent, resumeStore.projectList)
      const selectedSet = Array.isArray(selectedEntryIndexes) ? new Set(selectedEntryIndexes) : null
      const maxCount = Math.min(sections.length, resumeStore.projectList.length)
      for (let i = 0; i < maxCount; i += 1) {
        if (selectedSet && !selectedSet.has(i)) continue
        const section = sections[i]
        const project = resumeStore.projectList[i]
        if (!section || !project) continue
        if (section.introduction) {
          const intro = normalizeProjectIntroductionSingleLine(section.introduction)
          if (intro) project.introduction = markdown.render(intro)
          applied = true
        }
        if (section.mainWork) {
          project.mainWork = renderWithOriginalStyle(enhanceProjectMainWorkBold(section.mainWork), project.mainWork, 'ordered')
          applied = true
        }
      }
      if (!applied && !selectedSet && renderedHtml.trim() && resumeStore.projectList[0]) {
        resumeStore.projectList[0].mainWork = renderWithOriginalStyle(
          enhanceProjectMainWorkBold(optimizedContent),
          resumeStore.projectList[0].mainWork,
          'ordered',
        )
        applied = true
      }
    }
  } else if (moduleKey === 'awards') {
    snapshot = {
      resumeId: currentResumeId,
      previousContent: resumeStore.awardList[0]?.description ?? '',
      previousAwards: resumeStore.awardList.map((award) => ({ ...award })),
    }
    const parsedAwards = parseAwardOptimizedSections(optimizedContent)
    if (parsedAwards.length > 0) {
      const now = Date.now()
      const updatedAwards: AwardEntry[] = parsedAwards.map((award, index) => {
        const existing = resumeStore.awardList[index]
        const desc = normalizeMarkdownListContent(award.description)
        return {
          id: existing?.id ?? `ai_award_${now}_${index + 1}`,
          name: award.name || existing?.name || `奖项 ${index + 1}`,
          date: award.date || existing?.date || '',
          description: desc ? renderWithOriginalStyle(desc, existing?.description ?? '', 'unordered') : '',
        }
      })
      const preservedTail =
        resumeStore.awardList.length > updatedAwards.length
          ? resumeStore.awardList.slice(updatedAwards.length).map((award) => ({ ...award }))
          : []
      resumeStore.awardList.splice(0, resumeStore.awardList.length, ...updatedAwards, ...preservedTail)
      applied = true
    }
  }

  if (!applied) {
    return {
      applied: false,
      snapshot: null,
      error: `「${getModuleLabel(moduleKey)}」当前未选择可应用内容，请先勾选或手动复制调整。`,
    }
  }

  resumeStore.saveToStorage()
  return { applied: true, snapshot }
}

export function restoreAppliedModuleSnapshot(
  moduleKey: string,
  snapshot: ApplyUndoSnapshot,
  resumeStore: ReturnType<typeof useResumeStore>,
): boolean {
  if (snapshot.resumeId && snapshot.resumeId !== resumeStore.currentResumeId) {
    return false
  }
  if (moduleKey === 'skills') {
    resumeStore.skills = snapshot.previousContent
  } else if (moduleKey === 'selfIntro') {
    resumeStore.selfIntro = snapshot.previousContent
  } else if (moduleKey === 'workExperience') {
    const byId = snapshot.previousWorkDescriptionsById
    if (byId && Object.keys(byId).length > 0) {
      resumeStore.workList.forEach((item, i) => {
        const restored = (item.id && byId[item.id] !== undefined) ? byId[item.id] : snapshot.previousWorkDescriptions?.[i]
        if (restored !== undefined) item.description = restored
      })
    } else if (snapshot.previousWorkDescriptions) {
      snapshot.previousWorkDescriptions.forEach((desc, i) => {
        if (resumeStore.workList[i]) resumeStore.workList[i]!.description = desc
      })
    }
  } else if (moduleKey === 'projectExperience') {
    const byId = snapshot.previousProjectById
    if (byId && Object.keys(byId).length > 0) {
      resumeStore.projectList.forEach((item, i) => {
        const entrySnap = item.id ? byId[item.id] : undefined
        if (entrySnap) {
          item.introduction = entrySnap.introduction
          item.mainWork = entrySnap.mainWork
        } else if (snapshot.previousProjectMainWorks?.[i] !== undefined) {
          item.mainWork = snapshot.previousProjectMainWorks[i]!
          item.introduction = snapshot.previousProjectIntroductions?.[i] ?? ''
        }
      })
    } else if (snapshot.previousProjectMainWorks && snapshot.previousProjectIntroductions) {
      snapshot.previousProjectMainWorks.forEach((work, i) => {
        const target = resumeStore.projectList[i]
        if (!target) return
        target.mainWork = work
        target.introduction = snapshot.previousProjectIntroductions?.[i] ?? ''
      })
    }
  } else if (moduleKey === 'awards' && snapshot.previousAwards) {
    resumeStore.awardList.splice(0, resumeStore.awardList.length, ...snapshot.previousAwards.map((a) => ({ ...a })))
  }
  resumeStore.saveToStorage()
  return true
}
