import { useState } from 'react'
import { Wallet, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE, fmtCurrency } from '@/pages/actives/shared'
import { useApiMutation } from '@/hooks/use-api-mutation'

interface TFund { Id?: number; Name?: string; Balance?: number; Note?: string; Status?: { Id?: number; Name?: string } }
const EMPTY = (): TFund => ({ Name: '' })

export default function FundPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TFund>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'fund/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TFund) => ({ url: body.Id ? 'fund/update' : 'fund/create', method: 'POST' as const, body }),
    { onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật quỹ' : 'Đã thêm quỹ'); setModal(false); setForm(EMPTY()); refetch() }, onError: () => toast.error('Không thể lưu') }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `fund/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const items = (data?.Items ?? []) as TFund[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TFund>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Tên quỹ', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'balance', header: 'Số dư', cell: ({ row }) => <span className="tabular-nums font-medium text-emerald-700">{fmtCurrency(row.original.Balance)}</span> },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
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
      <ListPageHeader title="Quỹ" icon={Wallet}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm quỹ..." />
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm quỹ
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} emptyText="Không có quỹ nào" />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa quỹ' : 'Thêm quỹ'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên quỹ <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên quỹ" />
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
