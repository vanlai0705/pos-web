import { useState, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import {
  fmtNum, fmtDateOnly, currentMonthRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn, useReportExcel,
} from '../shared'

const TAB_KEYS = [
  'pages.report.currency.tabReceiptPayment',
  'pages.report.currency.tabReceipt',
  'pages.report.currency.tabPayment',
  'pages.report.currency.tabCashBalance',
]

// ─── Receipt-Payment (combined) ───────────────────────────────────────────────

function ReceiptPaymentReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-receipt-payment',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('metrics.totalReceipt'), value: s.Receipt || 0, tone: 'emerald' },
        { title: t('metrics.totalPayment'), value: s.Payment || 0, tone: 'rose' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.objectName')}</TH>
              <TH>{t('pages.report.currency.addressOrDocument')}</TH>
              <TH>{t('common.reason')}</TH>
              <TH right>{t('metrics.totalReceipt')}</TH>
              <TH right>{t('metrics.totalPayment')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold className="text-indigo-600">{item.Name}</TD>
                <TD>{item.ObjectName || '—'}</TD>
                <TD>{item.Address || item.OriginDocument || '—'}</TD>
                <TD>{item.ReceiptPaymentReason?.Name || '—'}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Receipt)}</TD>
                <TD right bold className="text-rose-700">{fmtNum(item.Payment)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Receipt (Phiếu thu) ──────────────────────────────────────────────────────

function ReceiptReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-receipt',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[{ title: t('metrics.totalReceipt'), value: s.Receipt || 0, tone: 'emerald' }]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.objectName')}</TH>
              <TH>{t('common.address')}</TH>
              <TH>{t('pages.report.currency.originalDocument')}</TH>
              <TH>{t('common.reason')}</TH>
              <TH right>{t('metrics.grandTotal')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.ObjectName || '—'}</TD>
                <TD>{item.Address || '—'}</TD>
                <TD>{item.OriginDocument || '—'}</TD>
                <TD>{item.ReceiptPaymentReason?.Name || '—'}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Receipt)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Payment (Phiếu chi) ──────────────────────────────────────────────────────

function PaymentReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-payment',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[{ title: t('metrics.totalPayment'), value: s.Payment || 0, tone: 'rose' }]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.objectName')}</TH>
              <TH>{t('common.address')}</TH>
              <TH>{t('pages.report.currency.originalDocument')}</TH>
              <TH>{t('common.reason')}</TH>
              <TH right>{t('metrics.grandTotal')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.ObjectName || '—'}</TD>
                <TD>{item.Address || '—'}</TD>
                <TD>{item.OriginDocument || '—'}</TD>
                <TD>{item.ReceiptPaymentReason?.Name || '—'}</TD>
                <TD right bold className="text-rose-700">{fmtNum(item.Payment)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Cash Balance (Tồn quỹ) ───────────────────────────────────────────────────

function CashBalanceReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-cash-balance',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('metrics.openingBalance'), value: s.Beginning || 0, tone: 'sky' },
        { title: t('metrics.totalReceipt'), value: s.Receipt || 0, tone: 'emerald' },
        { title: t('metrics.totalPayment'), value: s.Payment || 0, tone: 'rose' },
        { title: t('metrics.endingBalance'), value: s.End || 0, tone: 'amber' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.description')}</TH>
              <TH right>{t('pages.report.currency.receiptShort')}</TH>
              <TH right>{t('pages.report.currency.paymentShort')}</TH>
              <TH right>{t('common.inventory')}</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : (
              <>
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                    <TD center>{page * pageSize + idx + 1}</TD>
                    <TD center>{fmtDateOnly(item.Date)}</TD>
                    <TD bold>{item.Name}</TD>
                    <TD className="max-w-[240px] truncate" title={item.Detail}>{item.Detail || '—'}</TD>
                    <TD right>{fmtNum(item.Receipt)}</TD>
                    <TD right>{fmtNum(item.Payment)}</TD>
                    <TD right bold className="text-emerald-700">{fmtNum(item.Balance)}</TD>
                  </tr>
                ))}
                {s.End != null && (
                  <tr className="bg-slate-50">
                    <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-slate-700">{t('metrics.endingBalance')}</td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-slate-900">{fmtNum(s.End)}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportCurrencyPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)
  const range = currentMonthRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)
  const { exportExcel, exporting } = useReportExcel()
  const tabs = TAB_KEYS.map(key => t(key))

  /** One export endpoint per tab, all scoped by the shared date range. */
  const EXPORTS = [
    { url: 'excels/export-receipt-payment', file: 'danh-sach-thu-chi.xlsx' },
    { url: 'excels/export-receipt', file: 'phieu-thu.xlsx' },
    { url: 'excels/export-payment', file: 'phieu-chi.xlsx' },
    { url: 'excels/export-cash-balance', file: 'ton-quy.xlsx' },
  ]

  const handleExport = () => {
    const target = EXPORTS[tab]
    if (target) exportExcel(target.url, { DateFrom: dateFrom, DateTo: dateTo }, target.file)
  }

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{t('pages.report.currency.title')}</p>
            <p className="text-[11px] text-slate-500">{t('pages.report.currency.subtitle')}</p>
          </div>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <ReportTabs tabs={tabs} active={tab} onSelect={setTab} />
          <div className="flex items-center gap-2 flex-wrap">
            <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
            <ExcelBtn onClick={handleExport} loading={exporting} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-3">
        {tab === 0 && <ReceiptPaymentReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 1 && <ReceiptReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 2 && <PaymentReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 3 && <CashBalanceReport dateFrom={dateFrom} dateTo={dateTo} />}
      </div>
    </div>
  )
}
