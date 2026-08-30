import type { TPosDebtItem } from '@/store/slice/users/types/pos-types'
import { LiabilityDetailDialog } from '@/components/pos/liability-detail-dialog'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { OBJECT_TYPE, RECEIPT_PAYMENT_FOR, RECEIPT_PAYMENT_TYPE, ReceiptPayment, ReceiptPaymentDialog } from '@/components/pos/receipt-payment-dialog'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { MoneyTag } from '@/components/ui/data-tag'
import { ListPageHeader, PAGE_SIZE, SearchBar } from '@/pages/actives/shared'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import { Banknote, Info, MoreHorizontal, Users } from 'lucide-react'
import { useState } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const RECEIPT_ENDPOINTS = { detail: 'receipt/detail', create: 'receipt/create', update: 'receipt/update' }

export default function LiabilityCustomerPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [customerGroup, setCustomerGroup] = useState<LookupItem | null>(null)
  const [showAll, setShowAll] = useState(true)

  const [detailFor, setDetailFor] = useState<number | null>(null)
  const [payFor, setPayFor] = useState<Partial<ReceiptPayment> | null>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'liabilities/filter-customer',
    params: {
      Keyword: keyword || undefined,
      CustomerGroupId: customerGroup?.Id || undefined, IsShowAll: showAll,
      PageIndex: page - 1, PageSize: pageSize,
    },
  })

  const items = (data?.Items ?? []) as TPosDebtItem[]
  const total = data?.TotalItemCount ?? 0

  const openPay = (row: TPosDebtItem) => {
    const c = row.Customer
    setPayFor({
      ReceiptPaymentType: RECEIPT_PAYMENT_FOR.LIABILITY_CUSTOMER,
      ObjectType: OBJECT_TYPE.Customer,
      Customer: c ?? null,
      ObjectName: c?.Name ?? row.ObjectName ?? '',
      Address: c?.Address ?? '',
      Amount: row.Total ?? 0,
    })
  }

  const columns: ColumnDef<TPosDebtItem>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã khách', cell: ({ row }) => <span className="text-xs">{row.original.Customer?.CustomerCode ?? '—'}</span> },
    {
      id: 'customer', header: 'Khách hàng',
      cell: ({ row }) => {
        const c = row.original.Customer
        return <span className="font-medium">{c?.Name ?? row.original.ObjectName ?? '—'}</span>
      },
    },
    { id: 'group', header: 'Nhóm', cell: ({ row }) => <span className="text-xs">{row.original.Customer?.CustomerGroup?.Name ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Customer?.Address ?? '—'}</span> },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span className="text-xs">{row.original.Customer?.Phone ?? '—'}</span> },
    {
      id: 'total', header: 'Còn nợ',
      cell: ({ row }) => (
        <span className={row.original.Total != null && row.original.Total < 0 ? 'text-red-600' : ''}>
          <MoneyTag value={row.original.Total} />
        </span>
      ),
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const r = row.original
        const id = r.Customer?.Id
        if (!id) return null
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDetailFor(id)}>
                <Info className="h-3.5 w-3.5 mr-2" /> Chi tiết công nợ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openPay(r)}>
                <Banknote className="h-3.5 w-3.5 mr-2" /> Thanh toán
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Công nợ khách hàng" icon={Users}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder="Tìm khách hàng..." />
        <LookupSelect className="w-44" endpoint="customergroups/filter-simple" placeholder="Tất cả nhóm"
          value={customerGroup} onChange={v => { setCustomerGroup(v); setPage(1) }} />
        <label className="flex h-8 cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showAll} onChange={e => { setShowAll(e.target.checked); setPage(1) }} />
          Hiển thị tất cả
        </label>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText="Không có công nợ khách hàng"
      />

      <LiabilityDetailDialog
        open={detailFor != null}
        onOpenChange={o => { if (!o) setDetailFor(null) }}
        endpoint="liabilities/filter-liabilities-customer"
        customerId={detailFor ?? undefined}
      />

      <ReceiptPaymentDialog
        open={!!payFor}
        onOpenChange={o => { if (!o) setPayFor(null) }}
        type={RECEIPT_PAYMENT_TYPE.RECEIPT}
        endpoints={RECEIPT_ENDPOINTS}
        initial={payFor ?? undefined}
        disableObjectType
        onSaved={() => { setPayFor(null); refetch() }}
      />
    </div>
  )
}
