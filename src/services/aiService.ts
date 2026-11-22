// author: Bob
import type {
  AwardEntry,
  BasicInfo,
  EducationEntry,
  ProjectEntry,
  WorkEntry,
} from '@/stores/resume'
import { postByokChatCompletions } from '@/api/byokAiApi'
import {
  buildOptimizeUserPrompt,
  getModuleOutputRules,
  SYSTEM_PROMPT,
  type AiOptimizeScenario,
} from './prompts'
import { awardContentHtml, awardHasContent } from '@/utils/awardContent'

function formatBasicLink(label: string, link: { text: string; url: string }): string {
  const text = link.text.trim()
  if (!text) return ''
  const url = link.url.trim()
  return url ? `${label}：${text}（${url}）` : `${label}：${text}`
}

function formatBasicInfo(info: BasicInfo): string {
  const lines: string[] = []
  if (info.name) lines.push(`姓名：${info.name}`)
  if (info.phone) lines.push(`电话：${info.phone}`)
  if (info.email) lines.push(`邮箱：${info.email}`)
  if (info.jobTitle) lines.push(`求职岗位：${info.jobTitle}`)
  if (info.age) lines.push(`年龄：${info.age}`)
  if (info.gender) lines.push(`性别：${info.gender}`)
  if (info.educationLevel) lines.push(`学历：${info.educationLevel}`)
  if (info.workYears) lines.push(`工作年限：${info.workYears}`)
  if (info.currentStatus) lines.push(`当前状态：${info.currentStatus}`)
  if (info.location) lines.push(`所在地：${info.location}`)
  if (info.expectedLocation) lines.push(`期望工作地：${info.expectedLocation}`)
  if (info.expectedSalary) lines.push(`期望薪资：${info.expectedSalary}`)
  ;[
    formatBasicLink('个人网站', info.website),
    formatBasicLink('GitHub', info.github),
    formatBasicLink('博客', info.blog),
    ...info.customItems
      .map((item) => [item.label.trim(), item.value.trim()].filter(Boolean).join('：'))
      .filter(Boolean),
  ]
    .filter(Boolean)
    .forEach((line) => lines.push(line))
  return lines.join('\n')
}

function stripHtml(html: string): string {
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

function formatEducation(list: EducationEntry[]): string {
  return list
    .map((e) => {
      const parts: string[] = []
      if (e.school) parts.push(`学校：${e.school}`)
      if (e.college) parts.push(`学院：${e.college}`)
      if (e.major) parts.push(`专业：${e.major}`)
      if (e.degree) parts.push(`学位：${e.degree}`)
      if (e.startDate || e.endDate) parts.push(`时间：${e.startDate || ''} ~ ${e.endDate || ''}`)
      if (e.gpa) parts.push(`GPA：${e.gpa}`)
      if (e.description) parts.push(`描述：${stripHtml(e.description)}`)
      return parts.join('\n')
    })
    .join('\n---\n')
}

function formatWork(list: WorkEntry[]): string {
  return list
    .map((w) => {
      const parts: string[] = []
      if (w.company) parts.push(`公司：${w.company}`)
      if (w.department) parts.push(`部门：${w.department}`)
      if (w.position) parts.push(`职位：${w.position}`)
      if (w.startDate || w.endDate) parts.push(`时间：${w.startDate || ''} ~ ${w.endDate || ''}`)
      if (w.description) parts.push(`工作描述：${stripHtml(w.description)}`)
      return parts.join('\n')
    })
    .join('\n---\n')
}

function formatProjects(list: ProjectEntry[]): string {
  return list
    .map((p) => {
      const parts: string[] = []
      if (p.name) parts.push(`项目名称：${p.name}`)
      if (p.role) parts.push(`角色：${p.role}`)
      if (p.startDate || p.endDate) parts.push(`时间：${p.startDate || ''} ~ ${p.endDate || ''}`)
      if (p.link) parts.push(`链接：${p.link}`)
      if (p.introduction) parts.push(`项目介绍：${stripHtml(p.introduction)}`)
      if (p.mainWork) parts.push(`主要工作：${stripHtml(p.mainWork)}`)
      return parts.join('\n')
    })
    .join('\n---\n')
}

function formatAwards(list: AwardEntry[]): string {
  return list
    .filter((a) => awardHasContent(a))
    .map((a) => {
      const parts: string[] = []
      const content = stripHtml(awardContentHtml(a))
      if (content) parts.push(`奖项名称：${content}`)
      if (a.date) parts.push(`获奖时间：${a.date}`)
      return parts.join('\n')
    })
    .join('\n---\n')
}

const MODULE_LABELS: Record<string, string> = {
  basicInfo: '基本信息',
  education: '教育经历',
  skills: '专业技能',
  workExperience: '工作经历',
  projectExperience: '项目经历',
  awards: '荣誉奖项',
  selfIntro: '个人简介',
}

export interface ModuleData {
  basicInfo: BasicInfo
  educationList: EducationEntry[]
  skills: string
  workList: WorkEntry[]
  projectList: ProjectEntry[]
  awardList: AwardEntry[]
  selfIntro: string
}

export interface AiOptimizeRequestOptions {
  scenario?: AiOptimizeScenario
  targetJd?: string
  customInstruction?: string
  targetEntryIndex?: number | null
  followUpAnswers?: string
}

export function buildModuleText(
  moduleKey: string,
  data: ModuleData,
  targetEntryIndex?: number | null,
): string {
  switch (moduleKey) {
    case 'basicInfo':
      return formatBasicInfo(data.basicInfo)
    case 'education':
      return formatEducation(data.educationList)
    case 'skills':
      return stripHtml(data.skills)
    case 'workExperience': {
      if (typeof targetEntryIndex === 'number' && targetEntryIndex >= 0 && data.workList[targetEntryIndex]) {
        return formatWork([data.workList[targetEntryIndex]!])
      }
      return formatWork(data.workList)
    }
    case 'projectExperience': {
      if (typeof targetEntryIndex === 'number' && targetEntryIndex >= 0 && data.projectList[targetEntryIndex]) {
        return formatProjects([data.projectList[targetEntryIndex]!])
      }
      return formatProjects(data.projectList)
    }
    case 'awards':
      return formatAwards(data.awardList)
    case 'selfIntro':
      return stripHtml(data.selfIntro)
    default:
      return ''
  }
}

export function getTargetEntryLabel(
  moduleKey: string,
  data: ModuleData,
  targetEntryIndex?: number | null,
): string {
  if (typeof targetEntryIndex !== 'number' || targetEntryIndex < 0) return ''
  if (moduleKey === 'workExperience') {
    const target = data.workList[targetEntryIndex]
    return target ? [target.company.trim(), target.position.trim()].filter(Boolean).join(' · ') : ''
  }
  if (moduleKey === 'projectExperience') {
    const target = data.projectList[targetEntryIndex]
    return target?.name.trim() || ''
  }
  return ''
}

export function buildOptimizeContextPrompt(
  moduleKey: string,
  moduleData: ModuleData,
  options: AiOptimizeRequestOptions = {},
): { label: string; moduleText: string; userMessage: string } {
  const targetEntryIndex = options.targetEntryIndex ?? null
  const moduleText = buildModuleText(moduleKey, moduleData, targetEntryIndex)
  const label = getModuleLabel(moduleKey)
  const scopedProjects =
    moduleKey === 'projectExperience' && typeof targetEntryIndex === 'number' && moduleData.projectList[targetEntryIndex]
      ? [moduleData.projectList[targetEntryIndex]!]
      : moduleData.projectList
  const scopedWorks =
    moduleKey === 'workExperience' && typeof targetEntryIndex === 'number' && moduleData.workList[targetEntryIndex]
      ? [moduleData.workList[targetEntryIndex]!]
      : moduleData.workList

  const outputRules = getModuleOutputRules(moduleKey, {
    projectNames: scopedProjects.map((p) => p.name.trim()).filter(Boolean),
    workCompanyNames: scopedWorks.map((w) => w.company.trim()).filter(Boolean),
  })

  const userMessage = buildOptimizeUserPrompt({
    moduleLabel: label,
    moduleText,
    outputRules,
    jobTitle: moduleData.basicInfo.jobTitle,
    targetJd: options.targetJd,
    scenario: options.scenario,
    customInstruction: options.customInstruction,
    targetEntryLabel: getTargetEntryLabel(moduleKey, moduleData, targetEntryIndex),
    followUpAnswers: options.followUpAnswers,
  })

  return { label, moduleText, userMessage }
}

export function getModuleLabel(moduleKey: string): string {
  return MODULE_LABELS[moduleKey] ?? moduleKey
}

export interface AiStreamCallbacks {
  onChunk: (text: string) => void
  onDone: (fullText: string) => void
  onError: (error: string) => void
}

function classifyByokErrorStatus(status: number, detail: string, useCorsProxy: boolean): string {
  if (status === 401 || status === 403) {
    return `API 鉴权失败 (${status})：请检查 API Key 是否正确或额度是否充足。${detail ? ` 详情：${detail}` : ''}`
  }
  if (status === 404) {
    return `接口路径或模型不存在 (404)：请核对 Base URL 与模型名称。${detail ? ` 详情：${detail}` : ''}`
  }
  if (status === 429) {
    return `请求触发限流或配额不足 (429)：请稍后重试或检查账户余额。${detail ? ` 详情：${detail}` : ''}`
  }
  if (status === 502 || status === 504) {
    return `上游模型响应超时 (${status})：${detail || (useCorsProxy ? '代理转发上游超时，请重试。' : '请稍后重试。')}`
  }
  return `API 请求失败 (${status}): ${detail || '未知服务错误'}`
}

export async function optimizeModule(
  config: { apiUrl: string; apiToken: string; modelName: string; useCorsProxy?: boolean; proxyPath?: string },
  moduleKey: string,
  moduleData: ModuleData,
  callbacks: AiStreamCallbacks,
  signal?: AbortSignal,
  options: AiOptimizeRequestOptions = {},
): Promise<void> {
  const { label, moduleText, userMessage } = buildOptimizeContextPrompt(moduleKey, moduleData, options)

  if (!moduleText.trim()) {
    callbacks.onError(`「${label}」模块内容为空，请先填写内容后再优化。`)
    return
  }

  try {
    const response = await postByokChatCompletions(
      {
        apiUrl: config.apiUrl,
        apiToken: config.apiToken,
        modelName: config.modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        stream: true,
        useCorsProxy: config.useCorsProxy,
        proxyPath: config.proxyPath,
      },
      signal,
    )

    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      callbacks.onError(classifyByokErrorStatus(response.status, errorText.slice(0, 260), Boolean(config.useCorsProxy)))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('无法读取模型响应流')
      return
    }

    const decoder = new TextDecoder()
    let fullText = ''
    let buffer = ''

    const processLine = (rawLine: string) => {
      const trimmed = rawLine.trim()
      if (!trimmed || !trimmed.startsWith('data:')) return
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content
        if (content) {
          fullText += content
          callbacks.onChunk(fullText)
        }
      } catch {
        // 忽略半截 JSON 分片，等待后续完整流片段
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        lines.forEach(processLine)
      }

      buffer += decoder.decode()
      if (buffer.trim()) {
        processLine(buffer)
      }
    } finally {
      reader.releaseLock()
    }

    if (!fullText.trim()) {
      callbacks.onError('模型未返回有效文本内容，请检查模型名称与配额后重试。')
      return
    }

    callbacks.onDone(fullText)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    const isNetworkOrCors = err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)
    if (isNetworkOrCors) {
      callbacks.onError(
        config.useCorsProxy
          ? `边缘代理转发请求失败（${message}）。本地 vite dev 无 Edge Function 时请关闭边缘代理并直接连接支持跨域的模型地址，或部署到 Cloudflare Pages 后使用。`
          : `网络请求失败（常见原因为目标 API 未开启浏览器跨域 CORS，或接口地址不可达）。可在“模型配置”中开启“通过边缘代理解决跨域”或更换支持直连的服务商。`,
      )
      return
    }
    callbacks.onError(`请求出错: ${message}`)
  }
}

export interface ParsedAiResponse {
  suggestions: string
  missingInfo: string
  optimizedContent: string
}

type ParsedSectionKey = 'suggestions' | 'missingInfo' | 'optimizedContent'

function normalizeSectionLabel(rawLabel: string): ParsedSectionKey | null {
  const normalized = rawLabel
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')

  if (normalized === '优化建议' || normalized === 'suggestion' || normalized === 'suggestions') {
    return 'suggestions'
  }
  if (
    normalized === '待补充信息'
    || normalized === '待补充量化信息'
    || normalized === '待补充数据'
    || normalized === '补充信息'
    || normalized === 'missinginfo'
  ) {
    return 'missingInfo'
  }
  if (
    normalized === '优化后内容'
    || normalized === '优化后的内容'
    || normalized === 'optimizedcontent'
  ) {
    return 'optimizedContent'
  }
  return null
}

function normalizeHeadingText(line: string): string {
  return line
    .replace(/\uFF03/g, '#')
    .replace(/^\s*[-*+]\s*/, '')
    .replace(/^[\s#*`]+/, '')
    .replace(/[\s#*`：:]+$/, '')
    .replace(/\s+/g, '')
    .toLowerCase()
}

function parseSectionHeadingLine(line: string): { key: ParsedSectionKey; inlineContent: string } | null {
  const trimmed = line.trim()
  const isExplicitHeadingOrBold = /^(?:[#＃]{1,6}\s+|\*\*[^*]+\*\*\s*[：:]?\s*$)/.test(trimmed)
  const normalized = normalizeHeadingText(trimmed)
  const suggestionsKeywords = ['优化建议', '修改建议', '改进建议', 'suggestion', 'suggestions']
  const missingInfoKeywords = ['待补充信息', '待补充量化信息', '待补充数据', '补充信息', 'missinginfo']
  const optimizedKeywords = [
    '优化后内容',
    '优化后的内容',
    '优化内容',
    '优化结果',
    'optimizedcontent',
    'optimizedoutput',
  ]

  const matchHeadingKeyword = (keywords: string[]) =>
    keywords.some(
      (keyword) =>
        normalized === keyword
        || (isExplicitHeadingOrBold && (normalized.startsWith(`${keyword}：`) || normalized.startsWith(`${keyword}:`))),
    )

  if (matchHeadingKeyword(suggestionsKeywords)) {
    const inline = trimmed
      .replace(/^\s*[-*+]\s*/, '')
      .replace(/^[#＃*\s`]+/, '')
      .replace(/^(优化建议|修改建议|改进建议|suggestions?)\s*[#*`]*\s*[：:：-]?\s*/i, '')
      .trim()
    return { key: 'suggestions', inlineContent: inline }
  }

  if (matchHeadingKeyword(missingInfoKeywords)) {
    const inline = trimmed
      .replace(/^\s*[-*+]\s*/, '')
      .replace(/^[#＃*\s`]+/, '')
      .replace(/^(待补充量化信息|待补充信息|待补充数据|补充信息|missing\s*info)\s*[#*`]*\s*[：:：-]?\s*/i, '')
      .trim()
    return { key: 'missingInfo', inlineContent: inline }
  }

  if (matchHeadingKeyword(optimizedKeywords)) {
    const inline = trimmed
      .replace(/^\s*[-*+]\s*/, '')
      .replace(/^[#＃*\s`]+/, '')
      .replace(/^(优化后内容|优化后的内容|优化内容|优化结果|optimized\s*content|optimized\s*output)\s*[#*`]*\s*[：:：-]?\s*/i, '')
      .trim()
    return { key: 'optimizedContent', inlineContent: inline }
  }

  const strictMatch = line.match(
    /^(?:[-*+]\s*)?(?:[#＃]{1,6}\s*)?(?:\*\*)?\s*(优化建议|Suggestions?|待补充信息|待补充量化信息|Missing Info|优化后内容|优化后的内容|Optimized Content)\s*(?:\*\*)?\s*(?:[：:]\s*(.*))?$/i,
  )
  if (!strictMatch) return null
  const key = normalizeSectionLabel(strictMatch[1] ?? '')
  if (!key) return null
  return { key, inlineContent: (strictMatch[2] ?? '').trim() }
}

export function parseAiResponse(text: string): ParsedAiResponse {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return { suggestions: '', missingInfo: '', optimizedContent: '' }
  }

  const lines = normalized.split('\n')
  const sections: Record<ParsedSectionKey, string[]> = {
    suggestions: [],
    missingInfo: [],
    optimizedContent: [],
  }

  let currentSection: ParsedSectionKey | null = null

  for (const line of lines) {
    const heading = parseSectionHeadingLine(line.trim())
    if (heading) {
      currentSection = heading.key
      if (heading.inlineContent) {
        sections[currentSection].push(heading.inlineContent)
      }
      continue
    }

    if (currentSection) {
      sections[currentSection].push(line)
    }
  }

  const suggestions = sections.suggestions.join('\n').trim()
  const missingInfo = sections.missingInfo.join('\n').trim()
  const optimizedContent = sections.optimizedContent.join('\n').trim()

  if (!suggestions && !missingInfo && !optimizedContent) {
    return {
      suggestions: '',
      missingInfo: '',
      optimizedContent: normalized,
    }
  }

  if (!suggestions && optimizedContent) {
    return {
      suggestions: '本次模型未返回“优化建议”分段，仅返回了“优化后内容”。可点击“重新生成”重试。',
      missingInfo,
      optimizedContent,
    }
  }

  return {
    suggestions,
    missingInfo,
    optimizedContent,
  }
}
