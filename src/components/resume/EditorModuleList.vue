<!-- author: jf -->
<script setup lang="ts">
import type { Component } from 'vue'
import type { ModuleConfig } from '@/stores/resume'
import { getModuleIconPaths, MODULE_ICON_VIEWBOX } from '@/constants/moduleIcons'

defineProps<{
  filteredModules: ModuleConfig[]
  expanded: Record<string, boolean>
  editorMap: Record<string, Component>
}>()

defineEmits<{
  (event: 'toggle-expand', key: string): void
}>()

function moduleIconPaths(key: string): string[] {
  return getModuleIconPaths(key)
}
</script>

<template>
  <div class="module-sections">
    <article
      v-for="mod in filteredModules"
      :key="mod.key"
      class="module-block"
      :class="{ disabled: !mod.visible }"
    >
      <header class="module-head" @click="$emit('toggle-expand', mod.key)">
        <div class="module-head-left">
          <span class="module-head-icon" aria-hidden="true">
            <svg class="module-head-icon-svg" :viewBox="MODULE_ICON_VIEWBOX">
              <path v-for="(d, idx) in moduleIconPaths(mod.key)" :key="`${mod.key}-${idx}`" :d="d" />
            </svg>
          </span>
          <span class="module-head-title">{{ mod.label }}</span>
        </div>
        <div class="module-head-right">
          <span v-if="!mod.visible" class="disabled-tag">已关闭</span>
          <span class="expand-text">{{ expanded[mod.key] && mod.visible ? '收起' : '展开' }} ▸</span>
        </div>
      </header>

      <div v-if="expanded[mod.key] && mod.visible" class="module-body">
        <component :is="editorMap[mod.key]" />
      </div>
    </article>

    <div v-if="filteredModules.length === 0" class="empty-result">没有匹配的模块</div>
  </div>
</template>

<style scoped>
.module-sections {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.module-block {
  border-radius: 10px;
  background: #f8f3ed;
  border: 1px solid #efe4d8;
  overflow: hidden;
}

.module-block.disabled {
  background: #f2ece5;
}

.module-head {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 12px;
  cursor: pointer;
}

.module-head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.module-head-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.module-head-icon-svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #8a7461;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.module-block:not(.disabled) .module-head-icon-svg {
  stroke: #d97745;
}

.module-head-title {
  font-size: 14px;
  font-weight: 700;
  color: #2d2521;
}

.module-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.disabled-tag {
  font-size: 11px;
  color: #a08c7b;
  font-weight: 600;
}

.expand-text {
  font-size: 12px;
  color: #8a7461;
  font-weight: 600;
}

.module-body {
  padding: 0 10px 10px;
}

.empty-result {
  font-size: 12px;
  color: #8a7461;
  text-align: center;
  padding: 18px 0;
}

.module-body :deep(.editor-section) {
  margin: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
}

.module-body :deep(.editor-section:hover) {
  box-shadow: none;
}

.module-body :deep(.section-header) {
  display: none;
}

.module-body :deep(.section-body) {
  padding: 10px;
  background: #fff;
  border: 1px solid #e9ded0;
  border-radius: 8px;
}

.module-body :deep(.entry-card) {
  background: #fff;
  border-color: #e9ded0;
}

@container (max-width: 560px) {
  .expand-text {
    display: none;
  }
}
</style>
