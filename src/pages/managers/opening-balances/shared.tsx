import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Download, FileSpreadsheet, Save, Upload, Warehouse } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'
import { ExcelImportDialog } from '@/components/pos/excel-import-dialog'
import {
  useFilterWarehousesQuery,
  useGenericDownloadMutation,
  useGenericPostMutation,
  useLazyFilterReportQuery,
} from '@/store/slice/users/api/api'
import { cn, downloadBlob } from '@/utils'

type EntityKey = 'Customer' | 'Supplier'

type Entity = Record<string, any>

type OpeningBalanceRow = {
  Id?: number
  Amount: number
  AmountText: string
  Liabilities?: number
  Note?: string
  Customer?: Entity
  Supplier?: Entity
}

type OpeningInventoryRow = {
  Id?: number
  Product?: Entity
  Stock?: Entity
  Unit?: Entity
  Quantity: number
  QuantityText: string
  UnitPrice: number
  UnitPriceText: string
  Amount: number
  QuantityCurrent?: number
  Note?: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function toDateInputValue(value: string) {
  return `${value}`.split('T')[0]
}

/**
 * Once a "ngày chốt" (closing date) has been recorded for this entity, the
 * server always echoes it back on `Sumary.Date` — the date field then locks
 * to that value so a stray edit can't silently overwrite a different day's
 * opening balance. Mirrors Angular's syncDateFromSummary exactly.
 */
function summaryDateOf(data: any): string | undefined {
  return data?.Sumary?.Date || data?.Summary?.Date
}

function parseNumber(value: string) {
  if (!value) return 0
  return Number(`${value}`.replace(/,/g, '').replace(/\s/g, '')) || 0
}

function formatNumber(value?: number | null) {
  return Number(value || 0).toLocaleString('en-US')
}

function formatMoney(value?: number | null) {
  return Number(value || 0).toLocaleString('vi-VN')
}

function toPascalImage(image: any) {
  return image
    ? {
        Id: image.Id || 0,
        Url: image.Url || image.url || '',
      }
    : undefined
}

function toPascalUnit(unit: any) {
  return unit
    ? {
        Id: unit.Id || 0,
        Name: unit.Name || '',
        Image: toPascalImage(unit.Image),
      }
    : undefined
}

function toPascalCustomer(entity: any) {
  return {
    Id: entity?.Id || 0,
    Name: entity?.Name || '',
    Email: entity?.Email || '',
    Address: entity?.Address || '',
    Phone: entity?.Phone || entity?.PhoneNumber || '',
    TaxNumber: entity?.TaxNumber || entity?.TaxCode || '',
    CompanyName: entity?.CompanyName || '',
    CitizenId: entity?.CitizenId || '',
    Image: toPascalImage(entity?.Image),
    CustomerCode: entity?.CustomerCode || entity?.Code || '',
    SupplierCode: entity?.SupplierCode || '',
    IsCompany: entity?.IsCompany || false,
    Note: entity?.Note || '',
    Birthday: entity?.Birthday || undefined,
    Status: entity?.Status ? { Id: entity.Status.Id || 0, Name: entity.Status.Name || '' } : undefined,
    CustomerGroup: entity?.CustomerGroup
      ? {
          Id: entity.CustomerGroup.Id || 0,
          Name: entity.CustomerGroup.Name || '',
          Image: toPascalImage(entity.CustomerGroup.Image),
        }
      : undefined,
  }
}

function toPascalSupplier(entity: any) {
  return {
    Id: entity?.Id || 0,
    Name: entity?.Name || '',
    Address: entity?.Address || '',
    Image: toPascalImage(entity?.Image),
    SupplierCode: entity?.SupplierCode || entity?.Code || '',
    Email: entity?.Email || '',
    Phone: entity?.Phone || entity?.PhoneNumber || '',
    Website: entity?.Website || '',
    IsCompany: entity?.IsCompany || false,
    TaxNumber: entity?.TaxNumber || entity?.TaxCode || '',
    Status: entity?.Status ? { Id: entity.Status.Id || 0, Name: entity.Status.Name || '' } : undefined,
    SupplierGroup: entity?.SupplierGroup
      ? {
          Id: entity.SupplierGroup.Id || 0,
          Name: entity.SupplierGroup.Name || '',
          Image: toPascalImage(entity.SupplierGroup.Image),
        }
      : undefined,
  }
}

function getEntity(row: OpeningBalanceRow, entityKey: EntityKey) {
  return row?.[entityKey] || row.Customer || row.Supplier || {}
}

function resolveAmount(item: any) {
  return Number(
    item?.Amount ??
    item?.Liabilities ??
    item?.OpeningBalance ??
    item?.OpeningDebt ??
    item?.DebtAmount ??
    0,
  ) || 0
}

function toBalanceRow(item: any): OpeningBalanceRow {
  const amount = resolveAmount(item)
  return {
    ...item,
    Amount: amount,
    AmountText: formatNumber(amount),
  }
}

function toInventoryRow(item: any): OpeningInventoryRow {
  const quantity = Number(item?.Quantity ?? item?.QuantityCurrent ?? 0) || 0
  const unitPrice = Number(item?.UnitPrice ?? item?.CostPrice ?? item?.Product?.CostPrice ?? item?.Price ?? 0) || 0
  const amount = Number(item?.Amount ?? quantity * unitPrice) || 0

  return {
    ...item,
    Quantity: quantity,
    QuantityText: formatNumber(quantity),
    UnitPrice: unitPrice,
    UnitPriceText: formatNumber(unitPrice),
    Amount: amount,
  }
}

function toPascalProduct(product: any) {
  return {
    Id: product?.Id || 0,
    Barcode: product?.Barcode || '',
    ProductCode: product?.ProductCode || product?.Code || '',
    Name: product?.Name || '',
    Price: product?.Price || 0,
    Tax: product?.Tax || 0,
    Images: (product?.Images || []).map((image: any) => toPascalImage(image)),
    Unit: toPascalUnit(product?.Unit),
    ProductGroup: product?.ProductGroup
      ? {
          Id: product.ProductGroup.Id || 0,
          Name: product.ProductGroup.Name || '',
          Image: toPascalImage(product.ProductGroup.Image),
        }
      : undefined,
    ProductType: product?.ProductType
      ? {
          Id: product.ProductType.Id || 0,
          Code: product.ProductType.Code || '',
          Name: product.ProductType.Name || '',
        }
      : undefined,
  }
}

function toPascalStock(stock: any, stockId?: number) {
  return {
    Id: stock?.Id || stockId || 0,
    Name: stock?.Name || '',
    Image: toPascalImage(stock?.Image),
  }
}

function inputClassName(value?: number) {
  return cn(
    'h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-right font-semibold tabular-nums text-foreground outline-none transition focus:border-primary/30 focus:bg-background focus:ring-2 focus:ring-primary/20',
    Number(value || 0) < 0 && 'text-red-600 dark:text-red-400',
  )
}

export function OpeningBalanceEntityPage({
  title,
  entityLabel,
  entityKey,
  filterUrl,
  headerUrl,
  importUrl,
  updateUrl,
  exportUrl,
}: {
  title: string
  entityLabel: string
  entityKey: EntityKey
  filterUrl: string
  headerUrl: string
  importUrl: string
  updateUrl: string
  exportUrl: string
}) {
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)
  const [fetchRows, { isFetching }] = useLazyFilterReportQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()
  const [downloadFile, { isLoading: exporting }] = useGenericDownloadMutation()

  const [date, setDate] = useState(today())
  const [isDateLocked, setIsDateLocked] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [rows, setRows] = useState<OpeningBalanceRow[]>([])
  const [total, setTotal] = useState(0)

  const loadRows = useCallback(async () => {
    try {
      const data = await fetchRows({
        path: filterUrl,
        params: {
          PageIndex: page - 1,
          PageSize: pageSize,
          Keyword: keyword || undefined,
          Date: date,
        },
      }).unwrap()

      const summaryDate = summaryDateOf(data)
      setIsDateLocked(!!summaryDate)
      if (summaryDate) setDate(toDateInputValue(summaryDate))

      const items = data?.Items ?? []
      setRows(items.map(toBalanceRow))
      setTotal(data?.TotalItemCount ?? items.length)
    } catch {
      toast.error('Không thể tải dữ liệu')
    }
  }, [date, fetchRows, filterUrl, keyword, page, pageSize])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchInput)
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const updateAmount = (index: number, value: string) => {
    setRows(current => current.map((row, rowIndex) => rowIndex === index
      ? { ...row, Amount: parseNumber(value), AmountText: value }
      : row))
  }

  const formatAmountText = (index: number, mode: 'focus' | 'blur') => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      return { ...row, AmountText: mode === 'focus' ? (row.Amount ? `${row.Amount}` : '') : formatNumber(row.Amount) }
    }))
  }

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({ url: exportUrl }).unwrap()
      downloadBlob(blob, `${title}.xlsx`)
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const saveData = async () => {
    const payload = rows.map(row => {
      const entity = getEntity(row, entityKey)
      const item: Record<string, any> = {
        Id: row.Id || 0,
        Date: date,
        Amount: row.Amount || 0,
        Note: row.Note || '',
        Liabilities: row.Liabilities || 0,
      }

      item[entityKey] = entityKey === 'Customer' ? toPascalCustomer(entity) : toPascalSupplier(entity)
      return item
    })

    try {
      await request({ url: updateUrl, method: 'POST', body: payload }).unwrap()
      toast.success('Lưu dữ liệu thành công')
      loadRows()
    } catch {
      toast.error('Không thể lưu dữ liệu')
    }
  }

  const totalAmount = rows.reduce((sum, row) => sum + (row.Amount || 0), 0)

  const columns = useMemo<ColumnDef<OpeningBalanceRow>[]>(() => [
    {
      id: 'stt',
      header: 'STT',
      meta: { className: 'w-14 text-center' },
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: `Mã ${entityLabel.toLowerCase()}`,
      meta: { className: 'w-48' },
      cell: ({ row }) => {
        const entity = getEntity(row.original, entityKey)
        return <CodeTag value={entity.CustomerCode || entity.SupplierCode || entity.Code} />
      },
    },
    {
      id: 'name',
      header: entityLabel,
      cell: ({ row }) => {
        const entity = getEntity(row.original, entityKey)
        return <span className="font-semibold text-foreground">{entity.CompanyName || entity.Name || '-'}</span>
      },
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      cell: ({ row }) => <span className="line-clamp-1 text-muted-foreground">{getEntity(row.original, entityKey).Address || '-'}</span>,
    },
    {
      id: 'phone',
      header: 'Điện thoại',
      meta: { className: 'w-36' },
      cell: ({ row }) => {
        const entity = getEntity(row.original, entityKey)
        return <span>{entity.Phone || entity.PhoneNumber || '-'}</span>
      },
    },
    {
      id: 'amount',
      header: 'Số tiền',
      meta: { headClassName: 'w-44 text-right bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', cellClassName: 'w-44 bg-amber-50/40 dark:bg-amber-950/20' },
      cell: ({ row }) => (
        <Input
          value={row.original.AmountText}
          onChange={event => updateAmount(row.index, event.target.value)}
          onFocus={() => formatAmountText(row.index, 'focus')}
          onBlur={() => formatAmountText(row.index, 'blur')}
          className={inputClassName(row.original.Amount)}
        />
      ),
    },
  ], [entityKey, entityLabel, page, pageSize])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ListToolbar
        left={(
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">{title}</h1>
              <p className="text-xs text-muted-foreground">Tổng giá trị: <b className="text-red-600 dark:text-red-400">{formatMoney(totalAmount)}</b></p>
            </div>
          </div>
        )}
        searchValue={searchInput}
        searchPlaceholder="Tìm kiếm..."
        onSearchChange={setSearchInput}
        filters={(
          <label className={cn(
            'flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-sm',
            isDateLocked && 'opacity-70',
          )} title={isDateLocked ? 'Đã chốt công nợ ở ngày này — không thể đổi' : undefined}>
            <CalendarDays className="h-4 w-4 text-sky-600" />
            <Input type="date" value={date} disabled={isDateLocked}
              onChange={event => { setDate(event.target.value); setPage(1) }} className="h-7 w-36 border-0 p-0 shadow-none focus-visible:ring-0 disabled:cursor-not-allowed" />
          </label>
        )}
        actions={(
          <>
            <ToolbarButton tone="neutral" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Nhập
            </ToolbarButton>
            <ToolbarButton tone="neutral" disabled={exporting} onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Xuất
            </ToolbarButton>
          </>
        )}
      />

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl={headerUrl}
        dataUrl="opening-balances/get-excel-data"
        importUrl={importUrl}
        onImported={loadRows}
      />

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={rows}
          loading={isFetching}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
          emptyText="Không có dữ liệu"
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
        <div className="text-sm font-semibold text-muted-foreground">
          Tổng giá trị: <span className="text-red-600 dark:text-red-400">{formatMoney(totalAmount)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton tone="primary" disabled={saving} onClick={saveData}>
            <Save className="h-4 w-4" />
            Lưu dữ liệu
          </ToolbarButton>
          <ToolbarButton tone="danger" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Thoát
          </ToolbarButton>
        </div>
      </div>
    </div>
  )
}

export function OpeningInventoryPageContent() {
  const navigate = useNavigate()
  const [importOpen, setImportOpen] = useState(false)
  const [fetchRows, { isFetching }] = useLazyFilterReportQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()
  const [downloadFile, { isLoading: exporting }] = useGenericDownloadMutation()
  const { data: stockData } = useFilterWarehousesQuery({ PageIndex: 0, PageSize: 100, StatusId: 0 })

  const [date, setDate] = useState(today())
  const [isDateLocked, setIsDateLocked] = useState(false)
  const [stockId, setStockId] = useState<number | undefined>()
  const [searchInput, setSearchInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [rows, setRows] = useState<OpeningInventoryRow[]>([])
  const [total, setTotal] = useState(0)

  const stocks = (stockData?.Items ?? []) as Entity[]
  const selectedStock = stocks.find(stock => stock.Id === stockId)

  const loadRows = useCallback(async () => {
    try {
      const data = await fetchRows({
        path: 'opening-balances/filter-inventory',
        params: {
          PageIndex: page - 1,
          PageSize: pageSize,
          Keyword: keyword || undefined,
          Date: date,
          StockId: stockId,
        },
      }).unwrap()

      const summaryDate = summaryDateOf(data)
      setIsDateLocked(!!summaryDate)
      if (summaryDate) setDate(toDateInputValue(summaryDate))

      const items = data?.Items ?? []
      setRows(items.map(toInventoryRow))
      setTotal(data?.TotalItemCount ?? items.length)
    } catch {
      toast.error('Không thể tải tồn kho ban đầu')
    }
  }, [date, fetchRows, keyword, page, pageSize, stockId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setKeyword(searchInput)
      setPage(1)
    }, 350)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const updateQuantity = (index: number, value: string) => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const quantity = parseNumber(value)
      return { ...row, Quantity: quantity, QuantityText: value, Amount: quantity * (row.UnitPrice || 0) }
    }))
  }

  const updateUnitPrice = (index: number, value: string) => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const unitPrice = parseNumber(value)
      return { ...row, UnitPrice: unitPrice, UnitPriceText: value, Amount: (row.Quantity || 0) * unitPrice }
    }))
  }

  const formatText = (index: number, key: 'Quantity' | 'UnitPrice', mode: 'focus' | 'blur') => {
    setRows(current => current.map((row, rowIndex) => {
      if (rowIndex !== index) return row
      const textKey = key === 'Quantity' ? 'QuantityText' : 'UnitPriceText'
      return { ...row, [textKey]: mode === 'focus' ? (row[key] ? `${row[key]}` : '') : formatNumber(row[key]) }
    }))
  }

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({ url: 'opening-balances/export-excel-inventory' }).unwrap()
      downloadBlob(blob, 'cap-nhat-ton-kho-ban-dau.xlsx')
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const saveData = async () => {
    const payload = rows.map(row => ({
      Id: row.Id || 0,
      Product: toPascalProduct(row.Product),
      Stock: toPascalStock(row.Stock || selectedStock, stockId),
      Unit: toPascalUnit(row.Unit || row.Product?.Unit),
      Date: date,
      Quantity: row.Quantity || 0,
      UnitPrice: row.UnitPrice || 0,
      Amount: row.Amount || 0,
      Note: row.Note || '',
      QuantityCurrent: row.QuantityCurrent || 0,
    }))

    try {
      await request({ url: 'opening-balances/update-inventory', method: 'POST', body: payload }).unwrap()
      toast.success('Lưu dữ liệu thành công')
      loadRows()
    } catch {
      toast.error('Không thể lưu dữ liệu')
    }
  }

  const totalQuantity = rows.reduce((sum, row) => sum + (row.Quantity || 0), 0)
  const totalAmount = rows.reduce((sum, row) => sum + (row.Amount || 0), 0)

  const columns = useMemo<ColumnDef<OpeningInventoryRow>[]>(() => [
    {
      id: 'stt',
      header: 'STT',
      meta: { className: 'w-14 text-center' },
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Mã hàng',
      meta: { className: 'w-40' },
      cell: ({ row }) => <CodeTag value={row.original.Product?.ProductCode || row.original.Product?.Barcode || row.original.Product?.Code} />,
    },
    {
      id: 'name',
      header: 'Tên hàng',
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.Product?.Name || '-'}</span>,
    },
    {
      id: 'unit',
      header: 'ĐVT',
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => <span>{row.original.Product?.Unit?.Name || row.original.Product?.UnitName || row.original.Unit?.Name || '-'}</span>,
    },
    {
      id: 'stock',
      header: 'Kho',
      meta: { className: 'w-36' },
      cell: ({ row }) => <span>{row.original.Stock?.Name || selectedStock?.Name || '-'}</span>,
    },
    {
      id: 'quantity',
      header: 'SL tồn',
      meta: { headClassName: 'w-36 text-right bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', cellClassName: 'w-36 bg-amber-50/40 dark:bg-amber-950/20' },
      cell: ({ row }) => (
        <Input
          value={row.original.QuantityText}
          onChange={event => updateQuantity(row.index, event.target.value)}
          onFocus={() => formatText(row.index, 'Quantity', 'focus')}
          onBlur={() => formatText(row.index, 'Quantity', 'blur')}
          className={inputClassName(row.original.Quantity)}
        />
      ),
    },
    {
      id: 'unitPrice',
      header: 'Giá vốn',
      meta: { headClassName: 'w-40 text-right bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', cellClassName: 'w-40 bg-amber-50/40 dark:bg-amber-950/20' },
      cell: ({ row }) => (
        <Input
          value={row.original.UnitPriceText}
          onChange={event => updateUnitPrice(row.index, event.target.value)}
          onFocus={() => formatText(row.index, 'UnitPrice', 'focus')}
          onBlur={() => formatText(row.index, 'UnitPrice', 'blur')}
          className={inputClassName(row.original.UnitPrice)}
        />
      ),
    },
    {
      id: 'amount',
      header: 'Giá trị',
      meta: { className: 'w-44 text-right' },
      cell: ({ row }) => <MoneyTag value={row.original.Amount} />,
    },
  ], [page, pageSize, selectedStock?.Name])

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <ListToolbar
        left={(
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Warehouse className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Cập nhật tồn kho ban đầu</h1>
              <p className="text-xs text-muted-foreground">
                SL: <b className="text-sky-700 dark:text-sky-400">{formatMoney(totalQuantity)}</b>
                <span className="mx-2">|</span>
                Giá trị: <b className="text-red-600 dark:text-red-400">{formatMoney(totalAmount)}</b>
              </p>
            </div>
          </div>
        )}
        searchValue={searchInput}
        searchPlaceholder="Nhập mã hoặc tên hàng..."
        onSearchChange={setSearchInput}
        filters={(
          <div className="flex flex-wrap items-center gap-2">
            <label className={cn(
              'flex h-10 items-center gap-2 rounded-md border bg-card px-3 text-xs font-semibold text-muted-foreground shadow-sm',
              isDateLocked && 'opacity-70',
            )} title={isDateLocked ? 'Đã chốt tồn kho ở ngày này — không thể đổi' : undefined}>
              <CalendarDays className="h-4 w-4 text-sky-600" />
              <Input type="date" value={date} disabled={isDateLocked}
                onChange={event => { setDate(event.target.value); setPage(1) }} className="h-7 w-36 border-0 p-0 shadow-none focus-visible:ring-0 disabled:cursor-not-allowed" />
            </label>
            <select
              value={stockId ?? ''}
              onChange={event => { setStockId(event.target.value ? Number(event.target.value) : undefined); setPage(1) }}
              className="h-10 min-w-[180px] rounded-md border bg-card px-3 text-sm font-medium text-foreground shadow-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả kho</option>
              {stocks.map(stock => (
                <option key={stock.Id} value={stock.Id}>{stock.Name}</option>
              ))}
            </select>
          </div>
        )}
        actions={(
          <>
            <ToolbarButton tone="neutral" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Nhập
            </ToolbarButton>
            <ToolbarButton tone="neutral" disabled={exporting} onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Xuất
            </ToolbarButton>
          </>
        )}
      />

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl="opening-balances/get-excel-header-inventory"
        dataUrl="opening-balances/get-excel-data"
        importUrl="opening-balances/import-excel-inventory"
        onImported={loadRows}
      />

      <div className="min-h-0 flex-1">
        <DataTable
          columns={columns}
          data={rows}
          loading={isFetching}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={size => { setPageSize(size); setPage(1) }}
          emptyText="Không có dữ liệu tồn kho ban đầu"
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-muted-foreground">
          <span>Tổng mặt hàng: <b className="text-sky-700 dark:text-sky-400">{formatMoney(rows.length)}</b></span>
          <span>Tổng số lượng: <b className="text-sky-700 dark:text-sky-400">{formatMoney(totalQuantity)}</b></span>
          <span>Tổng giá trị: <b className="text-red-600 dark:text-red-400">{formatMoney(totalAmount)}</b></span>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton tone="primary" disabled={saving} onClick={saveData}>
            <Save className="h-4 w-4" />
            Ghi dữ liệu
          </ToolbarButton>
          <ToolbarButton tone="danger" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Thoát
          </ToolbarButton>
        </div>
      </div>
    </div>
  )
}
