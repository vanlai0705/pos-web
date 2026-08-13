import { useLazyFilterReportQuery, useLazyGenericGetQuery, useGenericPostMutation } from '@/store/slice/generic/api'
import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { Textarea } from '@/components/ui/textarea'
import { buildModelFormData } from '@/utils/multipart'
import { Edit2, FileQuestion, Headset, ImagePlus, Lock, Plus, RotateCcw, Trash2, Unlock } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const STATUS = {
  Actived: 0,
  Locked: 1,
  Deleted: 2,
} as const

type LookupItem = {
  Id?: number
  Code?: string
  Name?: string
  Icon?: string
  Image?: { Url?: string }
}

type SupportItem = {
  Id?: number
  Code?: string
  Name?: string
  Description?: string
  CreationTime?: string
  Status?: LookupItem
  Function?: LookupItem
  SupportType?: LookupItem
  CreatorUser?: { FullName?: string }
  Images?: Array<{ Id?: number; Url?: string; Name?: string }>
}

type PageMode = 'help' | 'support'

const configByMode = {
  help: {
    titleKey: 'supports.helpTitle',
    subtitleKey: 'supports.helpSubtitle',
    icon: FileQuestion,
    filterUrl: 'helps/filter',
    detailUrl: 'helps/detail',
    createUrl: 'helps/create',
    updateUrl: 'helps/update',
    lookupUrl: 'functions/filter-simple',
    lookupLabelKey: 'supports.functionLabel',
    emptyTextKey: 'supports.emptyHelp',
    searchPlaceholderKey: 'supports.searchHelp',
  },
  support: {
    titleKey: 'supports.supportTitle',
    subtitleKey: 'supports.supportSubtitle',
    icon: Headset,
    filterUrl: 'supports/filter',
    detailUrl: 'supports/detail',
    createUrl: 'supports/create',
    updateUrl: 'supports/update',
    lookupUrl: 'supports/filter-support-type',
    lookupLabelKey: 'supports.supportTypeLabel',
    emptyTextKey: 'supports.emptySupport',
    searchPlaceholderKey: 'supports.searchSupport',
  },
} as const

const emptyForm: SupportItem = {
  Name: '',
  Description: '',
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('vi-VN')
}

function getErrorMessage(error: any) {
  return error?.data?.Errors?.[0]?.Message || error?.data?.Message || error?.message
}

function getLookup(item: SupportItem, mode: PageMode) {
  return mode === 'help' ? item.Function : item.SupportType
}

function setLookup(item: SupportItem, mode: PageMode, value?: LookupItem): SupportItem {
  return mode === 'help' ? { ...item, Function: value } : { ...item, SupportType: value }
}

function buildSupportBody(model: SupportItem, files: File[]) {
  const payload = {
    ...model,
    Images: model.Images?.filter(image => Number(image.Id) > 0) || [],
  }
  return buildModelFormData(payload, files)
}

function LookupDisplay({ item, fallbackIcon: FallbackIcon }: { item?: LookupItem; fallbackIcon: typeof FileQuestion }) {
  return (
    <div className="flex min-w-44 items-center gap-2">
      {item?.Image?.Url ? (
        <img src={item.Image.Url} alt="" className="h-8 w-8 rounded-md border object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <FallbackIcon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-800">{item?.Name || '-'}</div>
        {item?.Code ? <div className="truncate text-xs text-muted-foreground">{item.Code}</div> : null}
      </div>
    </div>
  )
}

export function SupportListPage({ mode, guid }: { mode: PageMode; guid?: string }) {
  const config = configByMode[mode]
  const { t } = useTranslation()
  const title = t(config.titleKey)
  const lookupLabel = t(config.lookupLabelKey)
  const HeaderIcon = config.icon
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [statusId, setStatusId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [rows, setRows] = useState<SupportItem[]>([])
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<SupportItem>(emptyForm)
  const [lookupItems, setLookupItems] = useState<LookupItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [fetchRows, { isFetching }] = useLazyFilterReportQuery()
  const [fetchDetail, { isFetching: loadingDetail }] = useLazyGenericGetQuery()
  const [fetchLookup, { isFetching: loadingLookup }] = useLazyFilterReportQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const loadRows = async () => {
    try {
      const result = await fetchRows({
        path: config.filterUrl,
        params: {
          PageIndex: page - 1,
          PageSize: pageSize,
          Keyword: keyword,
          StatusId: statusId === 'all' ? undefined : Number(statusId),
        },
      }).unwrap()
      setRows((result as any)?.Items || [])
      setTotal((result as any)?.TotalItemCount || 0)
    } catch (error) {
      toast.error(getErrorMessage(error) || t('common.requestFailed'))
    }
  }

  useEffect(() => {
    loadRows()
  }, [page, pageSize, keyword, statusId])

  useEffect(() => {
    if (mode !== 'support' || !guid) return
    openDetailByGuid(guid)
  }, [mode, guid])

  const loadLookup = async (search = '') => {
    try {
      const result = await fetchLookup({
        path: config.lookupUrl,
        params: {
          PageIndex: 0,
          PageSize: 20,
          Keyword: search,
          StatusId: mode === 'help' ? STATUS.Actived : undefined,
        },
      }).unwrap()
      setLookupItems((result as any)?.Items || [])
    } catch {
      setLookupItems([])
    }
  }

  const openCreate = () => {
    setForm(emptyForm)
    setSelectedFiles([])
    setModalOpen(true)
    loadLookup()
  }

  const openDetail = async (id?: number) => {
    if (!id) return
    try {
      const result = await fetchDetail({ url: config.detailUrl, params: { id } }).unwrap()
      setForm(result?.Data || emptyForm)
      setSelectedFiles([])
      setModalOpen(true)
      loadLookup()
    } catch (error) {
      toast.error(getErrorMessage(error) || t('common.requestFailed'))
    }
  }

  const openDetailByGuid = async (value: string) => {
    if (mode !== 'support') return
    try {
      // There is no supports/detail-guid route (it 404s) — the plain detail
      // endpoint accepts the guid as its id.
      const result = await fetchDetail({ url: configByMode.support.detailUrl, params: { id: value } }).unwrap()
      setForm(result?.Data || emptyForm)
      setSelectedFiles([])
      setModalOpen(true)
      loadLookup()
    } catch (error) {
      toast.error(getErrorMessage(error) || t('common.requestFailed'))
    }
  }

  const saveDetail = async () => {
    if (!form.Name?.trim()) {
      toast.error(t('common.requiredName'))
      return
    }
    const selectedLookup = getLookup(form, mode)
    if (!selectedLookup?.Id) {
      toast.error(t('supports.requiredLookup', { field: lookupLabel.toLowerCase() }))
      return
    }
    try {
      const body = buildSupportBody(form, selectedFiles)
      const url = form.Id ? config.updateUrl : config.createUrl
      await request({ url, body }).unwrap()
      toast.success(form.Id ? t('common.updateSuccess') : t('common.createSuccess'))
      setModalOpen(false)
      loadRows()
    } catch (error) {
      toast.error(getErrorMessage(error) || t('common.requestFailed'))
    }
  }

  /**
   * helps/supports expose no update-status route (both 404) — unlike the other
   * modules. Status changes therefore go through the normal update, resending
   * the row with the new Status.
   */
  const updateStatus = async (id: number | undefined, nextStatusId: number) => {
    if (!id) return
    const row = rows.find(r => r.Id === id)
    if (!row) return
    try {
      const body = buildSupportBody({ ...row, Status: { ...(row.Status ?? {}), Id: nextStatusId } }, [])
      await request({ url: config.updateUrl, body }).unwrap()
      toast.success(nextStatusId === STATUS.Deleted ? t('common.deleteSuccess') : t('common.statusUpdateSuccess'))
      loadRows()
    } catch (error) {
      toast.error(getErrorMessage(error) || t('common.requestFailed'))
    }
  }

  const columns = useMemo<ColumnDef<SupportItem>[]>(() => [
    {
      header: t('common.index'),
      cell: ({ row }) => (page - 1) * pageSize + row.index + 1,
      meta: { className: 'w-16 text-center' },
    },
    {
      header: mode === 'support' ? t('supports.supportCode') : t('common.code'),
      cell: ({ row }) => <CodeTag value={row.original.Code || row.original.Id} />,
      meta: { className: 'w-32' },
    },
    {
      header: lookupLabel,
      cell: ({ row }) => <LookupDisplay item={getLookup(row.original, mode)} fallbackIcon={config.icon} />,
      meta: { className: 'min-w-52' },
    },
    {
      header: t('common.name'),
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.Name || '-'}</span>,
      meta: { className: 'min-w-52' },
    },
    {
      header: t('common.content'),
      cell: ({ row }) => <span className="line-clamp-2 text-slate-600">{row.original.Description || '-'}</span>,
      meta: { className: 'min-w-72' },
    },
    {
      header: t('common.createdBy'),
      cell: ({ row }) => row.original.CreatorUser?.FullName || '-',
      meta: { className: 'w-40' },
    },
    {
      header: t('common.createdDate'),
      cell: ({ row }) => formatDate(row.original.CreationTime),
      meta: { className: 'w-32' },
    },
    {
      header: t('common.status'),
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
      meta: { className: 'w-36' },
    },
    {
      header: t('common.actions'),
      cell: ({ row }) => {
        const currentStatus = Number(row.original.Status?.Id ?? STATUS.Actived)
        const nextStatus = currentStatus === STATUS.Locked ? STATUS.Actived : STATUS.Locked
        const ToggleIcon = currentStatus === STATUS.Locked ? Unlock : Lock
        return (
          <div className="flex items-center justify-end gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openDetail(row.original.Id)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600 hover:bg-amber-50" onClick={() => updateStatus(row.original.Id, nextStatus)}>
              <ToggleIcon className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => updateStatus(row.original.Id, STATUS.Deleted)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
      meta: { className: 'w-32 text-right' },
    },
  ], [config.icon, lookupLabel, mode, page, pageSize, t])

  const selectedLookup = getLookup(form, mode)
  const lookupOptions = selectedLookup?.Id && !lookupItems.some(item => item.Id === selectedLookup.Id)
    ? [selectedLookup, ...lookupItems]
    : lookupItems

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <ListToolbar
        left={
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              <p className="text-xs text-muted-foreground">{t(config.subtitleKey)}</p>
            </div>
          </div>
        }
        searchValue={keyword}
        searchPlaceholder={t(config.searchPlaceholderKey)}
        onSearchChange={(value) => {
          setKeyword(value)
          setPage(1)
        }}
        filters={
          <select
            value={statusId}
            onChange={event => {
              setStatusId(event.target.value)
              setPage(1)
            }}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-blue-400"
          >
            <option value="all">{t('common.allStatuses')}</option>
            <option value={STATUS.Actived}>{t('common.active')}</option>
            <option value={STATUS.Locked}>{t('common.locked')}</option>
          </select>
        }
        actions={
          <div className="flex items-center gap-2">
            <ToolbarButton tone="primary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('common.addNew')}
            </ToolbarButton>
            <ToolbarButton tone="neutral" onClick={loadRows}>
              <RotateCcw className="h-4 w-4" />
              {t('common.reload')}
            </ToolbarButton>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        loading={isFetching}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
        onRowDoubleClick={item => openDetail(item.Id)}
        emptyText={t(config.emptyTextKey)}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.Id ? t('common.editNamed', { name: title.toLowerCase() }) : t('common.addNamed', { name: title.toLowerCase() })}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {lookupLabel}
              <select
                value={selectedLookup?.Id ? String(selectedLookup.Id) : ''}
                onFocus={() => lookupItems.length === 0 && loadLookup()}
                onChange={event => {
                  const next = lookupItems.find(item => String(item.Id) === event.target.value)
                  setForm(current => setLookup(current, mode, next))
                }}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400"
              >
                <option value="">{loadingLookup ? t('common.loading') : t('common.selectNamed', { name: lookupLabel.toLowerCase() })}</option>
                {lookupOptions.map(item => (
                  <option key={item.Id} value={item.Id}>{item.Name || item.Code || item.Id}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t('common.name')}
              <Input value={form.Name || ''} onChange={event => setForm(current => ({ ...current, Name: event.target.value }))} placeholder={t('common.title')} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
              {t('common.content')}
              <Textarea value={form.Description || ''} onChange={event => setForm(current => ({ ...current, Description: event.target.value }))} rows={6} />
            </label>

            {mode === 'support' ? (
              <div className="grid gap-2">
                <div className="text-sm font-medium text-slate-700">{t('common.images')}</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={event => setSelectedFiles(Array.from(event.target.files || []))}
                />
                <Button type="button" variant="outline" className="w-fit gap-2" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" />
                  {t('common.selectImage')}
                </Button>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {form.Images?.map(image => image.Url ? (
                    <img key={image.Id || image.Url} src={image.Url} alt="" className="h-24 w-full rounded-md border object-cover" />
                  ) : null)}
                  {selectedFiles.map(file => (
                    <div key={`${file.name}-${file.size}`} className="rounded-md border bg-slate-50 p-2 text-xs text-slate-600">
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={saving || loadingDetail} onClick={saveDetail}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
