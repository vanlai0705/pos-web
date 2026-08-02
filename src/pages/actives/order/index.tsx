import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Search, Plus, Minus, Trash2, X,
  Printer, Banknote, Smartphone, CreditCard,
  ShoppingCart, Package, ChevronRight, Save,
  FileText, Info, Wallet, RefreshCw, BookOpen,
} from 'lucide-react'
import { CustomerSelect } from '@/components/pos/customer-select'
import { StaffSelect } from '@/components/pos/staff-select'
import type { TPosCustomerSimple, TPosUser } from '@/store/slice/users/types/pos-types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  useFilterActiveProductsQuery,
  useGetProductGroupsSimpleQuery,
  useSaveOrderMutation,
  useCompleteOrderMutation,
  useSaveBookingMutation,
  useSaveQuotationMutation,
  useGetSettingOrderQuery,
  useGetUserShopSettingQuery,
} from '@/store/slice/users/api/api'
import type {
  TPosActiveProduct, TPosOrder, TPosOrderItem, TPosCustomerInvoice,
} from '@/store/slice/users/types/pos-types'
import { getImageUrl } from '@/utils/common'

// ─── Constants ─────────────────────────────────────────────────────────────────

function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

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

const ICON_COLORS = [
  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400',
  'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
  'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  'bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400',
  'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400',
  'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400',
]

const DOT_COLORS = [
  'bg-blue-400', 'bg-violet-400', 'bg-emerald-400', 'bg-orange-400',
  'bg-pink-400', 'bg-cyan-400', 'bg-amber-400', 'bg-rose-400',
]

function ci(id?: number, i?: number) { return ((id ?? i ?? 0) % 8) }

// ─── Payment methods ──────────────────────────────────────────────────────────

const FUND_TYPES = [
  { id: 1, label: 'Tiền mặt',    icon: Banknote,    activeClass: 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900 shadow-sm' },
  { id: 2, label: 'Chuyển khoản', icon: Smartphone, activeClass: 'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-900 shadow-sm' },
  { id: 3, label: 'Cà thẻ',      icon: CreditCard,  activeClass: 'bg-violet-500 text-white shadow-violet-200 dark:shadow-violet-900 shadow-sm' },
  { id: 4, label: 'Quỹ',         icon: Wallet,      activeClass: 'bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900 shadow-sm' },
  { id: 5, label: 'Ví Momo',     icon: Wallet,      activeClass: 'bg-rose-500 text-white shadow-rose-200 dark:shadow-rose-900 shadow-sm' },
]

// ─── Cart item type ───────────────────────────────────────────────────────────

interface CartItem {
  product: TPosActiveProduct
  qty: number
  price: number
  discountPct: number
  note: string
}

function itemDiscount(item: CartItem) {
  return Math.round(item.price * item.qty * item.discountPct / 100)
}

/** Line total after discount, before tax. */
function itemSubtotal(item: CartItem) {
  return Math.max(0, item.price * item.qty - itemDiscount(item))
}

/** Per-item tax percent — 0 unless the shop enables per-item tax. */
function itemTaxPct(item: CartItem, perItemTax: boolean) {
  return perItemTax ? Number(item.product.Tax ?? 0) || 0 : 0
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
}

/** Order totals — mirrors Angular `OrderService.getTotal` / `OrderModel.getTotalTax`. */
function calcTotals(cart: CartItem[], { orderTaxPct, perItemTax, discountPct }: TotalsOpts) {
  const subTotal = cart.reduce((s, c) => s + itemSubtotal(c), 0)
  const orderDiscount = subTotal * discountPct / 100
  const totalBeforeTax = Math.max(0, subTotal - orderDiscount)
  const itemTax = cart.reduce((s, c) => s + itemTaxAmount(c, perItemTax), 0)
  // Per-item tax wins when present; otherwise fall back to the order-level rate.
  const totalTax = itemTax > 0 ? itemTax : totalBeforeTax * orderTaxPct / 100
  const subTotalItems = cart.reduce((s, c) => s + itemAmount(c, perItemTax), 0)
  return { subTotal, subTotalItems, orderDiscount, totalBeforeTax, totalTax, total: totalBeforeTax + totalTax }
}

// ─── Product panel ────────────────────────────────────────────────────────────

interface ProductPanelProps { onAdd: (p: TPosActiveProduct) => void }

function ProductPanel({ onAdd }: ProductPanelProps) {
  const [keyword, setKeyword] = useState('')
  const [groupId, setGroupId] = useState<number | null>(null)

  const { data: groups = [] } = useGetProductGroupsSimpleQuery()
  const { data, isLoading } = useFilterActiveProductsQuery({
    PageIndex: 0, PageSize: 60,
    Keyword: keyword || undefined,
    GroupId: groupId ?? undefined,
  })
  const products = data?.Items ?? []

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0 space-y-2 border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground">Chọn sản phẩm</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text" placeholder="Tìm sản phẩm, mã vạch..."
            value={keyword} onChange={e => setKeyword(e.target.value)}
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
          >Tất cả</button>
          {groups.map(g => (
            <button key={g.Id} onClick={() => setGroupId(g.Id ?? null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${groupId === g.Id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >{g.Name}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">Không tìm thấy sản phẩm</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {products.map((p, i) => {
              const c = ci(p.Id, i)
              const url = imgUrl(p.Image?.Url ?? p.Images?.[0]?.Url)
              return (
                <button key={p.Id ?? i} onClick={() => onAdd(p)}
                  className={`flex flex-col rounded-xl border bg-gradient-to-br text-left transition-all active:scale-95 hover:shadow-md hover:border-primary/40 duration-150 overflow-hidden ${CARD_COLORS[c]}`}
                >
                  {url
                    ? <img src={url} alt={p.Name} className="w-full h-20 object-cover" />
                    : <div className={`w-full h-14 flex items-center justify-center ${ICON_COLORS[c]}`}><Package className="h-7 w-7 opacity-60" /></div>
                  }
                  <div className="px-2 pt-1.5 pb-2">
                    <p className="text-[11px] font-semibold text-foreground line-clamp-2 leading-tight">{p.Name}</p>
                    <div className="flex items-center justify-between mt-1 gap-1 flex-wrap">
                      <span className="text-[11px] font-bold text-primary tabular-nums">{fmtCurrency(p.Price)}</span>
                      {p.Unit?.Name && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/60 text-muted-foreground border">{p.Unit.Name}</span>}
                    </div>
                    {p.Quantity != null && <p className="text-[9px] text-muted-foreground mt-0.5">Tồn: {p.Quantity.toLocaleString('vi-VN')}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sales tab (POS) ──────────────────────────────────────────────────────────

interface SalesTabProps { tableLabel?: string; bookingId?: number; onBack?: () => void }

function SalesTab({ tableLabel, bookingId, onBack }: SalesTabProps) {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [saveOrder, { isLoading: savingOrder }] = useSaveOrderMutation()
  const [completeOrder, { isLoading: completing }] = useCompleteOrderMutation()
  const [saveBooking, { isLoading: savingBooking }] = useSaveBookingMutation()
  const [saveQuotation, { isLoading: savingQuotation }] = useSaveQuotationMutation()
  const { data: settings } = useGetSettingOrderQuery()
  const { data: shopSetting } = useGetUserShopSettingQuery()
  const shopId = shopSetting?.SelectedShopId
  const taxPct = settings?.IsTax ? (settings.TaxPercent ?? 0) : 0
  const perItemTax = !!settings?.IsTaxPerItemAllowed
  const saving = savingOrder || completing || savingBooking || savingQuotation

  // Panel state refs (hoisted so we can read on submit)
  const [fundTypeId, setFundTypeId] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<TPosCustomerSimple | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<TPosUser | null>(null)
  const [note, setNote] = useState('')
  const [detail, setDetail] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [customerGive, setCustomerGive] = useState<number | ''>('')
  const [invoiceForm, setInvoiceForm] = useState<InvoiceFormData>(EMPTY_INVOICE_FORM)

  const addToCart = useCallback((product: TPosActiveProduct) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.product.Id === product.Id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { product, qty: 1, price: product.Price ?? 0, discountPct: 0, note: '' }]
    })
  }, [])

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

  const updateItem = useCallback((idx: number, field: 'discountPct' | 'note' | 'price', value: number | string) => {
    setCart(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const totals = useMemo(
    () => calcTotals(cart, { orderTaxPct: taxPct, perItemTax, discountPct }),
    [cart, taxPct, perItemTax, discountPct],
  )
  const { subTotal, subTotalItems, totalTax, total } = totals

  /**
   * Order lines in the shape `orders/*` expects: `Total` is pre-tax,
   * `Amount` is tax-inclusive, and the full product snapshot rides along.
   */
  const buildItems = (): TPosOrderItem[] => cart.map(c => {
    const tax = c.product.Tax == null ? null : itemTaxPct(c, perItemTax)
    return {
      Guid: newGuid(),
      Product: { ...c.product, Tax: tax ?? undefined },
      Unit: c.product.Unit,
      UnitName: c.product.Unit?.Name ?? '',
      Quantity: c.qty,
      QuantityGroup: 0,
      QuantitySystem: 0,
      QuantityReal: 0,
      Exchange: 0,
      Price: c.price,
      DiscountPercent: c.discountPct,
      Discount: itemDiscount(c),
      Total: itemSubtotal(c),
      Amount: itemAmount(c, perItemTax),
      Tax: tax ?? undefined,
      Type: 1,
      Note: c.note || '',
      IsPromotion: false,
      IsPrinted: false,
      IsAnonymous: false,
      Status: { Id: 0 },
    }
  })

  const handleSave = async (action: 'pay' | 'print' | 'temp' | 'booking' | 'quotation') => {
    if (cart.length === 0) { toast.error('Giỏ hàng trống'); return }
    if (invoiceForm.isInvoice && !invoiceForm.taxCode) {
      toast.error('Vui lòng nhập thông tin để xuất hoá đơn')
      return
    }

    const user = selectedStaff
      ? { Id: selectedStaff.Id, Name: selectedStaff.FullName || selectedStaff.Name }
      : undefined
    const items = buildItems()

    if (action === 'booking') {
      try {
        await saveBooking({
          Id: bookingId,
          Customer: selectedCustomer ?? undefined,
          User: user,
          Note: note || undefined,
          SubTotal: subTotal,
          Total: total,
          OrderItems: items,
        }).unwrap()
        toast.success('Đặt hàng thành công!')
        setCart([])
        if (onBack) onBack()
      } catch { toast.error('Không thể đặt hàng') }
      return
    }

    if (action === 'quotation') {
      try {
        await saveQuotation({
          Customer: selectedCustomer ?? undefined,
          User: user,
          Note: note || undefined,
          SubTotal: subTotal,
          Total: total,
          OrderItems: items,
        }).unwrap()
        toast.success('Đã tạo báo giá!')
        setCart([])
      } catch { toast.error('Không thể tạo báo giá') }
      return
    }

    // "Cà thẻ" settles on the card; every other fund type settles as cash.
    const isCard = fundTypeId === 3
    const now = new Date().toISOString()

    const order: TPosOrder = {
      Id: bookingId,
      Guid: newGuid(),
      Date: now,
      CreationTime: now,
      Detail: detail || 'Xuất bán hàng',
      Note: note || '',
      Customer: selectedCustomer ?? undefined,
      User: user,
      Shop: shopId ? { Id: shopId } : undefined,
      StockOut: settings?.StockDefault ?? undefined,
      Items: items,
      PromotionItems: [],
      Printers: [],
      SubTotal: subTotal,
      SubTotalItems: subTotalItems,
      Total: total,
      Discount: 0,
      DiscountPercent: discountPct,
      Tax: taxPct,
      TotalTax: totalTax,
      TransferCost: 0,
      OldDebit: 0,
      Cash: isCard ? 0 : total,
      Card: isCard ? total : 0,
      Transfer: 0,
      Shortage: 0,
      Round: 0,
      Change: customerGive !== '' ? Math.max(0, Number(customerGive) - total) : 0,
      Reserved: 0,
      Payment: 0,
      Return: 0,
      Point: 0,
      Voucher: 0,
      PrintNo: 0,
      PriceType: 0,
      Type: 0,
      PaymentType: 0,
      IsCustomersDebt: false,
      IsPrint: action === 'print',
      IsExportInvoice: invoiceForm.isInvoice,
      CustomerInvoice: buildCustomerInvoice(invoiceForm),
    }

    if (action === 'temp') {
      try {
        await saveOrder(order).unwrap()
        toast.success('Đã lưu tạm đơn hàng')
        setCart([])
      } catch { toast.error('Không thể lưu tạm đơn hàng') }
      return
    }

    try {
      await completeOrder(order).unwrap()
      if (action === 'print') {
        toast.success('Đã thanh toán — đang in hoá đơn...')
        window.print()
      } else {
        toast.success('Thanh toán thành công!')
      }
      setCart([])
      navigate('/actives/order-manager')
      if (onBack) onBack()
    } catch { toast.error('Không thể thanh toán đơn hàng') }
  }

  return (
    <div className="flex gap-2 h-full min-h-0 p-2">
      <div className="flex-[3] min-w-0 h-full">
        <InternalOrderPanel
          cart={cart}
          onQty={updateQty}
          onRemove={removeItem}
          onClear={() => setCart([])}
          onUpdateItem={updateItem}
          onSave={handleSave}
          saving={saving}
          taxPct={taxPct}
          perItemTax={perItemTax}
          tableLabel={tableLabel}
          onBack={onBack}
          onFundTypeChange={setFundTypeId}
          onCustomerChange={setSelectedCustomer}
          onStaffChange={setSelectedStaff}
          onNoteChange={setNote}
          onDiscountChange={setDiscountPct}
          detail={detail}
          setDetail={setDetail}
          customerGive={customerGive}
          setCustomerGive={setCustomerGive}
          invoiceForm={invoiceForm}
          setInvoiceForm={setInvoiceForm}
        />
      </div>
      <div className="flex-[2] min-w-0 h-full">
        <ProductPanel onAdd={addToCart} />
      </div>
    </div>
  )
}

// ─── Internal order panel tabs ────────────────────────────────────────────────

type PanelTab = 'sales' | 'invoice' | 'info'
const PANEL_TABS: { key: PanelTab; label: string; icon: React.ElementType }[] = [
  { key: 'sales',   label: 'Bán hàng',        icon: ShoppingCart },
  { key: 'invoice', label: 'Hoá đơn điện tử', icon: FileText },
  { key: 'info',    label: 'Thông tin',         icon: Info },
]

// ─── Internal order panel (with callbacks for parent state) ───────────────────

interface InternalOrderPanelProps {
  cart: CartItem[]
  onQty: (idx: number, delta: number) => void
  onRemove: (idx: number) => void
  onClear: () => void
  onUpdateItem: (idx: number, field: 'discountPct' | 'note' | 'price', value: number | string) => void
  onSave: (action: 'pay' | 'print' | 'temp' | 'booking' | 'quotation') => void
  saving: boolean
  taxPct: number
  perItemTax: boolean
  tableLabel?: string
  onBack?: () => void
  onFundTypeChange: (id: number) => void
  onCustomerChange: (customer: TPosCustomerSimple | null) => void
  onStaffChange: (user: TPosUser | null) => void
  onNoteChange: (v: string) => void
  onDiscountChange: (v: number) => void
  detail: string
  setDetail: (v: string) => void
  customerGive: number | ''
  setCustomerGive: (v: number | '') => void
  invoiceForm: InvoiceFormData
  setInvoiceForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>
}

function InternalOrderPanel({
  cart, onQty, onRemove, onClear, onUpdateItem, onSave, saving, taxPct, perItemTax,
  tableLabel, onBack,
  onFundTypeChange, onCustomerChange, onStaffChange, onNoteChange, onDiscountChange,
  detail, setDetail, customerGive, setCustomerGive, invoiceForm, setInvoiceForm,
}: InternalOrderPanelProps) {
  const [panelTab, setPanelTab] = useState<PanelTab>('sales')
  const [fundTypeId, setFundTypeId] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<TPosCustomerSimple | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<TPosUser | null>(null)
  const [note, setNote] = useState('')
  const [discountPct, setDiscountPct] = useState(0)
  const [voucher, setVoucher] = useState('')

  const { subTotal, orderDiscount, totalTax, total } = useMemo(
    () => calcTotals(cart, { orderTaxPct: taxPct, perItemTax, discountPct }),
    [cart, taxPct, perItemTax, discountPct],
  )
  const change = customerGive !== '' ? Math.max(0, Number(customerGive) - total) : null

  const setFund = (id: number) => { setFundTypeId(id); onFundTypeChange(id) }
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
  const setDisc = (v: number) => { setDiscountPct(v); onDiscountChange(v) }

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.75))' }}>
        {onBack && <button onClick={onBack} className="text-white/80 hover:text-white transition-colors mr-1"><X className="h-3.5 w-3.5" /></button>}
        <ShoppingCart className="h-4 w-4 text-white/90" />
        <span className="flex-1 text-sm font-bold text-white">{tableLabel ? 'Đặt bàn' : 'Đơn bán hàng'}</span>
        {tableLabel && <span className="bg-orange-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">{tableLabel}</span>}
        {cart.length > 0 && <button onClick={onClear} className="text-[11px] text-white/70 hover:text-white font-medium transition-colors">Xoá tất cả</button>}
      </div>

      {/* Panel tab bar */}
      <div className="flex border-b shrink-0 bg-muted/20">
        {PANEL_TABS.map(({ key, label, icon: Icon }) => (
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
            {label}
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
              <label className="text-xs font-medium mb-1 block">Ngày</label>
              <input type="date"
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Số HĐ</label>
              <input type="text" placeholder="Số hoá đơn..."
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Diễn giải</label>
              <input type="text" placeholder="Diễn giải..." value={detail} onChange={e => setDetail(e.target.value)}
                className="w-full rounded-lg border border-input px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Ghi chú</label>
              <input type="text" placeholder="Ghi chú..." value={note} onChange={e => setNoteVal(e.target.value)}
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
            <p className="text-xs">Chọn sản phẩm từ danh sách bên phải</p>
          </div>
        ) : (
          <table className="w-full text-xs min-w-[540px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b z-10">
              <tr>
                {['STT','Tên hàng','SL','Đơn giá','Giảm %','Giảm tiền','T.Tiền','Ghi chú',''].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-medium text-muted-foreground whitespace-nowrap first:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {cart.map((item, idx) => {
                const c = ci(item.product.Id, idx)
                const disc = itemDiscount(item)
                const rowTotal = itemSubtotal(item)
                return (
                  <tr key={item.product.Id ?? idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1.5 max-w-[140px]">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[c]}`} />
                        <span className="font-medium text-foreground line-clamp-1">{item.product.Name}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => onQty(idx, -1)} className="h-5 w-5 rounded border border-input flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                          <Minus className="h-2 w-2" />
                        </button>
                        <span className="w-6 text-center font-bold tabular-nums text-foreground">{item.qty}</span>
                        <button onClick={() => onQty(idx, 1)} className="h-5 w-5 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                          <Plus className="h-2 w-2" />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-foreground whitespace-nowrap">{fmt(item.price)}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center w-16 border border-input rounded px-1.5 py-0.5 bg-background">
                        <input type="number" min={0} max={100} value={item.discountPct}
                          onChange={e => onUpdateItem(idx, 'discountPct', Math.min(100, Math.max(0, Number(e.target.value))))}
                          className="w-full text-xs bg-transparent focus:outline-none tabular-nums text-foreground text-center" />
                        <span className="text-muted-foreground text-[10px]">%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-orange-500 whitespace-nowrap">{disc > 0 ? `-${fmt(disc)}` : '—'}</td>
                    <td className="px-2 py-1.5 tabular-nums font-semibold text-foreground whitespace-nowrap">{fmt(rowTotal)}</td>
                    <td className="px-2 py-1.5">
                      <input type="text" placeholder="Ghi chú..." value={item.note}
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
        <input type="text" placeholder="Ghi chú đơn hàng..." value={note} onChange={e => setNoteVal(e.target.value)}
          className="w-full rounded-lg border border-input px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground" />

        {/* Payment methods */}
        <div className="flex gap-1">
          {FUND_TYPES.map(({ id, label, icon: Icon, activeClass }) => (
            <button key={id} onClick={() => setFund(id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[9px] font-semibold transition-all ${fundTypeId === id ? activeClass : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="rounded-xl border bg-card px-3 py-2 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tiền hàng</span><span className="tabular-nums">{fmt(subTotal)}</span>
          </div>
          {totalTax > 0 && (
            <div className="flex justify-between text-xs text-blue-500 dark:text-blue-400">
              <span>Thuế{perItemTax ? '' : ` ${taxPct}%`}</span>
              <span className="tabular-nums">+{fmt(totalTax)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Giảm giá</span>
            <div className="flex items-center border border-input rounded px-1.5 py-0.5 bg-background w-20">
              <input type="number" min={0} max={100} value={discountPct}
                onChange={e => setDisc(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-full text-xs bg-transparent focus:outline-none tabular-nums text-foreground" />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
            {orderDiscount > 0 && <span className="text-xs text-orange-500 tabular-nums ml-auto">-{fmt(orderDiscount)}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Voucher</span>
            <input type="text" placeholder="Mã voucher..." value={voucher} onChange={e => setVoucher(e.target.value)}
              className="flex-1 border border-input rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
          </div>
          <div className="flex justify-between items-center border-t pt-1.5">
            <span className="text-sm font-bold text-foreground">Tổng cộng</span>
            <span className="text-lg font-extrabold tabular-nums text-primary">{fmtCurrency(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Khách đưa</span>
            <input type="number" min={0} value={customerGive}
              onChange={e => setCustomerGive(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="flex-1 border border-input rounded px-1.5 py-0.5 text-xs bg-background focus:outline-none placeholder:text-muted-foreground/50 text-foreground tabular-nums" />
            {change != null && change > 0 && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums whitespace-nowrap">Tiền thừa: {fmtCurrency(change)}</span>
            )}
          </div>
        </div>

        {/* Action buttons - row 1 */}
        <div className="grid grid-cols-4 gap-1">
          <button onClick={() => onBack?.()}
            className="flex items-center justify-center gap-1 rounded-lg border border-input px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted transition-all">
            <X className="h-3 w-3" /> Thoát
          </button>
          <button onClick={() => onSave('temp')} disabled={saving || cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg border border-sky-400 px-2 py-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-all disabled:opacity-40">
            <Save className="h-3 w-3" /> Lưu tạm
          </button>
          <button onClick={() => onSave('print')} disabled={saving || cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 py-1.5 text-[10px] font-bold text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-40 col-span-1">
            <Printer className="h-3 w-3" /> TT & In
          </button>
          <button onClick={() => onSave('pay')} disabled={saving || cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-primary to-primary/80 px-2 py-1.5 text-[10px] font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all disabled:opacity-40">
            <Banknote className="h-3 w-3" /> TT không in
          </button>
        </div>
        {/* Action buttons - row 2 */}
        <div className="grid grid-cols-3 gap-1">
          <button onClick={() => onSave('booking')} disabled={saving || cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg border border-orange-400 px-2 py-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-40">
            <BookOpen className="h-3 w-3" /> Đặt hàng
          </button>
          <button onClick={() => onSave('quotation')} disabled={saving || cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg border border-violet-400 px-2 py-1.5 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-40">
            <FileText className="h-3 w-3" /> Báo giá
          </button>
          <button disabled={cart.length === 0}
            className="flex items-center justify-center gap-1 rounded-lg border border-input px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted transition-all disabled:opacity-40">
            <RefreshCw className="h-3 w-3" /> Mở lại
          </button>
        </div>
        {cart.length > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ChevronRight className="h-3 w-3" />
            <span>{cart.length} sản phẩm — {cart.reduce((s, c) => s + c.qty, 0)} đơn vị</span>
          </div>
        )}
      </div>
        </>
      )}
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

function SellInvoiceTab({
  form,
  setForm,
}: {
  form: InvoiceFormData
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>
}) {
  const set = (key: keyof InvoiceFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3">
        {/* Toggle */}
        <div className="flex items-center gap-3">
          <Switch checked={form.isInvoice} onCheckedChange={v => set('isInvoice', v)} />
          <span className="text-sm font-medium">Xuất hoá đơn</span>
        </div>

        {/* Row 1: MST + Tên công ty */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="MST Khách hàng">
            <div className="flex gap-1.5">
              <Input
                value={form.taxCode}
                onChange={e => set('taxCode', e.target.value)}
                placeholder="MST Khách hàng"
                className="flex-1"
              />
              <Button variant="default" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Tên công ty" required>
            <Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Tên công ty" />
          </Field>
        </div>

        {/* Row 2: Địa chỉ full width */}
        <Field label="Địa chỉ khách hàng" required>
          <Textarea value={form.address} onChange={e => set('address', e.target.value)}
            placeholder="Địa chỉ khách hàng" rows={2} className="resize-none" />
        </Field>

        {/* Row 3: Tên KH + CCCD */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tên khách hàng" required>
            <Input value={form.buyerName} onChange={e => set('buyerName', e.target.value)} />
          </Field>
          <Field label="Căn cước công dân">
            <Input value={form.cccd} onChange={e => set('cccd', e.target.value)} placeholder="Căn cước công dân" />
          </Field>
        </div>

        {/* Row 4: SĐT + Email */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số điện thoại" required>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Số điện thoại" />
          </Field>
          <Field label="Email" required>
            <Input value={form.email} onChange={e => set('email', e.target.value)} placeholder="Email khách hàng" type="email" />
          </Field>
        </div>

        {/* Row 5: Số TK + Tên NH */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Số tài khoản">
            <Input value={form.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder="Số tài khoản" />
          </Field>
          <Field label="Tên ngân hàng">
            <Input value={form.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Tên ngân hàng" />
          </Field>
        </div>

        {/* Row 6: Phương thức TT */}
        <div className="w-1/2 pr-1.5">
          <Field label="Phương thức thanh toán">
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

interface PosOrderPageProps { tableLabel?: string; bookingId?: number; onBack?: () => void }

export default function PosOrderPage({ tableLabel, bookingId, onBack }: PosOrderPageProps = {}) {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')

  return (
    <div className="-m-4 overflow-hidden bg-muted/40" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <SalesTab
        tableLabel={tableLabel}
        bookingId={bookingId ?? (orderId ? Number(orderId) : undefined)}
        onBack={onBack}
      />
    </div>
  )
}
