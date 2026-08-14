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
