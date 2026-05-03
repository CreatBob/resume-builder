<!-- author: jf -->
<script setup lang="ts">
import { computed } from 'vue'
import { RESUME_LAYOUT_LIMITS, useResumeStore, type ResumeLayoutSettingKey } from '@/stores/resume'

const store = useResumeStore()
const isDefaultLayout = computed(() => store.isDefaultLayoutSettings())

interface LayoutSettingControl {
  key: ResumeLayoutSettingKey
  label: string
  unit: string
}

interface LayoutSettingGroup {
  title: string
  controls: LayoutSettingControl[]
}

const layoutSettingGroups: LayoutSettingGroup[] = [
  {
    title: '页面边距',
    controls: [
      { key: 'pageMarginTop', label: '上边距', unit: 'px' },
      { key: 'pageMarginLeft', label: '左边距', unit: 'px' },
      { key: 'pageMarginRight', label: '右边距', unit: 'px' },
    ],
  },
  {
    title: '模块间距',
    controls: [
      { key: 'moduleMarginTop', label: '模块上边距', unit: 'px' },
      { key: 'moduleMarginBottom', label: '模块下边距', unit: 'px' },
      { key: 'sectionTitleContentGap', label: '标题正文间距', unit: 'px' },
    ],
  },
  {
    title: '字体行距',
    controls: [{ key: 'contentLineHeight', label: '正文行距', unit: '' }],
  },
]

function handleLayoutInput(key: ResumeLayoutSettingKey, event: Event) {
  const input = event.target as HTMLInputElement
  store.updateLayoutSetting(key, input.value)
}

function formatLayoutValue(key: ResumeLayoutSettingKey): string {
  const value = store.layoutSettings[key]
  return key === 'contentLineHeight' ? value.toFixed(2) : String(value)
}

function handleResetLayoutSettings() {
  store.resetLayoutSettings()
}
</script>

<template>
  <section class="layout-settings">
    <div class="layout-settings-head">
      <div>
        <h2 class="layout-settings-title">版式设置</h2>
        <p class="layout-settings-subtitle">全局控制页面边距、模块间距和正文行距</p>
      </div>
      <button
        class="btn-reset-layout"
        type="button"
        :disabled="isDefaultLayout"
        @click="handleResetLayoutSettings"
      >
        恢复默认
      </button>
    </div>

    <div class="layout-settings-groups">
      <div v-for="group in layoutSettingGroups" :key="group.title" class="layout-setting-group">
        <p class="layout-setting-group-title">{{ group.title }}</p>
        <label v-for="control in group.controls" :key="control.key" class="layout-setting-row">
          <span class="layout-setting-label">{{ control.label }}</span>
          <input
            class="layout-range"
            type="range"
            :min="RESUME_LAYOUT_LIMITS[control.key].min"
            :max="RESUME_LAYOUT_LIMITS[control.key].max"
            :step="RESUME_LAYOUT_LIMITS[control.key].step"
            :value="store.layoutSettings[control.key]"
            :aria-label="control.label"
            @input="handleLayoutInput(control.key, $event)"
          />
          <span class="layout-number-wrap">
            <input
              class="layout-number"
              type="number"
              :min="RESUME_LAYOUT_LIMITS[control.key].min"
              :max="RESUME_LAYOUT_LIMITS[control.key].max"
              :step="RESUME_LAYOUT_LIMITS[control.key].step"
              :value="formatLayoutValue(control.key)"
              :aria-label="`${control.label}数值`"
              @change="handleLayoutInput(control.key, $event)"
            />
            <span v-if="control.unit" class="layout-unit">{{ control.unit }}</span>
          </span>
        </label>
      </div>
    </div>
  </section>
</template>

<style scoped>
.layout-settings {
  background: #fff;
  border: 1px solid #e9ded0;
  border-radius: 12px;
  padding: 14px;
}

.layout-settings-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.layout-settings-title {
  color: #2d2521;
  font-size: 16px;
  font-weight: 700;
}

.layout-settings-subtitle {
  margin-top: 2px;
  color: #8a7461;
  font-size: 12px;
}

.btn-reset-layout {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #ddcfbf;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.btn-reset-layout:hover:not(:disabled) {
  border-color: #d97745;
  color: #d97745;
  background: #fff9f4;
}

.btn-reset-layout:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.layout-settings-groups {
  display: grid;
  gap: 12px;
}

.layout-setting-group {
  display: grid;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: #f8f3ed;
}

.layout-setting-group-title {
  color: #8a7461;
  font-size: 12px;
  font-weight: 700;
}

.layout-setting-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) 72px;
  align-items: center;
  gap: 10px;
}

.layout-setting-label {
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
}

.layout-range {
  width: 100%;
  accent-color: #d97745;
}

.layout-number-wrap {
  height: 30px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #ddcfbf;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.layout-number {
  width: 48px;
  min-width: 0;
  height: 100%;
  border: none;
  background: transparent;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  outline: none;
}

.layout-unit {
  padding: 0 7px 0 3px;
  color: #8a7461;
  font-size: 11px;
  font-weight: 600;
}

@container (max-width: 560px) {
  .layout-settings-head {
    flex-direction: column;
  }

  .layout-setting-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .layout-number-wrap {
    width: 86px;
  }
}
</style>
