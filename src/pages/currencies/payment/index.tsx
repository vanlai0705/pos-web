import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { TrendingDown, Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ReceiptPaymentDialog, RECEIPT_PAYMENT_TYPE } from '@/components/pos/receipt-payment-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, fmtDateTime, PAGE_SIZE, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import type { TPosCurrencyVoucher } from '@/store/slice/users/types/pos-types'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { withDomainPath } from '@/utils/domain-route'


export default function PaymentPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'payment/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPosCurrencyVoucher[]
  const total = data?.TotalItemCount ?? 0

  const isCreateRoute = location.pathname.endsWith('/currencies/payment-create')
  const openCreate = () => {
    setEditId(undefined)
    setModal(true)
    if (!isCreateRoute) navigate(withDomainPath('/currencies/payment-create'))
  }
  const openEdit = (row: { Id?: number }) => { if (row.Id) { setEditId(row.Id); setModal(true) } }
  const setDialogOpen = (open: boolean) => {
    setModal(open)
    if (!open && isCreateRoute) navigate(withDomainPath('/currencies/payment'), { replace: true })
  }

  useEffect(() => {
    if (isCreateRoute) {
      setEditId(undefined)
      setModal(true)
    }
  }, [isCreateRoute])

  const removeRow = async (row: { Id?: number }) => {
    if (!row.Id) return
    if (!window.confirm('Xoá phiếu chi này?')) return
    try {
      await request({ url: `Payment/update-status?id=${row.Id}&statusId=2`, method: 'POST', body: {} }).unwrap()
      toast.success('Xoá thành công')
      refetch()
    } catch { toast.error('Không thể xoá phiếu chi') }
  }

  const columns: ColumnDef<TPosCurrencyVoucher>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'name', header: 'Số phiếu', cell: ({ row }) => <VoucherTag value={row.original.Name} /> },
    { id: 'date', header: 'Ngày', cell: ({ row }) => <span>{fmtDateTime(row.original.Date)}</span> },
    { id: 'object', header: 'Tên đối tượng', cell: ({ row }) => <span>{row.original.ObjectName ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.Address ?? '—'}</span> },
    { id: 'reason', header: 'Lý do', cell: ({ row }) => <span className="text-xs">{row.original.ReceiptPaymentReason?.Name ?? '—'}</span> },
    { id: 'payment', header: 'Số tiền chi', cell: ({ row }) => <MoneyTag value={row.original.Payment} /> },
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
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => removeRow(row.original)}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Xoá
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Phiếu chi" icon={TrendingDown}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm phiếu chi..." />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo phiếu chi
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
        emptyText="Không có phiếu chi nào"
      />

      <ReceiptPaymentDialog
        open={modal} onOpenChange={setDialogOpen}
        type={RECEIPT_PAYMENT_TYPE.PAYMENT}
        endpoints={{ detail: 'payment/detail', create: 'payment/create', update: 'payment/update' }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
