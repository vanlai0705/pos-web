import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'

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

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status?: { Id?: number; Name?: string } }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  const id = status.Id ?? 0
  const variant =
    id === 1 ? 'default' :
    id === 2 ? 'secondary' :
    id === 4 ? 'destructive' : 'outline'
  return <Badge variant={variant} className="text-xs">{status.Name ?? '—'}</Badge>
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
  value, onChange, placeholder = 'Tìm kiếm...',
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 h-8 w-52 text-sm"
      />
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  page, total, pageSize, onChange,
}: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void
}) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
      <span>{total} kết quả</span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="px-2">{page} / {totalPages}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

export function SummaryCard({ label, value, currency = false }: { label: string; value?: number | null; currency?: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
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
  return (
    <div className="sticky top-0 z-30 bg-background -mx-4 px-4 py-2 border-b mb-3 flex flex-wrap items-center gap-2">
      <h1 className="text-sm font-bold flex items-center gap-1.5 mr-auto shrink-0">
        <Icon className="w-4 h-4 text-primary" />
        {title}
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
  const [dateFrom, setDateFrom] = useState(initDateFrom ?? defaultDateFrom())
  const [dateTo, setDateTo] = useState(initDateTo ?? defaultDateTo())

  const goPage = useCallback((p: number) => setPage(p), [])
  const onKeyword = useCallback((v: string) => { setKeyword(v); setPage(1) }, [])
  const onDateFrom = useCallback((v: string) => { setDateFrom(v); setPage(1) }, [])
  const onDateTo = useCallback((v: string) => { setDateTo(v); setPage(1) }, [])

  return { keyword, setKeyword: onKeyword, page, goPage, dateFrom, setDateFrom: onDateFrom, dateTo, setDateTo: onDateTo }
}

export const PAGE_SIZE = 15
