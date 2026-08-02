import { useState } from 'react'
import { Truck, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import { useApiMutation } from '@/hooks/use-api-mutation'

interface TSupplier {
  Id?: number
  Code?: string
  Name?: string
  Phone?: string
  Email?: string
  Address?: string
  Note?: string
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TSupplier => ({ Name: '', Phone: '', Email: '', Address: '' })

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

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TSupplier) => ({ url: body.Id ? 'suppliers/update' : 'suppliers/create', method: 'POST' as const, body }),
    {
      onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật NCC' : 'Đã thêm NCC'); setModal(false); setForm(EMPTY()); refetch() },
      onError: () => toast.error('Không thể lưu nhà cung cấp'),
    }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `suppliers/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const items = (data?.Items ?? []) as TSupplier[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TSupplier>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã NCC', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên nhà cung cấp', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span className="text-sm">{row.original.Phone ?? '—'}</span> },
    { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Address ?? '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setForm(item); setModal(true) }}>Sửa</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => item.Id && toggleStatus({ id: item.Id, statusId: item.Status?.Id === 1 ? 2 : 1 })}>
              {item.Status?.Id === 1 ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
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
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
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
            <div className="space-y-1">
              <Label>Tên nhà cung cấp <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhà cung cấp" />
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
            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              <Input value={form.Address ?? ''} onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} placeholder="Địa chỉ" />
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
