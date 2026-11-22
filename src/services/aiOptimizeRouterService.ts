// author: Bob
import { fetchByokModelList, postByokChatCompletions } from '@/api/byokAiApi'
import { getAiProviderMode } from '@/config/aiProviderMode'
import type { useAiConfigStore } from '@/stores/aiConfig'
import {
  optimizeModule as optimizeViaByok,
  type AiOptimizeRequestOptions,
  type AiStreamCallbacks,
  type ModuleData,
} from '@/services/aiService'
import { optimizeModule as optimizeViaBackend } from '@/services/aiOptimizeBackendService'

export type ResolvedAiChannel = 'byok' | 'backend'

export interface ByokConnectionTestResult {
  ok: boolean
  message: string
  discoveredModels: string[]
}

export function resolveActiveAiChannel(): ResolvedAiChannel {
  const envMode = getAiProviderMode()
  if (envMode === 'backend') return 'backend'
  return 'byok'
}

export async function optimizeResumeModule(
  params: {
    aiConfig: ReturnType<typeof useAiConfigStore>
    moduleKey: string
    moduleData: ModuleData
    options?: AiOptimizeRequestOptions
  },
  callbacks: AiStreamCallbacks,
  signal?: AbortSignal,
): Promise<ResolvedAiChannel> {
  const channel = resolveActiveAiChannel()
  if (channel === 'byok') {
    if (!params.aiConfig.isConfigured) {
      callbacks.onError('尚未配置 AI 模型密钥。请点击右上角“模型配置”填写服务商 URL、API Key 与模型名称。')
      return channel
    }
    await optimizeViaByok(
      {
        apiUrl: params.aiConfig.apiUrl,
        apiToken: params.aiConfig.apiToken,
        modelName: params.aiConfig.modelName,
        useCorsProxy: params.aiConfig.useCorsProxy,
        proxyPath: params.aiConfig.corsProxyPath,
      },
      params.moduleKey,
      params.moduleData,
      callbacks,
      signal,
      params.options,
    )
    return channel
  }

  await optimizeViaBackend(
    params.moduleKey,
    params.moduleData,
    callbacks,
    signal,
    params.options,
  )
  return channel
}

export async function testByokConnection(
  config: {
    apiUrl: string
    apiToken: string
    modelName: string
    useCorsProxy?: boolean
    proxyPath?: string
  },
  signal?: AbortSignal,
): Promise<ByokConnectionTestResult> {
  if (!config.apiUrl.trim() || !config.apiToken.trim()) {
    return {
      ok: false,
      message: '请先填写完整的接口地址与 API Key。',
      discoveredModels: [],
    }
  }

  let discoveredModels: string[] = []
  if (!config.useCorsProxy) {
    try {
      const modelsResp = await fetchByokModelList(
        { apiUrl: config.apiUrl, apiToken: config.apiToken },
        signal,
      )
      if (modelsResp.ok) {
        const contentType = (modelsResp.headers.get('content-type') || '').toLowerCase()
        if (contentType.includes('application/json')) {
          const payload = (await modelsResp.json()) as { data?: Array<{ id?: string }> }
          discoveredModels = Array.isArray(payload.data)
            ? payload.data.map((item) => item?.id?.trim() ?? '').filter(Boolean).slice(0, 24)
            : []
          if (!config.modelName.trim()) {
            return {
              ok: true,
              message: discoveredModels.length > 0
                ? `连接成功，已拉取 ${discoveredModels.length} 个可用模型。`
                : '连接成功（服务商已响应模型列表）。',
              discoveredModels,
            }
          }
        }
      }
    } catch (err: unknown) {
      if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return {
          ok: false,
          message: '连接测试已取消。',
          discoveredModels,
        }
      }
      // 部分兼容网关未开放 /models 或未允许 GET CORS，继续使用最小对话探活
    }
  }

  if (!config.modelName.trim()) {
    return {
      ok: false,
      message: '未能从 /models 拉取模型列表，请手动填写模型名称后再测试。',
      discoveredModels,
    }
  }

  try {
    const pingResp = await postByokChatCompletions(
      {
        apiUrl: config.apiUrl,
        apiToken: config.apiToken,
        modelName: config.modelName,
        messages: [{ role: 'user', content: 'ping' }],
        stream: false,
        maxTokens: 1,
        useCorsProxy: config.useCorsProxy,
        proxyPath: config.proxyPath,
      },
      signal,
    )

    if (!pingResp.ok) {
      const text = await pingResp.text().catch(() => '')
      return {
        ok: false,
        message: `连接测试失败 (${pingResp.status})：${text.slice(0, 180) || pingResp.statusText}`,
        discoveredModels,
      }
    }

    const contentType = (pingResp.headers.get('content-type') || '').toLowerCase()
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        message: config.useCorsProxy
          ? '边缘代理返回了非 JSON 响应（本地 npm run dev 默认不运行 Edge Functions，请关闭代理或使用 wrangler pages dev 联调）。'
          : '接口返回了非 JSON 内容（可能填入了网页地址而非 API 地址），请检查 Base URL。',
        discoveredModels,
      }
    }

    const parsed = (await pingResp.json().catch(() => null)) as {
      choices?: unknown[]
      error?: { message?: string }
    } | null
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.choices)) {
      const errMsg = parsed?.error?.message?.trim()
      return {
        ok: false,
        message: errMsg ? `接口返回错误：${errMsg}` : '响应格式不符合 OpenAI Chat Completions 规范（缺少 choices 字段）。',
        discoveredModels,
      }
    }

    return {
      ok: true,
      message: discoveredModels.length > 0
        ? `连接与模型可用（已发现 ${discoveredModels.length} 个模型）。`
        : '连接与模型鉴权测试通过。',
      discoveredModels,
    }
  } catch (err: unknown) {
    if (signal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
      return {
        ok: false,
        message: '连接测试已取消。',
        discoveredModels,
      }
    }
    const msg = err instanceof Error ? err.message : String(err)
    const isNetwork = err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(msg)
    return {
      ok: false,
      message: isNetwork
        ? config.useCorsProxy
          ? '边缘代理请求失败（本地 npm run dev 未启用 Edge Functions，或线上代理网络不可达）。'
          : '浏览器无法直连该接口（可能受跨域 CORS 限制或地址不可达）。若部署在 Cloudflare Pages，可尝试开启“通过同源 Cloudflare 边缘代理转发”。'
        : `测试失败：${msg}`,
      discoveredModels,
    }
  }
}
