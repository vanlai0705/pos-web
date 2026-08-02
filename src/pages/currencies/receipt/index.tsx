import { useState } from 'react'
import { TrendingUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useFilterReportQuery, useCreateReceiptMutation } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtCurrency, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosCurrencyVoucher } from '@/store/slice/users/types/pos-types'

const EMPTY = (): TPosCurrencyVoucher => ({ Name: '', Date: new Date().toISOString().slice(0, 10), Note: '' })

export default function ReceiptPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosCurrencyVoucher>(EMPTY())

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'Receipt/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: PAGE_SIZE },
  })
  const [createReceipt, { isLoading: saving }] = useCreateReceiptMutation()

  const items = (data?.Items ?? []) as TPosCurrencyVoucher[]
  const total = data?.TotalItemCount ?? 0

  const handleSave = async () => {
    if (!form.ObjectName?.trim()) { toast.error('Vui lòng nhập tên đối tượng'); return }
    try {
      await createReceipt(form).unwrap()
      toast.success('Đã tạo phiếu thu')
      setModal(false)
      setForm(EMPTY())
      refetch()
    } catch {
      toast.error('Không thể tạo phiếu thu')
    }
  }

  const columns: ColumnDef<TPosCurrencyVoucher>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <span className="font-medium text-primary">{row.original.Name ?? '—'}</span> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'object', header: 'Tên đối tượng', cell: ({ row }) => <span>{row.original.ObjectName ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.Address ?? '—'}</span> },
    { id: 'reason', header: 'Lý do', cell: ({ row }) => <span className="text-xs">{row.original.ReceiptPaymentReason?.Name ?? '—'}</span> },
    { id: 'receipt', header: 'Số tiền thu', cell: ({ row }) => <span className="tabular-nums font-medium text-emerald-700">{fmtCurrency(row.original.Receipt)}</span> },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu thu" icon={TrendingUp}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm phiếu thu..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={() => { setForm(EMPTY()); setModal(true) }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo phiếu thu
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
        emptyText="Không có phiếu thu nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tạo phiếu thu</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên đối tượng <span className="text-destructive">*</span></Label>
              <Input value={form.ObjectName ?? ''} onChange={e => setForm(f => ({ ...f, ObjectName: e.target.value }))} placeholder="Tên đối tượng nộp tiền" />
            </div>
            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              <Input value={form.Address ?? ''} onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} placeholder="Địa chỉ" />
            </div>
            <div className="space-y-1">
              <Label>Số tiền thu</Label>
              <Input type="number" value={form.Receipt ?? ''} onChange={e => setForm(f => ({ ...f, Receipt: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Ngày</Label>
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
