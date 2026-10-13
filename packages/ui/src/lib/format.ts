const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const relativeFmt = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function parse(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined
  // Date-only values (YYYY-MM-DD) are calendar dates: don't shift them by time zone.
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function formatDate(value: string | Date | undefined, fallback = '—'): string {
  const d = parse(value)
  return d ? dateFmt.format(d) : fallback
}

export function formatDateTime(value: string | Date | undefined, fallback = '—'): string {
  const d = parse(value)
  return d ? dateTimeFmt.format(d) : fallback
}

/** "3 hours ago", "yesterday", "in 2 days". */
export function timeAgo(value: string | Date | undefined, now = new Date(), fallback = '—'): string {
  const d = parse(value)
  if (!d) return fallback
  const seconds = (d.getTime() - now.getTime()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeFmt.format(Math.round(seconds / size), unit)
  }
  return relativeFmt.format(Math.round(seconds), 'second')
}

/** Today's date as YYYY-MM-DD in local time (for date inputs / date-only columns). */
export function todayIso(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
