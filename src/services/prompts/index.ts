// author: Bob
import { awardsOutputRules } from './awardsPrompt'
import { basicInfoOutputRules } from './basicInfoPrompt'
import { educationOutputRules } from './educationPrompt'
import { getProjectExperienceOutputRules } from './projectExperiencePrompt'
import { selfIntroOutputRules } from './selfIntroPrompt'
import { skillsOutputRules } from './skillsPrompt'
import {
  AI_OPTIMIZE_SCENARIOS,
  COMMON_OUTPUT_RULES,
  SYSTEM_PROMPT,
  findScenarioGuidance,
  type AiOptimizeScenario,
} from './shared'
import { getWorkExperienceOutputRules } from './workExperiencePrompt'

export interface ModulePromptContext {
  projectNames?: string[]
  workCompanyNames?: string[]
}

export interface BuildOptimizePromptParams {
  moduleLabel: string
  moduleText: string
  outputRules: string
  jobTitle?: string
  targetJd?: string
  scenario?: AiOptimizeScenario
  customInstruction?: string
  targetEntryLabel?: string
  followUpAnswers?: string
}

type OutputRulesBuilder = (context: ModulePromptContext) => string[]

const MODULE_OUTPUT_RULE_BUILDERS: Record<string, OutputRulesBuilder> = {
  basicInfo: () => basicInfoOutputRules,
  education: () => educationOutputRules,
  skills: () => skillsOutputRules,
  workExperience: (context) => getWorkExperienceOutputRules(context.workCompanyNames),
  projectExperience: (context) => getProjectExperienceOutputRules(context.projectNames),
  awards: () => awardsOutputRules,
  selfIntro: () => selfIntroOutputRules,
}

export { AI_OPTIMIZE_SCENARIOS, SYSTEM_PROMPT, type AiOptimizeScenario }

export function getModuleOutputRules(moduleKey: string, context: ModulePromptContext = {}): string {
  const builder = MODULE_OUTPUT_RULE_BUILDERS[moduleKey]
  const rules = builder ? builder(context) : COMMON_OUTPUT_RULES
  return rules.join('\n')
}

export function buildOptimizeUserPrompt(params: BuildOptimizePromptParams): string {
  const blocks: string[] = [
    `请优化我简历中的「${params.moduleLabel}」模块${params.targetEntryLabel ? `（本次仅聚焦「${params.targetEntryLabel}」）` : ''}。`,
  ]

  if (params.jobTitle?.trim()) {
    blocks.push(`目标求职岗位：${params.jobTitle.trim()}`)
  }

  if (params.scenario) {
    blocks.push(`优化策略要求：${findScenarioGuidance(params.scenario)}`)
  }

  if (params.targetJd?.trim()) {
    blocks.push(`目标岗位 JD 参考：\n${params.targetJd.trim()}`)
  }

  if (params.customInstruction?.trim()) {
    blocks.push(`额外定制要求：\n${params.customInstruction.trim()}`)
  }

  if (params.followUpAnswers?.trim()) {
    blocks.push(`候选人新补充的真实指标/背景信息（请融入优化后内容并更新待补充项）：\n${params.followUpAnswers.trim()}`)
  }

  blocks.push(`以下是当前待优化内容：\n${params.moduleText}`)
  blocks.push(`请严格遵守以下输出要求：\n${params.outputRules}`)

  return blocks.join('\n\n')
}