import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import {
  fmtNum, fmtDateOnly, todayRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn, useReportExcel,
  CustomerFilter, ShopFilter, ProductGroupFilter,
} from '../shared'

function discountAmt(item: any) {
  const d = Number(item?.Discount) || 0
  const dp = Number(item?.DiscountPercent) || 0
  const sub = Number(item?.SubTotal) || 0
  return d + (sub * dp) / 100
}

function taxAmt(item: any) {
  const tt = Number(item?.TotalTax) || 0
  if (tt) return tt
  const tp = Number(item?.Tax) || 0
  const sub = Number(item?.SubTotal) || 0
  return (Math.max(sub - discountAmt(item), 0) * tp) / 100
}

// ─── Order report tab ────────────────────────────────────────────────────────

function OrderReport({
  dateFrom, dateTo, customerId, shopId,
}: {
  dateFrom: string; dateTo: string; customerId: number | null; shopId: number | null
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-order',
    params: {
      DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize,
      ...(customerId ? { CustomerId: customerId } : {}),
      ...(shopId ? { ShopId: shopId } : {}),
    },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, customerId, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  const sumDiscount = s.Discount || items.reduce((acc, i) => acc + discountAmt(i), 0)
  const sumTax = s.TotalTax || items.reduce((acc, i) => acc + taxAmt(i), 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.order.statSubTotal'), value: s.SubTotal || 0, tone: 'sky' },
        { title: t('pages.report.order.statDiscount'), value: sumDiscount, tone: 'rose' },
        { title: t('pages.report.order.statTax'), value: sumTax, tone: 'amber' },
        { title: t('pages.report.order.statTransferCost'), value: s.TransferCost || 0, tone: 'indigo' },
        { title: t('pages.report.order.statCash'), value: s.Cash || 0, tone: 'cyan' },
        { title: t('pages.report.order.statTransfer'), value: s.Transfer || 0, tone: 'violet' },
        { title: t('pages.report.order.statCard'), value: s.Card || 0, tone: 'pink' },
        { title: t('pages.report.order.statTotal'), value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('pages.report.order.colStt')}</TH>
              <TH center>{t('pages.report.order.colDate')}</TH>
              <TH>{t('pages.report.order.colOrder')}</TH>
              <TH>{t('pages.report.order.colCustomer')}</TH>
              <TH right>{t('pages.report.order.colSubTotal')}</TH>
              <TH right>{t('pages.report.order.colChange')}</TH>
              <TH right>{t('pages.report.order.colDiscount')}</TH>
              <TH right>{t('pages.report.order.colTax')}</TH>
              <TH right>{t('pages.report.order.colTransferCost')}</TH>
              <TH right>{t('pages.report.order.colCash')}</TH>
              <TH right>{t('pages.report.order.colTransfer')}</TH>
              <TH right>{t('pages.report.order.colCard')}</TH>
              <TH right>{t('pages.report.order.colTotal')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={13} /> : items.length === 0 ? <TableNoData cols={13} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>
                  <div>{fmtDateOnly(item.Date)}</div>
                  <div className="text-[10px] text-slate-400">{item.Date ? new Date(item.Date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.Customer?.Name || '—'}</TD>
                <TD right>{fmtNum(item.SubTotal)}</TD>
                <TD right>{fmtNum(item.Change)}</TD>
                <TD right>{fmtNum(discountAmt(item))}</TD>
                <TD right>{fmtNum(taxAmt(item))}</TD>
                <TD right>{fmtNum(item.TransferCost)}</TD>
                <TD right>{fmtNum(item.Cash)}</TD>
                <TD right>{fmtNum(item.Transfer)}</TD>
                <TD right>{fmtNum(item.Card)}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Total)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Order-item report tab ────────────────────────────────────────────────────

function OrderItemReport({
  dateFrom, dateTo, productGroupId, shopId,
}: {
  dateFrom: string; dateTo: string; productGroupId: number | null; shopId: number | null
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-order-item',
    params: {
      DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize,
      ...(productGroupId ? { ProductGroupId: productGroupId } : {}),
      ...(shopId ? { ShopId: shopId } : {}),
    },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, productGroupId, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.order.statQtySold'), value: s.Quantity || 0, tone: 'sky' },
        { title: t('pages.report.order.statQtyReturned'), value: s.Exchange || 0, tone: 'amber' },
        { title: t('pages.report.order.statAmount'), value: s.Amount || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('pages.report.order.colStt')}</TH>
              <TH>{t('pages.report.order.colProductCode')}</TH>
              <TH>{t('pages.report.order.colProduct')}</TH>
              <TH>{t('pages.report.order.colUnit')}</TH>
              <TH right>{t('pages.report.order.colQtySold')}</TH>
              <TH right>{t('pages.report.order.colQtyReturned')}</TH>
              <TH right>{t('pages.report.order.colUnitPrice')}</TH>
              <TH right>{t('pages.report.order.colAmount')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD className="text-slate-500">{item.Product?.Barcode || '—'}</TD>
                <TD bold>{item.Product?.Name || '—'}</TD>
                <TD>{item.Unit?.Name || '—'}</TD>
                <TD right>{fmtNum(item.Quantity)}</TD>
                <TD right>{fmtNum(item.Exchange)}</TD>
                <TD right>{fmtNum(item.Price)}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Amount)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportOrderPage() {
  const { t } = useTranslation()
  const TABS = [t('pages.report.order.tabSales'), t('pages.report.order.tabItems')]
  const [tab, setTab] = useState(0)
  const range = todayRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [productGroupId, setProductGroupId] = useState<number | null>(null)
  const [shopId, setShopId] = useState<number | null>(null)
  const { exportExcel, exporting } = useReportExcel()

  /** Each tab exports its own dataset with the filters currently applied. */
  const handleExport = () =>
    tab === 0
      ? exportExcel('excels/export-order',
        { DateFrom: dateFrom, DateTo: dateTo, CustomerId: customerId, ShopId: shopId },
        'bao-cao-ban-hang.xlsx')
      : exportExcel('excels/export-order-item',
        { DateFrom: dateFrom, DateTo: dateTo, ProductGroupId: productGroupId, ShopId: shopId },
        'tong-hop-mat-hang-ban.xlsx')

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Header */}
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{t('pages.report.order.pageTitle')}</p>
            <p className="text-[11px] text-slate-500">{t('pages.report.order.pageDescription')}</p>
          </div>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <ReportTabs tabs={TABS} active={tab} onSelect={setTab} />
          <div className="flex items-center gap-2 flex-wrap">
            {tab === 0
              ? <CustomerFilter value={customerId} onChange={setCustomerId} />
              : <ProductGroupFilter value={productGroupId} onChange={setProductGroupId} />
            }
            <ShopFilter value={shopId} onChange={setShopId} />
            <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
            <ExcelBtn onClick={handleExport} loading={exporting} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-3">
        {tab === 0
          ? <OrderReport dateFrom={dateFrom} dateTo={dateTo} customerId={customerId} shopId={shopId} />
          : <OrderItemReport dateFrom={dateFrom} dateTo={dateTo} productGroupId={productGroupId} shopId={shopId} />
        }
      </div>
    </div>
  )
}
