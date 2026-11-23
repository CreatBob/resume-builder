// author: Bob
import type { ResumeData } from '@/services/resumeStorageService'

export type PromptSchemaSource = 'blank' | 'current'
export type PromptCollabMode = 'conversational' | 'direct'

export interface ResumePromptOptions {
  schemaSource: PromptSchemaSource
  collabMode: PromptCollabMode
  onlyVisibleModules: boolean
  targetJobTitle: string
  targetJd: string
  rawExperience: string
  extraRequirements: string
}

interface ModuleConfigLike {
  key: string
  label: string
  icon: string
  visible: boolean
}

const DEFAULT_MODULES_TEMPLATE: ModuleConfigLike[] = [
  { key: 'basicInfo', label: '基本信息', icon: '👤', visible: true },
  { key: 'education', label: '教育经历', icon: '🎓', visible: true },
  { key: 'skills', label: '专业技能', icon: '⚡', visible: true },
  { key: 'workExperience', label: '工作经历', icon: '💼', visible: true },
  { key: 'projectExperience', label: '项目经历', icon: '📁', visible: true },
  { key: 'awards', label: '荣誉奖项', icon: '🏆', visible: false },
  { key: 'selfIntro', label: '个人简介', icon: '📝', visible: false },
]

const MODULE_TO_CONTENT_KEY: Record<string, string> = {
  basicInfo: 'basicInfo',
  education: 'educationList',
  skills: 'skills',
  workExperience: 'workList',
  projectExperience: 'projectList',
  awards: 'awardList',
  selfIntro: 'selfIntro',
}

function normalizeModulesForSchema(rawModules: unknown): ModuleConfigLike[] {
  const incomingMap = new Map<string, Partial<ModuleConfigLike>>()
  if (Array.isArray(rawModules)) {
    rawModules.forEach((item) => {
      if (item && typeof item === 'object' && 'key' in item) {
        const current = item as Partial<ModuleConfigLike>
        if (typeof current.key === 'string' && current.key) {
          incomingMap.set(current.key, current)
        }
      }
    })
  }

  return DEFAULT_MODULES_TEMPLATE.map((base) => {
    const incoming = incomingMap.get(base.key)
    return {
      key: base.key,
      label: typeof incoming?.label === 'string' && incoming.label.trim() ? incoming.label : base.label,
      icon: typeof incoming?.icon === 'string' && incoming.icon.trim() ? incoming.icon : base.icon,
      visible: typeof incoming?.visible === 'boolean' ? incoming.visible : base.visible,
    }
  })
}

function createNeutralBlankContent(modules: ModuleConfigLike[]): Record<string, unknown> {
  return {
    modules,
    basicInfo: {
      name: '姓名',
      phone: '13800000000',
      email: 'name@example.com',
      age: '26岁',
      gender: '',
      location: '所在城市',
      jobTitle: '目标岗位名称',
      educationLevel: '本科',
      avatar: '',
      workYears: '3年',
      currentStatus: '在职-考虑机会',
      expectedLocation: '期望工作城市',
      expectedSalary: '面议',
      website: {
        text: '',
        url: '',
      },
      wechat: '',
      currentCity: '所在城市',
      github: {
        text: '',
        url: '',
      },
      blog: {
        text: '',
        url: '',
      },
      customItems: [],
    },
    educationList: [
      {
        id: 'edu_1',
        school: '毕业院校名称',
        college: '院系（选填）',
        major: '所学专业',
        degree: '学历',
        startDate: '2018.09',
        endDate: '2022.06',
        gpa: '',
        description: '<p>主修课程、专业成绩或在校实践成果（选填）</p>',
        type: '全日制本科',
        location: '城市',
      },
    ],
    skills:
      '<ul><li>核心专业能力与业务技能 1（围绕目标岗位填写熟练软件/工具、资质证书、业务方法或语言能力）</li><li>核心专业能力与业务技能 2</li></ul>',
    workList: [
      {
        id: 'work_1',
        company: '公司或单位名称',
        department: '所属部门（选填）',
        position: '担任职位',
        startDate: '2022.07',
        endDate: '',
        location: '工作城市',
        description:
          '<ul><li>以动词开头描述核心工作职责、关键动作与可量化成果（如服务客户数、准确率、效率提升或业务增长）。</li></ul>',
      },
    ],
    projectList: [
      {
        id: 'proj_1',
        name: '重点专项工作 / 项目名称（若岗位不涉及独立项目，可填写专项任务或将 projectExperience 设为 false）',
        role: '担任角色',
        startDate: '2023.05',
        endDate: '2023.10',
        link: '',
        introduction: '<p>简要说明该项工作的背景与核心目标。</p>',
        mainWork:
          '<ol><li>关键推进举措、跨团队协作过程及最终落地效果。</li></ol>',
      },
    ],
    awardList: [
      {
        id: 'award_1',
        name: '荣誉奖项或职业资格证书名称',
        date: '2023.12',
        description: '<p>颁发机构或简要说明。</p>',
      },
    ],
    selfIntro:
      '<p>用 2~3 句话概括核心从业背景、突出工作优势及与目标岗位的匹配度。</p>',
  }
}

function buildSanitizedCurrentContent(currentData: ResumeData): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(currentData)) as Record<string, unknown>
  delete cloned.selectedTemplateKey
  delete cloned.selectedTemplateId
  delete cloned.layoutSettings

  if (cloned.basicInfo && typeof cloned.basicInfo === 'object' && !Array.isArray(cloned.basicInfo)) {
    const basic = cloned.basicInfo as Record<string, unknown>
    basic.avatar = ''
  }

  cloned.modules = normalizeModulesForSchema(cloned.modules)
  return cloned
}

function filterToVisibleModuleFields(
  source: Record<string, unknown>,
  modules: ModuleConfigLike[],
): Record<string, unknown> {
  const visibleMap = new Map<string, boolean>()
  modules.forEach((mod) => {
    visibleMap.set(mod.key, mod.visible)
  })

  const filtered: Record<string, unknown> = {
    modules,
  }

  Object.entries(MODULE_TO_CONTENT_KEY).forEach(([moduleKey, contentKey]) => {
    const isVisible = visibleMap.get(moduleKey)
    if (isVisible && contentKey in source) {
      filtered[contentKey] = source[contentKey]
    }
  })

  return filtered
}

/**
 * 构建用于外部 AI 参考的干净简历 JSON 结构字符串。
 * 不包含模板与排版设置，并强制清空头像字段以节省上下文窗口。
 */
export function buildPromptReferenceJson(
  currentData: ResumeData,
  options: { schemaSource: PromptSchemaSource; onlyVisibleModules: boolean },
): string {
  const currentModules = normalizeModulesForSchema(currentData.modules)
  const baseModules = options.onlyVisibleModules
    ? currentModules
    : DEFAULT_MODULES_TEMPLATE.map((item) => ({ ...item }))

  const rawSchema =
    options.schemaSource === 'current'
      ? buildSanitizedCurrentContent(currentData)
      : createNeutralBlankContent(baseModules)

  const resolvedModules = normalizeModulesForSchema(rawSchema.modules)
  const finalSchema = options.onlyVisibleModules
    ? filterToVisibleModuleFields(rawSchema, resolvedModules)
    : rawSchema

  return JSON.stringify(finalSchema, null, 2)
}

/**
 * 构建供用户复制到外部 AI（如 ChatGPT/Claude/DeepSeek/豆包）的完整写简历提示词。
 * 顶部输出 JSON 结构参考，底部提供跨行业通用简历编写规范与导入格式约束。
 */
export function buildResumeAiPrompt(
  currentData: ResumeData,
  options: ResumePromptOptions,
): string {
  const referenceJson = buildPromptReferenceJson(currentData, {
    schemaSource: options.schemaSource,
    onlyVisibleModules: options.onlyVisibleModules,
  })

  const targetJobLine = options.targetJobTitle.trim()
    ? `目标岗位：${options.targetJobTitle.trim()}`
    : '目标岗位：【请替换为你要投递的岗位，例如：酒店前台 / 行政文员 / 资料员 / 人事专员(HR) / 运营 / 运维 / 开发等任意行业岗位】'

  const sections: string[] = [
    '你现在是一位资深的跨行业简历顾问与招聘面试官。请严格参考下方提供的简历 JSON 数据结构，结合我给出的岗位目标与个人经历，为我撰写或重构一份专业简历。',
    '',
    '【重要说明】以下 JSON 结构中的系统排版配置（模板样式、页边距、字号、行距等）将由简历系统自动托管保留，你只需填写和生成简历内容相关字段，不要额外输出 `selectedTemplateKey`、`layoutSettings` 或图片 Base64 数据。',
    '',
    '```json',
    referenceJson,
    '```',
    '',
    '---',
    '',
    '### 一、目标岗位与行业适配要求',
    `- ${targetJobLine}`,
  ]

  if (options.targetJd.trim()) {
    sections.push('- 目标岗位 JD / 招聘要求如下，请提取核心能力与高频关键词并融入简历内容中：')
    sections.push('```text')
    sections.push(options.targetJd.trim())
    sections.push('```')
  }

  sections.push(
    '- **全行业自适应**：无论目标是服务行业、行政文职、工程资料、人力财务、市场运营还是技术研发岗位，请自动将占位文案替换为该行业的专业表达与核心工作场景，不要套用与目标岗位无关的行业术语。',
    '- **字段灵活适配**：非技术类岗位可将 `basicInfo.website`、`basicInfo.github`、`basicInfo.blog` 保留为 `{ "text": "", "url": "" }`；若该岗位没有独立“项目经历”，可用 `projectExperience` 呈现主导或参与的重点专项任务/活动/整改成果，或将 `modules` 中 `projectExperience` 的 `visible` 设为 `false`。',
    '',
    '### 二、高质量简历编写原则（请严格执行）',
    '1. **结果与价值导向（STAR 原则）**：用“任务背景 + 具体动作 + 量化结果/业务价值”描述每段经历；避免直接照抄岗位说明书，突出个人实际承担的工作与产生的价值。',
    '2. **动词开头、分点精炼**：每条工作或项目内容尽量以具体动作动词开头（如：接待、归档、统筹、跟进、审核、搭建、优化、维护等），语言简洁利落，每条控制在 1~2 句话。',
    '3. **量化数据与客观事实**：优先保留并提炼可衡量指标（如：日均接待量、文档归档准确率、流程耗时缩减、招聘到岗周期、活动转化率、服务满意度、成本节约或系统可用性等）；若我提供的资料中缺少具体数值，**严禁编造虚假数据**，请在对应位置标注 `【待补充】` 或向我确认。',
    '4. **紧扣岗位优先级排序**：按“与目标岗位最匹配、成果最突出”的重要程度倒序组织每段经历；核心经历精炼 3~5 条要点，早期或次要经历精炼 1~2 条要点，控制总篇幅适配 1~2 页 A4 简历。',
    '5. **真实性底线与去空话**：严格基于我提供的真实经历进行提炼与润色，不得虚构公司、学历、证书或业绩；删除“吃苦耐劳、性格开朗、责任心强、抗压能力强”等缺乏事实支撑的空洞套话，改用具体职责与结果体现优势。',
    '6. **模块开关按需调整**：可根据经历丰富度设置 `modules` 各模块的 `visible`（例如持有相关资质证书或表彰时开启 `awards`，需要用综述突出转行或应届匹配度时开启 `selfIntro`）。',
    '',
    '### 三、JSON 格式与导入兼容规范（务必遵守）',
    '1. **结构完整**：保留上述 JSON 顶层字段结构；`modules` 必须保留全部 7 个标准 `key`（`basicInfo`、`education`、`skills`、`workExperience`、`projectExperience`、`awards`、`selfIntro`），不可改名或删减。',
    '2. **富文本必须用简洁 HTML**：`skills`、`educationList[].description`、`workList[].description`、`projectList[].introduction`、`projectList[].mainWork`、`awardList[].description`、`selfIntro` 在系统中以 HTML 富文本渲染，**必须输出简洁 HTML 标签**（推荐 `<ul><li>...</li></ul>`、`<ol><li>...</li></ol>`、`<p>...</p>`、`<strong>...</strong>`），**禁止使用 Markdown 语法**（如 `- `、`* `、`**加粗**`、`###`）。',
    '3. **基础信息与对象字段**：`basicInfo.website`、`basicInfo.github`、`basicInfo.blog` 保持 `{ "text": "...", "url": "..." }` 对象格式；`basicInfo.avatar` 保持 `""`；`basicInfo.customItems` 每项为 `{ "id": "唯一标识", "label": "名称", "value": "内容" }`。',
    '4. **唯一 ID 与日期格式**：`educationList`、`workList`、`projectList`、`awardList`、`customItems` 的每一条都必须包含唯一的字符串 `id`（如 `"work_1"`）；日期统一使用 `YYYY.MM`（如 `"2023.06"`），仍在职或进行中时 `endDate` 留空字符串 `""`。',
    '5. **标准 JSON 代码块输出**：输出必须为合法标准 JSON（英文双引号、无注释、无多余尾逗号），并**完整包裹在单个** ```` ```json ... ``` ```` 代码块中，便于直接复制导入。',
  )

  if (options.extraRequirements.trim()) {
    sections.push('', '### 四、补充要求', options.extraRequirements.trim())
  }

  sections.push('', options.extraRequirements.trim() ? '### 五、协作方式' : '### 四、协作方式')

  if (options.collabMode === 'direct') {
    sections.push(
      '以下是我提供的个人资料 / 原始工作经历：',
      '```text',
      options.rawExperience.trim() || '【请在这里粘贴你的个人经历、旧简历文字或要点】',
      '```',
      '请直接结合目标岗位与上述简历编写原则，一次性生成严格符合规范的完整 JSON（只输出一个 ```json ... ``` 代码块）。',
    )
  } else {
    sections.push(
      '请先阅读并确认你已完全理解上述 JSON 结构与简历编写规范（先不要急着生成 JSON）。随后我将向你描述我的目标岗位、个人情况与工作经历；如果有关键信息缺失影响填写，请先列出 3~5 个简短问题向我追问，信息确认后再一次性输出完整 JSON 代码块。',
    )
  }

  return sections.join('\n')
}
