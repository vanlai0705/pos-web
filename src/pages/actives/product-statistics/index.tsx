import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { useFilterProductStatisticsQuery, useGetProductGroupsSimpleQuery } from '@/store/slice/users/api/api'
import type { TPosProductStatisticItem } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  ListPageHeader, DateRangeFilter, SummaryCard, useListFilter,
} from '../shared'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'

export default function ProductStatisticsPage() {
  const { page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data, isLoading } = useFilterProductStatisticsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    DateFrom: dateFrom,
    DateTo: dateTo,
    GroupId: groupId || undefined,
  })

  const { data: groups = [] } = useGetProductGroupsSimpleQuery()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const sumary = data?.Sumary

  const columns: ColumnDef<TPosProductStatisticItem>[] = [
    {
      id: 'stt',
      header: 'STT',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'productCode',
      header: 'Mã hàng',
      cell: ({ row }) => <CodeTag value={row.original.Product?.ProductCode} />,
    },
    {
      id: 'productName',
      header: 'Tên mặt hàng',
      cell: ({ row }) => <span className="font-medium">{row.original.Product?.Name ?? '—'}</span>,
    },
    {
      id: 'unit',
      header: 'ĐVT',
      cell: ({ row }) => row.original.Unit?.Name ?? '—',
    },
    {
      id: 'quantity',
      header: 'Số lượng',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.Quantity?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'price',
      header: 'Đơn giá',
      cell: ({ row }) => <MoneyTag value={row.original.Price} />,
    },
    {
      id: 'priceInput',
      header: 'Giá vốn',
      cell: ({ row }) => <MoneyTag value={row.original.PriceInput} />,
    },
    {
      id: 'amount',
      header: 'Thành tiền bán',
      cell: ({ row }) => <MoneyTag value={row.original.Amount} />,
    },
    {
      id: 'amountInput',
      header: 'Thành tiền nhập',
      cell: ({ row }) => <MoneyTag value={row.original.AmountInput} />,
    },
    {
      id: 'profit',
      header: 'Lãi',
      cell: ({ row }) => (
        <MoneyTag value={row.original.Profit} />
      ),
    },
    {
      id: 'profitPercent',
      header: 'Tỷ lệ lãi',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.ProfitPercent != null ? `${row.original.ProfitPercent.toFixed(1)}%` : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title="Thống kê mặt hàng bán" icon={BarChart2}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tất cả nhóm</option>
          {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
        </select>
      </ListPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Tổng số lượng" value={sumary?.Quantity} />
        <SummaryCard label="Thành tiền bán" value={sumary?.Amount} currency />
        <SummaryCard label="Thành tiền nhập" value={sumary?.AmountInput} currency />
        <SummaryCard label="Tổng lãi" value={sumary?.Profit} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={goPage}
        emptyText="Không có dữ liệu"
      />
    </div>
  )
}
