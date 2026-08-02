import { useState } from 'react'
import { FileText, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  useFilterQuotationsQuery,
  useSaveQuotationMutation,
  useUpdateQuotationStatusMutation,
  useLazyGetQuotationDetailQuery,
} from '@/store/slice/users/api/api'
import type { TPosQuotation } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, StatusBadge, fmtCurrency, fmtDate, useListFilter, PAGE_SIZE } from '../shared'

const EMPTY: TPosQuotation = {}

function QuotationDetail({ form, onChange }: { form: TPosQuotation; onChange: (f: TPosQuotation) => void }) {
  const set = (patch: Partial<TPosQuotation>) => onChange({ ...form, ...patch })
  const items = form.OrderItems ?? []
  return (
    <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Số phiếu</Label>
          <Input value={form.Code ?? ''} onChange={e => set({ Code: e.target.value })} placeholder="Tự động" />
        </div>
        <div className="space-y-1">
          <Label>Ngày tạo</Label>
          <Input type="date" value={form.Date?.slice(0, 10) ?? ''} onChange={e => set({ Date: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Ngày hết hạn</Label>
          <Input type="date" value={form.ExpiredDate?.slice(0, 10) ?? ''} onChange={e => set({ ExpiredDate: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Khách hàng</Label>
          <Input value={form.Customer?.Name ?? ''} onChange={e => set({ Customer: { ...form.Customer, Name: e.target.value } })} placeholder="Tên khách hàng" />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Ghi chú</Label>
        <Input value={form.Note ?? ''} onChange={e => set({ Note: e.target.value })} placeholder="Ghi chú" />
      </div>
      {items.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                {['Tên hàng', 'SL', 'Đơn giá', 'Thành tiền'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-2 py-1.5">{item.ProductName}</td>
                  <td className="px-2 py-1.5 tabular-nums">{item.Quantity}</td>
                  <td className="px-2 py-1.5 tabular-nums">{item.Price?.toLocaleString('vi-VN')}</td>
                  <td className="px-2 py-1.5 tabular-nums">{item.Total?.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t text-right text-sm font-semibold">
            Tổng: {fmtCurrency(form.Total ?? form.SubTotal)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function QuotationPage() {
  const { keyword, setKeyword, page, goPage, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TPosQuotation>(EMPTY)

  const { data, isLoading, refetch } = useFilterQuotationsQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    StatusId: statusId,
  })
  const [getDetail] = useLazyGetQuotationDetailQuery()
  const [save, { isLoading: saving }] = useSaveQuotationMutation()
  const [updateStatus] = useUpdateQuotationStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const openAdd = () => { setForm(EMPTY); setModal(true) }
  const openEdit = async (id: number) => {
    try {
      const detail = await getDetail(id).unwrap()
      setForm(detail)
      setModal(true)
    } catch { toast.error('Không thể tải báo giá') }
  }

  const handleSave = async () => {
    try {
      await save(form).unwrap()
      toast.success(form.Id ? 'Đã cập nhật báo giá' : 'Đã tạo báo giá')
      setModal(false)
      refetch()
    } catch { toast.error('Không thể lưu báo giá') }
  }

  const handleToggleStatus = async (id: number, currentStatusId?: number) => {
    const newStatusId = currentStatusId === 1 ? 2 : 1
    try {
      await updateStatus({ id, statusId: newStatusId }).unwrap()
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosQuotation>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Số phiếu',
      cell: ({ row }) => (
        <span
          className="font-medium text-primary cursor-pointer hover:underline"
          onClick={() => row.original.Id && openEdit(row.original.Id)}
        >
          {row.original.Code ?? '—'}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Ngày',
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.Date)}</span>,
    },
    {
      id: 'expiredDate',
      header: 'Hết hạn',
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.ExpiredDate)}</span>,
    },
    {
      id: 'customer',
      header: 'Khách hàng',
      cell: ({ row }) => row.original.Customer?.Name ?? '—',
    },
    {
      id: 'user',
      header: 'Nhân viên',
      cell: ({ row }) => row.original.User?.Name ?? '—',
    },
    {
      id: 'total',
      header: 'Tiền hàng',
      cell: ({ row }) => (
        <span className="tabular-nums">{fmtCurrency(row.original.Total ?? row.original.SubTotal)}</span>
      ),
    },
    {
      id: 'status',
      header: 'TT',
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => item.Id && openEdit(item.Id)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => item.Id && handleToggleStatus(item.Id, item.Status?.Id)}
            >
              {item.Status?.Id === 1
                ? <ToggleRight className="h-4 w-4 text-primary" />
                : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
              }
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Báo giá khách hàng" icon={FileText}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder="Tìm số phiếu, khách hàng..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); goPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả TT</option>
          <option value={1}>Hoạt động</option>
          <option value={2}>Đã huỷ</option>
          <option value={4}>Hoàn thành</option>
        </select>
        <Button size="sm" onClick={openAdd} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo báo giá
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={goPage}
        emptyText="Không có báo giá nào"
      />

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.Id ? `Báo giá #${form.Code}` : 'Tạo báo giá'}</DialogTitle>
          </DialogHeader>
          <QuotationDetail form={form} onChange={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
