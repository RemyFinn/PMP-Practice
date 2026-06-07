export function letters(value) {
  return Array.from(new Set(String(value || '').toUpperCase().match(/[A-F]/g) || [])).sort()
}

export function formatElapsed(seconds = 0) {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export function formatSpent(seconds) {
  if (seconds === null || seconds === undefined) return '未记录'
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  if (safeSeconds < 60) return `${safeSeconds} 秒`
  const minutes = Math.floor(safeSeconds / 60)
  const rest = safeSeconds % 60
  return rest ? `${minutes} 分 ${rest} 秒` : `${minutes} 分`
}

export function formatDateTime(value) {
  if (!value) return '暂无'
  const date = new Date(String(value).replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
