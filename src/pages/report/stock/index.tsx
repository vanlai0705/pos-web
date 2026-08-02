import { useState, useEffect } from 'react'
import { Warehouse } from 'lucide-react'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import {
  fmtNum, fmtDateOnly, currentMonthRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn,
} from '../shared'

const TABS = ['Nhập kho', 'Xuất kho', 'Kiểm kho', 'Chuyển kho', 'Tồn kho']

// ─── Stock In ─────────────────────────────────────────────────────────────────

function StockInReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-in',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Số lượng nhập', value: s.QuantityIn || 0, tone: 'sky' },
        { title: 'Tổng cộng', value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Nhà cung cấp</TH>
              <TH>Kho nhập</TH>
              <TH right>Số lượng nhập</TH>
              <TH right>Thành tiền</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.Supplier?.Name || '—'}</TD>
                <TD>{item.StockIn?.Name || '—'}</TD>
                <TD right>{fmtNum(item.QuantityIn)}</TD>
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

// ─── Stock Out ────────────────────────────────────────────────────────────────

function StockOutReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-out',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Số lượng xuất', value: s.QuantityOut || 0, tone: 'sky' },
        { title: 'Tổng cộng', value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Nhân viên</TH>
              <TH>Kho xuất</TH>
              <TH right>Số lượng</TH>
              <TH right>Tổng cộng</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.User?.Name || '—'}</TD>
                <TD>{item.StockOut?.Name || '—'}</TD>
                <TD right>{fmtNum(item.QuantityOut)}</TD>
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

// ─── Stock Check (Kiểm kho) ───────────────────────────────────────────────────

function StockCheckReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-check',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Số lượng nhập', value: s.QuantityIn || 0, tone: 'sky' },
        { title: 'Số lượng xuất', value: s.QuantityOut || 0, tone: 'amber' },
        { title: 'Chênh lệch', value: (s.QuantityIn || 0) + (s.QuantityOut || 0), tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Nhân viên</TH>
              <TH>Kho nhập</TH>
              <TH>Kho xuất</TH>
              <TH right>SL nhập</TH>
              <TH right>SL xuất</TH>
              <TH right>Chênh lệch</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={9} /> : items.length === 0 ? <TableNoData cols={9} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.User?.Name || '—'}</TD>
                <TD>{item.StockIn?.Name || '—'}</TD>
                <TD>{item.StockOut?.Name || '—'}</TD>
                <TD right>{fmtNum(item.QuantityIn)}</TD>
                <TD right>{fmtNum(item.QuantityOut)}</TD>
                <TD right bold className="text-emerald-700">{fmtNum((item.QuantityIn || 0) + (item.QuantityOut || 0))}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Stock Transfer (Chuyển kho) ──────────────────────────────────────────────

function StockTransferReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-transfer',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Số lượng chuyển', value: s.QuantityTransfer || 0, tone: 'sky' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH center>Ngày</TH>
              <TH>Số phiếu</TH>
              <TH>Nhân viên</TH>
              <TH>Kho nhập</TH>
              <TH>Kho xuất</TH>
              <TH right>SL chuyển</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={7} /> : items.length === 0 ? <TableNoData cols={7} /> : items.map((item, idx) => (
              <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                <TD center>{page * pageSize + idx + 1}</TD>
                <TD center>{fmtDateOnly(item.Date)}</TD>
                <TD bold>{item.Name}</TD>
                <TD>{item.User?.Name || '—'}</TD>
                <TD>{item.StockIn?.Name || '—'}</TD>
                <TD>{item.StockOut?.Name || '—'}</TD>
                <TD right bold className="text-emerald-700">{fmtNum(item.QuantityTransfer)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Inventory (Tồn kho) ──────────────────────────────────────────────────────

function InventoryReport({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'inventory/filter',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: 'Nhập trong kỳ', value: s.QuantityIn || 0, tone: 'sky' },
        { title: 'Xuất trong kỳ', value: s.QuantityOut || 0, tone: 'amber' },
        { title: 'Tồn cuối kỳ', value: s.QuantityEnd || 0, tone: 'emerald' },
        { title: 'Thành tiền', value: s.Amount || 0, tone: 'rose' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>STT</TH>
              <TH>Mã hàng</TH>
              <TH>Tên mặt hàng</TH>
              <TH>ĐVT</TH>
              <TH right>Tồn đầu kỳ</TH>
              <TH right>Nhập trong kỳ</TH>
              <TH right>Xuất trong kỳ</TH>
              <TH right>Tồn cuối kỳ</TH>
              <TH right>Đơn giá</TH>
              <TH right>Thành tiền</TH>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching ? <SkeletonRows cols={10} /> : items.length === 0 ? <TableNoData cols={10} /> : items.map((item, idx) => {
              const qEnd = (item.QuantityBeginning || 0) + (item.QuantityIn || 0) - (item.QuantityOut || 0)
              const isNegative = qEnd < 0
              return (
                <tr key={idx} className={`transition-colors ${isNegative ? 'bg-rose-50/50 hover:bg-rose-100/50 text-rose-900' : 'hover:bg-sky-50/50'}`}>
                  <TD center>{page * pageSize + idx + 1}</TD>
                  <TD className="font-medium whitespace-nowrap">{item.Product?.ProductCode || '—'}</TD>
                  <TD bold>{item.Product?.Name || '—'}</TD>
                  <TD>{item.Product?.Unit?.Name || item.Unit?.Name || '—'}</TD>
                  <TD right>{fmtNum(item.QuantityBeginning)}</TD>
                  <TD right>{fmtNum(item.QuantityIn)}</TD>
                  <TD right>{fmtNum(item.QuantityOut)}</TD>
                  <TD right bold>{fmtNum(qEnd)}</TD>
                  <TD right>{fmtNum(item.Product?.Price)}</TD>
                  <TD right bold className="text-emerald-700">{fmtNum(item.Amount)}</TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ReportPagination page={page} total={total} pageSize={pageSize} onPage={setPage} onPageSizeChange={s => { setPageSize(s); setPage(0) }} />
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportStockPage() {
  const [tab, setTab] = useState(0)
  const range = currentMonthRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Warehouse className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Báo cáo kho hàng</p>
            <p className="text-[11px] text-slate-500">Báo cáo nhập xuất, kiểm và tồn kho</p>
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
        {tab === 0 && <StockInReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 1 && <StockOutReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 2 && <StockCheckReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 3 && <StockTransferReport dateFrom={dateFrom} dateTo={dateTo} />}
        {tab === 4 && <InventoryReport dateFrom={dateFrom} dateTo={dateTo} />}
      </div>
    </div>
  )
}
