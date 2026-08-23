import dayjs from 'dayjs'

type DateInput = string | Date | dayjs.Dayjs

export function parseNumber(value?: string | number | null) {
  if (value == null || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return Number(`${value}`.replace(/,/g, '').replace(/\s/g, '')) || 0
}

export function numberValue(value?: string | number | null) {
  return parseNumber(value)
}

export function formatNumber(value?: number | null, locale = 'vi-VN') {
  return Number(value || 0).toLocaleString(locale)
}

export function formatMoney(value?: number | null, locale = 'vi-VN') {
  return Number(value || 0).toLocaleString(locale)
}

export const formatMony = formatMoney

export function fmtCurrency(val?: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

export function fmtDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD/MM/YYYY')
}

export function fmtDateTime(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD/MM/YYYY HH:mm')
}

export function toUtcStartOfDay(value: DateInput) {
  const date = dayjs(value)
  return date.isValid() ? date.startOf('day').toISOString() : ''
}

export function toUtcEndOfDay(value: DateInput) {
  const date = dayjs(value)
  return date.isValid() ? date.endOf('day').toISOString() : ''
}

export function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : ''
}

export function toDisplayDate(isoDate?: string | null) {
  if (!isoDate) return ''
  const date = dayjs(isoDate)
  return date.isValid() ? date.format('DD/MM/YYYY') : isoDate
}

/**
 * Some update/create payloads expect Date as a full datetime, not a bare
 * YYYY-MM-DD. Keeps the exact calendar date the caller picked -- no `Z`/
 * timezone conversion, so it can't shift to a different day.
 */
export function toDateTimeValue(dateOnly?: string | null) {
  if (!dateOnly) return dateOnly
  return dateOnly.includes('T') ? dateOnly : `${dateOnly}T00:00:00`
}

/**
 * Clamps a YYYY-MM-DD value against an optional min/max bound, calling
 * `onViolation` with a ready-to-show Vietnamese message when it had to
 * clamp. The native `<input type="date" min max>` already blocks most of
 * this via the picker UI, but manual typing can still bypass it -- this is
 * the explicit, always-enforced fallback (mirrors the Angular view-datetime
 * min/minAlertMessage behavior).
 */
export function clampDateWithinBounds(
  value: string,
  bounds: { min?: string | null; max?: string | null },
  onViolation: (message: string) => void,
): string {
  if (bounds.max && value > bounds.max) {
    onViolation(`Không được chọn ngày sau ${toDisplayDate(bounds.max)}`)
    return bounds.max
  }

  if (bounds.min && value < bounds.min) {
    onViolation(`Không được chọn ngày trước ${toDisplayDate(bounds.min)}`)
    return bounds.min
  }

  return value
}
