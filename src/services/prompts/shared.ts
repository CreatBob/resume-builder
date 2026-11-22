// author: Bob
export type AiOptimizeScenario = 'jd-match' | 'star-quantify' | 'concise-one-page' | 'polish' | 'custom'

export interface AiOptimizeScenarioMeta {
  key: AiOptimizeScenario
  label: string
  description: string
  guidance: string
}

export const AI_OPTIMIZE_SCENARIOS: AiOptimizeScenarioMeta[] = [
  {
    key: 'jd-match',
    label: 'JD 定向匹配',
    description: '围绕目标岗位关键词与核心能力重排表达',
    guidance: '优先贴合目标岗位 JD 中的核心技能、职责关键词与加分项，在不编造经历的前提下突出高度匹配的成果。',
  },
  {
    key: 'star-quantify',
    label: 'STAR 量化',
    description: '按场景-任务-方案-结果结构重写并凸显指标',
    guidance: '每条要点尽量遵循“动词开头 + 业务场景/痛点 + 技术方案或行动 + 量化结果”，缺失数据时不要虚构数字。',
  },
  {
    key: 'concise-one-page',
    label: '一页纸精简',
    description: '剔除冗余修饰语，压缩长度以适配单页简历',
    guidance: '精简套话和重复表达，保留最具含金量的技术词、业务难点和量化结果，控制字数更紧凑。',
  },
  {
    key: 'polish',
    label: '专业润色',
    description: '去口语化，统一强动词与技术表达规范',
    guidance: '替换口语化或平铺直叙描述，使用专业、克制、有说服力的求职表达并保持格式清晰。',
  },
  {
    key: 'custom',
    label: '自由定制',
    description: '完全按照下方补充指令针对性调整',
    guidance: '重点遵循用户填写的自定义优化指令与业务侧重进行改写。',
  },
]

export const COMMON_OUTPUT_RULES = [
  '- 输出语言：中文（若用户明确要求英文或双语则按要求输出）。',
  '- 使用 Markdown。',
  '- 每个要点（每一条列表项）必须只占一行，不要在同一条里换行。',
  '- 同级要点之间不要插入空行，不要输出多余空段落。',
  '- 严禁编造不存在的经历、公司、项目和量化数字。',
]

export const SYSTEM_PROMPT = `你是一位资深的简历优化专家，擅长把候选人已有信息优化为更专业、可量化、贴合目标岗位、可经受面试追问的表达。

你的回答必须严格使用下面三段结构：

## 优化建议

（指出当前写法的问题、与目标岗位的差距以及核心改进方向，3-5条简明要点）

## 待补充信息

（如果原文缺少关键量化指标、系统规模或业务对比，请列出 2-4 个需要候选人补充的具体数字/事实问题，并用“待补充量化数据”占位，绝不编造；若原文数据已足够完整，仅输出“信息较完整，无需补充。”）

## 优化后内容

（直接给出可直接粘贴回简历的 Markdown 结果）
`

export function findScenarioGuidance(scenario?: AiOptimizeScenario): string {
  const matched = AI_OPTIMIZE_SCENARIOS.find((item) => item.key === scenario)
  return matched?.guidance ?? AI_OPTIMIZE_SCENARIOS[1]!.guidance
}

