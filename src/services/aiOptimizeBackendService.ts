// author: Bob
import { postAiChatStream } from '@/api/aiApi'
import { SYSTEM_PROMPT } from '@/services/prompts'
import {
  buildOptimizeContextPrompt,
  type AiOptimizeRequestOptions,
  type AiStreamCallbacks,
  type ModuleData,
} from '@/services/aiService'

function logAiOptimizeFullOutput(moduleKey: string, label: string, fullText: string): void {
  console.info(
    `[ai-optimize][full-output] moduleKey=${moduleKey} label=${label}\n---BEGIN---\n${fullText || '<empty>'}\n---END---`,
  )
}

function parseErrorText(text: string): string {
  const cleaned = text.trim()
  if (!cleaned) return ''
  try {
    const parsed = JSON.parse(cleaned) as { message?: string; error?: string | { message?: string } }
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim()
    if (typeof parsed.error === 'string' && parsed.error.trim()) return parsed.error.trim()
    if (parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string') {
      return parsed.error.message.trim()
    }
    return cleaned
  } catch {
    return cleaned
  }
}

export async function optimizeModule(
  moduleKey: string,
  moduleData: ModuleData,
  callbacks: AiStreamCallbacks,
  signal?: AbortSignal,
  options: AiOptimizeRequestOptions = {},
): Promise<void> {
  const { label, moduleText, userMessage } = buildOptimizeContextPrompt(moduleKey, moduleData, options)

  if (!moduleText.trim()) {
    callbacks.onError(`“${label}”模块内容为空，请先填写后再优化。`)
    return
  }

  try {
    const response = await postAiChatStream(
      {
        message: `${SYSTEM_PROMPT}\n\n${userMessage}`,
        sanitizeOutput: true,
      },
      signal
    )

    if (!response.ok) {
      const errorText = parseErrorText(await response.text().catch(() => ''))
      callbacks.onError(`后端请求失败 (${response.status}): ${errorText || response.statusText}`)
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      callbacks.onError('后端未返回可读取的流。')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let eventName = 'message'
    let dataLines: string[] = []
    let fullText = ''

    const dispatchEvent = () => {
      if (dataLines.length === 0) {
        eventName = 'message'
        return
      }

      const data = dataLines.join('\n')
      dataLines = []

      if (eventName === 'error') {
        throw new Error(data || 'stream error')
      }

      if (eventName === 'chunk' || eventName === 'message') {
        fullText += data
        callbacks.onChunk(fullText)
      }

      eventName = 'message'
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.replace(/\r$/, '')

        if (!line) {
          dispatchEvent()
          continue
        }

        if (line.startsWith('event:')) {
          eventName = line.slice(6).trim() || 'message'
          continue
        }

        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        }
      }
    }

    buffer += decoder.decode()
    if (buffer.trim()) {
      const trailing = buffer.replace(/\r$/, '')
      if (trailing.startsWith('event:')) {
        eventName = trailing.slice(6).trim() || 'message'
      } else if (trailing.startsWith('data:')) {
        dataLines.push(trailing.slice(5).trimStart())
      }
    }
    if (dataLines.length > 0) {
      dispatchEvent()
    }

    if (!fullText.trim()) {
      callbacks.onError('后端流式返回为空，请检查后端模型配置与服务状态。')
      return
    }
    logAiOptimizeFullOutput(moduleKey, label, fullText)
    callbacks.onDone(fullText)
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return
    }
    const message = err instanceof Error ? err.message : String(err ?? 'unknown error')
    callbacks.onError(`请求出错: ${message}`)
  }
}
