import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react'
import { getImageUrl } from '@/utils/common'
import {
  useGetAnonymousProductsQuery,
  useGetTableOrderItemsByGuidQuery,
  useSubmitAnonymousOrderMutation,
} from '@/store/slice/users/api/api'
import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { fmtNum, QrOrderHeader, useDisablePageZoom } from './shared'

type CartEntry = { qty: number; note: string }

const ALL_CATEGORY = 'all'
const UNCATEGORIZED = 'none'

function itemAmount(product: TPosActiveProduct, qty: number) {
  const subtotal = (product.Price ?? 0) * qty
  const taxPercent = product.Tax
  return taxPercent == null ? subtotal : subtotal + (subtotal * taxPercent) / 100
}

export default function QrOrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const guid = searchParams.get('guid') ?? ''

  useDisablePageZoom()

  const { data: products = [] } = useGetAnonymousProductsQuery(guid, { skip: !guid })
  const { data: existingItems } = useGetTableOrderItemsByGuidQuery(guid, { skip: !guid })
  const [submitOrder, { isLoading: submitting }] = useSubmitAnonymousOrderMutation()

  const [cart, setCart] = useState<Record<number, CartEntry>>({})
  const [reviewing, setReviewing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<number | typeof ALL_CATEGORY | typeof UNCATEGORIZED>(ALL_CATEGORY)

  // `tables/order-anonymous` appends whatever this submits as new order
  // lines — it does not merge by product — so `cart` (what gets sent) must
  // always start at 0 per visit. Already-placed quantities are shown
  // separately, purely as "you already have N of this" context, and are
  // never re-submitted just by loading the page.
  const existingQtyById = useMemo(() => {
    const map = new Map<number, number>()
    for (const item of existingItems ?? []) {
      const id = item.Product?.Id
      if (id == null) continue
      map.set(id, (map.get(id) ?? 0) + (item.Quantity ?? 0))
    }
    return map
  }, [existingItems])

  const categories = useMemo(() => {
    const map = new Map<number, { Id: number; Name: string }>()
    let hasUncategorized = false
    for (const p of products) {
      if (p.ProductGroup?.Id) {
        if (!map.has(p.ProductGroup.Id)) map.set(p.ProductGroup.Id, { Id: p.ProductGroup.Id, Name: p.ProductGroup.Name ?? '' })
      } else {
        hasUncategorized = true
      }
    }
    const list: { Id: number | typeof ALL_CATEGORY | typeof UNCATEGORIZED; Name: string }[] = [
      { Id: ALL_CATEGORY, Name: t('pages.orderTable.allCategories') },
    ]
    if (hasUncategorized) list.push({ Id: UNCATEGORIZED, Name: t('pages.orderTable.uncategorized') })
    list.push(...Array.from(map.values()))
    return list
  }, [products, t])

  const visibleProducts = useMemo(() => {
    // Reviewing the order shows only what's in the cart — search/category
    // filters don't apply there (matches pos_web's isModeCart branch).
    const base = reviewing ? products.filter(p => (cart[p.Id ?? -1]?.qty ?? 0) > 0) : products
    const keyword = search.trim().toLowerCase()
    return base.filter(p => {
      if (!reviewing) {
        const matchCategory = categoryId === ALL_CATEGORY
          ? true
          : categoryId === UNCATEGORIZED
            ? !p.ProductGroup?.Id
            : p.ProductGroup?.Id === categoryId
        if (!matchCategory) return false
      }
      if (keyword && !p.Name?.toLowerCase().includes(keyword)) return false
      return true
    })
  }, [products, reviewing, cart, search, categoryId])

  const totalQty = useMemo(() => Object.values(cart).reduce((sum, e) => sum + e.qty, 0), [cart])
  const subTotal = useMemo(
    () => products.reduce((sum, p) => sum + (p.Price ?? 0) * (cart[p.Id ?? -1]?.qty ?? 0), 0),
    [products, cart],
  )

  const setQty = (product: TPosActiveProduct, qty: number) => {
    const id = product.Id
    if (id == null) return
    setCart(prev => ({ ...prev, [id]: { note: prev[id]?.note ?? '', qty: Math.max(0, qty) } }))
  }
  const setNote = (product: TPosActiveProduct, note: string) => {
    const id = product.Id
    if (id == null) return
    setCart(prev => ({ ...prev, [id]: { qty: prev[id]?.qty ?? 0, note } }))
  }

  const resetOrder = () => setCart({})

  const handleSave = async () => {
    if (totalQty === 0) {
      toast.error(t('pages.orderTable.selectAtLeastOneProduct'))
      return
    }
    const items = products
      .filter(p => (cart[p.Id ?? -1]?.qty ?? 0) > 0)
      .map(p => {
        const entry = cart[p.Id!]
        const total = (p.Price ?? 0) * entry.qty
        return {
          Product: { ...p, Note: entry.note },
          Quantity: entry.qty,
          Price: p.Price ?? 0,
          Note: entry.note,
          Tax: p.Tax ?? null,
          Discount: 0,
          DiscountPercent: 0,
          Total: total,
          Amount: itemAmount(p, entry.qty),
        }
      })
    const total = items.reduce((sum, it) => sum + it.Amount, 0)

    try {
      await submitOrder({
        guid,
        Detail: t('pages.orderTable.defaultOrderDetail'),
        Note: '',
        Items: items,
        PromotionItems: [],
        Table: null,
        Total: total,
      }).unwrap()
      navigate(`order-success?guid=${guid}`)
    } catch {
      toast.error(t('pages.orderTable.saveOrderFailed'))
    }
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground" style={{ touchAction: 'manipulation' }}>
      <QrOrderHeader
        left={reviewing ? (
          <button
            onClick={() => setReviewing(false)}
            className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold ring-1 ring-white/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t('pages.orderTable.back')}
          </button>
        ) : null}
        right={!reviewing ? (
          <button
            onClick={() => navigate(`order-cart?guid=${guid}`)}
            className="relative flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 transition hover:bg-white/30 active:scale-95"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-sm font-semibold">{t('pages.orderTable.cart')}</span>
            {totalQty > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground ring-2 ring-background">
                {totalQty}
              </span>
            )}
          </button>
        ) : null}
      />

      <div className="flex h-[calc(100dvh-64px)] flex-col bg-background">
        {!reviewing && (
          <>
            <div className="shrink-0 bg-background px-6 pt-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('pages.orderTable.searchPlaceholder')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="shrink-0 overflow-x-auto overflow-y-hidden whitespace-nowrap bg-background px-6 py-3">
              <div className="flex flex-nowrap gap-2">
                {categories.map(cate => (
                  <button
                    key={cate.Id}
                    onClick={() => setCategoryId(cate.Id)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs transition ${
                      categoryId === cate.Id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {cate.Name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {visibleProducts.map(item => {
              const entry = cart[item.Id ?? -1]
              const qty = entry?.qty ?? 0
              const existingQty = existingQtyById.get(item.Id ?? -1) ?? 0
              return (
                <div key={item.Id} onClick={() => qty === 0 && setQty(item, 1)} className="flex items-start gap-4 rounded-xl p-2 hover:bg-accent">
                  <div className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border">
                    <img src={getImageUrl(item.Image?.Url ?? item.Images?.[0]?.Url) ?? '/logo.png'} alt={item.Name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex flex-1 justify-between gap-2">
                    <div>
                      <h3 className="line-clamp-2 text-xs font-semibold">{item.Name}</h3>
                      <div className="mt-1 text-xs font-bold text-primary">{fmtNum(item.Price)} ₫</div>
                      {existingQty > 0 && (
                        <div className="mt-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">{t('pages.orderTable.alreadyOrdered', { count: existingQty })}</div>
                      )}
                      {qty > 0 && (
                        <textarea
                          rows={1}
                          value={entry?.note ?? ''}
                          onChange={e => setNote(item, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder={t('pages.orderTable.notePlaceholder')}
                          className="mt-1 min-h-[56px] w-full resize-none rounded-md border border-input bg-transparent px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      )}
                    </div>
                    {qty > 0 && (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setQty(item, qty - 1)} className="h-8 w-8 select-none rounded bg-muted text-muted-foreground">
                          <Minus className="mx-auto h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={qty}
                          onChange={e => setQty(item, Number(e.target.value) || 0)}
                          className="h-8 w-10 rounded border border-input bg-transparent text-center text-xs"
                        />
                        <button onClick={() => setQty(item, qty + 1)} className="h-8 w-8 select-none rounded bg-primary text-primary-foreground">
                          <Plus className="mx-auto h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {totalQty > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-[9999] mt-3 bg-transparent px-3 pb-2">
          <button className="flex h-[64px] w-full items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-2xl transition-all active:scale-95">
            {!reviewing && (
              <div
                onClick={e => { e.stopPropagation(); resetOrder() }}
                className="flex h-full w-[20%] items-center justify-center bg-primary text-sm font-bold uppercase tracking-wide transition hover:bg-primary/90"
              >
                {t('pages.orderTable.resetSelection')}
              </div>
            )}
            <div className="flex h-full w-[30%] flex-col justify-center bg-primary/80 px-4">
              <div className="text-xs opacity-80">{totalQty} {t('pages.orderTable.itemsUnit')}</div>
              <div className="text-sm font-bold">{fmtNum(subTotal)}</div>
            </div>
            <div
              onClick={() => (reviewing ? handleSave() : setReviewing(true))}
              className="flex h-full flex-1 items-center justify-center text-sm font-bold uppercase tracking-wide transition hover:bg-primary/90"
            >
              {submitting ? t('pages.orderTable.saving') : reviewing ? t('pages.orderTable.confirm') : t('pages.orderTable.confirmOrder')}
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
