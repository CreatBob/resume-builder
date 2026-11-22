// author: Bob
export type AiProviderMode = 'auto' | 'backend' | 'byok'

export interface AiProviderPreset {
  id: string
  label: string
  baseUrl: string
  defaultModel: string
  suggestedModels: string[]
  corsFriendly: boolean
  hint: string
}

const AI_PROVIDER_MODE_VALUES = new Set<AiProviderMode>(['auto', 'backend', 'byok'])

export function getAiProviderMode(): AiProviderMode {
  const mode = import.meta.env.VITE_AI_PROVIDER_MODE
  return AI_PROVIDER_MODE_VALUES.has(mode as AiProviderMode) ? (mode as AiProviderMode) : 'auto'
}

export function getAiProxyPath(): string {
  const raw = import.meta.env.VITE_AI_PROXY_PATH?.trim()
  return raw || '/api/ai-proxy/chat/completions'
}

export const AI_PROVIDER_PRESETS: AiProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    suggestedModels: ['deepseek-chat', 'deepseek-reasoner'],
    corsFriendly: true,
    hint: '官方支持浏览器直连，性价比高。',
  },
  {
    id: 'dashscope',
    label: '阿里云百炼（通义千问）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    suggestedModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
    corsFriendly: true,
    hint: '使用 OpenAI 兼容模式，需填写百炼 API Key。',
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow（硅基流动）',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    suggestedModels: ['Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3'],
    corsFriendly: true,
    hint: '支持多种开源模型，通常可直接浏览器请求。',
  },
  {
    id: 'moonshot',
    label: 'Moonshot Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    suggestedModels: ['moonshot-v1-8k', 'moonshot-v1-32k'],
    corsFriendly: true,
    hint: '擅长中文长文本润色与结构整理。',
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'glm-4-flash',
    suggestedModels: ['glm-4-flash', 'glm-4-plus'],
    corsFriendly: true,
    hint: '使用 /api/paas/v4 兼容端点。',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    suggestedModels: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet'],
    corsFriendly: true,
    hint: '聚合多家海外大模型，浏览器直连友好。',
  },
  {
    id: 'openai',
    label: 'OpenAI 官方',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    suggestedModels: ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'],
    corsFriendly: true,
    hint: '需本地网络可直达 OpenAI 接口。',
  },
  {
    id: 'ollama',
    label: '本地 Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5:7b',
    suggestedModels: ['qwen2.5:7b', 'llama3.1:8b'],
    corsFriendly: false,
    hint: '本地运行需启动 Ollama 且设置 OLLAMA_ORIGINS="*"。',
  },
  {
    id: 'custom',
    label: '自定义 OpenAI 兼容中转',
    baseUrl: '',
    defaultModel: '',
    suggestedModels: [],
    corsFriendly: false,
    hint: '若中转站未开启跨域头，可打开下方“通过边缘代理解决跨域”。',
  },
]

export function findAiProviderPreset(id: string): AiProviderPreset | undefined {
  return AI_PROVIDER_PRESETS.find((item) => item.id === id)
}
