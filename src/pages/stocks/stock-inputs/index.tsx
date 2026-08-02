import { useState } from 'react'
import { ArrowDownToLine, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery, useCreateStockInputMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosStockInput } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosStockInput => ({ Name: '', Date: new Date().toISOString().slice(0, 10), Note: '' })

export default function StockInputsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosStockInput>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockinputs/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })
  const [createStockInput, { isLoading: saving }] = useCreateStockInputMutation()

  const items = (data?.Items ?? []) as TPosStockInput[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error('Vui lòng nhập số phiếu'); return }
    try {
      await createStockInput(form).unwrap()
      toast.success('Đã tạo phiếu nhập kho')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể tạo phiếu nhập kho')
    }
  }

  const columns: ColumnDef<TPosStockInput>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="font-medium text-primary">{row.original.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'supplier', header: 'Nhà cung cấp', cell: ({ row }) => <span>{row.original.Supplier?.Name ?? '—'}</span> },
    { id: 'stock', header: 'Kho nhập', cell: ({ row }) => <span>{row.original.StockIn?.Name ?? (row.original as any).Stock?.Name ?? '—'}</span> },
    { id: 'qty', header: 'SL nhập', cell: ({ row }) => <span className="tabular-nums">{row.original.QuantityIn?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'total', header: 'Thành tiền', cell: ({ row }) => <span className="tabular-nums font-medium text-emerald-700">{fmtCurrency(row.original.Total)}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu nhập kho" icon={ArrowDownToLine}>
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
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có phiếu nhập kho nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo phiếu nhập kho</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Số phiếu <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Số phiếu nhập kho" />
            </div>
            <div className="space-y-1">
              <Label>Ngày nhập</Label>
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
