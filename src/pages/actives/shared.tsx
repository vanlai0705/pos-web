import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { DataPagination } from '@/components/ui/data-pagination'
import { Search } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { translateKnownText, translateMenuTitle } from '@/i18n/nav-title-map'
export { StatusBadge } from '@/components/ui/status-badge'

// ─── Currency format ──────────────────────────────────────────────────────────

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

// ─── Default date range: last 30 days ────────────────────────────────────────

export function defaultDateFrom() {
  return dayjs().subtract(30, 'day').format('YYYY-MM-DD')
}
export function defaultDateTo() {
  return dayjs().format('YYYY-MM-DD')
}

// ─── DateRange filter ─────────────────────────────────────────────────────────

export function DateRangeFilter({
  from, to, onFrom, onTo,
}: {
  from: string; to: string
  onFrom: (v: string) => void; onTo: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={from} onChange={e => onFrom(e.target.value)} className="h-8 w-36 text-sm" />
      <span className="text-muted-foreground text-xs">—</span>
      <Input type="date" value={to} onChange={e => onTo(e.target.value)} className="h-8 w-36 text-sm" />
    </div>
  )
}

// ─── Search bar ───────────────────────────────────────────────────────────────

export function SearchBar({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={translateKnownText(placeholder, t) ?? t('common.search')}
        className="pl-8 h-8 w-52 text-sm"
      />
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/** 1-based pagination — thin wrapper so every list shares one look. */
export function Pagination({
  page, total, pageSize, onChange, onPageSizeChange,
}: {
  page: number; total: number; pageSize: number
  onChange: (p: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  return (
    <DataPagination
      page={page}
      total={total}
      pageSize={pageSize}
      onPageChange={onChange}
      onPageSizeChange={onPageSizeChange}
      hideWhenSingle
    />
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

export function SummaryCard({ label, value, currency = false }: { label: string; value?: number | null; currency?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="rounded-lg border bg-card px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{translateKnownText(label, t)}</span>
      <span className="text-base font-semibold tabular-nums">
        {currency ? fmtCurrency(value) : (value?.toLocaleString('vi-VN') ?? '—')}
      </span>
    </div>
  )
}

// ─── List page shell ──────────────────────────────────────────────────────────

export function ListPageHeader({
  title, icon: Icon, children,
}: {
  title: string; icon: React.ComponentType<{ className?: string }>; children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="sticky top-0 z-30 bg-background -mx-4 px-4 py-2 border-b mb-3 flex flex-wrap items-center gap-2">
      <h1 className="text-sm font-bold flex items-center gap-1.5 mr-auto shrink-0">
        <Icon className="w-4 h-4 text-primary" />
        {translateMenuTitle(title, t)}
      </h1>
      {children && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── useListFilter hook ───────────────────────────────────────────────────────

export function useListFilter(initDateFrom?: string, initDateTo?: string) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(initDateFrom ?? defaultDateFrom())
  const [dateTo, setDateTo] = useState(initDateTo ?? defaultDateTo())

  const goPage = useCallback((p: number) => setPage(p), [])
  const onKeyword = useCallback((v: string) => { setKeyword(v); setPage(1) }, [])
  const onDateFrom = useCallback((v: string) => { setDateFrom(v); setPage(1) }, [])
  const onDateTo = useCallback((v: string) => { setDateTo(v); setPage(1) }, [])
  // Changing size shifts every row, so start over from page 1.
  const onPageSize = useCallback((s: number) => { setPageSize(s); setPage(1) }, [])

  return {
    keyword, setKeyword: onKeyword,
    page, goPage,
    pageSize, setPageSize: onPageSize,
    dateFrom, setDateFrom: onDateFrom,
    dateTo, setDateTo: onDateTo,
  }
}

export const PAGE_SIZE = 15
