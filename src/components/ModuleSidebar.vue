<script setup lang="ts">
import { computed } from 'vue'
import { useResumeStore } from '@/stores/resume'

const store = useResumeStore()

const enabledCount = computed(() => store.modules.filter((m) => m.visible).length)
const progressPercent = computed(() => Math.round((enabledCount.value / store.modules.length) * 100))
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <span class="brand-mark"></span>
      <span class="brand-text">Resume Builder</span>
    </div>

    <p class="menu-caption">模块开关</p>

    <ul class="module-list">
      <li
        v-for="mod in store.modules"
        :key="mod.key"
        class="module-item"
        :class="{ active: mod.visible, muted: !mod.visible }"
      >
        <div class="module-info">
          <span class="module-icon">{{ mod.icon }}</span>
          <span class="module-label">{{ mod.label }}</span>
        </div>

        <label class="toggle-switch">
          <input
            type="checkbox"
            :checked="mod.visible"
            :aria-label="`${mod.label}开关`"
            @change="store.toggleModule(mod.key)"
          />
          <span class="toggle-slider"></span>
        </label>
      </li>
    </ul>

    <div class="profile-card">
      <div class="profile-name">你好，张同学</div>
      <div class="profile-meta">已完成度 {{ progressPercent }}%</div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <button class="continue-btn">继续编辑</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 272px;
  min-width: 272px;
  background: #efe7dc;
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border-right: 1px solid #dfd2c2;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 2px;
}

.brand-mark {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: #d97745;
}

.brand-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #2d2521;
}

.menu-caption {
  color: #8a7461;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  padding: 0 6px;
}

.module-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  background: #f2ece5;
  transition: all 0.18s ease;
}

.module-item.active {
  background: #ffffff;
  border-color: #e9ded0;
}

.module-item.muted {
  opacity: 0.9;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.module-icon {
  width: 18px;
  text-align: center;
  font-size: 14px;
  flex-shrink: 0;
}

.module-label {
  color: #2d2521;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #b8afa6;
  transition: 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #ffffff;
  transition: 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: #d97745;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.profile-card {
  margin-top: auto;
  padding: 12px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e9ded0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-name {
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
}

.profile-meta {
  color: #8a7461;
  font-size: 11px;
}

.progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: #e6d8ca;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #d97745;
  transition: width 0.25s ease;
}

.continue-btn {
  border: none;
  height: 34px;
  border-radius: 9px;
  background: #2d2521;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.continue-btn:hover {
  background: #1f1916;
}
</style>
