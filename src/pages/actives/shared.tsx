import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DataPagination } from '@/components/ui/data-pagination'
import { CalendarRange, Search } from 'lucide-react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { translateKnownText, translateMenuTitle } from '@/i18n/nav-title-map'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export { StatusBadge } from '@/components/ui/status-badge'

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

export function toUtcStartOfDay(value: string | Date | dayjs.Dayjs) {
  const date = dayjs(value)
  return date.isValid() ? date.startOf('day').toISOString() : ''
}

export function toUtcEndOfDay(value: string | Date | dayjs.Dayjs) {
  const date = dayjs(value)
  return date.isValid() ? date.endOf('day').toISOString() : ''
}

export function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : ''
}

export function defaultDateFrom() {
  return toUtcStartOfDay(dayjs().subtract(30, 'day'))
}
export function defaultDateTo() {
  return toUtcEndOfDay(dayjs())
}

// ─── DateRange filter ─────────────────────────────────────────────────────────

type DateRange = { from: string; to: string }

function startOfBusinessWeek(date = dayjs()) {
  const offset = (date.day() + 6) % 7
  return date.subtract(offset, 'day').startOf('day')
}

function utcRange(from: dayjs.Dayjs, to: dayjs.Dayjs): DateRange {
  return { from: toUtcStartOfDay(from), to: toUtcEndOfDay(to) }
}

function rangeForQuarter(year: number, quarter: number): DateRange {
  const start = dayjs(`${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01`)
  return utcRange(start, start.add(2, 'month').endOf('month'))
}

function applyRange(range: DateRange, onFrom: (v: string) => void, onTo: (v: string) => void) {
  onFrom(range.from)
  onTo(range.to)
}

function DateRangePresetPicker({ onFrom, onTo, compact = false, disablePortal = false }: {
  onFrom: (v: string) => void
  onTo: (v: string) => void
  compact?: boolean
  disablePortal?: boolean
}) {
  const { t } = useTranslation()
  const now = dayjs()
  const yesterdayDate = now.subtract(1, 'day')
  const weekStart = startOfBusinessWeek(now)
  const lastWeekStart = weekStart.subtract(1, 'week')
  const monthItems = Array.from({ length: 12 }, (_, i) => {
    const start = dayjs(`${now.year()}-${String(i + 1).padStart(2, '0')}-01`)
    return {
      label: t('common.datePresets.monthNumber', { month: i + 1 }),
      range: utcRange(start, start.endOf('month')),
    }
  })
  const quarterItems = Array.from({ length: 4 }, (_, i) => ({
    label: t('common.datePresets.quarterNumber', { quarter: i + 1 }),
    range: rangeForQuarter(now.year(), i + 1),
  }))
  const presets = [
    { key: 'beforeToday', range: { from: '', to: toUtcEndOfDay(yesterdayDate) } },
    { key: 'today', range: utcRange(now, now) },
    { key: 'yesterday', range: utcRange(yesterdayDate, yesterdayDate) },
    { key: 'thisWeek', range: utcRange(weekStart, weekStart.add(6, 'day')) },
    { key: 'lastWeek', range: utcRange(lastWeekStart, lastWeekStart.add(6, 'day')) },
    { key: 'thisMonth', range: utcRange(now.startOf('month'), now.endOf('month')) },
    { key: 'lastMonth', range: utcRange(now.subtract(1, 'month').startOf('month'), now.subtract(1, 'month').endOf('month')) },
  ]
  const tailPresets = [
    { key: 'thisQuarter', range: rangeForQuarter(now.year(), Math.floor(now.month() / 3) + 1) },
    { key: 'lastQuarter', range: rangeForQuarter(now.subtract(3, 'month').year(), Math.floor(now.subtract(3, 'month').month() / 3) + 1) },
    { key: 'thisYear', range: utcRange(now.startOf('year'), now.endOf('year')) },
    { key: 'lastYear', range: utcRange(now.subtract(1, 'year').startOf('year'), now.subtract(1, 'year').endOf('year')) },
  ]
  const selectRange = (range: DateRange) => applyRange(range, onFrom, onTo)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={compact ? 'h-8 w-8 shrink-0' : 'h-8 w-8 shrink-0'}
          title={t('common.datePresets.title')}
        >
          <CalendarRange className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" disablePortal={disablePortal} className="z-[70] w-56 p-2">
        {presets.map(preset => (
          <DropdownMenuItem
            key={preset.key}
            className="px-3 py-2 text-sm font-semibold"
            onSelect={() => selectRange(preset.range)}
          >
            {t(`common.datePresets.${preset.key}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-3 py-2 text-sm font-semibold">
            {t('common.datePresets.month')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent disablePortal={disablePortal} className="z-[70] max-h-80 overflow-y-auto">
            {monthItems.map(item => (
              <DropdownMenuItem key={item.label} onSelect={() => selectRange(item.range)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {tailPresets.slice(0, 2).map(preset => (
          <DropdownMenuItem
            key={preset.key}
            className="px-3 py-2 text-sm font-semibold"
            onSelect={() => selectRange(preset.range)}
          >
            {t(`common.datePresets.${preset.key}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="px-3 py-2 text-sm font-semibold">
            {t('common.datePresets.quarter')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent disablePortal={disablePortal} className="z-[70]">
            {quarterItems.map(item => (
              <DropdownMenuItem key={item.label} onSelect={() => selectRange(item.range)}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {tailPresets.slice(2).map(preset => (
          <DropdownMenuItem
            key={preset.key}
            className="px-3 py-2 text-sm font-semibold"
            onSelect={() => selectRange(preset.range)}
          >
            {t(`common.datePresets.${preset.key}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-3 py-2 text-sm font-semibold" onSelect={() => selectRange({ from: '', to: '' })}>
          {t('common.all')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function DateRangeFilter({
  from, to, onFrom, onTo, compact = false, disablePortal = false,
}: {
  from: string; to: string
  onFrom: (v: string) => void; onTo: (v: string) => void
  compact?: boolean
  disablePortal?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <DateRangePresetPicker onFrom={onFrom} onTo={onTo} compact={compact} disablePortal={disablePortal} />
      <Input
        type="date"
        value={toDateInputValue(from)}
        onChange={e => onFrom(e.target.value ? toUtcStartOfDay(e.target.value) : '')}
        className={compact ? 'h-8 w-[140px] text-xs' : 'h-8 w-36 text-sm'}
      />
      <span className="text-muted-foreground text-xs">—</span>
      <Input
        type="date"
        value={toDateInputValue(to)}
        onChange={e => onTo(e.target.value ? toUtcEndOfDay(e.target.value) : '')}
        className={compact ? 'h-8 w-[140px] text-xs' : 'h-8 w-36 text-sm'}
      />
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
