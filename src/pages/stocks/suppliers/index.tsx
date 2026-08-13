import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { ListPageHeader, PAGE_SIZE, SearchBar, StatusBadge } from '@/pages/actives/shared'
import { useFilterReportQuery, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { Check, Lock, MoreHorizontal, Plus, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { buildModelFormData } from '@/utils/multipart'
import { STATUS } from '@/constants/status'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
interface TSupplier {
  Id?: number
  /** field is SupplierCode in pos_web — plain "Code" does not exist */
  SupplierCode?: string
  Name?: string
  Phone?: string
  Email?: string
  Address?: string
  Website?: string
  IsCompany?: boolean
  TaxNumber?: string
  SupplierGroup?: LookupItem | null
  Note?: string
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TSupplier => ({ Name: '', Phone: '', Email: '', Address: '', IsCompany: false, SupplierGroup: null })

export default function SuppliersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TSupplier>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'suppliers/filter',
    params: { Keyword: keyword || undefined, StatusId: statusId || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const [fetchDetail] = useLazyGenericGetQuery()

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TSupplier) => ({ url: body.Id ? 'suppliers/update' : 'suppliers/create', method: 'POST' as const, body: buildModelFormData(body) }),
    {
      onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật NCC' : 'Đã thêm NCC'); setModal(false); setForm(EMPTY()); refetch() },
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
      setForm({ ...EMPTY(), ...((res?.Data ?? row) as TSupplier) })
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(item)}>Chỉnh sửa</DropdownMenuItem>
              <DropdownMenuSeparator />
              {item.Status?.Id !== STATUS.ACTIVE && (
                <DropdownMenuItem onClick={() => changeStatus(item.Id!, STATUS.ACTIVE)}>
                  <Check className="h-3.5 w-3.5 mr-2 text-green-600" /> Kích hoạt
                </DropdownMenuItem>
              )}
              {item.Status?.Id !== STATUS.LOCKED && (
                <DropdownMenuItem onClick={() => changeStatus(item.Id!, STATUS.LOCKED)}>
                  <Lock className="h-3.5 w-3.5 mr-2 text-yellow-600" /> Khoá
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => changeStatus(item.Id!, STATUS.DELETED)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm NCC
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có nhà cung cấp nào" />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa NCC' : 'Thêm nhà cung cấp'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mã</Label>
                <Input value={form.SupplierCode ?? ''} onChange={e => setForm(f => ({ ...f, SupplierCode: e.target.value }))} placeholder="Tự động nếu để trống" />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex cursor-pointer select-none items-center gap-2 pb-2">
                  <Switch checked={!!form.IsCompany} onCheckedChange={v => setForm(f => ({ ...f, IsCompany: v }))} />
                  <span className="text-sm font-medium">Là công ty</span>
                </label>
                {form.IsCompany && (
                  <div className="flex-1 space-y-1">
                    <Label>Mã số thuế</Label>
                    <Input value={form.TaxNumber ?? ''} onChange={e => setForm(f => ({ ...f, TaxNumber: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tên nhà cung cấp <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhà cung cấp" />
            </div>

            <div className="space-y-1">
              <Label>Nhóm nhà cung cấp</Label>
              <LookupSelect endpoint="suppliergroups/filter-simple" placeholder="Chọn nhóm"
                value={form.SupplierGroup} onChange={v => setForm(f => ({ ...f, SupplierGroup: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Điện thoại</Label>
                <Input value={form.Phone ?? ''} onChange={e => setForm(f => ({ ...f, Phone: e.target.value }))} placeholder="Số điện thoại" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.Email ?? ''} onChange={e => setForm(f => ({ ...f, Email: e.target.value }))} placeholder="Email" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Địa chỉ</Label>
                <Input value={form.Address ?? ''} onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} placeholder="Địa chỉ" />
              </div>
              <div className="space-y-1">
                <Label>Trang web</Label>
                <Input value={form.Website ?? ''} onChange={e => setForm(f => ({ ...f, Website: e.target.value }))} placeholder="Trang web" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} rows={2} placeholder="Ghi chú" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={() => { if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên'); return } save(form) }} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
