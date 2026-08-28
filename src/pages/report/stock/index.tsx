import { useState, useEffect } from 'react'
import { Calculator, RefreshCw, Search, Warehouse } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/generic/api'
import { useFilterWarehousesQuery } from '@/store/slice/stocks/api'
import {
  fmtNum, fmtDateOnly, todayRange, REPORT_PAGE_SIZE,
  StatCards, ReportDateFilter, ReportTabs,
  TH, TD, TableNoData, SkeletonRows, ReportPagination, ExcelBtn, useReportExcel,
  ProductGroupFilter, ShopFilter,
} from '../shared'
import { STATUS } from '@/constants/status'
import { toast } from 'sonner'

const TAB_KEYS = [
  'pages.report.stock.tabStockIn',
  'pages.report.stock.tabStockOut',
  'pages.report.stock.tabStockCheck',
  'pages.report.stock.tabStockTransfer',
  'pages.report.stock.tabInventory',
]

// ─── Stock In ─────────────────────────────────────────────────────────────────

function StockInReport({ dateFrom, dateTo, shopId }: { dateFrom: string; dateTo: string; shopId: number | null }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-in',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize, ShopId: shopId || undefined },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.stock.quantityIn'), value: s.QuantityIn || 0, tone: 'sky' },
        { title: t('metrics.grandTotal'), value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.supplier')}</TH>
              <TH>{t('common.stockIn')}</TH>
              <TH right>{t('pages.report.stock.quantityIn')}</TH>
              <TH right>{t('metrics.amount')}</TH>
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

function StockOutReport({ dateFrom, dateTo, shopId }: { dateFrom: string; dateTo: string; shopId: number | null }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-out',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize, ShopId: shopId || undefined },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.stock.quantityOut'), value: s.QuantityOut || 0, tone: 'sky' },
        { title: t('metrics.grandTotal'), value: s.Total || 0, tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.employee')}</TH>
              <TH>{t('common.stockOut')}</TH>
              <TH right>{t('common.quantity')}</TH>
              <TH right>{t('metrics.grandTotal')}</TH>
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

function StockCheckReport({ dateFrom, dateTo, shopId }: { dateFrom: string; dateTo: string; shopId: number | null }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-check',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize, ShopId: shopId || undefined },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.stock.quantityIn'), value: s.QuantityIn || 0, tone: 'sky' },
        { title: t('pages.report.stock.quantityOut'), value: s.QuantityOut || 0, tone: 'amber' },
        { title: t('pages.report.stock.difference'), value: (s.QuantityIn || 0) + (s.QuantityOut || 0), tone: 'emerald' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.employee')}</TH>
              <TH>{t('common.stockIn')}</TH>
              <TH>{t('common.stockOut')}</TH>
              <TH right>{t('common.qtyIn')}</TH>
              <TH right>{t('common.qtyOut')}</TH>
              <TH right>{t('pages.report.stock.difference')}</TH>
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

function StockTransferReport({ dateFrom, dateTo, shopId }: { dateFrom: string; dateTo: string; shopId: number | null }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'reports/filter-stock-transfer',
    params: { DateFrom: dateFrom, DateTo: dateTo, PageIndex: page, PageSize: pageSize, ShopId: shopId || undefined },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('pages.report.stock.quantityTransfer'), value: s.QuantityTransfer || 0, tone: 'sky' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH center>{t('common.date')}</TH>
              <TH>{t('common.voucherNo')}</TH>
              <TH>{t('common.employee')}</TH>
              <TH>{t('common.stockIn')}</TH>
              <TH>{t('common.stockOut')}</TH>
              <TH right>{t('common.qtyTransfer')}</TH>
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

function InventoryReport({
  dateFrom, dateTo, keyword, stockId, productGroupId, isLowStock, shopId,
}: {
  dateFrom: string
  dateTo: string
  keyword: string
  stockId: number | null
  productGroupId: number | null
  isLowStock?: boolean
  shopId: number | null
}) {
  const { t } = useTranslation()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(REPORT_PAGE_SIZE)
  const { data, isFetching } = useFilterReportQuery({
    path: 'inventory/filter',
    // `isLowStock` stays undefined for "Tất cả" so the key is omitted from the
    // query entirely, rather than sent as `false` (which the backend reads as
    // "only in-stock", not "no filter").
    params: {
      DateFrom: dateFrom,
      DateTo: dateTo,
      PageIndex: page,
      PageSize: pageSize,
      Keyword: keyword || undefined,
      StockId: stockId || undefined,
      ProductGroupId: productGroupId || undefined,
      IsLowStock: isLowStock,
      ShopId: shopId || undefined,
    },
  })

  useEffect(() => { setPage(0) }, [dateFrom, dateTo, keyword, stockId, productGroupId, isLowStock, shopId])

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const s = data?.Sumary ?? {}

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <StatCards cards={[
        { title: t('metrics.periodStockIn'), value: s.QuantityIn || 0, tone: 'sky' },
        { title: t('metrics.periodStockOut'), value: s.QuantityOut || 0, tone: 'amber' },
        { title: t('metrics.endingBalance'), value: s.QuantityEnd || 0, tone: 'emerald' },
        { title: t('metrics.amount'), value: s.Amount || 0, tone: 'rose' },
      ]} />

      <div className="flex-1 min-h-0 overflow-auto mt-2">
        <table className="w-full text-xs border-separate min-w-max" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <TH center>{t('common.index')}</TH>
              <TH>{t('common.productCode')}</TH>
              <TH>{t('common.productName')}</TH>
              <TH>{t('common.unit')}</TH>
              <TH right>{t('metrics.openingBalance')}</TH>
              <TH right>{t('metrics.periodStockIn')}</TH>
              <TH right>{t('metrics.periodStockOut')}</TH>
              <TH right>{t('metrics.endingBalance')}</TH>
              <TH right>{t('common.price')}</TH>
              <TH right>{t('metrics.amount')}</TH>
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

/** undefined = "Tồn kho Tất cả" (no filter sent), matching the other two options. */
const LOW_STOCK_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tồn kho Tất cả' },
  { value: 'true', label: 'Chỉ hiển thị hết hàng' },
  { value: 'false', label: 'Chỉ hiển thị hàng còn trong kho' },
]

function StockFilter({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { t } = useTranslation()
  const { data } = useFilterWarehousesQuery({ PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE })
  const stocks = data?.Items ?? []

  return (
    <select
      value={value ?? ''}
      onChange={event => onChange(event.target.value ? Number(event.target.value) : null)}
      className="h-8 min-w-[140px] rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
    >
      <option value="">{t('common.stock')}</option>
      {stocks.map((stock: any) => (
        <option key={stock.Id} value={stock.Id}>{stock.Name}</option>
      ))}
    </select>
  )
}

function ReportActions({ onAverage, onLatest, loading }: { onAverage: () => void; onLatest: () => void; loading?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={loading}
        onClick={onAverage}
        className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        <Calculator className="h-3.5 w-3.5" />
        Giá vốn TB
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onLatest}
        className="flex h-8 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Giá nhập gần nhất
      </button>
    </div>
  )
}

export default function ReportStockPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)
  const range = todayRange()
  const [dateFrom, setDateFrom] = useState(range.from)
  const [dateTo, setDateTo] = useState(range.to)
  const [keyword, setKeyword] = useState('')
  const [stockId, setStockId] = useState<number | null>(null)
  const [productGroupId, setProductGroupId] = useState<number | null>(null)
  const [shopId, setShopId] = useState<number | null>(null)
  const [lowStockFilter, setLowStockFilter] = useState('all')
  const isLowStock = lowStockFilter === 'all' ? undefined : lowStockFilter === 'true'
  const { exportExcel, exporting } = useReportExcel()
  const [postAction, { isLoading: recalculating }] = useGenericPostMutation()
  const tabs = TAB_KEYS.map(key => t(key))

  /**
   * One export endpoint per stock-document tab. Tồn kho has none — pos_web
   * offers no Excel export there either — so the button is hidden on that tab.
   */
  const EXPORTS = [
    { url: 'excels/export-stock-in', file: 'nhap-kho.xlsx' },
    { url: 'excels/export-stock-out', file: 'xuat-kho.xlsx' },
    { url: 'excels/export-stock-check', file: 'kiem-kho.xlsx' },
    { url: 'excels/export-stock-transfer', file: 'chuyen-kho.xlsx' },
  ]

  const handleExport = () => {
    const target = EXPORTS[tab]
    if (!target) return
    exportExcel(target.url, { DateFrom: dateFrom, DateTo: dateTo, ShopId: shopId || undefined }, target.file)
  }

  const recalculateCost = async (url: string, message: string) => {
    try {
      await postAction({ url }).unwrap()
      toast.success(message)
    } catch {
      toast.error(t('pages.report.shared.error', { defaultValue: 'Có lỗi xảy ra' }))
    }
  }

  return (
    <div className="flex flex-col h-full gap-0">
      <div className="shrink-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Warehouse className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{t('pages.report.stock.title')}</p>
            <p className="text-[11px] text-slate-500">{t('pages.report.stock.subtitle')}</p>
          </div>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <ReportTabs tabs={tabs} active={tab} onSelect={setTab} />
          <div className="flex items-center gap-2 flex-wrap">
            {tab === 4 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  placeholder={t('common.search')}
                  className="h-8 w-[150px] rounded-md border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-700 shadow-sm outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
            <ReportDateFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
            {tab === 4 && (
              <>
                <StockFilter value={stockId} onChange={setStockId} />
                <ProductGroupFilter value={productGroupId} onChange={setProductGroupId} />
                <select
                  value={lowStockFilter}
                  onChange={event => setLowStockFilter(event.target.value)}
                  className="h-8 min-w-[150px] rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                >
                  {LOW_STOCK_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </>
            )}
            <ShopFilter value={shopId} onChange={setShopId} />
            {tab === 4 && (
              <ReportActions
                loading={recalculating}
                onAverage={() => recalculateCost('inventory/update-cost-by-average', 'Đã tính giá vốn trung bình')}
                onLatest={() => recalculateCost('inventory/update-cost-by-latest', 'Đã tính giá vốn gần nhất')}
              />
            )}
            {EXPORTS[tab] && <ExcelBtn onClick={handleExport} loading={exporting} />}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col p-3">
        {tab === 0 && <StockInReport dateFrom={dateFrom} dateTo={dateTo} shopId={shopId} />}
        {tab === 1 && <StockOutReport dateFrom={dateFrom} dateTo={dateTo} shopId={shopId} />}
        {tab === 2 && <StockCheckReport dateFrom={dateFrom} dateTo={dateTo} shopId={shopId} />}
        {tab === 3 && <StockTransferReport dateFrom={dateFrom} dateTo={dateTo} shopId={shopId} />}
        {tab === 4 && (
          <InventoryReport
            dateFrom={dateFrom}
            dateTo={dateTo}
            keyword={keyword}
            stockId={stockId}
            productGroupId={productGroupId}
            isLowStock={isLowStock}
            shopId={shopId}
          />
        )}
      </div>
    </div>
  )
}
