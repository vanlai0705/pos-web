import { useState } from 'react'
import { Store, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import { useApiMutation } from '@/hooks/use-api-mutation'

interface TShop {
  Id?: number
  Code?: string
  Name?: string
  Phone?: string
  Address?: string
  Email?: string
  Status?: { Id?: number; Name?: string }
}

const EMPTY = (): TShop => ({ Name: '', Phone: '', Address: '' })

export default function ShopsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TShop>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'shop/filter',
    params: { Keyword: keyword || undefined, StatusId: statusId || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TShop) => ({ url: body.Id ? 'shop/update' : 'shop/create', method: 'POST' as const, body }),
    {
      onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật cửa hàng' : 'Đã thêm cửa hàng'); setModal(false); setForm(EMPTY()); refetch() },
      onError: () => toast.error('Không thể lưu cửa hàng'),
    }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `shop/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const items = (data?.Items ?? []) as TShop[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TShop>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã CH', cell: ({ row }) => <span className="text-xs font-mono text-muted-foreground">{row.original.Code ?? '—'}</span> },
    { id: 'name', header: 'Tên cửa hàng', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
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
      <ListPageHeader title="Cửa hàng" icon={Store}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm cửa hàng..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
        </select>
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm cửa hàng
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có cửa hàng nào" />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa cửa hàng' : 'Thêm cửa hàng'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên cửa hàng <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên cửa hàng" />
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
