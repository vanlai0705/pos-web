import { cn } from '@/utils'
import { ChevronDown, Pencil, Plus, X } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface SelectBaseResult<T> {
  Items?: T[]
  TotalItemCount?: number
}

export interface SelectBaseProps<T> {
  value?: T | null
  onChange: (item: T | null) => void
  /** Stable identity for React keys / equality checks. */
  getId: (item: T) => number | string | undefined
  /** Trigger button label once an item is selected. */
  getLabel: (item: T) => string
  /** Row content inside the dropdown list — full control over layout (name, phone, code…). */
  renderItem: (item: T) => React.ReactNode
  /** Fetches one page of results; `pageIndex` is 0-based. */
  search: (args: { keyword: string; pageIndex: number; pageSize: number }) => Promise<SelectBaseResult<T>>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  pageSize?: number
  disabled?: boolean
  className?: string
  /** Show the "x" clear affordance when a value is selected (default true). */
  clearable?: boolean
  /**
   * 'sm' (default) matches the compact combos used inline in forms/order
   * panels (CustomerSelect, StaffSelect…). 'md' matches the taller, plain
   * lookup fields used in full-page dialogs (LookupSelect's original size).
   */
  size?: 'sm' | 'md'

  /** "Thêm" — omit to hide the add button entirely. */
  onAdd?: (e: React.MouseEvent) => void
  addTitle?: string

  /** Per-row "Sửa" — omit to hide the edit button entirely. */
  onEdit?: (e: React.MouseEvent, item: T) => void
  editTitle?: string

  /** "Danh sách" link to the full management page — omit to hide it. */
  onOpenList?: (e: React.MouseEvent) => void
  listLabel?: string
  listTitle?: string
}

/** Imperative handle so an owning "Thêm/Sửa" dialog can refresh the list after saving. */
export interface SelectBaseHandle {
  /** Re-runs the search with whatever keyword is currently typed. */
  refresh: () => void
}

function SelectBaseInner<T>({
  value,
  onChange,
  getId,
  getLabel,
  renderItem,
  search,
  placeholder,
  searchPlaceholder,
  emptyText,
  pageSize = 20,
  disabled,
  className,
  clearable = true,
  size = 'sm',
  onAdd,
  addTitle,
  onEdit,
  editTitle,
  onOpenList,
  listLabel,
  listTitle,
}: SelectBaseProps<T>, ref: React.Ref<SelectBaseHandle>) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('components.lookupSelect.selectPlaceholder')
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('components.lookupSelect.searchPlaceholder')
  const resolvedEmptyText = emptyText ?? t('components.lookupSelect.noResults')

  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const [items, setItems] = useState<T[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [total, setTotal] = useState(0)
  const [isFetching, setIsFetching] = useState(false)

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearTimeout(timer.current)
        setOpen(false)
        setKeyword('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // `page` 0 replaces the list (fresh keyword/open), further pages append —
  // lets the dropdown lazily load the full list on scroll instead of only
  // ever showing the first page of results.
  const runSearch = (kw: string, page = 0) => {
    setPageIndex(page)
    setIsFetching(true)
    search({ keyword: kw, pageIndex: page, pageSize })
      .then(res => {
        setTotal(res.TotalItemCount ?? 0)
        setItems(prev => (page === 0 ? res.Items ?? [] : [...prev, ...(res.Items ?? [])]))
      })
      .catch(() => {})
      .finally(() => setIsFetching(false))
  }

  const handleOpen = () => {
    if (disabled) return
    clearTimeout(timer.current)
    setOpen(true)
    runSearch('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSearch = (v: string) => {
    setKeyword(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => runSearch(v), 300)
  }

  const handleLoadMore = () => {
    if (isFetching || items.length >= total) return
    runSearch(keyword, pageIndex + 1)
  }

  const handleResultsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) handleLoadMore()
  }

  const handleSelect = (item: T) => {
    clearTimeout(timer.current)
    onChange(item)
    setOpen(false)
    setKeyword('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  useImperativeHandle(ref, () => ({
    refresh: () => runSearch(keyword),
  }))

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'

  return (
    <div ref={containerRef} className={cn('relative', size === 'sm' && 'flex-1', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg border border-input bg-background text-left transition-colors hover:bg-muted/30',
          size === 'sm' ? 'px-2.5 py-1.5' : 'h-9 rounded-md px-3',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('flex-1 truncate', size === 'sm' ? 'text-xs' : 'text-sm', !value && 'text-muted-foreground')}>
          {value ? getLabel(value) : resolvedPlaceholder}
        </span>
        {value && clearable && !disabled ? (
          <X className={cn(iconSize, 'text-muted-foreground/50 hover:text-destructive shrink-0')} onClick={handleClear} />
        ) : (
          <ChevronDown className={cn(iconSize, 'text-muted-foreground/50 shrink-0')} />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg">
          <div className="p-1.5 border-b flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={e => handleSearch(e.target.value)}
              placeholder={resolvedSearchPlaceholder}
              className={cn(
                'flex-1 min-w-0 bg-transparent px-2 py-1 focus:outline-none text-foreground placeholder:text-muted-foreground',
                size === 'sm' ? 'text-xs' : 'text-sm',
              )}
            />
            {onAdd && (
              <button type="button" onClick={onAdd} title={addTitle}
                className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            {onOpenList && (
              <button type="button" onClick={onOpenList} title={listTitle}
                className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors whitespace-nowrap">
                {listLabel}
              </button>
            )}
          </div>
          <div className={cn(size === 'sm' ? 'max-h-48' : 'max-h-56', 'overflow-y-auto')} onScroll={handleResultsScroll}>
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{resolvedEmptyText}</div>
            )}
            {items.map(item => (
              <div key={getId(item)} className="w-full flex items-center justify-between hover:bg-muted transition-colors group">
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex-1 min-w-0 text-left px-3 py-2 flex items-center justify-between gap-2',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                  )}
                >
                  {renderItem(item)}
                </button>
                {onEdit && (
                  <button type="button" onClick={e => onEdit(e, item)} title={editTitle}
                    className="shrink-0 mr-1.5 rounded p-1 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground hover:bg-background transition-colors">
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">{t('common.loading')}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Shared base for every search-to-pick combobox in the app (customer, staff,
 * supplier/reason/fund lookups…). Owns the parts that were previously copy-
 * pasted in each one: open/close + outside-click, debounced search, lazy
 * infinite-scroll pagination, and the trigger/dropdown chrome. Callers only
 * supply *what* to fetch and *how* to render a row/label — optionally wiring
 * up "Thêm" (add), per-row "Sửa" (edit) and a "Danh sách" (full list) link.
 * A ref exposes `refresh()` for callers that own their own add/edit dialog
 * and need the list to reflect a just-saved item.
 */
export const SelectBase = forwardRef(SelectBaseInner) as <T>(
  props: SelectBaseProps<T> & { ref?: React.Ref<SelectBaseHandle> }
) => ReturnType<typeof SelectBaseInner>
