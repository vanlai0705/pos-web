import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart2 } from 'lucide-react'
import { useGetProductGroupsSimpleQuery } from '@/store/slice/customers/api'
import { useFilterProductStatisticsQuery } from '@/store/slice/statistics/api'
import type { TPosProductStatisticItem } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  ListPageHeader, DateRangeFilter, SummaryCard, useListFilter, defaultDateTo, todayDateFrom,
} from '../shared'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'

export default function ProductStatisticsPage() {
  const { t } = useTranslation()
  const { page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter(todayDateFrom(), defaultDateTo())
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data, isLoading } = useFilterProductStatisticsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    DateFrom: dateFrom,
    DateTo: dateTo,
    ProductGroupId: groupId || undefined,
  })

  const { data: groups = [] } = useGetProductGroupsSimpleQuery()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const sumary = data?.Sumary

  const columns: ColumnDef<TPosProductStatisticItem>[] = [
    {
      id: 'stt',
      header: t('common.index'),
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'productCode',
      header: t('common.productCode'),
      cell: ({ row }) => <CodeTag value={row.original.Product?.ProductCode} />,
    },
    {
      id: 'productName',
      header: t('common.productName'),
      cell: ({ row }) => <span className="font-medium">{row.original.Product?.Name ?? '—'}</span>,
    },
    {
      id: 'unit',
      header: t('pages.actives.productStatistics.unitShort'),
      cell: ({ row }) => row.original.Unit?.Name ?? '—',
    },
    {
      id: 'quantity',
      header: t('common.quantity'),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.Quantity?.toLocaleString('vi-VN') ?? '—'}</span>
      ),
    },
    {
      id: 'price',
      header: t('common.price'),
      cell: ({ row }) => <MoneyTag value={row.original.Price} />,
    },
    {
      id: 'priceInput',
      header: t('pages.actives.productStatistics.priceInput'),
      cell: ({ row }) => <MoneyTag value={row.original.PriceInput} />,
    },
    {
      id: 'amount',
      header: t('pages.actives.productStatistics.amountSold'),
      cell: ({ row }) => <MoneyTag value={row.original.Amount} />,
    },
    {
      id: 'amountInput',
      header: t('pages.actives.productStatistics.amountInput'),
      cell: ({ row }) => <MoneyTag value={row.original.AmountInput} />,
    },
    {
      id: 'profit',
      header: t('pages.actives.productStatistics.profit'),
      cell: ({ row }) => (
        <MoneyTag value={row.original.Profit} />
      ),
    },
    {
      id: 'profitPercent',
      header: t('pages.actives.productStatistics.profitPercent'),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.ProfitPercent != null ? `${row.original.ProfitPercent.toFixed(1)}%` : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.productStatistics.pageTitle')} icon={BarChart2}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value === '' ? '' : Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pages.actives.productStatistics.allGroups')}</option>
          {groups.map(g => <option key={g.Id} value={g.Id}>{g.Name}</option>)}
        </select>
      </ListPageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label={t('pages.actives.productStatistics.totalQuantity')} value={sumary?.Quantity} />
        <SummaryCard label={t('pages.actives.productStatistics.amountSold')} value={sumary?.Amount} currency />
        <SummaryCard label={t('pages.actives.productStatistics.amountInput')} value={sumary?.AmountInput} currency />
        <SummaryCard label={t('pages.actives.productStatistics.totalProfit')} value={sumary?.Profit} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={goPage}
        emptyText={t('common.noData')}
      />
    </div>
  )
}
