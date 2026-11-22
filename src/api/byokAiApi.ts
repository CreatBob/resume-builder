// author: Bob
export interface ByokChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ByokChatRequestParams {
  apiUrl: string
  apiToken: string
  modelName: string
  messages: ByokChatMessage[]
  stream?: boolean
  maxTokens?: number
  useCorsProxy?: boolean
  proxyPath?: string
}

export interface ByokModelsRequestParams {
  apiUrl: string
  apiToken: string
}

function normalizeOpenAiPath(pathname: string, suffix: '/chat/completions' | '/models'): string {
  const cleanedPath = pathname.replace(/\/+$/, '')
  if (suffix === '/chat/completions') {
    if (/\/chat\/completions$/i.test(cleanedPath)) return cleanedPath
    if (/\/v\d+(?:alpha|beta)?(?:\/openai)?$/i.test(cleanedPath)) return `${cleanedPath}/chat/completions`
    return `${cleanedPath}/v1/chat/completions`
  }

  const withoutCompletions = cleanedPath.replace(/\/chat\/completions$/i, '')
  if (/\/models$/i.test(withoutCompletions)) return withoutCompletions
  if (/\/v\d+(?:alpha|beta)?(?:\/openai)?$/i.test(withoutCompletions)) return `${withoutCompletions}/models`
  return `${withoutCompletions}/v1/models`
}

export function buildChatCompletionsUrl(rawBaseUrl: string): string {
  const cleaned = rawBaseUrl.trim()
  if (!cleaned) return ''
  try {
    const parsed = new URL(cleaned)
    parsed.pathname = normalizeOpenAiPath(parsed.pathname, '/chat/completions')
    return parsed.toString()
  } catch {
    const stripped = cleaned.replace(/\/+$/, '')
    if (/\/chat\/completions$/i.test(stripped)) return stripped
    if (/\/v\d+(?:alpha|beta)?(?:\/openai)?$/i.test(stripped)) return `${stripped}/chat/completions`
    return `${stripped}/v1/chat/completions`
  }
}

export function buildModelsUrl(rawBaseUrl: string): string {
  const cleaned = rawBaseUrl.trim()
  if (!cleaned) return ''
  try {
    const parsed = new URL(cleaned)
    parsed.pathname = normalizeOpenAiPath(parsed.pathname, '/models')
    return parsed.toString()
  } catch {
    const stripped = cleaned.replace(/\/+$/, '').replace(/\/chat\/completions$/i, '')
    if (/\/models$/i.test(stripped)) return stripped
    if (/\/v\d+(?:alpha|beta)?(?:\/openai)?$/i.test(stripped)) return `${stripped}/models`
    return `${stripped}/v1/models`
  }
}

export async function postByokChatCompletions(
  params: ByokChatRequestParams,
  signal?: AbortSignal,
): Promise<Response> {
  const targetUrl = buildChatCompletionsUrl(params.apiUrl)
  const useProxy = Boolean(params.useCorsProxy && params.proxyPath)
  const endpoint = useProxy ? String(params.proxyPath) : targetUrl

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${params.apiToken.trim()}`,
  }
  if (params.stream !== false) {
    headers.Accept = 'text/event-stream'
  }
  if (useProxy) {
    headers['X-Target-Base-Url'] = targetUrl
  }

  const payload: Record<string, unknown> = {
    model: params.modelName.trim(),
    messages: params.messages,
    stream: params.stream !== false,
  }
  if (typeof params.maxTokens === 'number' && params.maxTokens > 0) {
    payload.max_tokens = params.maxTokens
  }

  return fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  })
}

export async function fetchByokModelList(
  params: ByokModelsRequestParams,
  signal?: AbortSignal,
): Promise<Response> {
  const targetUrl = buildModelsUrl(params.apiUrl)
  return fetch(targetUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${params.apiToken.trim()}`,
    },
    signal,
  })
}
