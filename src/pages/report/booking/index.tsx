import { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import {
  fmtNum, fmtDateOnly, currentMonthRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn,
} from '../shared'

const TABS = ['Báo cáo đặt hàng', 'Tổng hợp mặt hàng đặt']

// ─── Booking report tab ───────────────────────────────────────────────────────

function BookingReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-booking',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Tiền hàng', value: s.SubTotal || 0, tone: 'sky' },
        { title: 'Giảm giá', value: s.Discount || 0, tone: 'rose' },
        { title: 'Phí vận chuyển', value: s.TransferCost || 0, tone: 'amber' },
        { title: 'Tổng cộng', value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Mã đặt hàng</TH>
              <TH>Khách hàng</TH>
              <TH center>Điện thoại</TH>
              <TH>Địa chỉ</TH>
              <TH right>Tiền hàng</TH>
              <TH right>Giảm giá</TH>
              <TH right>Thuế</TH>
              <TH right>Phí vận chuyển</TH>
              <TH right>Tổng cộng</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={11} /> : items.length === 0 ? <TableNoData cols={11} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.Customer?.Name || '—'}</TD>
                <TD center>{item.Customer?.Phone || '—'}</TD>
                <TD>{item.Customer?.Address || '—'}</TD>
                <TD right>{fmtNum(item.SubTotal)}</TD>
                <TD right>{fmtNum(item.Discount)}</TD>
                <TD right>{fmtNum(item.Tax)}</TD>
                <TD right>{fmtNum(item.TransferCost)}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Total)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Booking-item report tab ──────────────────────────────────────────────────

function BookingItemReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-booking-item',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: REPORT_PAGE_SIZE },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Số lượng', value: s.Quantity || 0, tone: 'sky' },
        { title: 'Thành tiền', value: s.Amount || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH>Mã hàng</TH>
              <TH>Mặt hàng</TH>
              <TH>Đơn vị tính</TH>
              <TH right>Số lượng</TH>
              <TH right>Đơn giá</TH>
              <TH right>Thành tiền</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * REPORT_PAGE_SIZE + idx + 1}</TD>
                <TD className="text-slate-500">{item.Product?.Barcode || '—'}</TD>
                <TD bold>{item.Product?.Name || '—'}</TD>
                <TD>{item.Unit?.Name || '—'}</TD>
                <TD right>{fmtNum(item.Quantity)}</TD>
                <TD right>{fmtNum(item.Price)}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.Amount)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={REPORT_PAGE_SIZE} onPage={setPage} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportBookingPage() {
  const [tab, setTab] = useState(0)
  const range = currentMonthRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Báo cáo đặt hàng</p>
            <p className="text-[11px] text-slate-500">Báo cáo đặt hàng theo đơn và mặt hàng</p>
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
        {tab === 0
          ? <BookingReport dateFrom={dateFrom} dateTo={dateTo} />
          : <BookingItemReport dateFrom={dateFrom} dateTo={dateTo} />
        }
      </div>
    </div>
  )
}
