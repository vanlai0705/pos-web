import { useState, useEffect } from 'react'
import { Wallet } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import {
  fmtNum, fmtDateOnly, currentMonthRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn,
} from '../shared'

const TABS = ['Danh sách thu chi', 'Phiếu thu', 'Phiếu chi', 'Tồn quỹ']

// ─── Receipt-Payment (combined) ───────────────────────────────────────────────

function ReceiptPaymentReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-receipt-payment',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Tổng thu', value: s.Receipt || 0, tone: 'emerald' },
        { title: 'Tổng chi', value: s.Payment || 0, tone: 'rose' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Tên đối tượng</TH>
              <TH>Địa chỉ / Chứng từ</TH>
              <TH>Lý do</TH>
              <TH right>Tổng thu</TH>
              <TH right>Tổng chi</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
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

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Receipt (Phiếu thu) ──────────────────────────────────────────────────────

function ReceiptReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-receipt',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[{ title: 'Tổng thu', value: s.Receipt || 0, tone: 'emerald' }]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Tên đối tượng</TH>
              <TH>Địa chỉ</TH>
              <TH>Chứng từ gốc</TH>
              <TH>Lý do</TH>
              <TH right>Tổng cộng</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
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

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Payment (Phiếu chi) ──────────────────────────────────────────────────────

function PaymentReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-payment',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[{ title: 'Tổng chi', value: s.Payment || 0, tone: 'rose' }]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Tên đối tượng</TH>
              <TH>Địa chỉ</TH>
              <TH>Chứng từ gốc</TH>
              <TH>Lý do</TH>
              <TH right>Tổng cộng</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={8} /> : items.length === 0 ? <TableNoData cols={8} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
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

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Cash Balance (Tồn quỹ) ───────────────────────────────────────────────────

function CashBalanceReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-cash-balance',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Tồn đầu kỳ', value: s.Beginning || 0, tone: 'sky' },
        { title: 'Tổng thu', value: s.Receipt || 0, tone: 'emerald' },
        { title: 'Tổng chi', value: s.Payment || 0, tone: 'rose' },
        { title: 'Tồn cuối kỳ', value: s.End || 0, tone: 'amber' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Diễn giải</TH>
              <TH right>Thu</TH>
              <TH right>Chi</TH>
              <TH right>Tồn</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : (
              <>
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                    <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
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
                    <td colSpan={6} className="px-2 py-2 text-xs font-semibold text-slate-700">Tồn cuối kỳ</td>
                    <td className="px-2 py-2 text-right text-xs font-bold text-slate-900">{fmtNum(s.End)}</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportCurrencyPage() {
  const [tab, setTab] = useState(0)
  const range = currentMonthRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Báo cáo thu chi</p>
            <p className="text-[11px] text-slate-500">Phiếu thu, phiếu chi và tồn quỹ</p>
          </div>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <ReportTabs tabs={TABS} active={tab} onSelect={setTab} />
          <div className="flex items-center gap-2 flex-wrap">
            <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
            <ExcelBtn onClick={() => {}} />
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
