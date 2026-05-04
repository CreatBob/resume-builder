// author: jf
import type { AwardEntry } from '@/stores/resume'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function htmlToPlainText(html: string): string {
  if (!html) return ''

  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function awardHasContent(award: Pick<AwardEntry, 'name' | 'description' | 'date'>): boolean {
  return Boolean(award.name.trim() || award.date.trim() || htmlToPlainText(award.description).trim())
}

export function awardContentHtml(award: Pick<AwardEntry, 'name' | 'description'>): string {
  const name = award.name.trim()
  const description = award.description.trim()
  if (!description) return escapeHtml(name)
  if (!name) return description

  const descriptionText = htmlToPlainText(description)
  if (descriptionText.includes(name)) return description

  return `${escapeHtml(name)}<br>${description}`
}
