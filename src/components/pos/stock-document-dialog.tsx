import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { buildModelFormData } from '@/utils/multipart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import {
  useFilterActiveProductsQuery,
  useLazyGenericGetQuery,
  useGenericPostMutation,
} from '@/store/slice/users/api/api'
import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { getImageUrl } from '@/utils/common'
import dayjs from 'dayjs'

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
  open, onOpenChange, title, endpoints, options, editId, onSaved,
}: Props) {
  const { t } = useTranslation()
  const isCheck = !!options.stockCheck
  const isSalesDoc = !!options.sales
  const extraDateField = options.extraDateField
  const [form, setForm] = useState<StockDoc>(emptyStockDoc())
  const [keyword, setKeyword] = useState('')

  const [fetchDetail] = useLazyGenericGetQuery()
  const [fetchInventory] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  const { data: productData, isFetching: loadingProducts } = useFilterActiveProductsQuery(
    { PageIndex: 0, PageSize: 40, Keyword: keyword || undefined },
    { skip: !open },
  )
  const products = productData?.Items ?? []

  // Load the document when editing; reset to a blank one when creating.
  useEffect(() => {
    if (!open) return
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
        const res = await fetchInventory({ url: 'inventory/get-inventory', params: { productId: p.Id } }).unwrap()
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

  const handleSave = async () => {
    if (!(form.Items ?? []).length) { toast.error(t('components.stockDocumentDialog.selectItemRequired')); return }
    if (options.stockIn && !form.StockIn?.Id) { toast.error(t('components.stockDocumentDialog.selectStockInRequired')); return }
    if (options.stockOut && !form.StockOut?.Id) { toast.error(t('components.stockDocumentDialog.selectStockOutRequired')); return }
    try {
      await request({
        url: form.Id ? endpoints.update : endpoints.create,
        method: 'POST',
        body: buildModelFormData(isSalesDoc ? buildSalesPayload() : form),
      }).unwrap()
      toast.success(form.Id
        ? t('components.stockDocumentDialog.updateSuccess')
        : t('components.stockDocumentDialog.createSuccess'))
      onOpenChange(false)
      onSaved()
    } catch (e) { toast.error(errMsg(e, t('components.stockDocumentDialog.genericError'))) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader><DialogTitle>{form.Id ? `${t('components.stockDocumentDialog.editPrefix')} ${title.toLowerCase()}` : title}</DialogTitle></DialogHeader>

        <div className="grid gap-4 max-h-[70vh] overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            {/* Header fields — mirrors view-order-edit */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('common.date')}</Label>
                <Input type="date" value={form.Date ?? ''} onChange={e => setForm(f => ({ ...f, Date: e.target.value }))} />
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
                    value={form.StockOut} onChange={v => setForm(f => ({ ...f, StockOut: v }))} />
                </div>
              )}
              {options.stockIn && (
                <div className="space-y-1">
                  <Label>{t('common.stockIn')}</Label>
                  <LookupSelect endpoint="stock/filter-simple" placeholder={t('components.stockDocumentDialog.selectStockIn')}
                    value={form.StockIn} onChange={v => setForm(f => ({ ...f, StockIn: v }))} />
                </div>
              )}
              {options.supplier && (
                <div className="space-y-1">
                  <Label>{t('common.supplier')}</Label>
                  <LookupSelect endpoint="suppliers/filter-simple" placeholder={t('components.stockDocumentDialog.selectSupplier')}
                    value={form.Supplier} onChange={v => setForm(f => ({ ...f, Supplier: v }))} />
                </div>
              )}
              {options.customer && (
                <div className="space-y-1">
                  <Label>{t('common.customer')}</Label>
                  <LookupSelect endpoint="customers/filter-simple" placeholder={t('components.stockDocumentDialog.selectCustomer')}
                    value={form.Customer} onChange={v => setForm(f => ({ ...f, Customer: v }))} />
                </div>
              )}
              <div className="space-y-1">
                <Label>{t('components.stockDocumentDialog.employee')}</Label>
                <LookupSelect endpoint="users/filter-simple" placeholder={t('components.stockDocumentDialog.selectEmployee')}
                  value={form.User} onChange={v => setForm(f => ({ ...f, User: v }))} />
              </div>
              <div className="space-y-1">
                <Label>{t('common.note')}</Label>
                <Input value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
              </div>
            </div>

            {/* Line items */}
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-72 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 backdrop-blur">
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
                <div className="flex justify-between border-t bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{t('components.stockDocumentDialog.grandTotal')}</span>
                  <span className="font-bold tabular-nums text-primary">{subTotal.toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Product picker — replaces view-product-search */}
          <div className="rounded-lg border p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 pl-8" placeholder={t('components.stockDocumentDialog.searchProductPlaceholder')}
                value={keyword} onChange={e => setKeyword(e.target.value)} />
            </div>
            <div className="max-h-[420px] space-y-1 overflow-y-auto">
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

        <DialogFooter className="items-center justify-between sm:justify-between">
          <span className="text-xs italic text-muted-foreground">
            {form.CreatorUser?.FullName ? `${t('components.stockDocumentDialog.createdBy')} ${form.CreatorUser.FullName}` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('components.stockDocumentDialog.saving') : t('common.save')}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
