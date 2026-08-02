import { useState } from 'react'
import { ClipboardCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery, useCreateStockCheckMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosStockCheck } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosStockCheck => ({ Name: '', Date: new Date().toISOString().slice(0, 10), Note: '' })

export default function StockChecksPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosStockCheck>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockchecks/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })
  const [createStockCheck, { isLoading: saving }] = useCreateStockCheckMutation()

  const items = (data?.Items ?? []) as TPosStockCheck[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập số phiếu'); return }
    try {
      await createStockCheck(form).unwrap()
      toast.success('Đã tạo phiếu kiểm kê')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể tạo phiếu kiểm kê')
    }
  }

  const columns: ColumnDef<TPosStockCheck>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="font-medium text-primary">{row.original.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'user', header: 'Nhân viên', cell: ({ row }) => <span>{row.original.User?.Name ?? '—'}</span> },
    { id: 'stockIn', header: 'Kho nhập', cell: ({ row }) => <span>{row.original.StockIn?.Name ?? '—'}</span> },
    { id: 'stockOut', header: 'Kho xuất', cell: ({ row }) => <span>{row.original.StockOut?.Name ?? '—'}</span> },
    { id: 'qtyIn', header: 'SL nhập', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{row.original.QuantityIn?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'qtyOut', header: 'SL xuất', cell: ({ row }) => <span className="tabular-nums text-rose-700">{row.original.QuantityOut?.toLocaleString('vi-VN') ?? '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu kiểm kê" icon={ClipboardCheck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm số phiếu..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo phiếu
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
        emptyText="Không có phiếu kiểm kê nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo phiếu kiểm kê</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Số phiếu <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Số phiếu kiểm kê" />
            </div>
            <div className="space-y-1">
              <Label>Ngày kiểm kê</Label>
              <Input type="date" value={form.Date ?? ''} onChange={e => setForm(f => ({ ...f, Date: e.target.value }))} />
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
