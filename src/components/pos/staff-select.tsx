import { useLazyFilterUsersSimpleQuery } from '@/store/slice/customers/api'
import { useLazyGetMemberDetailQuery, useSaveMemberMutation } from '@/store/slice/human-resources/api'
import { TPosMember, TPosUser } from '@/store/slice/users'
import { cn } from '@/utils'
import { withDomainPath } from '@/utils/domain-route'
import { ChevronDown, Pencil, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { StaffDialog, emptyStaff } from './staff-form-dialog'
interface StaffSelectProps {
  value?: TPosUser | null
  onChange: (user: TPosUser | null) => void
  placeholder?: string
  className?: string
}

export function StaffSelect({
  value,
  onChange,
  placeholder,
  className,
}: StaffSelectProps) {
  const { t } = useTranslation()
  const resolvedPlaceholder = placeholder ?? t('components.staffSelect.placeholder')
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const PAGE_SIZE = 20
  const [search, { isFetching }] = useLazyFilterUsersSimpleQuery()
  const [items, setItems] = useState<TPosUser[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [total, setTotal] = useState(0)

  // Inline "Thêm"/"Sửa" — profile-only subset of the full staff wizard in
  // human-resources/members (no login account), same idea as CustomerSelect.
  const [getMemberDetail] = useLazyGetMemberDetailQuery()
  const [saveMember, { isLoading: saving }] = useSaveMemberMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TPosMember>(emptyStaff())

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

  const handleSelect = (item: TPosUser) => {
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
    setForm(emptyStaff())
    setDialogOpen(true)
  }

  const openEdit = async (e: React.MouseEvent, id?: number) => {
    e.stopPropagation()
    if (!id) return
    try {
      const detail = await getMemberDetail(id).unwrap()
      setForm({ ...emptyStaff(), ...detail })
      setDialogOpen(true)
    } catch {
      toast.error(t('components.staffSelect.loadDetailError'))
    }
  }

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(withDomainPath('/human-resources/members'), '_blank')
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) {
      toast.error(t('components.staffSelect.nameRequired'))
      return
    }
    const isNew = !form.Id
    try {
      const saved = await saveMember({ model: form, file: null }).unwrap()
      toast.success(isNew ? t('components.staffSelect.addSuccess') : t('components.staffSelect.updateSuccess'))
      setDialogOpen(false)
      runSearch(keyword)
      const savedId = saved?.Id ?? form.Id
      const fullName = `${form.Surname ?? ''} ${form.Name ?? ''}`.trim() || form.Name
      if (isNew && savedId) {
        onChange({ Id: savedId, Name: form.Name, Surname: form.Surname, FullName: fullName } as TPosUser)
      } else if (savedId && value?.Id === savedId) {
        onChange({ ...value, Name: form.Name, Surname: form.Surname, FullName: fullName } as TPosUser)
      }
    } catch {
      toast.error(t('components.staffSelect.saveError'))
    }
  }

  const displayName = value ? (value.FullName || value.Name) : null

  return (
    <div ref={containerRef} className={cn('relative flex-1', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 w-full rounded-lg border border-input px-2.5 py-1.5 bg-background hover:bg-muted/30 transition-colors text-left"
      >
        <span className={cn('flex-1 text-xs truncate', !displayName && 'text-muted-foreground')}>
          {displayName ?? resolvedPlaceholder}
        </span>
        {displayName ? (
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
              placeholder={t('common.searchEmployee')}
              className="flex-1 min-w-0 text-xs bg-transparent px-2 py-1 focus:outline-none text-foreground placeholder:text-muted-foreground"
            />
            <button type="button" onClick={openAdd} title={t('components.staffSelect.addStaff')}
              className="shrink-0 rounded-md p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={openList} title={t('components.staffSelect.staffListTitle')}
              className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors whitespace-nowrap">
              {t('components.staffSelect.staffList')}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto" onScroll={handleResultsScroll}>
            {!isFetching && items.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">{t('components.staffSelect.notFound')}</div>
            )}
            {items.map(u => (
              <div key={u.Id} className="w-full flex items-center justify-between hover:bg-muted transition-colors group">
                <button
                  type="button"
                  onClick={() => handleSelect(u)}
                  className="flex-1 min-w-0 text-left px-3 py-2 text-xs flex items-center justify-between gap-2"
                >
                  <span className="font-medium truncate">{u.FullName || u.Name}</span>
                  {u.Surname && <span className="text-muted-foreground shrink-0">{u.Surname}</span>}
                </button>
                <button type="button" onClick={e => openEdit(e, u.Id)} title={t('components.staffSelect.editStaff')}
                  className="shrink-0 mr-1.5 rounded p-1 text-muted-foreground/0 group-hover:text-muted-foreground hover:!text-foreground hover:bg-background transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
              </div>
            ))}
            {isFetching && <div className="px-3 py-2 text-xs text-muted-foreground">{t('common.loading')}</div>}
          </div>
        </div>
      )}

      <StaffDialog
        open={dialogOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
