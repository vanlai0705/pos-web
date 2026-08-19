import { useGenericPostMutation } from '@/store/slice/generic/api'
import { useState } from 'react';
import { confirmAction } from '@/components/ui/use-confirm-action'
import { ArrowDownToLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, PAGE_SIZE, todayDateFrom, defaultDateTo } from '@/pages/actives/shared'
import { RowActions } from '@/pages/managers/components'
import { fmtDateTime } from '@/utils'
import type { TPosStockInput } from '@/store/slice/users/types/pos-types'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'

import { STATUS } from '@/constants/status'


export default function StockInputsPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(todayDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'stockinputs/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPosStockInput[]
  const total = data?.TotalItemCount ?? 0

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: { Id?: number }) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: { Id?: number }, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá phiếu này?' })) return
    try {
      await request({ url: `stockinputs/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success('Lưu thành công')
      refetch()
    } catch { toast.error('Không thể cập nhật trạng thái') }
  }

  const columns: ColumnDef<TPosStockInput>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'supplier', header: 'Nhà cung cấp', cell: ({ row }) => <span>{row.original.Supplier?.Name ?? '—'}</span> },
    { id: 'stock', header: 'Kho nhập', cell: ({ row }) => <span>{row.original.StockIn?.Name ?? (row.original as any).Stock?.Name ?? '—'}</span> },
    { id: 'qty', header: 'SL nhập', cell: ({ row }) => <span className="tabular-nums">{row.original.QuantityIn?.toLocaleString('vi-VN') ?? '—'}</span> },
    { id: 'total', header: 'Thành tiền', cell: ({ row }) => <MoneyTag value={row.original.Total} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <RowActions
          onEdit={() => openEdit(row.original)}
          onDelete={() => changeStatus(row.original, STATUS.DELETED)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu nhập kho" icon={ArrowDownToLine}>
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
        emptyText="Không có phiếu nhập kho nào"
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title="Tạo phiếu nhập kho"
        endpoints={{ detail: 'stockinputs/detail', create: 'stockinputs/create', update: 'stockinputs/update' }}
        options={{ stockIn: true, supplier: true }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
