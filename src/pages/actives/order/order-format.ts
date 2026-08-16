export function fmtCurrency(val?: number | null) {
  if (val == null) return '-'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

export function fmt(val?: number | null) {
  if (val == null || val === 0) return '0'
  return val.toLocaleString('vi-VN')
}

export function normalizeName(name?: string) {
  return (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim()
}
