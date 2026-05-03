<!-- author: jf -->
# Preview Layout Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move resume layout controls from the left editor area into the right preview toolbar with a spacing popover and a separate line-height dropdown.

**Architecture:** Keep `stores/resume.ts` as the single source of truth for layout settings. Reuse `LayoutSettingsPanel.vue` as a compact spacing popover body, and let `PreviewPanel.vue` own toolbar trigger state, outside-click closing, and line-height preset selection.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vite, scoped CSS.

---

## File Structure

- Modify `src/components/resume/EditorPanel.vue`: remove the left-side `LayoutSettingsPanel` import and usage.
- Modify `src/components/resume/LayoutSettingsPanel.vue`: make the panel compact for a floating toolbar popover while preserving existing store update behavior.
- Modify `src/components/resume/PreviewPanel.vue`: add spacing popover state, line-height dropdown state, toolbar buttons, and styles.
- Modify `docs/requirements/2026-05-03-preview-layout-settings.md`: mark task and acceptance statuses as implementation progresses.

## Task 1: Remove Left-Side Layout Panel

**Files:**
- Modify: `src/components/resume/EditorPanel.vue`

- [ ] Step 1: Remove `LayoutSettingsPanel` import from `EditorPanel.vue`.
- [ ] Step 2: Remove `<LayoutSettingsPanel />` from the editor template.
- [ ] Step 3: Keep editor stats, info editor, import, save, and AI panel behavior unchanged.

## Task 2: Compact Spacing Panel

**Files:**
- Modify: `src/components/resume/LayoutSettingsPanel.vue`

- [ ] Step 1: Keep `RESUME_LAYOUT_LIMITS`, `useResumeStore`, `ResumeLayoutSettingKey`, and reset behavior unchanged.
- [ ] Step 2: Remove the large explanatory subtitle and group wrapper styling that made the panel look like a left-side card.
- [ ] Step 3: Render only spacing controls in the popover: page top/left/right margin, module top/bottom margin, and title-content gap.
- [ ] Step 4: Exclude `contentLineHeight` from this component because line-height is handled by the new dropdown.

## Task 3: Add Preview Toolbar Spacing Popover

**Files:**
- Modify: `src/components/resume/PreviewPanel.vue`

- [ ] Step 1: Import `LayoutSettingsPanel`.
- [ ] Step 2: Add `layoutMenuOpen` and `layoutMenuRef` refs.
- [ ] Step 3: Add an `间距配置` button beside template controls.
- [ ] Step 4: Render the compact `LayoutSettingsPanel` in an absolutely positioned popover under the button.
- [ ] Step 5: Update the existing document pointer-down handler so outside clicks close export, spacing, and line-height menus.

## Task 4: Add Line-Height Dropdown

**Files:**
- Modify: `src/components/resume/PreviewPanel.vue`

- [ ] Step 1: Add line-height preset values using existing `contentLineHeight` constraints.
- [ ] Step 2: Add `lineHeightMenuOpen` and `lineHeightMenuRef` refs.
- [ ] Step 3: Add a `行距` button beside `间距配置`.
- [ ] Step 4: Render a dropdown with preset options and selected-state styling.
- [ ] Step 5: On option click, call `store.updateLayoutSetting('contentLineHeight', preset.value)`.

## Task 5: Verify

**Files:**
- Modify: `docs/requirements/2026-05-03-preview-layout-settings.md`

- [ ] Step 1: Run `npm run type-check`; expected result: command exits 0.
- [ ] Step 2: Run `npm run build-only`; expected result: command exits 0.
- [ ] Step 3: Start or reuse `npm run dev`.
- [ ] Step 4: Use Playwright to verify the preview toolbar buttons, spacing popover, line-height dropdown, outside-click closing, and absence of the left-side layout panel.
- [ ] Step 5: Update requirement document task statuses and acceptance results.
