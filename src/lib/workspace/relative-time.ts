/**
 * Format a date string as relative time (e.g., "刚刚", "3分钟前", "2小时前")
 */
export function formatRelativeTime(dateString: string, locale: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diffMs = now - date

  if (diffMs < 0) {
    return locale === 'zh' ? '刚刚' : 'just now'
  }

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (locale === 'zh') {
    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    if (weeks < 4) return `${weeks}周前`
    if (months < 12) return `${months}个月前`
    return `${Math.floor(days / 365)}年前`
  }

  // English
  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (weeks < 4) return `${weeks}w ago`
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
