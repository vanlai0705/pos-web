import type { TPosActiveProduct,TPosCustomerInvoice,TPosCustomerSimple,TPosFundAccount,TPosFundType,TPosOrder,TPosOrderItem,TPosSettingOrder,TPosUser } from '@/store/slice/users/types/pos-types'
import { CustomerSelect } from '@/components/pos/customer-select'
import { StaffSelect } from '@/components/pos/staff-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useNumberDraft } from '@/components/ui/number-input'
import { PosImage } from '@/components/ui/pos-image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useAuth } from '@/hooks/useAuth'
import { useGenericDownloadMutation } from '@/store/slice/generic/api'
import { useGetUserShopSettingQuery } from '@/store/slice/notifications/api'
import { useCompleteOrderMutation, useLazyGetOrderDetailQuery, useSaveOrderMutation } from '@/store/slice/orders/api'
import { useFilterActiveProductsQuery, useGetActiveProductsSimpleQuery } from '@/store/slice/products/api'
import { useGetPaymentTypesQuery, useGetSettingOrderQuery } from '@/store/slice/settings/api'
import { useDeleteTableOrderMutation, useLazyGetOrderKitchenQuery, useLazyGetTableOrderDetailQuery, useSaveTableOrderMutation } from '@/store/slice/tables/api'
import { useGetProductGroupsSimpleQuery } from '@/store/slice/users'
import { cn } from '@/utils'
import { printData, printDatas, type PrinterSetting } from '@/utils/print-service'
import { Ban, Banknote, BookOpen, CheckCircle2, CreditCard, Eye, EyeOff, FileText, Info, LayoutGrid, Minus, Package, Pencil, Plus, Printer, RefreshCw, Save, Search, ShoppingCart, Smartphone, Table2, Trash2, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { OrderSearchDialog } from './order-search-dialog'

// ─── Constants ─────────────────────────────────────────────────────────────────

function fmtCurrency(val?: number | null) {
  if (val == null) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
}

function fmt(val?: number | null) {
  if (val == null || val === 0) return '0'
  return val.toLocaleString('vi-VN')
}

const CARD_COLORS = [
  'from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800',
  'from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800',
  'from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800',
  'from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800',
  'from-pink-500/10 to-pink-600/5 border-pink-200 dark:border-pink-800',
  'from-cyan-500/10 to-cyan-600/5 border-cyan-200 dark:border-cyan-800',
  'from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800',
  'from-rose-500/10 to-rose-600/5 border-rose-200 dark:border-rose-800',
]

const DOT_COLORS = [
  'bg-blue-400', 'bg-violet-400', 'bg-emerald-400', 'bg-orange-400',
  'bg-pink-400', 'bg-cyan-400', 'bg-amber-400', 'bg-rose-400',
]

function ci(id?: number, i?: number) { return ((id ?? i ?? 0) % 8) }

// ─── Payment methods ──────────────────────────────────────────────────────────

/** Fund types come from the API; match on name to pick an icon and accent. */
const FUND_STYLES: { match: RegExp; icon: React.ElementType; activeClass: string }[] = [
  { match: /tien mat|cash/,  icon: Banknote,   activeClass: 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900 shadow-sm' },
  { match: /chuyen khoan/,   icon: Smartphone, activeClass: 'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-900 shadow-sm' },
  { match: /ca the|card/,    icon: CreditCard, activeClass: 'bg-violet-500 text-white shadow-violet-200 dark:shadow-violet-900 shadow-sm' },
  { match: /quy/,            icon: Wallet,     activeClass: 'bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900 shadow-sm' },
]
const FUND_FALLBACK = { icon: Wallet, activeClass: 'bg-rose-500 text-white shadow-rose-200 dark:shadow-rose-900 shadow-sm' }

/** Strip Vietnamese diacritics so names can be matched the way Angular does. */
function normalizeName(name?: string) {
  return (name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim()
}

function fundStyle(name?: string) {
  const n = normalizeName(name)
  return FUND_STYLES.find(s => s.match.test(n)) ?? FUND_FALLBACK
}

/** An account is worth showing when it has a QR or an account number. */
function hasAccountInfo(a?: TPosFundAccount) {
  return !!(a && (a.QrCodeUrl || a.AccountNumber))
}

// ─── Cart item type ───────────────────────────────────────────────────────────

interface CartItem {
  product: TPosActiveProduct
  qty: number
  price: number
  discountPct: number
  discountAmt: number
  note: string
  /**
   * Per-line tax percent, seeded from the product's own Tax when added to
   * the cart (Angular's `createOrderItem`) and independently editable after
   * that via the Thuế column. `null` means the product itself is untaxable
   * ("KCT") — the column stays disabled and this never becomes a number.
   */
  tax: number | null
}

function itemDiscount(item: CartItem) {
  const base = item.price * item.qty
  return Math.min(base, base * item.discountPct / 100 + item.discountAmt)
}

/** Line total after discount, before tax. */
function itemSubtotal(item: CartItem) {
  return Math.max(0, item.price * item.qty - itemDiscount(item))
}

/** Per-item tax percent — 0 unless the shop enables per-item tax; the line's
 * own Tax wins over the product's (matches Angular's `getTaxPercentItem`). */
function itemTaxPct(item: CartItem, perItemTax: boolean) {
  return perItemTax ? Number(item.tax ?? item.product.Tax) || 0 : 0
}

function itemTaxAmount(item: CartItem, perItemTax: boolean) {
  return itemSubtotal(item) * itemTaxPct(item, perItemTax) / 100
}

/** Line total including per-item tax — the `Amount` the server expects. */
function itemAmount(item: CartItem, perItemTax: boolean) {
  return itemSubtotal(item) + itemTaxAmount(item, perItemTax)
}

function newGuid() {
  return crypto.randomUUID()
}

const DEVICE_GUID_KEY = 'storedGuid'
const LEGACY_DEVICE_GUID_KEY = 'guid-app'

/** Stable per-browser id the order endpoints use to tell devices apart. */
function getDeviceGuid() {
  const stored = localStorage.getItem(DEVICE_GUID_KEY)
  if (stored) return stored
  const legacy = localStorage.getItem(LEGACY_DEVICE_GUID_KEY)
  const guid = legacy ?? newGuid()
  localStorage.setItem(DEVICE_GUID_KEY, guid)
  return guid
}

const DEFAULT_RETAIL_CUSTOMER_NAME = 'BÁN CHO NGƯỜI TIÊU DÙNG'

const EMPTY_INVOICE_FORM: InvoiceFormData = {
  isInvoice: false,
  taxCode: '',
  companyName: '',
  address: '',
  buyerName: DEFAULT_RETAIL_CUSTOMER_NAME,
  cccd: '',
  phone: '',
  email: '',
  bankAccount: '',
  bankName: '',
  paymentMethod: 'TM/CK',
}

/**
 * Map the e-invoice form onto the server's `CustomerInvoice` shape, dropping
 * blanks the way Angular's `cleanCustomerData` does (PaymentMethod always stays).
 */
function buildCustomerInvoice(f: InvoiceFormData): TPosCustomerInvoice {
  const all: TPosCustomerInvoice = {
    Id: 0,
    CompanyName: f.companyName,
    Address: f.address,
    TaxAgencyCode: f.taxCode,
    BuyerName: f.buyerName,
    CitizenId: f.cccd,
    PaymentMethod: f.paymentMethod,
    PhoneNumber: f.phone,
    BankName: f.bankName,
    BankAccount: f.bankAccount,
    Email: f.email,
  }
  return Object.fromEntries(
    Object.entries(all).filter(([k, v]) => k === 'PaymentMethod' || (v !== '' && v != null)),
  )
}

interface TotalsOpts {
  /** Order-level tax percent (settings.IsTax ? TaxPercent : 0) */
  orderTaxPct: number
  perItemTax: boolean
  discountPct: number
  /** Absolute discount on top of the percentage one */
  discountAmt?: number
  /** Voucher value in đồng — not a code */
  voucher?: number
  transferCost?: number
}

/** Order totals — mirrors Angular `OrderService.getTotal` / `OrderModel.getTotalTax`. */
function calcTotals(
  cart: CartItem[],
  { orderTaxPct, perItemTax, discountPct, discountAmt = 0, voucher = 0, transferCost = 0 }: TotalsOpts,
) {
  const subTotal = cart.reduce((s, c) => s + itemSubtotal(c), 0)
  const orderDiscount = Math.min(subTotal * discountPct / 100 + discountAmt, subTotal)
  const totalBeforeTax = Math.max(0, subTotal - orderDiscount - voucher)
  const totalTax = perItemTax
    ? cart.reduce((s, c) => s + itemTaxAmount(c, true), 0)
    : totalBeforeTax * orderTaxPct / 100
  const subTotalItems = cart.reduce((s, c) => s + itemAmount(c, perItemTax), 0)
  return {
    subTotal, subTotalItems, orderDiscount, totalBeforeTax, totalTax,
    total: totalBeforeTax + totalTax + transferCost,
  }
}

// ─── Product panel ────────────────────────────────────────────────────────────

/** Packed grid — 4 across once there is room; 3 keeps cards legible when narrow. */
const PRODUCT_GRID = 'grid grid-cols-3 lg:grid-cols-4 gap-1.5'

const PRODUCT_PAGE_SIZE = 30

function createCartItemFromProduct(product: TPosActiveProduct): CartItem {
  // Angular's createOrderItem: a tax-exempt product (Tax === null/undefined)
  // stays null forever on this line; anything else seeds a real number.
  const tax = product.Tax == null ? null : Number(product.Tax) || 0
  return {
    product,
    qty: 1,
    price: product.Price ?? 0,
    discountPct: 0,
    discountAmt: 0,
    note: '',
    tax,
  }
}

function ProductItemDialog({
  product,
  open,
  onOpenChange,
  onConfirm,
}: {
  product: TPosActiveProduct | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (item: CartItem) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<CartItem | null>(null)

  useEffect(() => {
    setDraft(product ? createCartItemFromProduct(product) : null)
  }, [product])

  const setField = (field: 'qty' | 'price' | 'discountPct' | 'discountAmt', value: number) => {
    setDraft(current => current ? { ...current, [field]: value } : current)
  }

  const setNote = (value: string) => {
    setDraft(current => current ? { ...current, note: value } : current)
  }

  const handleConfirm = () => {
    if (!draft) return
    const qty = Math.max(1, Math.round(Number(draft.qty) || 1))
    const price = Math.max(0, Number(draft.price) || 0)
    const discountPct = Math.min(100, Math.max(0, Number(draft.discountPct) || 0))
    const discountAmt = Math.max(0, Number(draft.discountAmt) || 0)
    onConfirm({ ...draft, qty, price, discountPct, discountAmt })
    onOpenChange(false)
  }

  const total = draft ? itemSubtotal(draft) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden">
        <DialogHeader className="border-b bg-muted/20 px-5 py-4">
          <DialogTitle className="flex items-center gap-3 text-base">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pencil className="h-5 w-5" />
            </span>
            <span className="truncate">{product?.Name || t('common.productName')}</span>
          </DialogTitle>
        </DialogHeader>

        {draft && (
          <div className="space-y-5 px-5 py-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('common.quantity')}>
                <NumInput value={draft.qty} onChange={v => setField('qty', Math.max(1, Math.round(v)))} className="h-11" />
              </Field>
              <Field label={t('common.price')}>
                <NumInput value={draft.price} onChange={v => setField('price', Math.max(0, v))} className="h-11" />
              </Field>
              <Field label={t('common.discount')}>
                <NumInput value={draft.discountPct} onChange={v => setField('discountPct', Math.min(100, Math.max(0, v)))} suffix="%" className="h-11" />
              </Field>
              <Field label={t('metrics.discount')}>
                <NumInput value={draft.discountAmt} onChange={v => setField('discountAmt', Math.max(0, v))} className="h-11" />
              </Field>
              <Field label={t('metrics.amount')}>
                <NumInput value={total} onChange={() => undefined} className="h-11 pointer-events-none opacity-70" />
              </Field>
            </div>
            <Field label={t('common.note')}>
              <Textarea
                value={draft.note}
                onChange={e => setNote(e.target.value)}
                placeholder={t('common.note')}
                className="min-h-12 resize-none"
              />
            </Field>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t bg-muted/20 px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-w-28">
            <Ban className="mr-2 h-4 w-4" /> {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} className="min-w-32 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t('pages.actives.order.searchDialogConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ProductPanelProps { onAdd: (p: TPosActiveProduct) => void }

function ProductPanel({ onAdd }: ProductPanelProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [showCost, setShowCost] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [pageIndex, setPageIndex] = useState(0)
  const [products, setProducts] = useState<TPosActiveProduct[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const scannerBuffer = useRef('')
  const scannerLastTs = useRef(0)
  const lastHandledScan = useRef<{ value: string; ts: number } | null>(null)
  // Only append a page once — StrictMode/refetches must not duplicate rows.
  const appendedPage = useRef(-1)

  const { data: groups = [] } = useGetProductGroupsSimpleQuery()
  const { data: simpleProducts = [] } = useGetActiveProductsSimpleQuery()
  const { data, isFetching, isLoading } = useFilterActiveProductsQuery({
    PageIndex: pageIndex, PageSize: PRODUCT_PAGE_SIZE,
    Keyword: keyword || undefined,
    ProductGroupId: groupId ?? undefined,
  })

  // New search/filter — start over from page 0.
  useEffect(() => {
    setPageIndex(0)
    setProducts([])
    appendedPage.current = -1
    gridRef.current?.scrollTo({ top: 0 })
  }, [keyword, groupId])

  useEffect(() => {
    if (!data || appendedPage.current === pageIndex) return
    appendedPage.current = pageIndex
    setProducts(prev => pageIndex === 0 ? data.Items : [...prev, ...data.Items])
  }, [data, pageIndex])

  const total = data?.TotalItemCount ?? 0
  const hasMore = products.length < total

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isFetching) return
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      setPageIndex(p => p + 1)
    }
  }

  const scanBarcode = useCallback((value: string) => {
    const scanned = value.trim().toLowerCase()
    if (!scanned) return
    const last = lastHandledScan.current
    if (last?.value === scanned && Date.now() - last.ts < 150) return
    lastHandledScan.current = { value: scanned, ts: Date.now() }
    const exactMatch = (p: TPosActiveProduct) => {
      const barcode = String(p.Barcode ?? '').trim().toLowerCase()
      const productCode = String(p.ProductCode ?? '').trim().toLowerCase()
      const code = String(p.Code ?? '').trim().toLowerCase()
      return barcode === scanned || productCode === scanned || code === scanned
    }
    const matched = simpleProducts.find(exactMatch) ?? products.find(exactMatch)
    if (!matched) return
    onAdd(matched)
    setKeyword('')
  }, [onAdd, products, simpleProducts])

  useEffect(() => {
    const handleScannerKeydown = (e: KeyboardEvent) => {
      const now = Date.now()
      if (now - scannerLastTs.current > 50) scannerBuffer.current = ''
      scannerLastTs.current = now

      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return

      if (e.key === 'Enter') {
        const scanned = scannerBuffer.current
        scannerBuffer.current = ''
        if (scanned.length >= 3) scanBarcode(scanned)
        return
      }

      if (e.key.length === 1) scannerBuffer.current += e.key
    }

    window.addEventListener('keydown', handleScannerKeydown)
    return () => window.removeEventListener('keydown', handleScannerKeydown)
  }, [scanBarcode])

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0 space-y-2 border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 text-sm font-semibold text-foreground">{t('pages.actives.order.chooseProductHeading')}</span>
          <button
            type="button"
            onClick={() => setViewMode(v => v === 'card' ? 'table' : 'card')}
            title={t(viewMode === 'card' ? 'pages.actives.order.switchToTableView' : 'pages.actives.order.switchToCardView')}
            aria-label={t(viewMode === 'card' ? 'pages.actives.order.switchToTableView' : 'pages.actives.order.switchToCardView')}
            aria-pressed={viewMode === 'table'}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors',
              viewMode === 'table'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {viewMode === 'card' ? <Table2 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setShowCost(v => !v)}
            title={t('pages.actives.order.toggleCostPrice')}
            aria-label={t('pages.actives.order.toggleCostPrice')}
            aria-pressed={showCost}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors',
              showCost
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {showCost ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text" placeholder={t('pages.actives.order.searchProductPlaceholder')}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              scanBarcode(e.currentTarget.value)
            }}
            className="w-full h-9 pl-8 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground text-foreground"
          />
          {keyword && (
            <button onClick={() => setKeyword('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setGroupId(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${groupId === null ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >{t('common.all')}</button>
          {groups.map(g => (
            <button key={g.Id} onClick={() => setGroupId(g.Id ?? null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${groupId === g.Id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >{g.Name}</button>
          ))}
        </div>
      </div>

      <div ref={gridRef} onScroll={handleScroll} className={cn('flex-1 overflow-y-auto', viewMode === 'table' ? 'p-0' : 'p-2')}>
        {isLoading && pageIndex === 0 ? (
          viewMode === 'table' ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-md" />)}
            </div>
          ) : (
            <div className={PRODUCT_GRID}>
              {Array.from({ length: 16 }).map((_, i) => <Skeleton key={i} className="aspect-[5/4] rounded-lg" />)}
            </div>
          )
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t('pages.actives.order.productsNotFound')}</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur border-b">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.productName')}</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.barcode')}</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.unit')}</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('common.quantity')}</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('common.price')}</th>
                {showCost && (
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('pages.actives.order.costShort')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p, i) => {
                const barcode = p.Barcode || p.Code || p.ProductCode || ''
                const cost = p.PriceInput ?? p.ImportPrice
                return (
                  <tr
                    key={p.Id ?? i}
                    onClick={() => onAdd(p)}
                    className="cursor-pointer transition-colors hover:bg-primary/5 active:bg-primary/10"
                  >
                    <td className="px-2 py-2 min-w-0">
                      <div className="font-semibold text-foreground line-clamp-1">{p.Name}</div>
                      {p.ProductGroup?.Name && <div className="text-[10px] text-muted-foreground truncate">{p.ProductGroup.Name}</div>}
                    </td>
                    <td className="px-2 py-2 font-mono text-muted-foreground whitespace-nowrap">{barcode || '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{p.Unit?.Name || '—'}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={cn(
                        'inline-flex min-w-10 justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                        (p.Quantity ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                      )}>
                        {fmt(p.Quantity)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-extrabold text-primary tabular-nums whitespace-nowrap">{fmt(p.Price)}</td>
                    {showCost && (
                      <td className="px-2 py-2 text-right text-amber-700 font-semibold tabular-nums whitespace-nowrap">
                        {cost != null ? fmt(cost) : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className={PRODUCT_GRID}>
            {products.map((p, i) => {
              const c = ci(p.Id, i)
              const url = p.Image?.Url ?? p.Images?.[0]?.Url
              const cost = p.PriceInput ?? p.ImportPrice
              const barcode = p.Barcode || p.Code || p.ProductCode
              return (
                <button key={p.Id ?? i} onClick={() => onAdd(p)}
                  className={`group relative flex flex-col rounded-lg border overflow-hidden text-left transition-all active:scale-95 hover:shadow-lg hover:border-primary/50 duration-150 ${CARD_COLORS[c]}`}
                >
                  {/* Ảnh — không còn lớp phủ tối, chỉ 2 badge góc trên tự có nền riêng */}
                  <div className="relative aspect-[4/3] shrink-0">
                    <PosImage
                      url={url}
                      alt={p.Name}
                      className="absolute inset-0 h-full w-full"
                      fallbackIcon={<Package className="h-7 w-7 opacity-50" />}
                    />
                    <div className="absolute top-0.5 left-0.5 right-0.5 flex items-start justify-between gap-0.5">
                      {p.Unit?.Name && (
                        <span className="px-1 rounded bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-white/90 truncate max-w-[55%]">
                          {p.Unit.Name}
                        </span>
                      )}
                      {p.Quantity != null && (
                        <span className={cn(
                          'px-1 rounded backdrop-blur-sm text-[10px] font-bold tabular-nums ml-auto',
                          p.Quantity > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white',
                        )}>
                          {p.Quantity.toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tên + mã hàng + giá — nền đặc, không cần lớp phủ */}
                  <div className="flex-1 min-w-0 px-1.5 py-1 space-y-0.5 bg-card">
                    <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-2">
                      {p.Name}
                    </p>
                    {barcode && (
                      <p className="text-[9px] font-mono text-muted-foreground truncate">{barcode}</p>
                    )}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[12px] font-extrabold tabular-nums text-primary">
                        {fmt(p.Price)}
                      </span>
                      {showCost && cost != null && (
                        <span className="px-1 rounded bg-amber-400/95 text-amber-950 text-[8px] font-bold tabular-nums">
                          V:{fmt(cost)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {isFetching && pageIndex > 0 && (
          viewMode === 'table' ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-md" />)}
            </div>
          ) : (
            <div className={cn(PRODUCT_GRID, 'mt-1.5')}>
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-lg" />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ─── Sales tab (POS) ──────────────────────────────────────────────────────────

/**
 * Retail actions plus the restaurant-only ones the table view exposes.
 * `save-exit` / `print-*` persist through `tables/*-order`; the rest reuse `orders/*`.
 */
export type OrderAction =
  | 'pay' | 'print' | 'temp'
  | 'save-exit' | 'print-temp' | 'print-kitchen' | 'print-label' | 'cancel-order'

interface SalesTabProps {
  tableLabel?: string
  bookingId?: number
  /** Retail order opened from order-manager via /actives/order?orderId=... */
  initialOrderId?: number
  /** Set in the restaurant flow — switches to the table button set and `tables/*` saves. */
  tableId?: number
  /** The table's own Guid (not the order's) — what the kitchen-print routes key on. */
  tableGuid?: string
  onBack?: () => void
}

function SalesTab({ tableLabel, bookingId, initialOrderId, tableId, tableGuid, onBack }: SalesTabProps) {
  const { t } = useTranslation()
  const [cart, setCart] = useState<CartItem[]>([])
  // Bumped after a successful retail payment to force InternalOrderPanel to
  // remount — it caches its own copies of customer/staff/note/fund locally,
  // so resetting only SalesTab's state wouldn't clear what's on screen.
  const [resetKey, setResetKey] = useState(0)
  const [saveOrder, { isLoading: savingOrder }] = useSaveOrderMutation()
  const [completeOrder, { isLoading: completing }] = useCompleteOrderMutation()
  const [loadTableOrder] = useLazyGetTableOrderDetailQuery()
  const [saveTableOrder, { isLoading: savingTable }] = useSaveTableOrderMutation()
  const [fetchOrderKitchen] = useLazyGetOrderKitchenQuery()
  // The order the server already has on this table. Its identity fields must
  // ride back out on save/pay or the table is never released.
  const [baseOrder, setBaseOrder] = useState<TPosOrder | null>(null)
  const [deleteTableOrder, { isLoading: deletingTable }] = useDeleteTableOrderMutation()
  const [downloadFile] = useGenericDownloadMutation()
  const { data: settings } = useGetSettingOrderQuery()
  // RTK Query dedupes this against InternalOrderPanel's own identical call —
  // needed here too so handleSave can resolve a cash fallback even when the
  // panel's own picker never rendered anything for the user to click.
  const { data: fundTypes = [] } = useGetPaymentTypesQuery()
  // Which warehouse a StockOut deducts from — mirrors pos_web's
  // getDefaultStockOut: the currently-selected shop's own Stock first
  // (user-infos/get-setting), falling back to setting/get-order's
  // StockDefault only when that shop has no warehouse assigned.
  const { data: shopSetting } = useGetUserShopSettingQuery()
  const defaultStockOut = useMemo(() => {
    const shops = shopSetting?.Shops ?? []
    const selectedShop = shops.find(s => s.Id === shopSetting?.SelectedShopId) ?? shops[0]
    const shopStock = selectedShop?.Stock
    if (shopStock?.Id) return shopStock
    return settings?.StockDefault ?? null
  }, [shopSetting, settings])
  const { user: auth } = useAuth()
  // `Member` mirrors Angular's currentMember: the logged-in user plus their shops.
  const member = useMemo(() => {
    const u = auth?.data?.User
    if (!u) return null
    return { ...u, Shops: (u as { Shops?: unknown[] }).Shops ?? auth?.data?.Shops ?? [] }
  }, [auth])
  const perItemTax = !!settings?.IsTaxPerItemAllowed
  const isTableMode = !!tableLabel
  const saving = savingOrder || completing || savingTable || deletingTable

  // Panel state refs (hoisted so we can read on submit)
  const [fund, setFund] = useState<{ type: TPosFundType | null; accountId?: number }>({ type: null })
  const onFundTypeChange = useCallback(
    (type: TPosFundType | null, accountId?: number) => setFund({ type, accountId }),
    [],
  )
  const [selectedCustomer, setSelectedCustomer] = useState<TPosCustomerSimple | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<TPosUser | null>(null)
  const [note, setNote] = useState('')
  const [detail, setDetail] = useState('')
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>(EMPTY_INVOICE_FORM)

  // Money block — same fields sell-payment exposes, each gated by settings.
  const [discountPct, setDiscountPct] = useState(0)
  const [discountAmt, setDiscountAmt] = useState(0)
  const [voucher, setVoucher] = useState(0)
  const [transferCost, setTransferCost] = useState(0)
  const [taxOverride, setTaxOverride] = useState<number | null>(null)
  const [payment, setPayment] = useState<number | ''>('')
  const [isCustomersDebt, setIsCustomersDebt] = useState(false)
  const [shortage, setShortage] = useState(0)
  const taxPct = taxOverride ?? (settings?.IsTax ? (settings.TaxPercent ?? 0) : 0)

  // Opening an occupied table pulls its order in so the cart shows what the
  // guests already ordered instead of starting empty (which used to wipe it).
  useEffect(() => {
    if (!tableId || !bookingId) return
    let cancelled = false
    loadTableOrder(tableId)
      .unwrap()
      .then(order => {
        if (cancelled || !order) return
        setBaseOrder(order)
        setCart((order.Items ?? []).map(it => ({
          product: (it.Product ?? {}) as TPosActiveProduct,
          qty: it.Quantity ?? 1,
          price: it.Price ?? it.Product?.Price ?? 0,
          discountPct: it.DiscountPercent ?? 0,
          discountAmt: it.Discount ?? 0,
          note: it.Note ?? '',
          tax: it.Tax ?? it.Product?.Tax ?? null,
        })))
        if (order.Note) setNote(order.Note)
        if (order.Detail) setDetail(order.Detail)
        setSelectedCustomer(order.Customer ?? null)
        if (order.User) setSelectedStaff(order.User as TPosUser)
        else setSelectedStaff(null)
        setDiscountPct(order.DiscountPercent ?? 0)
        setDiscountAmt(order.Discount ?? 0)
        setVoucher(order.Voucher ?? 0)
        setTransferCost(order.TransferCost ?? 0)
        setTaxOverride(order.Tax ?? null)
        setPayment(order.Payment ?? '')
        setIsCustomersDebt(!!order.IsCustomersDebt)
        setShortage(order.Shortage ?? 0)
      })
      .catch(() => toast.error(t('pages.actives.order.loadTableOrderFailed')))
    return () => { cancelled = true }
  }, [tableId, bookingId, loadTableOrder, t])

  // "Đặt hàng" / "Báo giá" — search-and-resume an existing booking/quotation.
  // Bookings and quotations live in the same Orders table under a different
  // Type/Status, so picking one loads it the same way orders/detail always
  // does (Angular's orderDetail(id), called from onFunctionOrderClick).
  const [loadOrderDetail] = useLazyGetOrderDetailQuery()
  const [bookingSearchOpen, setBookingSearchOpen] = useState(false)
  const [quotationSearchOpen, setQuotationSearchOpen] = useState(false)
  const [temporarySearchOpen, setTemporarySearchOpen] = useState(false)

  const applyOrderToCart = useCallback((order: TPosOrder, keepIdentity = false) => {
    setBaseOrder(keepIdentity ? order : null)
    setCart((order.Items ?? []).map(it => ({
      product: (it.Product ?? {}) as TPosActiveProduct,
      qty: it.Quantity ?? 1,
      price: it.Price ?? it.Product?.Price ?? 0,
      discountPct: it.DiscountPercent ?? 0,
      discountAmt: it.Discount ?? 0,
      note: it.Note ?? '',
      tax: it.Tax ?? it.Product?.Tax ?? null,
    })))
    setSelectedCustomer(order.Customer ?? null)
    if (order.User) setSelectedStaff(order.User as TPosUser)
    else setSelectedStaff(null)
    setNote(order.Note ?? '')
    setDetail(order.Detail ?? '')
    setDiscountPct(order.DiscountPercent ?? 0)
    setDiscountAmt(order.Discount ?? 0)
    setVoucher(order.Voucher ?? 0)
    setTransferCost(order.TransferCost ?? 0)
    setTaxOverride(order.Tax ?? null)
    setPayment(order.Payment ?? '')
    setIsCustomersDebt(!!order.IsCustomersDebt)
    setShortage(order.Shortage ?? 0)
  }, [])

  const applyPickedOrder = useCallback(async (id?: number) => {
    if (!id) return
    try {
      const order = await loadOrderDetail(id).unwrap()
      if (!order) return
      applyOrderToCart(order)
    } catch {
      toast.error(t('pages.actives.order.loadOrderFailed'))
    }
  }, [applyOrderToCart, loadOrderDetail, t])

  useEffect(() => {
    if (!initialOrderId || tableId) return
    let cancelled = false
    loadOrderDetail(initialOrderId)
      .unwrap()
      .then(order => {
        if (cancelled || !order) return
        applyOrderToCart(order, true)
      })
      .catch(() => toast.error(t('pages.actives.order.loadOrderFailed')))
    return () => { cancelled = true }
  }, [applyOrderToCart, initialOrderId, loadOrderDetail, tableId, t])

  // Guard shared by both pickers: Angular refuses to open the search dialog
  // while the cart already has items, to avoid silently discarding them.
  const openOrderSearch = (kind: 'booking' | 'quotation' | 'temporary') => {
    if (cart.length > 0) { toast.error(t('pages.actives.order.searchDialogCartNotEmpty')); return }
    if (kind === 'booking') setBookingSearchOpen(true)
    else if (kind === 'quotation') setQuotationSearchOpen(true)
    else setTemporarySearchOpen(true)
  }

  const [editingProduct, setEditingProduct] = useState<TPosActiveProduct | null>(null)

  const commitProductToCart = useCallback((item: CartItem) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.product.Id === item.product.Id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          qty: next[idx].qty + item.qty,
          price: item.price,
          discountPct: item.discountPct,
          discountAmt: item.discountAmt,
          note: item.note,
          tax: item.tax,
        }
        return next
      }
      return [...prev, item]
    })
  }, [])

  const addToCart = useCallback((product: TPosActiveProduct) => {
    if (settings?.IsInputQuantityWithBarcode) {
      setEditingProduct(product)
      return
    }

    setCart(prev => {
      const idx = prev.findIndex(c => c.product.Id === product.Id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, createCartItemFromProduct(product)]
    })
  }, [settings?.IsInputQuantityWithBarcode])

  const updateQty = useCallback((idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev]
      const newQty = next[idx].qty + delta
      if (newQty <= 0) return next.filter((_, i) => i !== idx)
      next[idx] = { ...next[idx], qty: newQty }
      return next
    })
  }, [])

  const removeItem = useCallback((idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const updateItem = useCallback((idx: number, field: 'discountPct' | 'discountAmt' | 'note' | 'price' | 'qty' | 'tax', value: number | string) => {
    setCart(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const totals = useMemo(
    () => calcTotals(cart, { orderTaxPct: taxPct, perItemTax, discountPct, discountAmt, voucher, transferCost }),
    [cart, taxPct, perItemTax, discountPct, discountAmt, voucher, transferCost],
  )
  const { subTotal, subTotalItems, total } = totals

  /**
   * Order lines shaped like Angular's `buildOrderPayload`: `Total` is pre-tax,
   * `Amount` is tax-inclusive, and both are echoed onto the product snapshot.
   */
  const buildItems = (): TPosOrderItem[] => cart.map(c => {
    // A product with no Tax stays null so the server keeps it tax-exempt.
    const tax = c.product.Tax == null ? null : itemTaxPct(c, perItemTax)
    const lineTotal = itemSubtotal(c)
    const lineAmount = itemAmount(c, perItemTax)
    return {
      Guid: newGuid(),
      Product: { ...c.product, Tax: tax, Total: lineTotal, Amount: lineAmount },
      Quantity: c.qty,
      Discount: c.discountAmt,
      DiscountPercent: c.discountPct,
      Tax: tax,
      IsPromotion: false,
      Price: c.price,
      Unit: c.product.Unit,
      QuantitySystem: 0,
      QuantityReal: 0,
      Note: c.note || '',
      ParentId: null,
      Total: lineTotal,
      Amount: lineAmount,
    }
  })

  /**
   * "Provisional invoice" print path (settings.IsPrintProvisionalInvoice):
   * fetch the order PDF and preview it inline in a side sheet — mirrors
   * Angular's `app-pdf` drawer — instead of a physical printer.
   */
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const pdfFrameRef = useRef<HTMLIFrameElement>(null)
  // The screen must stay put while the PDF is up (Angular's
  // `closeAfterProvisionalInvoice`) — navigating away unmounts the sheet
  // before it can render. Whatever save/pay flow triggered the preview hands
  // us its "now go do the exit/navigate" step to run once the user closes it.
  const pdfCloseCallbackRef = useRef<(() => void) | null>(null)

  const printOrderPdf = async (
    orderId: number,
    onClosed?: () => void,
    isTemplateTemp = false,
  ) => {
    try {
      const blob = await downloadFile({
        url: 'orders/print-order-pdf',
        method: 'POST',
        body: { OrderId: orderId, IsTemplateTemp: isTemplateTemp },
      }).unwrap()
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      pdfCloseCallbackRef.current = onClosed ?? null
      setPdfPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    } catch {
      toast.error(t('pages.actives.order.printInvoiceLoadFailed'))
      onClosed?.()
    }
  }

  const closePdfPreview = () => {
    setPdfPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    const onClosed = pdfCloseCallbackRef.current
    pdfCloseCallbackRef.current = null
    onClosed?.()
  }

  const printPdfPreview = () => {
    const frameWindow = pdfFrameRef.current?.contentWindow
    if (!frameWindow) return
    frameWindow.focus()
    frameWindow.print()
  }

  /** The response's own printer(s), or the shop's single default bill printer. */
  const printersOrDefault = (printers?: PrinterSetting[]): PrinterSetting[] =>
    printers?.length
      ? printers
      : settings?.PrinterUrl
        ? [{ PrinterUrl: settings.PrinterUrl, PrinterName: settings.BillPrinterName }]
        : []

  /**
   * Bill printing after payment. Mirrors Angular's `printOrder` (retail,
   * `sell-main.component.ts`) / `handlePrintInvoice(..., isOrder=true)`
   * (restaurant, `restaurant-sell.component.ts`): a provisional-invoice shop
   * setting always wins and opens the PDF instead of hitting a physical
   * printer; otherwise retail always uses its single configured printer via
   * `printData`, while the restaurant flow fans out to every printer the
   * server assigned this order to via `printDatas`.
   */
  const printBill = (orderId: number, orderPrinters?: PrinterSetting[], onDone?: () => void) => {
    if (settings?.IsPrintProvisionalInvoice) {
      printOrderPdf(orderId, onDone)
      return
    }
    if (isTableMode) {
      printersOrDefault(orderPrinters).forEach(p =>
        printDatas(p.PrinterUrl, 'orders/print-order', p.PrinterName, { orderId }))
    } else {
      printData(settings?.PrinterUrl, 'orders/print-order', settings?.BillPrinterName, { orderId })
    }
    onDone?.()
  }

  /** "In tạm" (temporary receipt) — restaurant-only, always the shop's default printer. */
  const printTempReceipt = (orderId: number, onDone?: () => void) => {
    if (settings?.IsPrintProvisionalInvoice) {
      printOrderPdf(orderId, onDone, true)
      return
    }
    printData(settings?.PrinterUrl, 'tables/print-order', settings?.BillPrinterName, {
      orderId,
      IsTemplateTemp: true,
    })
    onDone?.()
  }

  /** "Lưu & Thoát" auto-print and "In tem" — one ticket per assigned/default printer. */
  const printKitchenTicket = (api: string, orderPrinters?: PrinterSetting[]) => {
    if (!tableGuid) return
    printersOrDefault(orderPrinters).forEach(p =>
      printDatas(p.PrinterUrl, api, p.PrinterName, { guid: tableGuid }))
  }

  /** Explicit "In bếp" — per-printer item breakdown from `tables/get-order-kitchen`. */
  const printKitchen = async () => {
    if (!tableGuid) return
    try {
      const groups = await fetchOrderKitchen({ tableGuid, deviceGuid: getDeviceGuid() }).unwrap()
      groups.forEach(g => {
        if (!g.Printer?.PrinterUrl) return
        printDatas(g.Printer.PrinterUrl, 'tables/print-kitchen', g.Printer.PrinterName, {
          guid: tableGuid, items: g.Items,
        })
      })
    } catch {
      toast.error(t('pages.actives.order.kitchenDataFailed'))
    }
  }

  /**
   * Restaurant payload = the order the server already holds, with our edits on
   * top. Keeping Id/Guid/Name/Type/Table/Shop/Status is what lets the server
   * match the order back to its table and release it on payment.
   */
  const withTable = (order: TPosOrder): TPosOrder => ({
    ...(baseOrder ?? {}),
    ...order,
    Id: baseOrder?.Id ?? order.Id,
    Guid: baseOrder?.Guid,
    Name: baseOrder?.Name ?? '',
    // 6 = table order; a fresh one still has to declare itself as such.
    Type: baseOrder?.Type ?? 6,
    Status: baseOrder?.Status,
    Shop: baseOrder?.Shop,
    Table: baseOrder?.Table ?? (tableId ? { Id: tableId, Name: tableLabel } : null),
    deviceGuid: getDeviceGuid(),
    table: { id: tableId, name: tableLabel },
  })

  const handleSave = async (action: OrderAction) => {
    // Cancelling an existing table order is the one action that needs no cart.
    if (action === 'cancel-order') {
      if (!tableId) return
      if (!await confirmAction({ description: t('pages.actives.order.confirmDeleteOrder') })) return
      try {
        await deleteTableOrder(tableId).unwrap()
        toast.success(t('pages.actives.order.orderDeletedSuccess'))
        setCart([])
        onBack?.()
      } catch { toast.error(t('pages.actives.order.deleteOrderFailed')) }
      return
    }

    if (cart.length === 0) { toast.error(t('pages.actives.order.cartEmptyError')); return }
    if (invoiceForm.isInvoice && !invoiceForm.taxCode) {
      toast.error(t('pages.actives.order.invoiceInfoRequired'))
      return
    }

    const user = selectedStaff
      ? { Id: selectedStaff.Id, Name: selectedStaff.FullName || selectedStaff.Name }
      : undefined
    const items = buildItems()

    // "Cà thẻ" settles on the card; every other fund type settles as cash.
    const isCard = /ca the|card/.test(normalizeName(fund.type?.Name))
    // Retail opens a payment dialog that pre-fills "Khách đưa" with the total;
    // the table view has no such dialog, so it stays at whatever was typed.
    const debtEnabled = !!selectedCustomer && isCustomersDebt
    const shortageValue = debtEnabled ? Math.min(total, Math.max(0, shortage)) : 0
    const paid = debtEnabled ? Math.max(0, total - shortageValue) : (payment === '' ? (isTableMode ? 0 : total) : Number(payment))
    const now = new Date().toISOString()
    // A picked account wins over the fund type itself — same as sell-payment.
    // If nothing was ever picked (e.g. the picker had nothing to show yet),
    // fall back to a real "Tiền mặt" fund type so payment isn't blocked —
    // defaults to cash, matching how a walk-in sale is normally settled.
    const cashFallback = fundTypes.find(f => /tien mat|cash/.test(normalizeName(f.Name))) ?? fundTypes[0]
    const fundTypeRef = fund.accountId ?? fund.type?.Id ?? cashFallback?.Id

    const order: TPosOrder = {
      Id: isTableMode ? bookingId : baseOrder?.Id,
      Name: '',
      Date: now,
      Detail: detail || t('pages.actives.order.defaultSaleDetail'),
      Note: note || '',
      Customer: selectedCustomer ?? null,
      User: user,
      // Who is ringing the order up — the logged-in user plus their shops.
      Member: member,
      CreatorUser: null,
      StockOut: defaultStockOut,
      // An explicit `null` here is what actually crashes the backend
      // (NullReferenceException) — omit the key entirely on the rare case
      // even the cash fallback above couldn't resolve anything.
      FundType: fundTypeRef ? { Id: fundTypeRef } : undefined,
      Items: items,
      PromotionItems: [],
      Table: null,
      SubTotal: subTotal,
      SubTotalItems: subTotalItems,
      Total: total,
      Discount: discountAmt,
      DiscountPercent: discountPct,
      Tax: taxPct,
      TransferCost: transferCost,
      OldDebit: 0,
      Cash: isCard ? 0 : paid,
      Card: isCard ? paid : 0,
      Shortage: shortageValue,
      Round: 0,
      Payment: paid,
      Change: Math.max(0, paid - total),
      Reserved: 0,
      Voucher: voucher,
      Type: 0,
      PaymentType: 0,
      IsCustomersDebt: debtEnabled,
      // Angular never sends IsPrint at all — every order-save endpoint
      // (temp/complete/table) omits it entirely; printing is a fully
      // separate client-side step (printBill/printKitchenTicket/
      // printTempReceipt below) that runs AFTER the save succeeds, keyed off
      // `action`, not off anything in this payload. Including it here was
      // this migration's own addition, not something the real API expects —
      // and is the likely cause of a backend NullReferenceException on
      // orders/completed for shops with incomplete printer/receipt config.
      IsExportInvoice: invoiceForm.isInvoice,
      CustomerInvoice: buildCustomerInvoice(invoiceForm),
    }

    if (action === 'temp') {
      try {
        await saveOrder(order).unwrap()
        toast.success(t('pages.actives.order.tempOrderSaved'))
        setBaseOrder(null)
        setCart([])
      } catch { toast.error(t('pages.actives.order.tempOrderSaveFailed')) }
      return
    }

    // ── Restaurant: park the order on the table, no payment yet ──
    if (action === 'save-exit' || action === 'print-temp' || action === 'print-kitchen' || action === 'print-label') {
      try {
        const res = await saveTableOrder({ order: withTable(order), isUpdate: !!bookingId }).unwrap()
        const savedId = res?.OrderId ?? bookingId
        toast.success(t('pages.actives.order.orderSavedSuccess'))
        const finish = () => onBack?.()

        // "Lưu & Thoát" auto-fires a kitchen ticket, same as a plain save in Angular.
        if (action === 'save-exit') { setCart([]); printKitchenTicket('tables/print-kitchen', res?.Printers); finish(); return }
        // "In bếp" keeps the order open so more items can be sent.
        if (action === 'print-kitchen') { await printKitchen(); return }
        if (action === 'print-label') { setCart([]); printKitchenTicket('tables/print-kitchen-label', res?.Printers); finish(); return }
        if (action === 'print-temp') {
          if (savedId) printTempReceipt(savedId)
          return
        }
      } catch { toast.error(t('pages.actives.order.orderSaveFailed')) }
      return
    }

    try {
      const res = await completeOrder(isTableMode ? withTable(order) : order).unwrap()
      toast.success(t('pages.actives.order.paymentSuccess'))
      setCart([])
      const finish = () => {
        // Restaurant: back to the floor plan, table gets refetched there.
        // Retail: stays on this same screen (matches Angular's clearOrder(),
        // which just resets the order model in place) and resets the form so
        // the next sale starts clean — "Thanh toán và in"/"không in" must
        // leave the cashier right where they were, not bounce to order-manager.
        if (isTableMode) { onBack?.(); return }
        setBaseOrder(null)
        setSelectedCustomer(null)
        setSelectedStaff(null)
        setNote('')
        setDetail('')
        setDiscountPct(0)
        setDiscountAmt(0)
        setVoucher(0)
        setTransferCost(0)
        setTaxOverride(null)
        setPayment('')
        setIsCustomersDebt(false)
        setShortage(0)
        setInvoiceForm(EMPTY_INVOICE_FORM)
        setFund({ type: null })
        setResetKey(k => k + 1)
      }
      if (action === 'print' && res?.Id) printBill(res.Id, res.Printers, finish)
      else finish()
    } catch { toast.error(t('pages.actives.order.paymentFailed')) }
  }

  return (
    <div className="flex gap-2 h-full min-h-0 p-2">
      <div className="flex-[3] min-w-0 h-full">
        <InternalOrderPanel
          key={resetKey}
          cart={cart}
          onQty={updateQty}
          onRemove={removeItem}
          onClear={() => setCart([])}
          onUpdateItem={updateItem}
          onSave={handleSave}
          onOpenOrderSearch={openOrderSearch}
          saving={saving}
          settings={settings}
          totals={totals}
          perItemTax={perItemTax}
          tableLabel={tableLabel}
          hasTableOrder={!!bookingId && !!tableId}
          onBack={onBack}
          onFundTypeChange={onFundTypeChange}
          customerValue={selectedCustomer}
          staffValue={selectedStaff}
          noteValue={note}
          onCustomerChange={setSelectedCustomer}
          onStaffChange={setSelectedStaff}
          onNoteChange={setNote}
          detail={detail}
          setDetail={setDetail}
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
          money={{
            discountPct, setDiscountPct,
            discountAmt, setDiscountAmt,
            voucher, setVoucher,
            transferCost, setTransferCost,
            taxPct, setTaxOverride,
            payment, setPayment,
            isCustomersDebt, setIsCustomersDebt,
            shortage, setShortage,
          }}
        />
      </div>
      <div className="flex-[2] min-w-0 h-full">
        <ProductPanel onAdd={addToCart} />
      </div>

      <ProductItemDialog
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={open => { if (!open) setEditingProduct(null) }}
        onConfirm={commitProductToCart}
      />

      <Sheet open={!!pdfPreviewUrl} onOpenChange={open => { if (!open) closePdfPreview() }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col gap-0">
          <SheetHeader className="flex-none flex-row items-center justify-between gap-2 border-b px-4 py-3 space-y-0">
            <SheetTitle>{t('pages.actives.order.invoicePreviewTitle')}</SheetTitle>
            <Button size="sm" className="mr-6" onClick={printPdfPreview}>
              <Printer className="h-3.5 w-3.5 mr-1.5" /> {t('pages.actives.order.printInvoiceButton')}
            </Button>
          </SheetHeader>
          <div className="flex-1 min-h-0 bg-muted/40 p-2">
            {pdfPreviewUrl && (
              <iframe ref={pdfFrameRef} src={pdfPreviewUrl} title={t('pages.actives.order.invoicePreviewTitle')}
                className="w-full h-full rounded border bg-white" />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <OrderSearchDialog
        open={bookingSearchOpen}
        onOpenChange={setBookingSearchOpen}
        kind="booking"
        onConfirm={order => { setBookingSearchOpen(false); applyPickedOrder(order.Id) }}
      />
      <OrderSearchDialog
        open={quotationSearchOpen}
        onOpenChange={setQuotationSearchOpen}
        kind="quotation"
        onConfirm={order => { setQuotationSearchOpen(false); applyPickedOrder(order.Id) }}
      />
      <OrderSearchDialog
        open={temporarySearchOpen}
        onOpenChange={setTemporarySearchOpen}
        kind="temporary"
        onConfirm={order => { setTemporarySearchOpen(false); applyOrderToCart(order as TPosOrder, true) }}
      />
    </div>
  )
}

// ─── Internal order panel tabs ────────────────────────────────────────────────

type PanelTab = 'sales' | 'invoice' | 'info'
const PANEL_TABS: { key: PanelTab; labelKey: string; icon: React.ElementType }[] = [
  { key: 'sales',   labelKey: 'pages.actives.order.salesTabLabel',    icon: ShoppingCart },
  { key: 'invoice', labelKey: 'pages.actives.order.eInvoiceTabLabel', icon: FileText },
  { key: 'info',    labelKey: 'pages.actives.order.infoTabLabel',     icon: Info },
]

// ─── Footer action button ─────────────────────────────────────────────────────

const ACTION_TONES = {
  neutral: 'border-input text-muted-foreground hover:bg-muted',
  sky: 'border-sky-400 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20',
  emerald: 'border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  'emerald-strong': 'border-2 border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
  indigo: 'border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
  rose: 'border-rose-400 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
} as const

function ActionBtn({ tone, icon: Icon, label, onClick, disabled }: {
  tone: keyof typeof ACTION_TONES
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all disabled:opacity-40',
        ACTION_TONES[tone],
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

// ─── Money block bits ─────────────────────────────────────────────────────────

function MoneyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground whitespace-nowrap w-16 shrink-0">{label}</span>
      {children}
    </div>
  )
}

/** Per-line discount %, kept clearable and clamped to 0–100. */
function PercentInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const draft = useNumberDraft(value, onChange, { min: 0, max: 100 })
  return (
    <input type="text" disabled={disabled} {...draft}
      className="w-full text-xs bg-transparent focus:outline-none tabular-nums text-foreground text-center disabled:cursor-not-allowed disabled:opacity-50" />
  )
}

function NumInput({ value, onChange, suffix, className }: {
  value: number
  onChange: (v: number) => void
  suffix?: string
  className?: string
}) {
  const draft = useNumberDraft(value, onChange, { min: 0 })
  return (
    <div className={cn('flex items-center border border-input rounded px-1.5 py-0.5 bg-background', className)}>
      <input type="text" {...draft}
        className="w-0 flex-1 text-xs bg-transparent focus:outline-none tabular-nums text-foreground text-right" />
      {suffix && <span className="text-xs text-muted-foreground ml-0.5">{suffix}</span>}
    </div>
  )
}

// ─── Internal order panel (with callbacks for parent state) ───────────────────

interface InternalOrderPanelProps {
  cart: CartItem[]
  onQty: (idx: number, delta: number) => void
  onRemove: (idx: number) => void
  onClear: () => void
  onUpdateItem: (idx: number, field: 'discountPct' | 'discountAmt' | 'note' | 'price' | 'qty' | 'tax', value: number | string) => void
  onSave: (action: OrderAction) => void
  onOpenOrderSearch: (kind: 'booking' | 'quotation' | 'temporary') => void
  saving: boolean
  settings?: TPosSettingOrder
  totals: ReturnType<typeof calcTotals>
  perItemTax: boolean
  tableLabel?: string
  /** True when an existing table order can be cancelled */
  hasTableOrder?: boolean
  onBack?: () => void
  onFundTypeChange: (fund: TPosFundType | null, accountId?: number) => void
  customerValue: TPosCustomerSimple | null
  staffValue: TPosUser | null
  noteValue: string
  onCustomerChange: (customer: TPosCustomerSimple | null) => void
  onStaffChange: (user: TPosUser | null) => void
  onNoteChange: (v: string) => void
  detail: string
  setDetail: (v: string) => void
  invoiceForm: InvoiceFormData
  setInvoiceForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>
  money: MoneyControls
}

/** The editable money fields, owned by SalesTab so submit and display never drift. */
interface MoneyControls {
  discountPct: number; setDiscountPct: (v: number) => void
  discountAmt: number; setDiscountAmt: (v: number) => void
  voucher: number; setVoucher: (v: number) => void
  transferCost: number; setTransferCost: (v: number) => void
  taxPct: number; setTaxOverride: (v: number) => void
  payment: number | ''; setPayment: (v: number | '') => void
  isCustomersDebt: boolean; setIsCustomersDebt: (v: boolean) => void
  shortage: number; setShortage: (v: number) => void
}

function InternalOrderPanel({
  cart, onQty, onRemove, onClear, onUpdateItem, onSave, onOpenOrderSearch, saving, settings, totals, perItemTax,
  tableLabel, hasTableOrder, onBack,
  onFundTypeChange, customerValue, staffValue, noteValue, onCustomerChange, onStaffChange, onNoteChange,
  detail, setDetail, invoiceForm, setInvoiceForm, money,
}: InternalOrderPanelProps) {
  const { t } = useTranslation()
  const [panelTab, setPanelTab] = useState<PanelTab>('sales')
  const { data: fundTypes = [] } = useGetPaymentTypesQuery()
  const [fundTypeId, setFundTypeId] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<TPosCustomerSimple | null>(customerValue)
  const [selectedStaff, setSelectedStaff] = useState<TPosUser | null>(staffValue)
  const [note, setNote] = useState(noteValue)
  // Picking a QR-bearing payment method pops the code up big enough to scan,
  // instead of relying on the small inline thumbnail.
  const [qrAccount, setQrAccount] = useState<TPosFundAccount | null>(null)

  const { subTotal, orderDiscount, totalTax, total } = totals
  const debtEnabled = !!selectedCustomer && money.isCustomersDebt
  const normalizedShortage = debtEnabled ? Math.min(total, Math.max(0, money.shortage)) : 0
  const paymentValue = debtEnabled ? Math.max(0, total - normalizedShortage) : money.payment
  const change = !debtEnabled && money.payment !== '' ? Math.max(0, Number(money.payment) - total) : null

  useEffect(() => {
    setSelectedCustomer(customerValue)
  }, [customerValue])

  useEffect(() => {
    setSelectedStaff(staffValue)
  }, [staffValue])

  useEffect(() => {
    setNote(noteValue)
  }, [noteValue])

  useEffect(() => {
    if (!selectedCustomer && money.isCustomersDebt) {
      money.setIsCustomersDebt(false)
      money.setShortage(0)
    }
  }, [money, selectedCustomer])

  useEffect(() => {
    if (!debtEnabled || money.shortage <= total) return
    money.setShortage(total)
  }, [debtEnabled, money, total])

  // Default to the first fund type once the list arrives.
  useEffect(() => {
    if (fundTypeId != null || !fundTypes.length) return
    const first = fundTypes.find(f => /tien mat|cash/.test(normalizeName(f.Name))) ?? fundTypes[0]
    setFundTypeId(first.Id ?? null)
    onFundTypeChange(first, first.Items?.length === 1 ? first.Items[0].Id : undefined)
  }, [fundTypes, fundTypeId, onFundTypeChange])

  const selectedFund = fundTypes.find(f => f.Id === fundTypeId)
  // Show the fund type's own account when it has no linked ones (matches how
  // "Ví Momo"/"Cà thẻ" carry their details at the top level).
  const accounts = selectedFund?.Items?.length
    ? selectedFund.Items
    : hasAccountInfo(selectedFund) ? [selectedFund as TPosFundAccount] : []

  const setFund = (f: TPosFundType) => {
    setFundTypeId(f.Id ?? null)
    // The inline account card is gone — the QR popup is now the only place
    // to see/pick an account, so default straight to the first one (its own
    // switcher lets the user flip to another if the fund type has several).
    const list = f.Items?.length ? f.Items : (hasAccountInfo(f) ? [f as TPosFundAccount] : [])
    const first = list[0]
    onFundTypeChange(f, first?.Id)
    setQrAccount(first?.QrCodeUrl ? first : null)
  }
  /** Switching accounts from inside the QR popup — always stays open, even for a QR-less account. */
  const switchAccount = (a: TPosFundAccount) => {
    if (selectedFund) onFundTypeChange(selectedFund, a.Id)
    setQrAccount(a)
  }
  const setCust = (c: TPosCustomerSimple | null) => {
    setSelectedCustomer(c)
    onCustomerChange(c)
    if (c) {
      setInvoiceForm(prev => ({
        ...prev,
        buyerName: c.Name || prev.buyerName,
        taxCode: c.TaxNumber || prev.taxCode,
        companyName: c.CompanyName || prev.companyName,
        address: c.Address || prev.address,
        phone: c.Phone || prev.phone,
        email: c.Email || prev.email,
      }))
    }
  }
  const setStaff = (u: TPosUser | null) => { setSelectedStaff(u); onStaffChange(u) }
  const setNoteVal = (v: string) => { setNote(v); onNoteChange(v) }
  const setCustomerDebt = (checked: boolean) => {
    money.setIsCustomersDebt(checked)
    if (checked) {
      money.setPayment(0)
      money.setShortage(total)
      return
    }
    money.setShortage(0)
    money.setPayment(total)
  }
  const setPaymentValue = (value: number | '') => {
    if (debtEnabled) {
      const paid = value === '' ? 0 : Math.min(total, Math.max(0, Number(value)))
      money.setPayment(paid)
      money.setShortage(Math.max(0, total - paid))
      return
    }
    money.setPayment(value)
  }
  const setShortageValue = (value: number) => {
    const next = Math.min(total, Math.max(0, value))
    money.setShortage(next)
    money.setPayment(Math.max(0, total - next))
  }

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.75))' }}>
        {onBack && <button onClick={onBack} className="text-white/80 hover:text-white transition-colors mr-1"><X className="h-3.5 w-3.5" /></button>}
        <ShoppingCart className="h-4 w-4 text-white/90" />
        <span className="flex-1 text-sm font-bold text-white">{tableLabel ? t('pages.actives.order.bookingHeaderTitle') : t('pages.actives.order.orderHeaderTitle')}</span>
        {tableLabel && <span className="bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{tableLabel}</span>}
        {cart.length > 0 && (
          <button onClick={onClear}
            className="flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-rose-600">
            <Trash2 className="h-3 w-3" /> {t('pages.actives.order.clearAllButton')}
          </button>
        )}
      </div>

      {/* Panel tab bar */}
      <div className="flex border-b shrink-0 bg-muted/20">
        {PANEL_TABS.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setPanelTab(key)}
            className={`flex items-center gap-1 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              panelTab === key
                ? 'border-primary text-primary bg-background/60'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3 w-3" />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Hoá đơn điện tử tab */}
      {panelTab === 'invoice' && <SellInvoiceTab form={invoiceForm} setForm={setInvoiceForm} />}

      {/* Thông tin tab */}
      {panelTab === 'info' && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block">{t('common.date')}</label>
              <input type="date"
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('common.invoiceNo')}</label>
              <input type="text" placeholder={t('pages.actives.order.invoiceNoPlaceholder')}
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('common.description')}</label>
              <input type="text" placeholder={t('pages.actives.order.detailPlaceholder')} value={detail} onChange={e => setDetail(e.target.value)}
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">{t('common.note')}</label>
              <input type="text" placeholder={t('pages.actives.order.notePlaceholder')} value={note} onChange={e => setNoteVal(e.target.value)}
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
        </div>
      )}

      {panelTab === 'sales' && (
        <>
        {/* Customer + Staff */}
        <div className="px-2.5 pt-2 pb-1.5 border-b shrink-0">
          <div className="flex gap-2">
            <CustomerSelect value={selectedCustomer} onChange={setCust} />
            <StaffSelect value={selectedStaff} onChange={setStaff} />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 opacity-40" />
            </div>
            <p className="text-xs">{t('pages.actives.order.selectProductHint')}</p>
          </div>
        ) : (
          <table className="w-full text-xs min-w-[540px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b z-10">
              <tr>
                {[
                  t('common.index'), t('pages.actives.order.colItemName'), t('pages.actives.order.colQty'),
                  t('common.price'), t('pages.actives.order.colDiscountPercent'), t('pages.actives.order.colDiscountAmount'),
                  ...(perItemTax ? [t('pages.actives.order.colTax')] : []),
                  t('pages.actives.order.colLineTotal'), t('common.note'), '',
                ].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap first:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cart.map((item, idx) => {
                const c = ci(item.product.Id, idx)
                // "T.Tiền" = Angular's "Thành tiền", which is the AFTER-tax
                // amount (getItemAmountAfterTax), not the pre-tax subtotal.
                const rowTotal = itemAmount(item, perItemTax)
                return (
                  <tr key={item.product.Id ?? idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1.5 max-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[c]}`} />
                        <div className="min-w-0 flex items-center gap-1">
                          {/* KCT = không chịu thuế (Product.Tax null), VAT {percent}% = chịu thuế —
                              shown before the name per request, using the line's own tax rate
                              (falls back to the product's registered rate) so an edited per-line
                              % stays reflected here too. */}
                          <span className={cn(
                            'shrink-0 rounded-full px-1.5 text-[9px] font-bold leading-[14px] whitespace-nowrap',
                            item.product.Tax == null
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                          )}>
                            {item.product.Tax == null
                              ? t('pages.actives.order.taxExemptBadge')
                              : t('pages.actives.order.taxableBadge', { percent: item.tax ?? item.product.Tax })}
                          </span>
                          <span className="font-medium text-foreground line-clamp-1">{item.product.Name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onQty(idx, -1)} className="h-5 w-5 rounded border border-input flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0">
                          <Minus className="h-2 w-2" />
                        </button>
                        <NumInput value={item.qty} className="w-11"
                          onChange={v => onUpdateItem(idx, 'qty', Math.max(1, Math.round(v)))} />
                        <button onClick={() => onQty(idx, 1)} className="h-5 w-5 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors shrink-0">
                          <Plus className="h-2 w-2" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput value={item.price} className="w-20"
                        onChange={v => onUpdateItem(idx, 'price', Math.max(0, v))} />
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center w-16 border border-input rounded px-1.5 py-0.5 bg-background">
                        <PercentInput value={item.discountPct}
                          onChange={v => onUpdateItem(idx, 'discountPct', v)} />
                        <span className="text-muted-foreground text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput value={item.discountAmt} className="w-20"
                        onChange={v => onUpdateItem(idx, 'discountAmt', Math.max(0, v))} />
                    </td>
                    {perItemTax && (
                      <td className="px-2 py-1.5">
                        <div className="flex items-center w-14 border border-input rounded px-1.5 py-0.5 bg-background">
                          <PercentInput value={item.tax ?? 0} disabled={item.product.Tax == null}
                            onChange={v => onUpdateItem(idx, 'tax', v)} />
                          <span className="text-muted-foreground text-[10px]">%</span>
                        </div>
                      </td>
                    )}
                    <td className="px-2 py-1.5 tabular-nums font-semibold text-foreground whitespace-nowrap">{fmt(rowTotal)}</td>
                    <td className="px-2 py-1.5">
                      <input type="text" placeholder={t('pages.actives.order.notePlaceholder')} value={item.note}
                        onChange={e => onUpdateItem(idx, 'note', e.target.value)}
                        className="w-20 text-xs bg-transparent border border-input rounded px-1.5 py-0.5 focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
                    </td>
                    <td className="px-2 py-1.5">
                      <button onClick={() => onRemove(idx)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-2.5 pt-2 pb-2 space-y-1.5 shrink-0 bg-muted/20">
        {/* Ghi chú + Diễn giải */}
        <div className="grid grid-cols-2 gap-1.5">
          <input type="text" placeholder={t('pages.actives.order.orderNotePlaceholder')} value={note} onChange={e => setNoteVal(e.target.value)}
            className="w-full rounded-lg border border-input px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground" />
          <input type="text" placeholder={t('pages.actives.order.detailPlaceholder')} value={detail} onChange={e => setDetail(e.target.value)}
            className="w-full rounded-lg border border-input px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground" />
        </div>

        {/* Phương thức thanh toán | Tiền */}
        <div className="grid grid-cols-2 gap-1.5 items-start">
          <div className="flex flex-col gap-1">
            {fundTypes.map(f => {
              const { icon: Icon, activeClass } = fundStyle(f.Name)
              return (
                <button key={f.Id} onClick={() => setFund(f)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${fundTypeId === f.Id ? activeClass : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{f.Name}</span>
                </button>
              )
            })}
          </div>

          <div className="rounded-xl border bg-card px-2.5 py-2 space-y-1">
            <MoneyRow label={t('pages.actives.order.subtotalLabel')}>
              <span className="flex-1 text-xs font-semibold tabular-nums text-foreground text-right">{fmt(subTotal)}</span>
            </MoneyRow>

            {settings?.IsDiscount !== false && (
              <MoneyRow label={t('pages.actives.order.discountLabel')}>
                <div className="flex items-center gap-1 flex-1">
                  <NumInput value={money.discountPct} onChange={v => money.setDiscountPct(Math.min(100, Math.max(0, v)))} suffix="%" className="w-12" />
                  <NumInput value={money.discountAmt} onChange={money.setDiscountAmt} className="flex-1" />
                </div>
              </MoneyRow>
            )}

            {settings?.IsVoucher && (
              <MoneyRow label={t('pages.actives.order.voucherLabel')}>
                <NumInput value={money.voucher} onChange={money.setVoucher} className="flex-1" />
              </MoneyRow>
            )}

            {settings?.IsTax && !perItemTax && (
              <MoneyRow label={t('pages.actives.order.taxPercentLabel')}>
                <NumInput value={money.taxPct} onChange={money.setTaxOverride} suffix="%" className="flex-1" />
              </MoneyRow>
            )}

            {settings?.IsTranferCost && (
              <MoneyRow label={t('pages.actives.order.shippingFeeLabel')}>
                <NumInput value={money.transferCost} onChange={money.setTransferCost} className="flex-1" />
              </MoneyRow>
            )}

            {totalTax > 0 && (
              <div className="flex justify-between text-xs text-blue-500 dark:text-blue-400">
                <span>{t('pages.actives.order.taxLabel')}{perItemTax ? '' : ` ${money.taxPct}%`}</span>
                <span className="tabular-nums">+{fmt(totalTax)}</span>
              </div>
            )}
            {orderDiscount > 0 && (
              <div className="flex justify-between text-xs text-orange-500">
                <span>{t('pages.actives.order.discountedLabel')}</span><span className="tabular-nums">-{fmt(orderDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t pt-1.5">
              <span className="text-xs font-bold text-foreground">{t('pages.actives.order.totalLabel')}</span>
              <span className="text-base font-extrabold tabular-nums text-primary">{fmtCurrency(total)}</span>
            </div>

            <MoneyRow label={t('pages.actives.order.customerPaidLabel')}>
              <input type="number" min={0} value={paymentValue}
                onChange={e => setPaymentValue(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={String(Math.round(total))}
                className="flex-1 w-0 border border-input rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none placeholder:text-muted-foreground/50 text-foreground tabular-nums text-right" />
            </MoneyRow>
            {selectedCustomer && (
              <MoneyRow label={t('pages.actives.order.customerDebtLabel')}>
                <label className="flex h-8 flex-1 items-center gap-2 rounded border bg-background px-2 text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={money.isCustomersDebt}
                    onChange={e => setCustomerDebt(e.target.checked)}
                  />
                  <span>{t('pages.actives.order.customerDebtLabel')}</span>
                </label>
              </MoneyRow>
            )}
            {debtEnabled && (
              <MoneyRow label={t('pages.actives.order.shortageLabel')}>
                <NumInput value={normalizedShortage} onChange={setShortageValue} className="flex-1 text-rose-600" />
              </MoneyRow>
            )}
            {change != null && change > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>{t('pages.actives.order.changeLabel')}</span><span className="tabular-nums">{fmtCurrency(change)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Restaurant actions — mirrors the Angular table view */}
        {tableLabel ? (
          <>
            {/* Row 1: thoát / lưu / thanh toán */}
            <div className="grid grid-cols-4 gap-1.5">
              <ActionBtn tone="neutral" icon={X} label={t('pages.actives.order.exitButton')} onClick={() => onBack?.()} />
              <ActionBtn tone="sky" icon={Save} label={t('pages.actives.order.saveAndExitButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('save-exit')} />
              <ActionBtn tone="emerald-strong" icon={Printer} label={t('pages.actives.order.payAndPrintButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('print')} />
              <ActionBtn tone="emerald" icon={Banknote} label={t('pages.actives.order.payNoPrintButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('pay')} />
            </div>
            {/* Row 2: các lệnh in + xoá đơn */}
            <div className={cn('grid gap-1.5', hasTableOrder ? 'grid-cols-4' : 'grid-cols-3')}>
              <ActionBtn tone="neutral" icon={Printer} label={t('pages.actives.order.printTempButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('print-temp')} />
              <ActionBtn tone="indigo" icon={Printer} label={t('pages.actives.order.printKitchenButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('print-kitchen')} />
              <ActionBtn tone="indigo" icon={Printer} label={t('pages.actives.order.printLabelButton')}
                disabled={saving || cart.length === 0} onClick={() => onSave('print-label')} />
              {hasTableOrder && (
                <ActionBtn tone="rose" icon={Trash2} label={t('pages.actives.order.deleteOrderButton')}
                  disabled={saving} onClick={() => onSave('cancel-order')} />
              )}
            </div>
          </>
        ) : (
          <>
          {/* Action buttons - row 1 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => onSave('temp')} disabled={saving || cart.length === 0}
              className="flex items-center justify-center gap-1 rounded-lg border border-sky-400 px-2 py-2.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all disabled:opacity-40">
              <Save className="h-3.5 w-3.5" /> {t('pages.actives.order.saveTempButton')}
            </button>
            <button onClick={() => onSave('print')} disabled={saving || cart.length === 0}
              className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-2.5 text-xs font-bold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-40 col-span-1">
              <Printer className="h-3.5 w-3.5" /> {t('pages.actives.order.payAndPrintButton')}
            </button>
            <button onClick={() => onSave('pay')} disabled={saving || cart.length === 0}
              className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-2 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all disabled:opacity-40">
              <Banknote className="h-3.5 w-3.5" /> {t('pages.actives.order.payNoPrintButton')}
            </button>
          </div>
          {/* Action buttons - row 2 */}
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => onOpenOrderSearch('booking')} disabled={saving}
              className="flex items-center justify-center gap-1 rounded-lg border border-orange-400 px-2 py-2.5 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-40">
              <BookOpen className="h-3.5 w-3.5" /> {t('pages.actives.order.bookingButton')}
            </button>
            <button onClick={() => onOpenOrderSearch('quotation')} disabled={saving}
              className="flex items-center justify-center gap-1 rounded-lg border border-violet-400 px-2 py-2.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-40">
              <FileText className="h-3.5 w-3.5" /> {t('pages.actives.order.quotationButton')}
            </button>
            <button onClick={() => onOpenOrderSearch('temporary')} disabled={saving}
              className="flex items-center justify-center gap-1 rounded-lg border border-input px-2 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-all disabled:opacity-40">
              <RefreshCw className="h-3.5 w-3.5" /> {t('pages.actives.order.reopenButton')}
            </button>
          </div>
          </>
        )}
      </div>
        </>
      )}

      <Dialog open={!!qrAccount} onOpenChange={v => !v && setQrAccount(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>{t('pages.actives.order.scanToPayTitle')}</DialogTitle></DialogHeader>
          <div className="flex flex-col items-center gap-2">
            {accounts.length > 1 && (
              <div className="flex flex-wrap justify-center gap-1">
                {accounts.map(a => (
                  <button key={a.Id} type="button" onClick={() => switchAccount(a)}
                    className={cn(
                      'px-2 py-1 rounded-full text-[10px] font-semibold border transition-colors',
                      qrAccount?.Id === a.Id ? 'border-primary bg-primary/10 text-primary' : 'border-input text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {a.ShortName || a.Name}
                  </button>
                ))}
              </div>
            )}
            {qrAccount?.QrCodeUrl && (
              <img src={qrAccount.QrCodeUrl} alt="QR" className="w-56 h-56 object-contain rounded-lg border bg-white" />
            )}
            <div className="text-center space-y-0.5">
              <p className="font-semibold text-sm">{qrAccount?.ShortName || qrAccount?.Name}</p>
              {qrAccount?.AccountNumber && <p className="text-primary font-bold tabular-nums">{qrAccount.AccountNumber}</p>}
              {qrAccount?.AccountName && <p className="text-xs text-muted-foreground">{qrAccount.AccountName}</p>}
            </div>
            <div className="w-full rounded-lg bg-muted px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('pages.actives.order.amountToPayLabel')}</span>
              <span className="font-bold tabular-nums">{fmt(total)}</span>
            </div>
            <Button className="w-full" onClick={() => setQrAccount(null)}>{t('pages.actives.order.closeButton')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Sell Invoice Tab ─────────────────────────────────────────────────────────

interface InvoiceFormData {
  isInvoice: boolean
  taxCode: string
  companyName: string
  address: string
  buyerName: string
  cccd: string
  phone: string
  email: string
  bankAccount: string
  bankName: string
  paymentMethod: string
}

const PAYMENT_METHODS = [
  { value: 'TM/CK', label: 'TM/CK' },
  { value: 'CK',    label: 'CK' },
]

/** Hoisted to module scope: defining this inside SellInvoiceTab gave it a new
 * function identity on every keystroke, so React remounted the wrapped input
 * (losing focus) instead of just re-rendering it. */
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">
        {required && <span className="text-destructive mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  )
}

function SellInvoiceTab({
  form,
  setForm,
}: {
  form: InvoiceFormData
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>
}) {
  const { t } = useTranslation()
  const set = (key: keyof InvoiceFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-3">
          <Switch checked={form.isInvoice} onCheckedChange={v => set('isInvoice', v)} />
          <span className="text-sm font-medium">{t('pages.actives.order.exportInvoiceToggle')}</span>
        </div>

        {/* Row 1: MST + Tên công ty */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.customerTaxCode')}>
            <div className="flex gap-1.5">
              <Input
                value={form.taxCode}
                onChange={e => set('taxCode', e.target.value)}
                placeholder={t('common.customerTaxCode')}
                className="flex-1"
              />
              <Button variant="default" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label={t('common.companyName')} required>
            <Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder={t('common.companyName')} />
          </Field>
        </div>

        {/* Row 2: Địa chỉ full width */}
        <Field label={t('common.customerAddress')} required>
          <Textarea value={form.address} onChange={e => set('address', e.target.value)}
            placeholder={t('common.customerAddress')} rows={2} className="resize-none" />
        </Field>

        {/* Row 3: Tên KH + CCCD */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.customerName')} required>
            <Input value={form.buyerName} onChange={e => set('buyerName', e.target.value)} />
          </Field>
          <Field label={t('common.citizenId')}>
            <Input value={form.cccd} onChange={e => set('cccd', e.target.value)} placeholder={t('common.citizenId')} />
          </Field>
        </div>

        {/* Row 4: SĐT + Email */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('pages.actives.order.phoneNumberLabel')} required>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={t('pages.actives.order.phoneNumberLabel')} />
          </Field>
          <Field label={t('common.email')} required>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder={t('pages.actives.order.emailPlaceholder')} type="email" />
          </Field>
        </div>

        {/* Row 5: Số TK + Tên NH */}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('pages.actives.order.bankAccountNumberLabel')}>
            <Input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder={t('pages.actives.order.bankAccountNumberLabel')} />
          </Field>
          <Field label={t('common.bankName')}>
            <Input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder={t('common.bankName')} />
          </Field>
        </div>

        {/* Row 6: Phương thức TT */}
        <div className="w-1/2 pr-1.5">
          <Field label={t('pages.actives.order.paymentMethodLabel')}>
            <Select value={form.paymentMethod} onValueChange={v => set('paymentMethod', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  )
}

// ─── Main POS page ────────────────────────────────────────────────────────────

interface PosOrderPageProps { tableLabel?: string; bookingId?: number; tableId?: number; tableGuid?: string; onBack?: () => void }

export default function PosOrderPage({ tableLabel, bookingId, tableId, tableGuid, onBack }: PosOrderPageProps = {}) {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="-m-4 overflow-hidden bg-muted/40" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <SalesTab
        tableLabel={tableLabel}
        bookingId={bookingId}
        initialOrderId={orderId ? Number(orderId) : undefined}
        tableId={tableId}
        tableGuid={tableGuid}
        onBack={onBack}
      />
    </div>
  )
}
