<!-- author: Bob -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DiffLine, SelectableOptimizedEntry } from '@/services/aiOptimizeApplyService'

const props = defineProps<{
  renderedHtml: string
  diffLines: DiffLine[]
  selectableEntries: SelectableOptimizedEntry[]
  selectedIndexes: number[]
  isDone: boolean
  canApply: boolean
  isApplied: boolean
  canUndo: boolean
}>()

const emit = defineEmits<{
  (e: 'update:selectedIndexes', value: number[]): void
  (e: 'apply'): void
  (e: 'undo'): void
}>()

const viewMode = ref<'rendered' | 'diff'>('rendered')

const hasDiffChanges = computed(() =>
  props.diffLines.some((line) => line.type === 'added' || line.type === 'removed'),
)

function toggleEntry(index: number) {
  const exists = props.selectedIndexes.includes(index)
  const next = exists
    ? props.selectedIndexes.filter((item) => item !== index)
    : [...props.selectedIndexes, index].sort((a, b) => a - b)
  emit('update:selectedIndexes', next)
}
</script>

<template>
  <div class="result-card content-card">
    <div class="result-card-header">
      <div class="header-left">
        <h4 class="result-card-title">优化后内容</h4>
        <div class="view-tabs" role="tablist" aria-label="结果查看模式">
          <button
            class="view-tab"
            type="button"
            role="tab"
            :aria-selected="viewMode === 'rendered'"
            :class="{ active: viewMode === 'rendered' }"
            @click="viewMode = 'rendered'"
          >
            渲染结果
          </button>
          <button
            class="view-tab"
            type="button"
            role="tab"
            :aria-selected="viewMode === 'diff'"
            :class="{ active: viewMode === 'diff' }"
            @click="viewMode = 'diff'"
          >
            改动对比
          </button>
        </div>
      </div>

      <div class="result-card-actions">
        <button
          v-if="props.isDone && props.canApply && !props.isApplied"
          class="btn-apply"
          type="button"
          :disabled="props.selectableEntries.length > 0 && props.selectedIndexes.length === 0"
          @click="emit('apply')"
        >
          {{ props.selectableEntries.length > 0 ? '应用所选条目' : '应用此内容' }}
        </button>
        <button
          v-if="props.isDone && props.canApply && props.isApplied && props.canUndo"
          class="btn-undo"
          type="button"
          @click="emit('undo')"
        >
          撤回应用
        </button>
        <span v-if="props.isApplied" class="applied-tag">已应用</span>
        <span v-if="props.isDone && !props.canApply" class="applied-tag">仅查看建议</span>
      </div>
    </div>

    <div v-if="props.isDone && props.selectableEntries.length > 1" class="entry-selector-bar">
      <span class="entry-selector-label">选择采纳段：</span>
      <label
        v-for="entry in props.selectableEntries"
        :key="entry.index"
        class="entry-check-pill"
      >
        <input
          type="checkbox"
          :checked="props.selectedIndexes.includes(entry.index)"
          @change="toggleEntry(entry.index)"
        />
        <span>{{ entry.title }}</span>
      </label>
    </div>

    <div
      v-if="viewMode === 'rendered'"
      class="result-content markdown-content"
      v-html="props.renderedHtml"
    ></div>

    <div v-else class="diff-viewer">
      <p v-if="!hasDiffChanges && props.diffLines.length === 0" class="diff-empty">
        暂无可对比的原始内容或改动片段。
      </p>
      <div
        v-for="(line, idx) in props.diffLines"
        :key="idx"
        class="diff-line"
        :class="line.type"
      >
        <span class="diff-marker" aria-hidden="true">
          {{ line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ' }}
        </span>
        <span class="diff-text">{{ line.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  overflow: hidden;
}

.result-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.result-card-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

.view-tabs {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.view-tab {
  height: 26px;
  padding: 0 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.view-tab.active {
  background: var(--color-bg-panel);
  color: var(--color-brand);
  box-shadow: var(--shadow-xs);
}

.result-card-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-apply {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-apply:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-undo {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-undo:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.applied-tag {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-brand-text);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-brand-subtle);
}

.entry-selector-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background: var(--color-bg-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.entry-selector-label {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.entry-check-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  cursor: pointer;
}

.entry-check-pill input {
  accent-color: var(--color-brand);
}

.result-content {
  padding: 12px 14px 14px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.7;
  word-break: break-word;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
  margin: 0 0 8px;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 700;
}

.markdown-content :deep(p),
.markdown-content :deep(ol),
.markdown-content :deep(ul) {
  margin: 0 0 10px;
}

.markdown-content :deep(ol),
.markdown-content :deep(ul) {
  padding-left: 20px;
}

.markdown-content :deep(li) {
  margin-bottom: 6px;
}

.diff-viewer {
  padding: 10px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-xs);
  line-height: 1.6;
}

.diff-empty {
  color: var(--color-text-tertiary);
}

.diff-line {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 6px;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  word-break: break-word;
}

.diff-line.removed {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  text-decoration: line-through;
}

.diff-line.added {
  background: var(--color-success-subtle);
  color: var(--color-success);
  font-weight: 600;
}

.diff-line.unchanged {
  color: var(--color-text-secondary);
}

.diff-marker {
  font-weight: 700;
  text-align: center;
}
</style>
