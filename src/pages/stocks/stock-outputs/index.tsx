import { useState } from 'react'
import { ArrowUpFromLine, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery, useCreateStockOutputMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosStockOutput } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosStockOutput => ({ Name: '', Date: new Date().toISOString().slice(0, 10), Note: '' })

export default function StockOutputsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosStockOutput>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockoutputs/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })
  const [createStockOutput, { isLoading: saving }] = useCreateStockOutputMutation()

  const items = (data?.Items ?? []) as TPosStockOutput[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập số phiếu'); return }
    try {
      await createStockOutput(form).unwrap()
      toast.success('Đã tạo phiếu xuất kho')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể tạo phiếu xuất kho')
    }
  }

  const columns: ColumnDef<TPosStockOutput>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="font-medium text-primary">{row.original.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'user', header: 'Nhân viên', cell: ({ row }) => <span>{row.original.User?.Name ?? '—'}</span> },
    { id: 'stock', header: 'Kho xuất', cell: ({ row }) => <span>{row.original.StockOut?.Name ?? (row.original as any).Stock?.Name ?? '—'}</span> },
    { id: 'qty', header: 'SL xuất', cell: ({ row }) => <span className="tabular-nums">{row.original.QuantityOut?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'total', header: 'Thành tiền', cell: ({ row }) => <span className="tabular-nums font-medium text-rose-700">{fmtCurrency(row.original.Total)}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu xuất kho" icon={ArrowUpFromLine}>
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
        emptyText="Không có phiếu xuất kho nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo phiếu xuất kho</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Số phiếu <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Số phiếu xuất kho" />
            </div>
            <div className="space-y-1">
              <Label>Ngày xuất</Label>
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
