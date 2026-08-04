import { useState } from 'react'
import { FileText, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useFilterQuotationsQuery,
  useUpdateQuotationStatusMutation,
} from '@/store/slice/users/api/api'
import type { TPosQuotation } from '@/store/slice/users/types/pos-types'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, StatusBadge, fmtDate, useListFilter } from '../shared'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'



export default function QuotationPage() {
  const { keyword, setKeyword, page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterQuotationsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    StatusId: statusId,
  })
  const [updateStatus] = useUpdateQuotationStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const openAdd = () => { setEditId(undefined); setModal(true) }
  const openEdit = (id: number) => { setEditId(id); setModal(true) }

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
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Số phiếu',
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => row.original.Id && openEdit(row.original.Id)}
        >
          <VoucherTag value={row.original.Code} />
        </button>
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
        <MoneyTag value={row.original.Total ?? row.original.SubTotal} />
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
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={goPage}
        emptyText="Không có báo giá nào"
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title="Tạo báo giá"
        endpoints={{ detail: 'quotations/detail', create: 'quotations/create', update: 'quotations/update' }}
        options={{ customer: true }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
