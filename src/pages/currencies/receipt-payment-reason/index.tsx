import { useState } from 'react'
import { FileText, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import { useApiMutation } from '@/hooks/use-api-mutation'

interface TReason { Id?: number; Name?: string; Note?: string; Status?: { Id?: number; Name?: string } }
const EMPTY = (): TReason => ({ Name: '' })

export default function ReceiptPaymentReasonPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TReason>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'ReceiptPaymentReason/filter',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TReason) => ({ url: body.Id ? 'ReceiptPaymentReason/update' : 'ReceiptPaymentReason/create', method: 'POST' as const, body }),
    { onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật' : 'Đã thêm'); setModal(false); setForm(EMPTY()); refetch() }, onError: () => toast.error('Không thể lưu') }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `ReceiptPaymentReason/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const items = (data?.Items ?? []) as TReason[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TReason>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Tên lý do', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
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
      <ListPageHeader title="Lý do thu chi" icon={FileText}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm lý do..." />
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm
        </Button>
      </ListPageHeader>

      <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} emptyText="Không có lý do thu chi" />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa lý do' : 'Thêm lý do thu chi'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên lý do <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên lý do thu chi" />
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
