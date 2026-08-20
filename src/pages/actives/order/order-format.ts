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

/** 0=Cash, 1=Card, 2=Transfer, 3=Wallet — mirrors pos_web's currency.constant.ts. */
export const FUND_GROUP = { CASH: 0, CARD: 1, TRANSFER: 2, WALLET: 3 } as const

export type FundKind = 'cash' | 'card' | 'transfer'

/**
 * Cash/Card/Transfer classification for a fund type. `FundGroup` (a real,
 * persisted field on every fund type) is authoritative — prefer it over
 * matching on Name, which breaks for any fund type not literally named
 * "Tiền mặt"/"Chuyển khoản"/etc. Business rule: anything besides Cash and
 * Card (including Wallet) counts as Transfer.
 */
export function classifyFundType(fundType?: { FundGroup?: number; Name?: string } | null): FundKind {
  if (!fundType) return 'cash'
  const group = fundType.FundGroup
  if (group != null) {
    if (group === FUND_GROUP.CASH) return 'cash'
    if (group === FUND_GROUP.CARD) return 'card'
    return 'transfer'
  }
  const name = normalizeName(fundType.Name)
  if (name === 'tien mat' || name === 'cash') return 'cash'
  if (name === 'ca the' || name === 'card') return 'card'
  if (name === 'chuyen khoan' || name === 'transfer' || name === 'bank transfer') return 'transfer'
  return 'cash'
}
