import { useState } from 'react'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { ClipboardCheck, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/generic/api'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, PAGE_SIZE, todayDateFrom, defaultDateTo } from '@/pages/actives/shared'
import { fmtDateTime } from '@/utils'
import type { TPosStockCheck } from '@/store/slice/users/types/pos-types'
import { VoucherTag } from '@/components/ui/data-tag'

// Status codes match pos_web: 0 active, 1 locked, 2 deleted.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const


export default function StockChecksPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(todayDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockchecks/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPosStockCheck[]
  const total = data?.TotalItemCount ?? 0

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: { Id?: number }) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: { Id?: number }, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá phiếu này?' })) return
    try {
      await request({ url: `stockchecks/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosStockCheck>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'user', header: 'Nhân viên', cell: ({ row }) => <span>{row.original.User?.Name ?? '—'}</span> },
    { id: 'stockIn', header: 'Kho nhập', cell: ({ row }) => <span>{row.original.StockIn?.Name ?? '—'}</span> },
    { id: 'stockOut', header: 'Kho xuất', cell: ({ row }) => <span>{row.original.StockOut?.Name ?? '—'}</span> },
    { id: 'qtyIn', header: 'SL nhập', cell: ({ row }) => <span className="tabular-nums text-emerald-700">{row.original.QuantityIn?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'qtyOut', header: 'SL xuất', cell: ({ row }) => <span className="tabular-nums text-rose-700">{row.original.QuantityOut?.toLocaleString('vi-VN') ?? '—'}</span> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>Chỉnh sửa</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive"
              onClick={() => changeStatus(row.original, STATUS.DELETED)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu kiểm kê" icon={ClipboardCheck}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm số phiếu..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo phiếu
        </Button>
      </ListPageHeader>

      <DataTable
        onRowDoubleClick={openEdit}
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có phiếu kiểm kê nào"
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title="Tạo phiếu kiểm kê"
        endpoints={{ detail: 'stockchecks/detail', create: 'stockchecks/create', update: 'stockchecks/update' }}
        options={{ stockIn: true, stockCheck: true }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
