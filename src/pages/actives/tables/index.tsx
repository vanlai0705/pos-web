import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { TreeSidebar, type TreeSidebarNode } from '@/components/layout/tree-sidebar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useGenericDownloadMutation, useGenericPostMutation } from '@/store/slice/generic/api'
import { cn, downloadBlob, query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import { Download, FileDown, MoreHorizontal, Plus, QrCode, RefreshCw, Table2, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { type ColumnDef, DataTable } from '@/components/ui/data-table'

const PAGE_SIZE = 10

interface Area extends TreeSidebarNode {
  IsActive?: boolean
  Note?: string
  Stock?: { Id?: number; Name?: string }
  Users?: Array<{ Id?: number; Name?: string }>
}

interface RestaurantTable {
  Id?: number
  Name?: string
  Code?: string
  Guid?: string
  Notes?: string
  Note?: string
  PricingMode?: number
  DisplayGroup?: string
  IsActive?: boolean
  Area?: { Id?: number; Name?: string }
}

interface SimpleOption {
  Id: number
  Name: string
}

interface AreaForm {
  Id?: number
  Name: string
  IsActive: boolean
  StockId: number
  UserIds: number[]
  Note: string
}

interface TableForm {
  Id?: number
  Name: string
  PricingMode: number
  AreaId: number
  Note: string
}

interface BatchRow {
  AreaId: number
  AreaName: string
  FromNumber: string
  ToNumber: string
  StartNameWith: string
}

const emptyAreaForm = (): AreaForm => ({ Name: '', IsActive: true, StockId: 0, UserIds: [], Note: '' })
const emptyTableForm = (): TableForm => ({ Name: '', PricingMode: 1, AreaId: 0, Note: '' })

export default function TablesManagePage() {
  const { t } = useTranslation()
  const [areas, setAreas] = useState<Area[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectedAreaId, setSelectedAreaId] = useState(0)
  const [areaSearch, setAreaSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [areasLoading, setAreasLoading] = useState(false)
  const [tablesLoading, setTablesLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [stocks, setStocks] = useState<SimpleOption[]>([])
  const [users, setUsers] = useState<SimpleOption[]>([])

  const [areaModal, setAreaModal] = useState(false)
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm())

  const [tableModal, setTableModal] = useState(false)
  const [tableForm, setTableForm] = useState<TableForm>(emptyTableForm())

  const [batchMode, setBatchMode] = useState(false)
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewFileName, setPreviewFileName] = useState('qr.png')

  const searchTimer = useRef<number | null>(null)
  const [request] = useGenericPostMutation()
  const [downloadFile, { isLoading: downloading }] = useGenericDownloadMutation()

  const selectedArea = areas.find(area => area.Id === selectedAreaId)

  const loadAreas = useCallback(async (keywordValue = areaSearch) => {
    setAreasLoading(true)
    try {
      const response = await request({
        url: `area/filter${query({ PageIndex: 0, PageSize: 100, Keyword: keywordValue || undefined })}`,
        method: 'GET',
      }).unwrap()
      setAreas((response?.Data?.Items || []) as Area[])
    } catch {
      toast.error(t('pages.actives.tables.loadAreasError'))
    } finally {
      setAreasLoading(false)
    }
  }, [areaSearch, request, t])

  const loadTables = useCallback(async (nextPage: number, keywordValue: string, areaId: number) => {
    setTablesLoading(true)
    try {
      const response = await request({
        url: `tables/filter${query({
          PageIndex: nextPage - 1,
          PageSize: PAGE_SIZE,
          Keyword: keywordValue || undefined,
          areaId: areaId > 0 ? areaId : undefined,
        })}`,
        method: 'GET',
      }).unwrap()
      setTables((response?.Data?.Items || []) as RestaurantTable[])
      setTotal(response?.Data?.TotalItemCount || 0)
    } catch {
      setTables([])
      setTotal(0)
      toast.error(t('pages.actives.tables.loadTablesError'))
    } finally {
      setTablesLoading(false)
    }
  }, [request, t])

  const loadOptions = useCallback(async () => {
    try {
      const [stockRes, userRes] = await Promise.all([
        request({ url: 'stock/filter-simple', method: 'GET' }).unwrap(),
        request({ url: 'users/filter-simple', method: 'GET' }).unwrap(),
      ])
      setStocks((stockRes?.Data?.Items || []) as SimpleOption[])
      setUsers((userRes?.Data?.Items || []) as SimpleOption[])
    } catch {
      toast.error(t('pages.actives.tables.loadOptionsError'))
    }
  }, [request, t])

  useEffect(() => {
    loadAreas('')
    loadOptions()
  }, [loadAreas, loadOptions])

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      setPage(1)
      loadTables(1, keyword, selectedAreaId)
    }, 450)
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current)
    }
  }, [keyword, loadTables, selectedAreaId])

  const openCreateArea = () => {
    setAreaForm(emptyAreaForm())
    setAreaModal(true)
  }

  const openEditArea = async (area: Area) => {
    setSelectedAreaId(area.Id)
    try {
      const response = await request({ url: `area/detail${query({ id: area.Id })}`, method: 'GET' }).unwrap()
      const detail = response?.Data || area
      setAreaForm({
        Id: detail.Id,
        Name: detail.Name || '',
        IsActive: detail.IsActive ?? true,
        StockId: detail.Stock?.Id || 0,
        UserIds: (detail.Users || []).map((user: any) => user.Id).filter(Boolean),
        Note: detail.Note || detail.Notes || '',
      })
      setAreaModal(true)
    } catch {
      toast.error(t('pages.actives.tables.areaDetailError'))
    }
  }

  const saveArea = async () => {
    if (!areaForm.Name.trim()) {
      toast.error(t('pages.actives.tables.areaNameRequired'))
      return
    }
    if (!areaForm.StockId) {
      toast.error(t('pages.actives.tables.stockRequired'))
      return
    }
    if (areaForm.UserIds.length === 0) {
      toast.error(t('pages.actives.tables.staffRequired'))
      return
    }

    const isUpdate = !!areaForm.Id
    const payload = {
      id: areaForm.Id || 0,
      name: areaForm.Name,
      isActive: areaForm.IsActive,
      stock: { id: areaForm.StockId },
      users: areaForm.UserIds.map(id => ({ id })),
      note: areaForm.Note,
    }

    setSaving(true)
    try {
      await request({
        url: isUpdate ? 'area/update' : 'area/create',
        method: isUpdate ? 'PUT' : 'POST',
        body: buildModelFormData(payload),
      }).unwrap()
      toast.success(isUpdate ? t('pages.actives.tables.areaUpdateSuccess') : t('pages.actives.tables.areaCreateSuccess'))
      setAreaModal(false)
      await loadAreas()
    } catch {
      toast.error(t('pages.actives.tables.areaSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const deleteArea = async (area: Area) => {
    if (!await confirmAction({ description: t('pages.actives.tables.deleteAreaConfirm', { name: area.Name || area.Code }) })) return
    try {
      await request({ url: `area/delete${query({ id: area.Id })}`, method: 'DELETE' }).unwrap()
      toast.success(t('pages.actives.tables.areaDeleteSuccess'))
      if (selectedAreaId === area.Id) setSelectedAreaId(0)
      await loadAreas()
      await loadTables(1, keyword, selectedAreaId === area.Id ? 0 : selectedAreaId)
    } catch {
      toast.error(t('pages.actives.tables.areaDeleteError'))
    }
  }

  const openCreateTable = () => {
    setTableForm({ ...emptyTableForm(), AreaId: selectedAreaId || areas[0]?.Id || 0 })
    setTableModal(true)
  }

  const openEditTable = async (table: RestaurantTable) => {
    try {
      const response = await request({ url: `tables/detail${query({ id: table.Id })}`, method: 'GET' }).unwrap()
      const detail = response?.Data || table
      setTableForm({
        Id: detail.Id,
        Name: detail.Name || '',
        PricingMode: detail.PricingMode || 1,
        AreaId: selectedAreaId || detail.Area?.Id || 0,
        Note: detail.Note || detail.Notes || '',
      })
      setTableModal(true)
    } catch {
      toast.error(t('pages.actives.tables.tableDetailError'))
    }
  }

  const saveTable = async () => {
    if (!tableForm.Name.trim()) {
      toast.error(t('pages.actives.tables.tableNameRequired'))
      return
    }
    if (!tableForm.AreaId) {
      toast.error(t('pages.actives.tables.areaSelectRequired'))
      return
    }

    const isUpdate = !!tableForm.Id
    const payload = {
      id: tableForm.Id || 0,
      name: tableForm.Name,
      pricingMode: tableForm.PricingMode,
      area: { id: Number(tableForm.AreaId) },
      displayGroup: '',
      note: tableForm.Note,
      isActive: true,
      isTennisCourt: true,
      qrCodeUrl: '',
      code: '',
    }

    setSaving(true)
    try {
      await request({
        url: isUpdate ? 'tables/update' : 'tables/create',
        method: isUpdate ? 'PUT' : 'POST',
        body: buildModelFormData(payload),
      }).unwrap()
      toast.success(isUpdate ? t('pages.actives.tables.tableUpdateSuccess') : t('pages.actives.tables.tableCreateSuccess'))
      setTableModal(false)
      await loadTables(page, keyword, selectedAreaId)
    } catch {
      toast.error(t('pages.actives.tables.tableSaveError'))
    } finally {
      setSaving(false)
    }
  }

  const deleteTable = async (table: RestaurantTable) => {
    if (!await confirmAction({ description: t('pages.actives.tables.deleteTableConfirm', { name: table.Name || table.Code }) })) return
    try {
      await request({ url: `tables/delete${query({ id: table.Id })}`, method: 'DELETE' }).unwrap()
      toast.success(t('pages.actives.tables.tableDeleteSuccess'))
      await loadTables(page, keyword, selectedAreaId)
    } catch {
      toast.error(t('pages.actives.tables.tableDeleteError'))
    }
  }

  const prepareBatchRows = () => {
    const rows = selectedAreaId > 0 && selectedArea
      ? [{ AreaId: selectedArea.Id, AreaName: selectedArea.Name || '', FromNumber: '', ToNumber: '', StartNameWith: '' }]
      : areas.map(area => ({ AreaId: area.Id, AreaName: area.Name || '', FromNumber: '', ToNumber: '', StartNameWith: '' }))
    setBatchRows(rows)
    setBatchMode(true)
  }

  const submitBatch = async () => {
    // Rows are pre-seeded per area so the user can fill in just the ones
    // they actually want — an untouched row (all 3 fields still blank)
    // is simply skipped, not treated as an incomplete submission. A row
    // the user *started* filling in still has to be completed, though.
    const touchedRows = batchRows.filter(row => row.FromNumber || row.ToNumber || row.StartNameWith.trim())
    if (touchedRows.length === 0 || touchedRows.some(row => !row.AreaId || !row.FromNumber || !row.ToNumber || !row.StartNameWith.trim())) {
      toast.error(t('pages.actives.tables.batchFieldsRequired'))
      return
    }
    try {
      await request({
        url: 'tables/batch-create',
        method: 'POST',
        body: touchedRows.map(row => ({
          areaId: row.AreaId,
          fromNumber: Number(row.FromNumber),
          toNumber: Number(row.ToNumber),
          startNameWith: row.StartNameWith,
        })),
      }).unwrap()
      toast.success(t('pages.actives.tables.batchCreateSuccess'))
      setBatchMode(false)
      await loadTables(1, keyword, selectedAreaId)
    } catch {
      toast.error(t('pages.actives.tables.batchCreateError'))
    }
  }

  const downloadAllQr = async () => {
    try {
      const blob = await downloadFile({ url: 'tables/get-qr-image-files' }).unwrap()
      downloadBlob(blob, 'tat-ca-qr-ban.zip')
    } catch {
      toast.error(t('pages.actives.tables.downloadAllQrError'))
    }
  }

  const previewQr = async (table: RestaurantTable) => {
    if (!table.Id) return
    try {
      const blob = await downloadFile({ url: `tables/get-qr-image-file${query({ id: table.Id })}` }).unwrap()
      const url = URL.createObjectURL(blob)
      setPreviewBlob(blob)
      setPreviewUrl(url)
      setPreviewFileName(`${table.Name || 'qr'}.png`.replace(/[^\w.\- ]/g, ''))
      setPreviewOpen(true)
    } catch {
      toast.error(t('pages.actives.tables.downloadQrError'))
    }
  }

  const exportExcel = () => {
    const rows = [
      ['#', t('pages.actives.tables.tableName'), t('pages.actives.tables.area'), t('common.note')],
      ...tables.map((table, index) => [
        index + 1,
        table.Name || '',
        table.Area?.Name || '',
        table.Notes || table.Note || '-',
      ]),
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), `Danh_sach_ban_${selectedArea?.Name || 'Tat_ca'}.csv`)
  }

  const areaTree = useMemo<Area[]>(() => [
    { Id: 0, Name: t('pages.actives.tables.allAreas') },
    ...areas,
  ], [areas, t])

  const tableColumns: ColumnDef<RestaurantTable>[] = [
    {
      id: 'stt',
      header: '#',
      meta: { className: 'w-16 text-center' },
      cell: ({ row }) => <span className="text-slate-400">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'name',
      header: t('pages.actives.tables.tableName'),
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-semibold text-slate-800">
          <Table2 className="h-4 w-4 text-indigo-500" />
          {row.original.Name || '-'}
        </div>
      ),
    },
    {
      id: 'area',
      header: t('pages.actives.tables.area'),
      cell: ({ row }) => (
        <span className="inline-flex rounded-md bg-blue-500 px-2 py-1 text-xs font-semibold text-white">
          {row.original.Area?.Name || selectedArea?.Name || '-'}
        </span>
      ),
    },
    {
      id: 'note',
      header: t('common.note'),
      meta: { cellClassName: 'text-xs text-slate-500' },
      cell: ({ row }) => row.original.Notes || row.original.Note || '-',
    },
    {
      id: 'actions',
      header: t('common.actions'),
      meta: { className: 'w-24 text-right' },
      cell: ({ row }) => {
        const table = row.original
        return (
          <div onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditTable(table)}>{t('pages.actives.tables.editTable')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => previewQr(table)}>{t('pages.actives.tables.viewDownloadQr')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTable(table)}>{t('pages.actives.tables.deleteTable')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <TreeSidebar
          title={t('pages.actives.tables.areaSidebarTitle')}
          items={areaTree}
          selectedId={selectedAreaId}
          itemCount={areas.length}
          searchText={areaSearch}
          loading={areasLoading}
          searchPlaceholder={t('pages.actives.tables.searchArea')}
          emptyText={t('pages.actives.tables.areaNotFound')}
          onSearchTextChange={value => {
            setAreaSearch(value)
            loadAreas(value)
          }}
          onSelect={area => setSelectedAreaId(area.Id)}
          onCreate={openCreateArea}
          onEditItem={openEditArea}
          onDeleteItem={deleteArea}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <ListToolbar
            searchValue={keyword}
            searchPlaceholder={t('pages.actives.tables.searchTable')}
            onSearchChange={setKeyword}
            actions={(
              <>
                <ToolbarButton tone="primary" onClick={openCreateTable}>
                  <Plus className="h-4 w-4" />
                  {t('pages.actives.tables.addTable')}
                </ToolbarButton>
                <ToolbarButton tone="neutral" onClick={() => loadTables(page, keyword, selectedAreaId)}>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </ToolbarButton>
                <ToolbarButton tone="neutral" disabled={tables.length === 0} onClick={exportExcel}>
                  <FileDown className="h-4 w-4" />
                  {t('common.exportExcel')}
                </ToolbarButton>
                <ToolbarButton tone="neutral" onClick={prepareBatchRows}>
                  <Zap className="h-4 w-4 text-orange-500" />
                  {t('pages.actives.tables.quickAdd')}
                </ToolbarButton>
                <ToolbarButton tone="neutral" disabled={downloading} onClick={downloadAllQr}>
                  <QrCode className="h-4 w-4 text-cyan-600" />
                  {t('pages.actives.tables.downloadAllQr')}
                </ToolbarButton>
              </>
            )}
          />

          {batchMode ? (
            <BatchPanel
              rows={batchRows}
              setRows={setBatchRows}
              onSubmit={submitBatch}
              onClose={() => setBatchMode(false)}
            />
          ) : (
            <DataTable
              columns={tableColumns}
              data={tables}
              loading={tablesLoading}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={nextPage => {
                setPage(nextPage)
                loadTables(nextPage, keyword, selectedAreaId)
              }}
              emptyText={t('pages.actives.tables.noTablesInArea')}
            />
          )}
        </section>
      </div>

      <AreaModal
        open={areaModal}
        form={areaForm}
        setForm={setAreaForm}
        stocks={stocks}
        users={users}
        saving={saving}
        onClose={() => setAreaModal(false)}
        onSave={saveArea}
      />

      <TableModal
        open={tableModal}
        form={tableForm}
        setForm={setTableForm}
        areas={areas}
        selectedAreaId={selectedAreaId}
        saving={saving}
        onClose={() => setTableModal(false)}
        onSave={saveTable}
      />

      <Dialog open={previewOpen} onOpenChange={open => {
        setPreviewOpen(open)
        if (!open && previewUrl) URL.revokeObjectURL(previewUrl)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('pages.actives.tables.qrCodeTitle')}</DialogTitle></DialogHeader>
          <div className="flex justify-center">
            {previewUrl ? <img src={previewUrl} className="h-80 w-80 rounded-lg border object-contain" /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>{t('pages.actives.tables.close')}</Button>
            <Button disabled={!previewBlob} onClick={() => previewBlob && downloadBlob(previewBlob, previewFileName)}>
              <Download className="mr-2 h-4 w-4" />
              {t('pages.actives.tables.downloadImage')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AreaModal({
  open,
  form,
  setForm,
  stocks,
  users,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: AreaForm
  setForm: React.Dispatch<React.SetStateAction<AreaForm>>
  stocks: SimpleOption[]
  users: SimpleOption[]
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.Id ? t('pages.actives.tables.editAreaTitle') : t('pages.actives.tables.addAreaTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label={t('pages.actives.tables.areaNameLabel')} required>
            <Input value={form.Name} onChange={event => setForm(current => ({ ...current, Name: event.target.value }))} placeholder={t('pages.actives.tables.areaNamePlaceholder')} />
          </Field>
          <Field label={t('pages.actives.tables.stockLabel')} required>
            <select value={form.StockId || ''} onChange={event => setForm(current => ({ ...current, StockId: Number(event.target.value) }))} className="h-9 w-full rounded-md border bg-white px-3 text-sm">
              <option value="">{t('pages.actives.tables.selectStockOption')}</option>
              {stocks.map(stock => <option key={stock.Id} value={stock.Id}>{stock.Name}</option>)}
            </select>
          </Field>
          <Field label={t('pages.actives.tables.staffLabel')} required>
            <div className="grid max-h-44 gap-2 overflow-auto rounded-md border bg-slate-50 p-2 sm:grid-cols-2">
              {users.map(user => {
                const checked = form.UserIds.includes(user.Id)
                return (
                  <label key={user.Id} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm', checked ? 'bg-indigo-50 text-indigo-700' : 'bg-white')}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={event => setForm(current => ({
                        ...current,
                        UserIds: event.target.checked
                          ? [...current.UserIds, user.Id]
                          : current.UserIds.filter(id => id !== user.Id),
                      }))}
                    />
                    {user.Name}
                  </label>
                )
              })}
            </div>
          </Field>
          <Field label={t('common.note')}>
            <Textarea rows={2} value={form.Note} onChange={event => setForm(current => ({ ...current, Note: event.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Switch checked={form.IsActive} onCheckedChange={value => setForm(current => ({ ...current, IsActive: value }))} />
            {t('common.active')}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? t('pages.actives.tables.saving') : form.Id ? t('pages.actives.tables.update') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TableModal({
  open,
  form,
  setForm,
  areas,
  selectedAreaId,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: TableForm
  setForm: React.Dispatch<React.SetStateAction<TableForm>>
  areas: Area[]
  selectedAreaId: number
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.Id ? t('pages.actives.tables.editTableTitle') : t('pages.actives.tables.addTableTitle')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label={t('pages.actives.tables.tableNameLabel')} required>
            <Input value={form.Name} onChange={event => setForm(current => ({ ...current, Name: event.target.value }))} placeholder={t('pages.actives.tables.tableNamePlaceholder')} />
          </Field>
          <Field label={t('pages.actives.tables.pricingModeLabel')}>
            <div className="flex flex-wrap gap-3 text-sm">
              {[
                { id: 1, name: t('pages.actives.tables.pricingByHour') },
                { id: 2, name: t('pages.actives.tables.pricingByPriceList') },
                { id: 3, name: t('pages.actives.tables.pricingByArea') },
              ].map(item => (
                <label key={item.id} className="flex items-center gap-1">
                  <input type="radio" checked={form.PricingMode === item.id} onChange={() => setForm(current => ({ ...current, PricingMode: item.id }))} />
                  {item.name}
                </label>
              ))}
            </div>
          </Field>
          {selectedAreaId === 0 ? (
            <Field label={t('pages.actives.tables.area')} required>
              <select value={form.AreaId || ''} onChange={event => setForm(current => ({ ...current, AreaId: Number(event.target.value) }))} className="h-9 w-full rounded-md border bg-white px-3 text-sm">
                <option value="">{t('pages.actives.tables.selectAreaOption')}</option>
                {areas.map(area => <option key={area.Id} value={area.Id}>{area.Name}</option>)}
              </select>
            </Field>
          ) : null}
          <Field label={t('common.note')}>
            <Textarea rows={3} value={form.Note} onChange={event => setForm(current => ({ ...current, Note: event.target.value }))} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? t('pages.actives.tables.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BatchPanel({
  rows,
  setRows,
  onSubmit,
  onClose,
}: {
  rows: BatchRow[]
  setRows: React.Dispatch<React.SetStateAction<BatchRow[]>>
  onSubmit: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const update = (index: number, key: keyof BatchRow, value: string) => {
    setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value } : row))
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        <strong>{t('pages.actives.tables.batchIntro')}</strong>
        <div className="mt-1 text-blue-800">{t('pages.actives.tables.batchExample')}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="border px-2 py-2">#</th>
              <th className="border px-2 py-2">{t('pages.actives.tables.area')}</th>
              <th className="border px-2 py-2">{t('pages.actives.tables.tableFromNumber')}</th>
              <th className="border px-2 py-2">{t('pages.actives.tables.tableToNumber')}</th>
              <th className="border px-2 py-2">{t('pages.actives.tables.startNameWith')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.AreaId}>
                <td className="border px-2 py-2 text-center">{index + 1}</td>
                <td className="border px-2 py-2">{row.AreaName}</td>
                <td className="border px-2 py-2"><Input type="number" value={row.FromNumber} onChange={event => update(index, 'FromNumber', event.target.value)} className="text-center" /></td>
                <td className="border px-2 py-2"><Input type="number" value={row.ToNumber} onChange={event => update(index, 'ToNumber', event.target.value)} className="text-center" /></td>
                <td className="border px-2 py-2"><Input value={row.StartNameWith} onChange={event => update(index, 'StartNameWith', event.target.value)} className="text-center" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{t('pages.actives.tables.exit')}</Button>
        <Button onClick={onSubmit}>{t('pages.actives.tables.execute')}</Button>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}
