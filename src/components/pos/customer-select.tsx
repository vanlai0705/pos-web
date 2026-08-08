import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Pencil, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils'
import { withDomainPath } from '@/utils/domain-route'
import {
  useLazyFilterCustomersSimpleQuery,
  useLazyGetCustomerDetailQuery,
  useGetCustomerGroupsSimpleQuery,
  useSaveCustomerMutation,
} from '@/store/slice/users/api/api'
import type { TPosCustomer, TPosCustomerSimple } from '@/store/slice/users/types/pos-types'
import { CustomerDialog, emptyCustomer, buildCustomerPayload } from './customer-form-dialog'

interface CustomerSelectProps {
  value?: TPosCustomerSimple | null
  onChange: (customer: TPosCustomerSimple | null) => void
  placeholder?: string
  className?: string
}

export function CustomerSelect({
  value,
  onChange,
  placeholder,
  className,
}: CustomerSelectProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('components.customerSelect.placeholder')
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const PAGE_SIZE = 20
  const [search, { isFetching }] = useLazyFilterCustomersSimpleQuery()
  const [items, setItems] = useState<TPosCustomerSimple[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [total, setTotal] = useState(0)

  // Inline "Thêm"/"Sửa" — mirrors Angular's view-combobox enableAdd/enableEdit,
  // which reuse the exact same detail dialog as the full Customers list page.
  const { data: groups = [] } = useGetCustomerGroupsSimpleQuery()
  const [getCustomerDetail] = useLazyGetCustomerDetailQuery()
  const [saveCustomer, { isLoading: saving }] = useSaveCustomerMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TPosCustomer>(emptyCustomer())

  // close on outside click
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
  // ever showing the first 10 results.
  const runSearch = (v: string, page = 0) => {
    setPageIndex(page)
    search({ Keyword: v, PageIndex: page, PageSize: PAGE_SIZE }).unwrap().then(res => {
      setTotal(res.TotalItemCount ?? 0)
      setItems(prev => (page === 0 ? res.Items ?? [] : [...prev, ...(res.Items ?? [])]))
    }).catch(() => {})
  }

  const handleOpen = () => {
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

  const handleSelect = (item: TPosCustomerSimple) => {
    clearTimeout(timer.current)
    onChange(item)
    setOpen(false)
    setKeyword('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setForm(emptyCustomer())
    setDialogOpen(true)
  }

  const openEdit = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation()
    if (!id) return
    try {
      const detail = await getCustomerDetail(id).unwrap()
      setForm({ ...emptyCustomer(), ...detail })
      setDialogOpen(true)
    } catch {
      toast.error(t('components.customerSelect.loadDetailError'))
    }
  }

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(withDomainPath('/actives/customers'), '_blank')
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) {
      toast.error(t('components.customerSelect.nameRequired'))
      return
    }
    const isNew = !form.Id
    try {
      const saved = await saveCustomer(buildCustomerPayload(form)).unwrap()
      toast.success(isNew ? t('components.customerSelect.addSuccess') : t('components.customerSelect.updateSuccess'))
      setDialogOpen(false)
      runSearch(keyword)
      // A brand-new customer gets auto-selected (Angular's addChange); an edit
      // of the currently-picked one refreshes the trigger label too.
      const savedId = saved?.Id ?? form.Id
      if (isNew && savedId) onChange({ Id: savedId, Name: form.Name, Phone: form.Phone } as TPosCustomerSimple)
      else if (savedId && value?.Id === savedId) onChange({ ...value, Name: form.Name, Phone: form.Phone })
    } catch {
      toast.error(t('components.customerSelect.saveError'))
    }
  }

  return (
    <div ref={containerRef} className={cn('relative flex-1', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full rounded-lg border border-input px-2.5 py-1.5 bg-background hover:bg-muted/30 transition-colors text-left"
      >
        <span className={cn('flex-1 text-xs truncate', !value && 'text-muted-foreground')}>
          {value ? value.Name : resolvedPlaceholder}
        </span>
        {value ? (
          <X className="h-3 w-3 text-muted-foreground/50 hover:text-destructive shrink-0" onClick={handleClear} />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground/50 shrink-0" />
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
              placeholder={t('common.searchCustomer')}
              className="flex-1 min-w-0 text-xs bg-transparent px-2 py-1 focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button type="button" onClick={openAdd} title={t('components.customerSelect.addCustomer')}
              className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={openList} title={t('components.customerSelect.customerList')}
              className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors whitespace-nowrap">
              {t('components.customerSelect.listButton')}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto" onScroll={handleResultsScroll}>
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{t('components.customerSelect.noResults')}</div>
            )}
            {items.map(c => (
              <div key={c.Id} className="w-full flex items-center justify-between hover:bg-muted transition-colors group">
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="flex-1 min-w-0 text-left px-3 py-2 text-xs flex items-center justify-between gap-2"
                >
                  <span className="font-medium truncate">{c.Name}</span>
                  {c.Phone && <span className="text-muted-foreground shrink-0">{c.Phone}</span>}
                </button>
                <button type="button" onClick={e => openEdit(e, c.Id)} title={t('components.customerSelect.edit')}
                  className="shrink-0 mr-1.5 rounded p-1 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground hover:bg-background transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ))}
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">{t('common.loading')}</div>}
          </div>
        </div>
      )}

      <CustomerDialog
        open={dialogOpen}
        form={form}
        setForm={setForm}
        groups={groups}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
