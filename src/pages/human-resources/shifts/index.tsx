import { useState } from 'react'
import { Clock, Plus, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterShiftsQuery, useSaveShiftMutation, useUpdateShiftStatusMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, StatusBadge, PAGE_SIZE } from '@/pages/actives/shared'
import type { TPosShift } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosShift => ({ Name: '' })

export default function ShiftsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosShift>(EMPTY())

  const { data, isLoading, refetch } = useFilterShiftsQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId,
  })
  const [saveShift, { isLoading: saving }] = useSaveShiftMutation()
  const [updateStatus] = useUpdateShiftStatusMutation()

  const items = (data?.Items ?? []) as TPosShift[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên ca'); return }
    try {
      await saveShift(form).unwrap()
      toast.success(form.Id ? 'Đã cập nhật ca làm việc' : 'Đã thêm ca làm việc')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể lưu ca làm việc')
    }
  }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    try {
      await updateStatus({ id, statusId: currentStatusId === 1 ? 2 : 1 }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosShift>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Tên ca', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'start', header: 'Giờ bắt đầu', cell: ({ row }) => <span>{row.original.StartTime ?? '—'}</span> },
    { id: 'end', header: 'Giờ kết thúc', cell: ({ row }) => <span>{row.original.EndTime ?? '—'}</span> },
    { id: 'note', header: 'Ghi chú', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Note ?? '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setForm(item); setModal(true) }}>Sửa</Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => item.Id && handleToggleStatus(item.Id, item.Status?.Id)}
              title={item.Status?.Id === 1 ? 'Ngừng hoạt động' : 'Kích hoạt'}>
              {item.Status?.Id === 1
                ? <ToggleRight className="h-4 w-4 text-primary" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Ca làm việc" icon={Clock}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm ca làm việc..." />
        <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Ngừng HĐ</option>
        </select>
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Thêm ca
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        emptyText="Không có ca làm việc nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên ca <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên ca làm việc" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Giờ bắt đầu</Label>
                <Input type="time" value={form.StartTime ?? ''} onChange={e => setForm(f => ({ ...f, StartTime: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Giờ kết thúc</Label>
                <Input type="time" value={form.EndTime ?? ''} onChange={e => setForm(f => ({ ...f, EndTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} rows={2} placeholder="Ghi chú" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
