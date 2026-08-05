import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { buildModelFormData } from '@/utils/multipart'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { useLazyGenericGetQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import dayjs from 'dayjs'

/** PROMOTION_TYPE in pos_web. */
export const PROMOTION_TYPE = {
  Discount: 0,
  DiscountByCategory: 1,
  DiscountByProduct: 2,
  ProductSamePrice: 3,
  DiscountByQuantity: 4,
  DiscountByBillTotal: 5,
  Buy1Get1: 6,
} as const

const STATUS = { ACTIVE: 0, LOCKED: 1 } as const

const ENDPOINTS = {
  detail: 'promotions/detail', create: 'promotions/create', update: 'promotions/update',
}

type TProduct = LookupItem & {
  Barcode?: string
  Price?: number
  Unit?: { Id?: number; Name?: string }
}

export interface PromotionItem {
  Id?: number
  /** Client-side row key — the server never sees it */
  TempId?: string
  Product?: TProduct | null
  ProductGet?: TProduct | null
  ProductGroup?: LookupItem | null
  Quantity?: number
  QuantityGet?: number
  DiscountPercent?: number
  Discount?: number
  Amount?: number
  PriceDiscount?: number
  Status?: { Id?: number }
}

export interface Promotion {
  Id?: number
  Name?: string
  Type?: number
  DateFrom?: string
  DateTo?: string
  Priority?: number
  Note?: string
  Status?: { Id?: number }
  Items?: PromotionItem[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** One of PROMOTION_TYPE — decides which item columns the form shows */
  type: number
  title: string
  editId?: number
  onSaved: () => void
}

/**
 * How each promotion type builds its rows. `picker` types add a row by choosing
 * a product/group; `manual` types add blank rows with the "Thêm dòng" button;
 * `single` (Discount) keeps exactly one implicit row.
 */
function rowMode(type: number): 'single' | 'productGroup' | 'product' | 'manual' {
  if (type === PROMOTION_TYPE.Discount) return 'single'
  if (type === PROMOTION_TYPE.DiscountByCategory) return 'productGroup'
  if (type === PROMOTION_TYPE.DiscountByProduct) return 'product'
  return 'manual'
}

/** Percent/amount columns are hidden for the two types that set a price instead. */
const hasDiscountCols = (type: number) =>
  type !== PROMOTION_TYPE.ProductSamePrice && type !== PROMOTION_TYPE.Buy1Get1

function newItem(type: number): PromotionItem {
  const base: PromotionItem = { TempId: crypto.randomUUID(), Status: { Id: STATUS.ACTIVE } }
  if (type === PROMOTION_TYPE.Buy1Get1) return { ...base, Quantity: 1, QuantityGet: 1 }
  if (type === PROMOTION_TYPE.ProductSamePrice) return base
  return { ...base, DiscountPercent: 5, Discount: 0 }
}

function emptyPromotion(type: number): Promotion {
  return {
    Name: '', Type: type,
    DateFrom: dayjs().format('YYYY-MM-DD'), DateTo: '',
    Priority: 0, Note: '',
    Status: { Id: STATUS.ACTIVE },
    // Types that build rows by hand start with one, so the form is usable
    // straight away — an empty detail table is rejected by the server.
    Items: rowMode(type) === 'productGroup' || rowMode(type) === 'product' ? [] : [newItem(type)],
  }
}

/** Rows coming back from the server need a stable client key to edit against. */
function withTempIds(items: PromotionItem[] = []) {
  return items.map(i => ({ ...i, TempId: String(i.Id ?? crypto.randomUUID()) }))
}

function errMsg(e: any, fallback: string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || fallback
}

const money = (v?: number) => (v ?? 0).toLocaleString('vi-VN')

/**
 * The single create/edit form behind all seven promotion pages — they share
 * `promotions/create|update|detail` and differ only in `Type` and item columns.
 */
export function PromotionDialog({ open, onOpenChange, type, title, editId, onSaved }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<Promotion>(emptyPromotion(type))
  const mode = rowMode(type)
  const showDiscount = hasDiscountCols(type)

  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  useEffect(() => {
    if (!open) return
    if (!editId) { setForm(emptyPromotion(type)); return }
    fetchDetail({ url: ENDPOINTS.detail, params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as Promotion
        setForm({
          ...emptyPromotion(type), ...d,
          DateFrom: d.DateFrom ? dayjs(d.DateFrom).format('YYYY-MM-DD') : '',
          DateTo: d.DateTo ? dayjs(d.DateTo).format('YYYY-MM-DD') : '',
          Items: withTempIds(d.Items),
        })
      })
      .catch(e => toast.error(errMsg(e, t('components.promotionDialog.errorProcessRequest'))))
  }, [open, editId, type, fetchDetail, t])

  const setItems = (fn: (items: PromotionItem[]) => PromotionItem[]) =>
    setForm(f => ({ ...f, Items: fn(f.Items ?? []) }))

  const patchItem = (tempId: string, patch: Partial<PromotionItem>) =>
    setItems(items => items.map(i => (i.TempId === tempId ? { ...i, ...patch } : i)))

  const removeItem = (tempId: string) => setItems(items => items.filter(i => i.TempId !== tempId))

  /**
   * Angular bumps the discount by 5% when the same product/group is picked
   * again instead of adding a duplicate row.
   */
  const addByPick = (key: 'Product' | 'ProductGroup', picked: LookupItem | null) => {
    if (!picked?.Id) return
    setItems(items => {
      const idx = items.findIndex(i => (i[key] as LookupItem | null)?.Id === picked.Id)
      if (idx >= 0) {
        const current = Number(items[idx].DiscountPercent ?? 0)
        if (current + 5 > 100) return items
        return items.map((i, n) => (n === idx ? { ...i, DiscountPercent: current + 5 } : i))
      }
      const next = [...items, { ...newItem(type), [key]: picked }]
      return next.sort((a, b) =>
        String((a[key] as LookupItem | null)?.Name ?? '')
          .localeCompare(String((b[key] as LookupItem | null)?.Name ?? ''), 'vi'))
    })
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) { toast.error(t('components.promotionDialog.nameRequired')); return }
    if (mode !== 'single' && !(form.Items ?? []).length) {
      toast.error(t('components.promotionDialog.itemsRequired'))
      return
    }
    try {
      await request({
        url: form.Id ? ENDPOINTS.update : ENDPOINTS.create,
        method: 'POST',
        // pos_web posts every detail form as multipart with the model under
        // `model`; these endpoints read Request.Form and reject raw JSON.
        body: buildModelFormData({
          ...form,
          Type: type,
          Priority: Number(form.Priority) || 0,
          // TempId is a client-side row key; the API rejects unknown fields.
          Items: (form.Items ?? []).map(({ TempId: _TempId, ...rest }) => rest),
        }),
      }).unwrap()
      toast.success(form.Id
        ? t('components.promotionDialog.updateSuccess')
        : t('components.promotionDialog.createSuccess'))
      onOpenChange(false)
      onSaved()
    } catch (e) { toast.error(errMsg(e, t('components.promotionDialog.errorProcessRequest'))) }
  }

  const items = form.Items ?? []
  const stopped = form.Status?.Id !== STATUS.ACTIVE

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {form.Id ? t('components.promotionDialog.editTitle', { title: title.toLowerCase() }) : title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>{t('common.name')} <span className="text-destructive">*</span></Label>
              <Input value={form.Name ?? ''} onChange={e => setForm(f => ({ ...f, Name: e.target.value }))}
                placeholder={t('common.programName')} />
            </div>
            <div className="space-y-1">
              <Label>{t('common.fromDate')}</Label>
              <Input type="date" value={form.DateFrom ?? ''} onChange={e => setForm(f => ({ ...f, DateFrom: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t('common.toDate')}</Label>
              <Input type="date" value={form.DateTo ?? ''} onChange={e => setForm(f => ({ ...f, DateTo: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-4 items-end gap-3">
            <div className="space-y-1">
              <Label>{t('components.promotionDialog.priority')}</Label>
              <NumberInput min={0} max={999999} value={form.Priority ?? 0}
                onChange={v => setForm(f => ({ ...f, Priority: v }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>{t('common.note')}</Label>
              <Textarea rows={1} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 py-2">
              {/* Angular flips Status to Locked when "Ngừng áp dụng" is on. */}
              <Switch checked={stopped}
                onCheckedChange={v => setForm(f => ({ ...f, Status: { Id: v ? STATUS.LOCKED : STATUS.ACTIVE } }))} />
              <span className="text-sm font-medium">{t('components.promotionDialog.stopApplying')}</span>
            </label>
          </div>

          {mode === 'single' ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3">
              <div className="space-y-1">
                <Label>{t('components.promotionDialog.discountPercentLabel')}</Label>
                <NumberInput min={0} max={100} value={items[0]?.DiscountPercent ?? 0}
                  onChange={v => patchItem(items[0]?.TempId ?? '', { DiscountPercent: v })} />
              </div>
              <div className="space-y-1">
                <Label>{t('components.promotionDialog.discountAmount')}</Label>
                <NumberInput min={0} max={999999999} value={items[0]?.Discount ?? 0}
                  onChange={v => patchItem(items[0]?.TempId ?? '', { Discount: v })} />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="flex-1">
                  {t('components.promotionDialog.itemsDetail')} <span className="text-destructive">*</span>
                </Label>
                {mode === 'productGroup' && (
                  <LookupSelect className="w-64" endpoint="productgroups/filter-simple"
                    placeholder={t('components.promotionDialog.selectGroupToAdd')}
                    value={null} onChange={v => addByPick('ProductGroup', v)} />
                )}
                {mode === 'product' && (
                  <LookupSelect<TProduct> className="w-64" endpoint="products/filter-simple"
                    placeholder={t('components.promotionDialog.selectProductToAdd')}
                    subtitle={p => p.Barcode} value={null} onChange={v => addByPick('Product', v)} />
                )}
                {mode === 'manual' && (
                  <Button type="button" size="sm" variant="outline"
                    onClick={() => setItems(list => [...list, newItem(type)])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> {t('components.promotionDialog.addRow')}
                  </Button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr className="h-9">
                      <th className="w-10 px-2">{t('common.index')}</th>
                      {type === PROMOTION_TYPE.DiscountByCategory && <th className="px-2 text-left">{t('components.promotionDialog.productGroupColumn')}</th>}
                      {type === PROMOTION_TYPE.DiscountByProduct && <th className="px-2 text-left">{t('components.promotionDialog.productColumn')}</th>}
                      {type === PROMOTION_TYPE.DiscountByProduct && <th className="px-2">{t('components.promotionDialog.barcodeColumn')}</th>}
                      {type === PROMOTION_TYPE.DiscountByBillTotal && <th className="px-2 text-right">{t('components.promotionDialog.billTotalFrom')}</th>}
                      {(type === PROMOTION_TYPE.DiscountByQuantity
                        || type === PROMOTION_TYPE.ProductSamePrice
                        || type === PROMOTION_TYPE.Buy1Get1) && <th className="px-2 text-left">{t('components.promotionDialog.productColumn')}</th>}
                      {type === PROMOTION_TYPE.Buy1Get1 && <th className="px-2">{t('components.promotionDialog.unitColumn')}</th>}
                      {type === PROMOTION_TYPE.Buy1Get1 && <th className="px-2 text-left">{t('components.promotionDialog.giftProductColumn')}</th>}
                      {type === PROMOTION_TYPE.Buy1Get1 && <th className="px-2">{t('components.promotionDialog.unitColumn')}</th>}
                      {type === PROMOTION_TYPE.DiscountByQuantity && <th className="px-2 text-right">{t('common.quantity')}</th>}
                      {showDiscount && <th className="px-2 text-right">{t('components.promotionDialog.discountPercentColumn')}</th>}
                      {showDiscount && <th className="px-2 text-right">{t('components.promotionDialog.discountAmount')}</th>}
                      {type === PROMOTION_TYPE.ProductSamePrice && <th className="px-2 text-right">{t('common.salePrice')}</th>}
                      {type === PROMOTION_TYPE.ProductSamePrice && <th className="px-2 text-right">{t('components.promotionDialog.promotionalPrice')}</th>}
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={12} className="p-4 text-center text-xs text-muted-foreground">
                          {mode === 'manual'
                            ? t('components.promotionDialog.emptyRowsManual')
                            : t('components.promotionDialog.emptyRowsPicker')}
                        </td>
                      </tr>
                    )}
                    {items.map((item, index) => {
                      const key = item.TempId ?? String(index)
                      return (
                        <tr key={key} className="border-t">
                          <td className="px-2 py-1 text-center text-muted-foreground">{index + 1}</td>

                          {type === PROMOTION_TYPE.DiscountByCategory && (
                            <td className="px-2 py-1">{item.ProductGroup?.Name ?? '—'}</td>
                          )}
                          {type === PROMOTION_TYPE.DiscountByProduct && (
                            <td className="px-2 py-1">{item.Product?.Name ?? '—'}</td>
                          )}
                          {type === PROMOTION_TYPE.DiscountByProduct && (
                            <td className="px-2 py-1 text-center text-xs text-muted-foreground">{item.Product?.Barcode ?? '—'}</td>
                          )}

                          {type === PROMOTION_TYPE.DiscountByBillTotal && (
                            <td className="px-2 py-1">
                              <NumberInput min={0} max={999999999} className="h-8 text-right"
                                value={item.Amount ?? 0}
                                onChange={v => patchItem(key, { Amount: v })} />
                            </td>
                          )}

                          {(type === PROMOTION_TYPE.DiscountByQuantity
                            || type === PROMOTION_TYPE.ProductSamePrice
                            || type === PROMOTION_TYPE.Buy1Get1) && (
                              <td className="px-2 py-1 min-w-[180px]">
                                <LookupSelect<TProduct> endpoint="products/filter-simple"
                                  placeholder={t('components.promotionDialog.selectProduct')}
                                  value={item.Product} onChange={v => patchItem(key, { Product: v })} />
                              </td>
                            )}
                          {type === PROMOTION_TYPE.Buy1Get1 && (
                            <td className="px-2 py-1 text-center text-xs">{item.Product?.Unit?.Name ?? '—'}</td>
                          )}
                          {type === PROMOTION_TYPE.Buy1Get1 && (
                            <td className="px-2 py-1 min-w-[180px]">
                              <LookupSelect<TProduct> endpoint="products/filter-simple"
                                placeholder={t('components.promotionDialog.giftProductColumn')}
                                value={item.ProductGet} onChange={v => patchItem(key, { ProductGet: v })} />
                            </td>
                          )}
                          {type === PROMOTION_TYPE.Buy1Get1 && (
                            <td className="px-2 py-1 text-center text-xs">{item.ProductGet?.Unit?.Name ?? '—'}</td>
                          )}

                          {type === PROMOTION_TYPE.DiscountByQuantity && (
                            <td className="px-2 py-1 w-[110px]">
                              <NumberInput min={0} max={999999} className="h-8 text-right"
                                value={item.Quantity ?? 0}
                                onChange={v => patchItem(key, { Quantity: v })} />
                            </td>
                          )}

                          {showDiscount && (
                            <td className="px-2 py-1 w-[90px]">
                              <NumberInput min={0} max={100} className="h-8 text-right"
                                value={item.DiscountPercent ?? 0}
                                onChange={v => patchItem(key, { DiscountPercent: v })} />
                            </td>
                          )}
                          {showDiscount && (
                            <td className="px-2 py-1 w-[120px]">
                              <NumberInput min={0} max={999999999} className="h-8 text-right"
                                value={item.Discount ?? 0}
                                onChange={v => patchItem(key, { Discount: v })} />
                            </td>
                          )}

                          {type === PROMOTION_TYPE.ProductSamePrice && (
                            <td className="px-2 py-1 text-right tabular-nums">{money(item.Product?.Price)}</td>
                          )}
                          {type === PROMOTION_TYPE.ProductSamePrice && (
                            <td className="px-2 py-1 w-[130px]">
                              <NumberInput min={0} max={999999999} className="h-8 text-right"
                                value={item.PriceDiscount ?? 0}
                                onChange={v => patchItem(key, { PriceDiscount: v })} />
                            </td>
                          )}

                          <td className="px-2 py-1 text-center">
                            <button type="button" onClick={() => removeItem(key)}
                              className="text-muted-foreground/60 transition-colors hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('components.promotionDialog.savingEllipsis') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
