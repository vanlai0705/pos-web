import { useState } from 'react'
import { ArrowUpFromLine, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosStockOutput } from '@/store/slice/users/types/pos-types'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'

// Status codes match pos_web: 0 active, 1 locked, 2 deleted.
const STATUS = { ACTIVE: 0, LOCKED: 1, DELETED: 2 } as const


export default function StockOutputsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockoutputs/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPosStockOutput[]
  const total = data?.TotalItemCount ?? 0

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: { Id?: number }) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: { Id?: number }, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !window.confirm('Xoá phiếu này?')) return
    try {
      await request({ url: `stockoutputs/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosStockOutput>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'user', header: 'Nhân viên', cell: ({ row }) => <span>{row.original.User?.Name ?? '—'}</span> },
    { id: 'stock', header: 'Kho xuất', cell: ({ row }) => <span>{row.original.StockOut?.Name ?? (row.original as any).Stock?.Name ?? '—'}</span> },
    { id: 'qty', header: 'SL xuất', cell: ({ row }) => <span className="tabular-nums">{row.original.QuantityOut?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'total', header: 'Thành tiền', cell: ({ row }) => <MoneyTag value={row.original.Total} /> },
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
      <ListPageHeader title="Phiếu xuất kho" icon={ArrowUpFromLine}>
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
        emptyText="Không có phiếu xuất kho nào"
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title="Tạo phiếu xuất kho"
        endpoints={{ detail: 'stockoutputs/detail', create: 'stockoutputs/create', update: 'stockoutputs/update' }}
        options={{ stockOut: true }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
