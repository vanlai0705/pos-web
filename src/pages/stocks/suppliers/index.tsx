import { ExcelImportDialog } from '@/components/pos/excel-import-dialog'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { ListPageHeader, PAGE_SIZE, SearchBar, StatusBadge } from '@/pages/actives/shared'
import { RowActions } from '@/pages/managers/components'
import { useFilterReportQuery, useGenericDownloadMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { Download, Plus, Truck, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { buildModelFormData } from '@/utils/multipart'
import { downloadBlob, query } from '@/utils'
import { STATUS } from '@/constants/status'
import { emptySupplier, SupplierDialog, type TSupplier } from '@/components/pos/supplier-form-dialog'

export default function SuppliersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TSupplier>(emptySupplier())
  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'suppliers/filter',
    params: { Keyword: keyword || undefined, StatusId: statusId || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [downloadFile, { isLoading: exporting }] = useGenericDownloadMutation()

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({
        url: `suppliers/export-excel${query({
          Keyword: keyword || undefined,
          StatusId: statusId === '' ? undefined : statusId,
          PageIndex: page - 1,
          PageSize: pageSize,
        })}`,
      }).unwrap()
      downloadBlob(blob, 'nha-cung-cap.xlsx')
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TSupplier) => ({ url: body.Id ? 'suppliers/update' : 'suppliers/create', method: 'POST' as const, body: buildModelFormData(body) }),
    {
      onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật NCC' : 'Đã thêm NCC'); setModal(false); setForm(emptySupplier()); refetch() },
      onError: () => toast.error('Không thể lưu nhà cung cấp'),
    }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `suppliers/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá nhà cung cấp này?' })) return
    toggleStatus({ id, statusId })
  }

  // The filter row is missing `Note` (SupplierModel has no note property) —
  // opening edit re-fetches the full SupplierDetailModel.
  const openEdit = async (row: TSupplier) => {
    if (!row.Id) return
    try {
      const res = await fetchDetail({ url: 'suppliers/detail', params: { id: row.Id } }).unwrap()
      setForm({ ...emptySupplier(), ...((res?.Data ?? row) as TSupplier) })
      setModal(true)
    } catch {
      setForm(row)
      setModal(true)
    }
  }

  const items = (data?.Items ?? []) as TSupplier[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TSupplier>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã NCC', cell: ({ row }) => <CodeTag value={row.original.SupplierCode} /> },
    { id: 'name', header: 'Tên nhà cung cấp', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'group', header: 'Nhóm', cell: ({ row }) => <span className="text-xs">{row.original.SupplierGroup?.Name ?? '—'}</span> },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span className="text-sm">{row.original.Phone ?? '—'}</span> },
    { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Address ?? '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        if (!item.Id) return null
        return (
          <RowActions
            statusId={item.Status?.Id}
            onEdit={() => openEdit(item)}
            onActivate={() => changeStatus(item.Id!, STATUS.ACTIVE)}
            onLock={() => changeStatus(item.Id!, STATUS.LOCKED)}
            onDelete={() => changeStatus(item.Id!, STATUS.DELETED)}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Nhà cung cấp" icon={Truck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm nhà cung cấp..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={STATUS.ACTIVE}>Hoạt động</option>
          <option value={STATUS.LOCKED}>Đã khoá</option>
        </select>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Nhập
        </Button>
        <Button size="sm" variant="outline" className="h-8" disabled={exporting} onClick={exportExcel}>
          <Download className="h-3.5 w-3.5 mr-1" /> Xuất
        </Button>
        <Button size="sm" className="h-8" onClick={() => { setForm(emptySupplier()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm NCC
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có nhà cung cấp nào" />

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl="suppliers/get-excel-header"
        dataUrl="suppliers/get-excel-data"
        importUrl="suppliers/import-excel"
        onImported={refetch}
      />

      <SupplierDialog
        open={modal}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setModal(false)}
        onSave={() => { if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên'); return } save(form) }}
      />
    </div>
  )
}
