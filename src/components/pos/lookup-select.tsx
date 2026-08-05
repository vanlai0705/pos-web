import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils'
import { useLazyFilterReportQuery } from '@/store/slice/users/api/api'

export interface LookupItem {
  Id?: number
  Name?: string
  [key: string]: unknown
}

interface LookupSelectProps<T extends LookupItem> {
  /** A filter-simple style endpoint returning `{ Items, TotalItemCount }` */
  endpoint: string
  value?: T | null
  onChange: (item: T | null) => void
  placeholder?: string
  /** Extra query params, e.g. `{ Type: 0 }` to scope reasons to reward/punish */
  params?: Record<string, unknown>
  /** Secondary line under the name (phone, code…) */
  subtitle?: (item: T) => string | undefined
  disabled?: boolean
  className?: string
}

/**
 * Click-to-open searchable picker shared by every lookup combobox. The list is
 * fetched on open (and debounced while typing) so the page does not pay for
 * lookups the user never touches.
 */
export function LookupSelect<T extends LookupItem>({
  endpoint, value, onChange, placeholder, params, subtitle, disabled, className,
}: LookupSelectProps<T>) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('components.lookupSelect.selectPlaceholder')
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const [search, { data, isFetching }] = useLazyFilterReportQuery()
  const items = ((data as { Items?: T[] } | undefined)?.Items ?? []) as T[]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setKeyword('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const run = (kw: string) =>
    search({ path: endpoint, params: { PageIndex: 0, PageSize: 50, Keyword: kw, ...params } })

  const handleOpen = () => {
    if (disabled) return
    setOpen(true)
    run('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleSearch = (v: string) => {
    setKeyword(v)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => run(v), 300)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm transition-colors',
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/30',
        )}
      >
        <span className={cn('flex-1 truncate', !value && 'text-muted-foreground')}>
          {value?.Name || resolvedPlaceholder}
        </span>
        {value && !disabled ? (
          <X
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 hover:text-destructive"
            onClick={e => { e.stopPropagation(); onChange(null) }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-popover shadow-lg">
          <div className="border-b p-1.5">
            <input
              ref={inputRef}
              value={keyword}
              onChange={e => handleSearch(e.target.value)}
              placeholder={t('components.lookupSelect.searchPlaceholder')}
              className="w-full bg-transparent px-2 py-1 text-sm focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">{t('common.loading')}</div>}
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{t('components.lookupSelect.noResults')}</div>
            )}
            {items.map(item => (
              <button
                key={item.Id}
                type="button"
                onClick={() => { onChange(item); setOpen(false); setKeyword('') }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <span className="truncate font-medium">{item.Name}</span>
                {subtitle?.(item) && (
                  <span className="ml-2 shrink-0 text-xs text-muted-foreground">{subtitle(item)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
