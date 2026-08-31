import dayjs from 'dayjs'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { CustomerSelect } from '@/components/pos/customer-select'
import { StaffSelect } from '@/components/pos/staff-select'
import { SupplierSelect } from '@/components/pos/supplier-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useGenericDownloadMutation, useGenericPostMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { useFilterActiveProductsQuery } from '@/store/slice/products/api'
import { useGetSettingOrderQuery } from '@/store/slice/settings/api'
import { TPosActiveProduct, type TPosCustomerSimple, type TPosUser } from '@/store/slice/users'
import { getImageUrl } from '@/utils/common'
import { clampDateWithinBounds } from '@/utils/format'
import { buildModelFormData } from '@/utils/multipart'
import { Eye, Package, Printer, Search, Trash2 } from 'lucide-react'
import { printData } from '@/utils/print-service'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { NumberInput } from '../ui/number-input'
export interface StockDocLine {
  Product?: TPosActiveProduct
  Quantity?: number
  /** Stock-check only: what the system believes vs what was counted */
  QuantitySystem?: number
  QuantityReal?: number
  Price?: number
  PriceInput?: number
  Discount?: number
  DiscountPercent?: number
  Tax?: number | null
  Total?: number
  Amount?: number
  Note?: string
}

export interface StockDoc {
  Id?: number
  Name?: string
  Date?: string
  DeliveryDate?: string
  ExpiredDate?: string
  SubTotal?: number
  Total?: number
  StockIn?: LookupItem | null
  StockOut?: LookupItem | null
  Supplier?: LookupItem | null
  Customer?: LookupItem | null
  User?: LookupItem | null
  Note?: string
  Items?: StockDocLine[]
  CreatorUser?: { FullName?: string }
}

export interface StockDocEndpoints {
  detail: string
  create: string
  update: string
}

export interface StockDocOptions {
  stockIn?: boolean
  stockInLabel?: string
  stockOut?: boolean
  supplier?: boolean
  customer?: boolean
  /** Count sheet: replaces price columns with system/real quantities */
  stockCheck?: boolean
  /** Sales-like documents (booking/quotation) use product sale price and order item totals. */
  sales?: boolean
  extraDateField?: 'DeliveryDate' | 'ExpiredDate'
  extraDateLabel?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  endpoints: StockDocEndpoints
  options: StockDocOptions
  /** Id to load for editing; omit to create */
  editId?: number
  onSaved: () => void
  /**
   * YYYY-MM-DD. No stock movement can be dated before the inventory opening
   * balance. Only passed by the 4 stock documents (nhập/xuất/chuyển/kiểm kê)
   * -- quotation/booking, which reuse this same dialog, leave it unset.
   */
  minDate?: string | null
}

export function emptyStockDoc(): StockDoc {
  return { Date: dayjs().format('YYYY-MM-DD'), Note: '', Items: [] }
}

function lineQty(l: StockDocLine, isCheck: boolean) {
  // A count sheet's effective quantity is the difference it will post.
  if (isCheck) return (l.QuantityReal ?? 0) - (l.QuantitySystem ?? 0)
  return l.Quantity ?? 0
}

function lineTotal(l: StockDocLine) {
  return (l.Quantity ?? 0) * (l.Price ?? 0)
}

function errMsg(e: any, fallback: string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || fallback
}

/**
 * Create/edit dialog shared by the four stock documents (nhập, xuất, chuyển,
 * kiểm kê). They differ only in which party/stock lookups they show and whether
 * lines carry prices or counted quantities, so those come in as options.
 */
export function StockDocumentDialog({
  open, onOpenChange, title, endpoints, options, editId, onSaved, minDate,
}: Props) {
  const { t } = useTranslation()
  const isCheck = !!options.stockCheck
  const isSalesDoc = !!options.sales
  const extraDateField = options.extraDateField
  const [form, setForm] = useState<StockDoc>(emptyStockDoc())
  const [keyword, setKeyword] = useState('')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const defaultStockAppliedRef = useRef(false)

  const [fetchDetail] = useLazyGenericGetQuery()
  const [fetchInventory] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()
  const [downloadFile, { isLoading: printing }] = useGenericDownloadMutation()
  const { data: settings } = useGetSettingOrderQuery()
  const canApplyDefaultStock = endpoints.create.includes('stockinputs') || isCheck
  const defaultStockIn = settings?.StockDefault?.Id
    ? settings.StockDefault
    : null

  const { data: productData, isFetching: loadingProducts } = useFilterActiveProductsQuery(
    { PageIndex: 0, PageSize: 40, Keyword: keyword || undefined },
    { skip: !open },
  )
  const products = productData?.Items ?? []

  // Load the document when editing; reset to a blank one when creating.
  useEffect(() => {
    if (!open) return
    defaultStockAppliedRef.current = false
    if (!editId) {
      const empty = emptyStockDoc()
      setForm(extraDateField ? { ...empty, [extraDateField]: empty.Date } : empty)
      return
    }
    fetchDetail({ url: endpoints.detail, params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as StockDoc
        setForm({
          ...emptyStockDoc(), ...d,
          Date: d.Date ? dayjs(d.Date).format('YYYY-MM-DD') : emptyStockDoc().Date,
          DeliveryDate: d.DeliveryDate ? dayjs(d.DeliveryDate).format('YYYY-MM-DD') : d.DeliveryDate,
          ExpiredDate: d.ExpiredDate ? dayjs(d.ExpiredDate).format('YYYY-MM-DD') : d.ExpiredDate,
          Items: d.Items ?? [],
        })
      })
      .catch(e => toast.error(errMsg(e, t('components.stockDocumentDialog.genericError'))))
  }, [open, editId, endpoints.detail, extraDateField, fetchDetail, t])

  useEffect(() => {
    if (
      !open ||
      editId ||
      !canApplyDefaultStock ||
      !options.stockIn ||
      !defaultStockIn?.Id ||
      defaultStockAppliedRef.current
    ) {
      return
    }

    defaultStockAppliedRef.current = true
    setForm(f => f.StockIn?.Id ? f : ({ ...f, StockIn: defaultStockIn }))
  }, [canApplyDefaultStock, defaultStockIn, editId, open, options.stockIn])

  useEffect(() => () => {
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const setLine = useCallback((idx: number, patch: Partial<StockDocLine>) => {
    setForm(f => {
      const items = [...(f.Items ?? [])]
      items[idx] = { ...items[idx], ...patch }
      return { ...f, Items: items }
    })
  }, [])

  const removeLine = (idx: number) =>
    setForm(f => ({ ...f, Items: (f.Items ?? []).filter((_, i) => i !== idx) }))

  const addProduct = async (p: TPosActiveProduct) => {
    const existing = (form.Items ?? []).findIndex(l => l.Product?.Id === p.Id)
    if (existing >= 0) {
      const cur = form.Items![existing]
      setLine(existing, isCheck
        ? { QuantityReal: (cur.QuantityReal ?? 0) + 1 }
        : { Quantity: (cur.Quantity ?? 0) + 1 })
      return
    }

    if (isCheck) {
      // The count sheet starts each line at the system quantity, like Angular.
      let system = 0
      try {
        const res = await fetchInventory({ url: 'inventory/get-inventory', params: { productId: p.Id, stockId: form.StockIn?.Id } }).unwrap()
        system = Number(res?.Data?.[0]?.Quantity ?? 0)
      } catch { system = 0 }
      setForm(f => ({
        ...f,
        Items: [...(f.Items ?? []), { Product: p, QuantitySystem: system, QuantityReal: system }],
      }))
      return
    }

    // Sales-like documents use sale price; stock receiving keeps import price.
    const price = isSalesDoc ? Number(p.Price ?? 0) : Number(p.PriceInput ?? p.ImportPrice ?? 0)
    setForm(f => ({
      ...f,
      Items: [...(f.Items ?? []), { Product: p, Quantity: 1, Price: price, PriceInput: price }],
    }))
  }

  const subTotal = useMemo(
    () => (form.Items ?? []).reduce((s, l) => s + lineTotal(l), 0),
    [form.Items],
  )

  const buildSalesPayload = () => {
    const items = (form.Items ?? []).map(line => {
      const total = lineTotal(line)
      const tax = line.Product?.Tax === null || line.Product?.Tax === undefined
        ? null
        : Number(line.Tax ?? line.Product.Tax) || 0
      return {
        ...line,
        Discount: line.Discount ?? 0,
        DiscountPercent: line.DiscountPercent ?? 0,
        Tax: tax,
        Total: total,
        Amount: total,
        Product: line.Product ? { ...line.Product, Tax: tax, Total: total, Amount: total } : line.Product,
      }
    })

    return {
      ...form,
      Items: items,
      SubTotal: subTotal,
      Total: subTotal,
    }
  }

  const saveDocument = async (closeAfterSave = true) => {
    if (!(form.Items ?? []).length) { toast.error(t('components.stockDocumentDialog.selectItemRequired')); return }
    if (options.stockIn && !form.StockIn?.Id) { toast.error(`Vui lòng chọn ${options.stockInLabel ?? t('common.stockIn')}`); return }
    if (options.stockOut && !form.StockOut?.Id) { toast.error(t('components.stockDocumentDialog.selectStockOutRequired')); return }
    try {
      const res = await request({
        url: form.Id ? endpoints.update : endpoints.create,
        method: 'POST',
        body: buildModelFormData(isSalesDoc ? buildSalesPayload() : form),
      }).unwrap()
      const saved = res?.Data ?? res
      const savedId = Number(saved?.Id ?? form.Id ?? 0)
      if (savedId) {
        setForm(f => ({ ...f, Id: savedId }))
      }
      toast.success(form.Id
        ? t('components.stockDocumentDialog.updateSuccess')
        : t('components.stockDocumentDialog.createSuccess'))
      if (closeAfterSave) onOpenChange(false)
      onSaved()
      return savedId
    } catch (e) { toast.error(errMsg(e, t('components.stockDocumentDialog.genericError'))) }
  }

  const handleSave = () => {
    saveDocument()
  }

  const printStockInput = (orderId: number) => {
    printData(
      settings?.PrinterUrl,
      'stockinputs/print-stock-input',
      settings?.BillPrinterName,
      { orderId, isTemplateTemp: true, IsTemplateTemp: true },
    )
  }

  const requestStockInputPdf = async (orderId: number) => {
    const blob = await downloadFile({
      url: 'stockinputs/print-stock-input-pdf',
      method: 'POST',
      body: { OrderId: orderId, IsTemplateTemp: true },
    }).unwrap()
    return new Blob([blob], { type: 'application/pdf' })
  }

  /**
   * "Lưu in": không có dialog phụ nào cần mở, nên đóng dialog nhập liệu ngay
   * là an toàn — luồng in vẫn chạy nền phía sau.
   */
  const handleSaveAndPrint = async () => {
    const savedId = await saveDocument(true)
    if (!savedId) return
    try {
      await requestStockInputPdf(savedId)
      printStockInput(savedId)
    } catch (e) {
      toast.error(errMsg(e, t('components.stockDocumentDialog.genericError')))
    }
  }

  /**
   * "Lưu xem in": lấy PDF xong (dialog nhập liệu vẫn mở lúc chờ mạng) rồi mới
   * đóng dialog nhập liệu, và đợi hết animation đóng của Radix mới mở dialog
   * xem PDF. Đóng — mở đồng thời trong cùng 1 lần render khiến Radix xử lý 2
   * dialog cùng đổi trạng thái một lúc không ổn định (dialog xem PDF không
   * hiện lên dù không báo lỗi gì), nên phải tách làm 2 bước riêng biệt.
   */
  const handleSavePreviewAndPrint = async () => {
    const savedId = await saveDocument(false)
    if (!savedId) return
    try {
      const blob = await requestStockInputPdf(savedId)
      const url = URL.createObjectURL(blob)
      onOpenChange(false)
      await new Promise(resolve => setTimeout(resolve, 300))
      setPdfPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
      printStockInput(savedId)
    } catch (e) {
      toast.error(errMsg(e, t('components.stockDocumentDialog.genericError')))
    }
  }

  const closePdfPreview = () => {
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>{form.Id ? `${t('components.stockDocumentDialog.editPrefix')} ${title.toLowerCase()}` : title}</DialogTitle></DialogHeader>

        <div className="flex min-h-0 max-h-[70vh] flex-col gap-3">
          {/* Header fields — mirrors view-order-edit. Fixed height, never
              part of any scroll region, so it's always fully visible. */}
          <div className="shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('common.date')}</Label>
                <Input type="date" value={form.Date ?? ''} min={minDate ?? undefined}
                  onChange={e => {
                    const value = clampDateWithinBounds(e.target.value, { min: minDate }, toast.warning)
                    setForm(f => ({ ...f, Date: value }))
                  }} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.voucherNo')}</Label>
                <Input value={form.Name ?? ''} disabled placeholder={t('components.stockDocumentDialog.autoPlaceholder')} />
              </div>
              {extraDateField && (
                <div className="space-y-1">
                  <Label>{options.extraDateLabel}</Label>
                  <Input
                    type="date"
                    value={(form[extraDateField] as string | undefined) ?? ''}
                    onChange={e => setForm(f => ({ ...f, [extraDateField]: e.target.value }))}
                  />
                </div>
              )}
              {options.stockOut && (
                <div className="space-y-1">
                  <Label>{t('common.stockOut')}</Label>
                  <LookupSelect endpoint="stock/filter-simple" placeholder={t('components.stockDocumentDialog.selectStockOut')}
                    value={form.StockOut} onChange={v => setForm(f => ({ ...f, StockOut: v }))} listPath="/stocks/stocks" />
                </div>
              )}
              {options.stockIn && (
                <div className="space-y-1">
                  <Label>{options.stockInLabel ?? t('common.stockIn')}</Label>
                  <LookupSelect endpoint="stock/filter-simple" placeholder={t('components.stockDocumentDialog.selectStockIn')}
                    value={form.StockIn} onChange={v => setForm(f => ({ ...f, StockIn: v }))} listPath="/stocks/stocks" />
                </div>
              )}
              {options.supplier && (
                <div className="space-y-1">
                  <Label>{t('common.supplier')}</Label>
                  <SupplierSelect placeholder={t('components.stockDocumentDialog.selectSupplier')}
                    value={form.Supplier} onChange={v => setForm(f => ({ ...f, Supplier: v }))} />
                </div>
              )}
              {options.customer && (
                <div className="space-y-1">
                  <Label>{t('common.customer')}</Label>
                  <CustomerSelect placeholder={t('components.stockDocumentDialog.selectCustomer')}
                    value={form.Customer as TPosCustomerSimple | null} onChange={v => setForm(f => ({ ...f, Customer: v }))} />
                </div>
              )}
              <div className="space-y-1">
                <Label>{t('components.stockDocumentDialog.employee')}</Label>
                <StaffSelect placeholder={t('components.stockDocumentDialog.selectEmployee')}
                  value={form.User as TPosUser | null} onChange={v => setForm(f => ({ ...f, User: v }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.note')}</Label>
                <Input value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Items table (left) + product picker (right) share one bounded
              row so both fill all remaining height instead of stopping at an
              arbitrary max-height, and the grand total below stays pinned
              outside the table's own scroll — no dialog-wide scrolling
              needed to reach it. */}
          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* Line items */}
            <div className="flex min-h-0 flex-col rounded-lg border overflow-hidden">
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      {['#', t('components.stockDocumentDialog.item'), ...(isCheck
                        ? [t('components.stockDocumentDialog.qtySystem'), t('components.stockDocumentDialog.qtyReal'), t('components.stockDocumentDialog.difference')]
                        : [t('components.stockDocumentDialog.qty'), t('common.price'), t('common.amount')]), ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(form.Items ?? []).length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">{t('components.stockDocumentDialog.noItems')}</td></tr>
                    )}
                    {(form.Items ?? []).map((l, i) => (
                      <tr key={l.Product?.Id ?? i} className="hover:bg-muted/20">
                        <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium">{l.Product?.Name}</div>
                          <div className="text-[10px] text-muted-foreground">{l.Product?.Unit?.Name}</div>
                        </td>
                        {isCheck ? (
                          <>
                            <td className="px-2 py-1.5">
                              <NumberInput className="h-7 w-24 text-xs" value={l.QuantitySystem ?? 0}
                                onChange={v => setLine(i, { QuantitySystem: v })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <NumberInput className="h-7 w-24 text-xs" value={l.QuantityReal ?? 0}
                                onChange={v => setLine(i, { QuantityReal: v })} />
                            </td>
                            <td className={`px-2 py-1.5 tabular-nums font-semibold ${
                              lineQty(l, true) > 0 ? 'text-emerald-600' : lineQty(l, true) < 0 ? 'text-rose-600' : ''}`}>
                              {lineQty(l, true).toLocaleString('vi-VN')}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-1.5">
                              <NumberInput min={0} className="h-7 w-20 text-xs" value={l.Quantity ?? 0}
                                onChange={v => setLine(i, { Quantity: v })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <NumberInput min={0} className="h-7 w-28 text-xs" value={l.Price ?? 0}
                                onChange={v => setLine(i, { Price: v })} />
                            </td>
                            <td className="px-2 py-1.5 tabular-nums font-semibold">{lineTotal(l).toLocaleString('vi-VN')}</td>
                          </>
                        )}
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeLine(i)}
                            className="text-muted-foreground/50 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!isCheck && (
                <div className="shrink-0 flex justify-between border-t bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{t('components.stockDocumentDialog.grandTotal')}</span>
                  <span className="font-bold tabular-nums text-primary">{subTotal.toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Product picker — replaces view-product-search */}
            <div className="flex min-h-0 flex-col gap-2 rounded-lg border p-2">
              <div className="relative shrink-0">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-8" placeholder={t('components.stockDocumentDialog.searchProductPlaceholder')}
                  value={keyword} onChange={e => setKeyword(e.target.value)} />
              </div>
              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {loadingProducts && <div className="px-2 py-3 text-xs text-muted-foreground">{t('common.loading')}</div>}
                {!loadingProducts && products.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">{t('components.stockDocumentDialog.noProductsFound')}</div>
                )}
                {products.map(p => {
                  const img = getImageUrl(p.Image?.Url ?? p.Images?.[0]?.Url ?? undefined)
                  return (
                    <button key={p.Id} type="button" onClick={() => addProduct(p)}
                      className="flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/40">
                      {img
                        ? <img src={img} alt="" className="h-8 w-8 rounded object-cover" />
                        : <div className="flex h-8 w-8 items-center justify-center rounded bg-muted"><Package className="h-4 w-4 text-muted-foreground/60" /></div>}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium">{p.Name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.ProductCode ?? p.Code} · {t('common.inventory')} {p.Quantity?.toLocaleString('vi-VN') ?? 0}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                        {(p.Price ?? 0).toLocaleString('vi-VN')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canPrintStockInput && (
              <>
                <Button type="button" variant="secondary" onClick={handleSaveAndPrint} disabled={saving || printing}>
                  <Printer className="mr-2 h-4 w-4" />
                  Lưu in
                </Button>
                <Button type="button" variant="outline" onClick={handleSavePreviewAndPrint} disabled={saving || printing}>
                  <Eye className="mr-2 h-4 w-4" />
                  Lưu xem in
                </Button>
              </>
            )}
            <span className="text-xs italic text-muted-foreground">
              {form.CreatorUser?.FullName ? `${t('components.stockDocumentDialog.createdBy')} ${form.CreatorUser.FullName}` : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('components.stockDocumentDialog.saving') : t('common.save')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={!!pdfPreviewUrl} onOpenChange={open => { if (!open) closePdfPreview() }}>
      <DialogContent className="flex h-[86vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle>Lưu xem in</DialogTitle>
        </DialogHeader>
        {pdfPreviewUrl && (
          <iframe src={pdfPreviewUrl} title="stock-input-pdf" className="min-h-0 flex-1 w-full border-0" />
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
