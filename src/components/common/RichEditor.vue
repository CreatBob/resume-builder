<script setup lang="ts">
import { nextTick, ref, watch, onMounted } from 'vue'
// author: Bob

let richEditorInstanceCounter = 0

const props = defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const linkInputId = `rich-editor-link-input-${++richEditorInstanceCounter}`
const editorRef = ref<HTMLDivElement | null>(null)
const linkInputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const showPlaceholder = ref(!props.modelValue)
const isLinkPopoverOpen = ref(false)
const linkInputValue = ref('')
const linkError = ref('')
const pendingLinkRange = ref<Range | null>(null)

// 同步外部值到 DOM，编辑中不刷新以避免光标跳动。
watch(() => props.modelValue, (val) => {
  if (!editorRef.value || isFocused.value) return
  if (editorRef.value.innerHTML !== val) {
    editorRef.value.innerHTML = val || ''
    applySafeLinkAttributes()
  }
  showPlaceholder.value = !val
})

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || ''
    applySafeLinkAttributes()
    showPlaceholder.value = !props.modelValue
  }
})

function onInput() {
  applySafeLinkAttributes()
  const html = editorRef.value?.innerHTML ?? ''
  // 将浏览器生成的空段落视为空内容。
  const clean = html === '<br>' || html === '<div><br></div>' ? '' : html
  showPlaceholder.value = !clean
  emit('update:modelValue', clean)
}

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
  editorRef.value?.focus()
  onInput()
}

function normalizeLinkUrl(rawUrl: string): string {
  const trimmedUrl = rawUrl.trim()
  if (!trimmedUrl) return ''

  let urlWithProtocol = trimmedUrl
  if (!/^[a-z][a-z\d+.-]*:/i.test(trimmedUrl)) {
    urlWithProtocol = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedUrl)
      ? `mailto:${trimmedUrl}`
      : `https://${trimmedUrl}`
  }

  try {
    const url = new URL(urlWithProtocol)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function applySafeLinkAttributes() {
  editorRef.value?.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const normalizedUrl = normalizeLinkUrl(link.getAttribute('href') ?? '')
    if (!normalizedUrl) {
      link.removeAttribute('href')
      link.removeAttribute('target')
      link.removeAttribute('rel')
      return
    }
    link.href = normalizedUrl
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  })
}

function getCurrentEditorRange(): Range | null {
  const selection = window.getSelection()
  const editor = editorRef.value
  if (!selection || !editor || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  return editor.contains(range.commonAncestorContainer) ? range.cloneRange() : null
}

function restoreEditorRange(range: Range) {
  const selection = window.getSelection()
  if (!selection) return
  selection.removeAllRanges()
  selection.addRange(range)
}

function openLinkPopover() {
  const range = getCurrentEditorRange()
  pendingLinkRange.value = range
  linkError.value = ''

  if (!range || range.collapsed) {
    linkInputValue.value = ''
    linkError.value = '请先选中要添加链接的文字'
  } else {
    const selectedText = range.toString().trim()
    linkInputValue.value = /^https?:\/\//i.test(selectedText) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(selectedText)
      ? selectedText
      : 'https://'
  }

  isLinkPopoverOpen.value = true
  void nextTick(() => linkInputRef.value?.focus())
}

function closeLinkPopover() {
  isLinkPopoverOpen.value = false
  linkInputValue.value = ''
  linkError.value = ''
  pendingLinkRange.value = null
  editorRef.value?.focus()
}

function confirmLink() {
  const range = pendingLinkRange.value
  if (!range || range.collapsed) {
    linkError.value = '请先选中要添加链接的文字'
    return
  }

  const normalizedUrl = normalizeLinkUrl(linkInputValue.value)
  if (!normalizedUrl) {
    linkError.value = '请输入有效链接，仅支持 http、https 或 mailto'
    return
  }

  editorRef.value?.focus()
  restoreEditorRange(range)
  document.execCommand('createLink', false, normalizedUrl)
  applySafeLinkAttributes()
  isLinkPopoverOpen.value = false
  linkInputValue.value = ''
  pendingLinkRange.value = null
  linkError.value = ''
  onInput()
}

function unlink() {
  execCmd('unlink')
}

function setFontSize(e: Event) {
  const target = e.target as HTMLSelectElement
  const size = target.value
  if (!size) return
  // execCommand 的 fontSize 只能使用 1-7，先生成临时 font 后替换为 span。
  document.execCommand('fontSize', false, '7')
  const fontEls = editorRef.value?.querySelectorAll('font[size="7"]')
  fontEls?.forEach(el => {
    const span = document.createElement('span')
    span.style.fontSize = size
    span.innerHTML = el.innerHTML
    el.parentNode?.replaceChild(span, el)
  })
  // 同步列表符号字号，避免项目符号和正文大小不一致。
  applyFontSizeToSelectedListItems(size)
  editorRef.value?.focus()
  onInput()
  // 重置选择器，保证连续选择同一字号也能触发。
  target.value = ''
}

function applyFontSizeToSelectedListItems(size: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const startEl =
    range.startContainer.nodeType === Node.ELEMENT_NODE
      ? (range.startContainer as Element)
      : range.startContainer.parentElement
  const endEl =
    range.endContainer.nodeType === Node.ELEMENT_NODE
      ? (range.endContainer as Element)
      : range.endContainer.parentElement

  const startLi = startEl?.closest('li') as HTMLElement | null
  const endLi = endEl?.closest('li') as HTMLElement | null

  if (startLi && endLi && startLi.parentElement && startLi.parentElement === endLi.parentElement) {
    const siblings = Array.from(startLi.parentElement.children).filter(
      (node) => node instanceof HTMLElement && node.tagName === 'LI'
    ) as HTMLElement[]
    const startIndex = siblings.indexOf(startLi)
    const endIndex = siblings.indexOf(endLi)
    if (startIndex > -1 && endIndex > -1) {
      const from = Math.min(startIndex, endIndex)
      const to = Math.max(startIndex, endIndex)
      for (let i = from; i <= to; i += 1) {
        const li = siblings[i]
        if (li) li.style.fontSize = size
      }
      return
    }
  }

  if (startLi) startLi.style.fontSize = size
  if (endLi && endLi !== startLi) endLi.style.fontSize = size
}

function setColor(e: Event) {
  const color = (e.target as HTMLInputElement).value
  execCmd('foreColor', color)
}

function isActive(cmd: string): boolean {
  try { return document.queryCommandState(cmd) } catch { return false }
}
</script>

<template>
  <div class="rich-editor-wrap" :class="{ focused: isFocused }">
    <!-- 工具栏 -->
    <div class="rich-toolbar">
      <button type="button" class="tool-btn" :class="{ active: isActive('bold') }" @mousedown.prevent="execCmd('bold')" title="粗体">
        <strong>B</strong>
      </button>
      <button type="button" class="tool-btn" :class="{ active: isActive('italic') }" @mousedown.prevent="execCmd('italic')" title="斜体">
        <em>I</em>
      </button>
      <button type="button" class="tool-btn" :class="{ active: isActive('underline') }" @mousedown.prevent="execCmd('underline')" title="下划线">
        <u>U</u>
      </button>
      <div class="tool-divider"></div>
      <select class="tool-select" @change="setFontSize" title="字体大小">
        <option value="">字号</option>
        <option value="10px">10</option>
        <option value="11px">11</option>
        <option value="12px">12</option>
        <option value="13px">13</option>
        <option value="14px">14</option>
        <option value="16px">16</option>
        <option value="18px">18</option>
        <option value="20px">20</option>
      </select>
      <input type="color" class="tool-color" @change="setColor" title="字体颜色" value="#333333" />
      <div class="tool-divider"></div>
      <button type="button" class="tool-btn" :class="{ active: isActive('createLink') || isLinkPopoverOpen }" @mousedown.prevent="openLinkPopover" title="添加链接">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M6.8 4.7l.8-.8a3 3 0 0 1 4.2 4.2l-1.9 1.9a3 3 0 0 1-4.2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M9.2 11.3l-.8.8a3 3 0 0 1-4.2-4.2l1.9-1.9a3 3 0 0 1 4.2 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M6.4 9.6l3.2-3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <button type="button" class="tool-btn" @mousedown.prevent="unlink" title="取消链接">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M6.6 4.7l.8-.8a3 3 0 0 1 4.2 4.2l-.6.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M9.4 11.3l-.8.8a3 3 0 0 1-4.2-4.2l.6-.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3.5 3.5l9 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="tool-divider"></div>
      <button type="button" class="tool-btn" @mousedown.prevent="execCmd('insertUnorderedList')" title="无序列表">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="2" cy="4" r="1.2" fill="currentColor"/>
          <circle cx="2" cy="8" r="1.2" fill="currentColor"/>
          <circle cx="2" cy="12" r="1.2" fill="currentColor"/>
          <path d="M5 4h9M5 8h9M5 12h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <button type="button" class="tool-btn" @mousedown.prevent="execCmd('insertOrderedList')" title="有序列表">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <text x="0" y="5.5" font-size="5" fill="currentColor" font-weight="bold">1.</text>
          <text x="0" y="9.5" font-size="5" fill="currentColor" font-weight="bold">2.</text>
          <text x="0" y="13.5" font-size="5" fill="currentColor" font-weight="bold">3.</text>
          <path d="M5 4h9M5 8h9M5 12h9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
      <button type="button" class="tool-btn" @mousedown.prevent="execCmd('removeFormat')" title="清除格式">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M3 12L9 3M6 12h7M3 6l7 0" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>
    </div>

    <div v-if="isLinkPopoverOpen" class="link-popover" role="dialog" aria-label="添加链接">
      <label class="link-label" :for="linkInputId">链接地址</label>
      <div class="link-input-row">
        <input
          :id="linkInputId"
          ref="linkInputRef"
          v-model="linkInputValue"
          class="link-input"
          type="url"
          placeholder="https://example.com"
          @keydown.enter.prevent="confirmLink"
          @keydown.esc.prevent="closeLinkPopover"
        />
        <button type="button" class="link-action link-action-primary" @mousedown.prevent="confirmLink">确定</button>
        <button type="button" class="link-action" @mousedown.prevent="closeLinkPopover">取消</button>
      </div>
      <p class="link-helper" :class="{ 'link-helper-error': linkError }">
        {{ linkError || '支持 http、https、mailto；未填写协议时会自动补全 https。' }}
      </p>
    </div>

    <!-- 编辑区 -->
    <div class="editor-area-wrap">
      <div
        ref="editorRef"
        class="editor-area"
        contenteditable="true"
        :style="{ minHeight: (rows || 3) * 1.8 + 'em' }"
        @input="onInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
        spellcheck="false"
      ></div>
      <div v-if="showPlaceholder" class="editor-placeholder">{{ placeholder || '请输入内容...' }}</div>
    </div>
  </div>
</template>

<style scoped>
.rich-editor-wrap {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--gray-50);
  overflow: hidden;
  transition: all var(--transition-fast);
}

.rich-editor-wrap.focused {
  border-color: var(--primary-400);
  background: white;
  box-shadow: 0 0 0 3px var(--primary-50);
}

/* Toolbar */
.rich-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  background: white;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.tool-btn {
  min-width: 26px;
  height: 24px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  color: var(--text-primary);
  font-size: 0.8rem;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-200);
}

.tool-btn.active {
  background: var(--primary-50);
  border-color: var(--primary-200);
  color: var(--primary-600);
}

.tool-divider {
  width: 1px;
  height: 16px;
  background: var(--gray-200);
  margin: 0 3px;
}

.tool-select {
  height: 24px;
  padding: 0 4px;
  border: 1px solid var(--gray-200);
  border-radius: 3px;
  font-size: 0.75rem;
  color: var(--text-primary);
  background: white;
  cursor: pointer;
  outline: none;
}

.tool-color {
  width: 24px;
  height: 24px;
  padding: 1px;
  border: 1px solid var(--gray-200);
  border-radius: 3px;
  cursor: pointer;
  background: white;
}

.link-popover {
  padding: 10px 12px 11px;
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-xs);
}

.link-label {
  display: block;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.link-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.link-input {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 9px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  outline: none;
}

.link-input:focus {
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.link-action {
  flex-shrink: 0;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.link-action:hover {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand);
}

.link-action-primary {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.link-action-primary:hover {
  background: var(--color-brand-hover);
  color: var(--color-text-inverse);
}

.link-helper {
  min-height: 16px;
  margin-top: 6px;
  color: var(--color-text-tertiary);
  font-size: 11px;
  line-height: 1.45;
}

.link-helper-error {
  color: var(--color-danger);
}

/* 编辑区 */
.editor-area-wrap {
  position: relative;
}

.editor-area {
  padding: 8px 10px 8px 24px;
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-primary);
  outline: none;
  word-break: break-word;
}

.editor-area:empty {
  min-height: 3em;
}

.editor-placeholder {
  position: absolute;
  top: 8px;
  left: 10px;
  color: var(--gray-400);
  font-size: 0.88rem;
  pointer-events: none;
  user-select: none;
}

/* List styles inside editor */
.editor-area ul {
  list-style-type: disc;
  padding-left: 18px;
  margin: 4px 0;
}

.editor-area ol {
  list-style-type: decimal;
  padding-left: 18px;
  margin: 4px 0;
}

.editor-area li {
  margin-bottom: 2px;
  font-size: inherit;
}

.editor-area li::marker {
  font-size: 1em;
  font-weight: inherit;
  color: currentColor;
}

.editor-area :deep(a[href]) {
  color: var(--color-text-link);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (max-width: 560px) {
  .link-input-row {
    align-items: stretch;
    flex-direction: column;
  }

  .link-action {
    width: 100%;
  }
}
</style>
