import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useFilterRevenueStatisticsQuery, useFilterRevenueStatisticsSummaryQuery } from '@/store/slice/statistics/api'
import type { TPosRevenueStatItem } from '@/store/slice/users/types/pos-types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  ListPageHeader, DateRangeFilter, SummaryCard, fmtDateTime, useListFilter, PAGE_SIZE,
} from '../shared'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'

function RevenueTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const { data, isLoading } = useFilterRevenueStatisticsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    DateFrom: dateFrom,
    DateTo: dateTo,
  })

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const sumary = data?.Sumary

  const columns: ColumnDef<TPosRevenueStatItem>[] = [
    {
      id: 'stt',
      header: t('common.index'),
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'name',
      header: t('common.voucherNo'),
      cell: ({ row }) => <VoucherTag value={row.original.Name} />,
    },
    {
      id: 'date',
      header: t('common.date'),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDateTime(row.original.Date)}</span>,
    },
    {
      id: 'customer',
      header: t('common.customer'),
      cell: ({ row }) => row.original.Customer?.Name ?? '—',
    },
    {
      id: 'subTotal',
      header: t('pages.actives.revenueStatistics.subTotal'),
      cell: ({ row }) => <MoneyTag value={row.original.SubTotal} />,
    },
    {
      id: 'discount',
      header: t('pages.actives.revenueStatistics.discount'),
      cell: ({ row }) => <MoneyTag value={row.original.Discount} />,
    },
    {
      id: 'discountPercent',
      header: t('pages.actives.revenueStatistics.discountPercent'),
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.DiscountPercent != null ? `${row.original.DiscountPercent.toFixed(1)}%` : '—'}
        </span>
      ),
    },
    {
      id: 'transferCost',
      header: t('pages.actives.revenueStatistics.transferCost'),
      cell: ({ row }) => <MoneyTag value={row.original.TransferCost} />,
    },
    {
      id: 'total',
      header: t('pages.actives.revenueStatistics.total'),
      cell: ({ row }) => <MoneyTag value={row.original.Total} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label={t('pages.actives.revenueStatistics.subTotal')} value={sumary?.SubTotal} currency />
        <SummaryCard label={t('pages.actives.revenueStatistics.discount')} value={sumary?.Discount} currency />
        <SummaryCard label={t('pages.actives.revenueStatistics.transferCostFull')} value={sumary?.TransferCost} currency />
        <SummaryCard label={t('pages.actives.revenueStatistics.total')} value={sumary?.Total} currency />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText={t('common.noData')}
      />
    </div>
  )
}

function SummaryTab({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const { data: items = [], isLoading } = useFilterRevenueStatisticsSummaryQuery({ DateFrom: dateFrom, DateTo: dateTo })
  const totalAmount = items.reduce((sum, item) => sum + (item.Total ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <span className="font-semibold text-sm">{t('pages.actives.revenueStatistics.totalRevenue')}</span>
          <MoneyTag value={totalAmount || undefined} className="text-sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">{t('pages.actives.revenueStatistics.paymentMethod')}</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">{t('pages.actives.revenueStatistics.totalAmount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2.5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="h-4 w-28 ml-auto" /></td>
                  </tr>
                ))
                : items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">{item.FundType?.Name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right"><MoneyTag value={item.Total} /></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function RevenueStatisticsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'revenue' | 'summary'>('revenue')
  const { dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()

  const tabs = [
    { key: 'revenue', label: t('pages.actives.revenueStatistics.title') },
    { key: 'summary', label: t('pages.actives.revenueStatistics.tabSummary') },
  ] as const

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.revenueStatistics.title')} icon={TrendingUp}>
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
      </ListPageHeader>

      <div className="border-b flex gap-0">
        {tabs.map(tabItem => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === tabItem.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'revenue'
        ? <RevenueTab dateFrom={dateFrom} dateTo={dateTo} />
        : <SummaryTab dateFrom={dateFrom} dateTo={dateTo} />
      }
    </div>
  )
}
