<script setup lang="ts">
import { useResumeStore } from '@/stores/resume'
import { ref } from 'vue'

const store = useResumeStore()
const collapsed = ref(false)

const handleKeyDown = (e: KeyboardEvent, moduleKey: string) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    store.toggleModule(moduleKey)
  }
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <div class="logo" v-show="!collapsed">
        <svg class="logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="11" x2="12" y2="17"/>
          <line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
        <span class="logo-text">我的简历</span>
      </div>
      <button
        class="collapse-btn"
        @click="collapsed = !collapsed"
        :title="collapsed ? '展开菜单' : '收起菜单'"
        :aria-label="collapsed ? '展开菜单' : '收起菜单'"
        :aria-expanded="!collapsed"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" :style="{ transform: collapsed ? 'rotate(180deg)' : '' }">
          <path d="M10 4L6 8L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <div class="sidebar-content" v-show="!collapsed">
      <div class="section-title">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
        </svg>
        <span>模块选择</span>
      </div>

      <ul class="module-list">
        <li
          v-for="mod in store.modules"
          :key="mod.key"
          class="module-item"
          :class="{ active: mod.visible }"
        >
          <div class="module-info">
            <span class="module-icon" :aria-hidden="true">{{ mod.icon }}</span>
            <span class="module-label">{{ mod.label }}</span>
          </div>
          <label class="toggle-switch" :for="'toggle-' + mod.key">
            <input
              :id="'toggle-' + mod.key"
              type="checkbox"
              :checked="mod.visible"
              @change="store.toggleModule(mod.key)"
              @keydown="handleKeyDown($event, mod.key)"
              :aria-label="`${mod.label} - ${mod.visible ? '已启用' : '已禁用'}`"
            />
            <span class="toggle-slider"></span>
          </label>
        </li>
      </ul>
    </div>

    <!-- Collapsed: show only icons -->
    <div class="sidebar-collapsed-icons" v-show="collapsed">
      <div
        v-for="mod in store.modules"
        :key="mod.key"
        class="collapsed-icon"
        :class="{ active: mod.visible }"
        :title="mod.label"
        @click="store.toggleModule(mod.key)"
        @keydown="handleKeyDown($event, mod.key)"
        role="button"
        tabindex="0"
        :aria-label="`${mod.label} - ${mod.visible ? '已启用' : '已禁用'}`"
      >
        {{ mod.icon }}
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-width: 220px;
  background: var(--bg-sidebar);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  overflow-y: auto;
  transition: width var(--transition-base), min-width var(--transition-base);
}

.sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

.sidebar-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
  padding: var(--spacing-lg) var(--spacing-sm);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--primary-500);
  flex-shrink: 0;
}

.logo-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-inverse);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.collapse-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: var(--gray-400);
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.collapse-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.collapse-btn:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.collapse-btn svg {
  transition: transform var(--transition-base);
}

.sidebar-content {
  padding: var(--spacing-lg);
  flex: 1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--gray-400);
  font-size: 0.78rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--spacing-md);
  padding: 0 var(--spacing-xs);
}

.module-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.module-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  cursor: default;
  border: 1px solid transparent;
}

.module-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.module-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.module-item:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(59, 130, 246, 0.3);
}

.module-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.module-icon {
  font-size: 1rem;
  width: 20px;
  text-align: center;
}

.module-label {
  color: var(--gray-200);
  font-size: 0.88rem;
  font-weight: 400;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch input:focus-visible + .toggle-slider {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--gray-600);
  border-radius: var(--radius-full);
  transition: var(--transition-base);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background: white;
  border-radius: 50%;
  transition: var(--transition-base);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--primary-500);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(16px);
}

/* Collapsed Icons */
.sidebar-collapsed-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-sm);
  gap: 4px;
}

.collapsed-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  font-size: 1.1rem;
  cursor: pointer;
  transition: all var(--transition-fast);
  opacity: 0.4;
  border: 1px solid transparent;
}

.collapsed-icon:hover {
  background: rgba(255, 255, 255, 0.15);
  opacity: 1;
}

.collapsed-icon:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}

.collapsed-icon.active {
  opacity: 1;
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}
</style>
