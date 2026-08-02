import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, FileSpreadsheet, ChevronDown, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import dayjs from 'dayjs'
import {
  useLazyFilterCustomersQuery,
  useGetUserShopSettingQuery,
  useGetProductGroupsSimpleQuery,
} from '@/store/slice/users/api/api'

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtNum(val?: number | null) {
  if (val == null) return '0'
  return new Intl.NumberFormat('vi-VN').format(val)
}

export function fmtDateR(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD/MM/YYYY HH:mm')
}

export function fmtDateOnly(dateStr?: string | null) {
  if (!dateStr) return '—'
  return dayjs(dateStr).format('DD/MM/YYYY')
}

export function currentMonthRange() {
  const now = new Date()
  return {
    from: dayjs(now).startOf('month').format('YYYY-MM-DD'),
    to: dayjs(now).endOf('month').format('YYYY-MM-DD'),
  }
}

export const REPORT_PAGE_SIZE = 100

// ─── Summary cards ────────────────────────────────────────────────────────────

type Tone = 'sky' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'violet' | 'pink' | 'cyan'

const TONE: Record<Tone, string> = {
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

export function StatCards({ cards }: {
  cards: { title: string; value: number; tone: Tone }[]
}) {
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      {cards.map(c => (
        <div key={c.title} className={`flex flex-col px-3 py-1.5 rounded-lg border ${TONE[c.tone]}`}>
          <span className="text-[10px] opacity-70 whitespace-nowrap">{c.title}</span>
          <span className="font-bold text-sm leading-tight">{fmtNum(c.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Date range filter ────────────────────────────────────────────────────────

export function ReportDateFilter({
  from, to, onFrom, onTo,
}: {
  from: string; to: string
  onFrom: (v: string) => void; onTo: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="date"
        value={from}
        onChange={e => onFrom(e.target.value)}
        className="h-8 w-[140px] text-xs"
      />
      <span className="text-slate-400 text-xs shrink-0">—</span>
      <Input
        type="date"
        value={to}
        onChange={e => onTo(e.target.value)}
        className="h-8 w-[140px] text-xs"
      />
    </div>
  )
}

// ─── Sub-tab bar ──────────────────────────────────────────────────────────────

export function ReportTabs({ tabs, active, onSelect }: {
  tabs: string[]; active: number; onSelect: (i: number) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onSelect(i)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
            active === i
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-sky-50'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────

export function TH({ children, right = false, center = false }: {
  children: React.ReactNode; right?: boolean; center?: boolean
}) {
  return (
    <th className={`px-2 py-2 text-[11px] font-semibold text-slate-600 whitespace-nowrap bg-slate-100 border-b border-slate-200 sticky top-0 ${
      right ? 'text-right' : center ? 'text-center' : 'text-left'
    }`}>
      {children}
    </th>
  )
}

export function TD({ children, right = false, center = false, bold = false, className = '' }: {
  children: React.ReactNode; right?: boolean; center?: boolean; bold?: boolean; className?: string
}) {
  return (
    <td className={`px-2 py-1.5 text-xs text-slate-700 ${
      right ? 'text-right' : center ? 'text-center' : ''
    } ${bold ? 'font-semibold' : ''} ${className}`}>
      {children}
    </td>
  )
}

export function TableNoData({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-16 text-sm text-slate-400">
        Không có dữ liệu
      </td>
    </tr>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function ReportPagination({ page, total, pageSize, onPage }: {
  page: number; total: number; pageSize: number; onPage: (p: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between px-2 py-1.5 shrink-0 border-t border-slate-100 bg-slate-50/50">
      <span className="text-xs text-slate-500">Tổng: <strong>{total}</strong> dòng</span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            disabled={page === 0} onClick={() => onPage(page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-slate-600 w-16 text-center">{page + 1} / {totalPages}</span>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0"
            disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Excel export button ──────────────────────────────────────────────────────

export function ExcelBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={onClick}>
      <FileSpreadsheet className="h-3.5 w-3.5" />
      Xuất Excel
    </Button>
  )
}

// ─── Loading skeleton rows ────────────────────────────────────────────────────

export function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-2 py-2">
              <div className="h-3 bg-slate-200 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ─── CustomerFilter ───────────────────────────────────────────────────────────

export function CustomerFilter({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const [trigger, { data, isFetching }] = useLazyFilterCustomersQuery()

  useEffect(() => {
    if (open) trigger({ PageSize: 15, PageIndex: 0, Search: search })
  }, [open, search, trigger])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const items = data?.Items ?? []

  const handleSelect = (id: number, name: string) => {
    onChange(id)
    setSelectedName(name)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setSelectedName('')
    setSearch('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-8 min-w-[180px] flex items-center gap-1.5 px-2.5 rounded-md border border-slate-300 bg-white text-xs text-slate-700 hover:border-slate-400 transition-colors"
      >
        <span className="flex-1 text-left truncate">
          {selectedName || <span className="text-slate-400">Khách hàng</span>}
        </span>
        {value ? (
          <X className="h-3 w-3 shrink-0 text-slate-400 hover:text-slate-600" onClick={handleClear} />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-[240px] bg-white border border-slate-200 rounded-md shadow-lg">
          <div className="p-1.5 border-b border-slate-100">
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên / số điện thoại..."
              className="h-7 text-xs"
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {isFetching ? (
              <div className="px-3 py-2 text-xs text-slate-400">Đang tìm...</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy</div>
            ) : (
              items.map(c => (
                <button
                  key={c.Id}
                  type="button"
                  onClick={() => handleSelect(c.Id!, c.Name)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-sky-50 text-slate-700"
                >
                  <div className="font-medium">{c.Name}</div>
                  {c.Phone && <div className="text-slate-400">{c.Phone}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ShopFilter ───────────────────────────────────────────────────────────────

export function ShopFilter({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { data: setting } = useGetUserShopSettingQuery()
  const shops = setting?.Shops ?? []

  if (shops.length <= 1) return null

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:border-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
    >
      <option value="">Tất cả chi nhánh</option>
      {shops.map(s => (
        <option key={s.Id} value={s.Id}>{s.Name}</option>
      ))}
    </select>
  )
}

// ─── ProductGroupFilter ───────────────────────────────────────────────────────

export function ProductGroupFilter({
  value,
  onChange,
}: {
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { data: groups = [] } = useGetProductGroupsSimpleQuery()

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:border-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-sky-500"
    >
      <option value="">Tất cả nhóm hàng</option>
      {groups.map(g => (
        <option key={g.Id} value={g.Id}>{g.Name}</option>
      ))}
    </select>
  )
}
