import type { TPosCustomerSimple, TPosFundAccount, TPosFundType, TPosSettingOrder, TPosUser } from '@/store/slice/users/types/pos-types'
import { CustomerSelect } from '@/components/pos/customer-select'
import { StaffSelect } from '@/components/pos/staff-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGetPaymentTypesQuery } from '@/store/slice/settings/api'
import { cn } from '@/utils'
import { Banknote, CreditCard, FileText, Info, Minus, ShoppingCart, Smartphone, Trash2, Wallet, X, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoneyRow, NumInput, PercentInput } from './order-inputs'
import { fmt, fmtCurrency, normalizeName } from './order-format'
import { type CartItem, type InvoiceFormData, type OrderAction, calcTotals, itemAmount } from './order-model'
import { OrderActions } from './order-actions'
import { SellInvoiceTab } from './sell-invoice-tab'

type PanelTab = 'sales' | 'invoice' | 'info'

const PANEL_TABS: { key: PanelTab; labelKey: string; icon: React.ElementType }[] = [
  { key: 'sales', labelKey: 'pages.actives.order.salesTabLabel', icon: ShoppingCart },
  { key: 'invoice', labelKey: 'pages.actives.order.eInvoiceTabLabel', icon: FileText },
  { key: 'info', labelKey: 'pages.actives.order.infoTabLabel', icon: Info },
]

const FUND_STYLES: { match: RegExp; icon: React.ElementType; activeClass: string }[] = [
  { match: /tien mat|cash/, icon: Banknote, activeClass: 'bg-emerald-500 text-white shadow-emerald-200 dark:shadow-emerald-900 shadow-sm' },
  { match: /chuyen khoan/, icon: Smartphone, activeClass: 'bg-blue-500 text-white shadow-blue-200 dark:shadow-blue-900 shadow-sm' },
  { match: /ca the|card/, icon: CreditCard, activeClass: 'bg-violet-500 text-white shadow-violet-200 dark:shadow-violet-900 shadow-sm' },
  { match: /quy/, icon: Wallet, activeClass: 'bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900 shadow-sm' },
]

const FUND_FALLBACK = { icon: Wallet, activeClass: 'bg-rose-500 text-white shadow-rose-200 dark:shadow-rose-900 shadow-sm' }

const DOT_COLORS = [
  'bg-blue-400', 'bg-violet-400', 'bg-emerald-400', 'bg-orange-400',
  'bg-pink-400', 'bg-cyan-400', 'bg-amber-400', 'bg-rose-400',
]

export interface MoneyControls {
  discountPct: number; setDiscountPct: (v: number) => void
  discountAmt: number; setDiscountAmt: (v: number) => void
  voucher: number; setVoucher: (v: number) => void
  transferCost: number; setTransferCost: (v: number) => void
  serviceFeePercent: number; setServiceFeePercent: (v: number) => void
  taxPct: number; setTaxOverride: (v: number) => void
  payment: number | ''; setPayment: (v: number | '') => void
  isCustomersDebt: boolean; setIsCustomersDebt: (v: boolean) => void
  shortage: number; setShortage: (v: number) => void
}

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
  fromOrderManager?: boolean
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

function fundStyle(name?: string) {
  const n = normalizeName(name)
  return FUND_STYLES.find(s => s.match.test(n)) ?? FUND_FALLBACK
}

function hasAccountInfo(a?: TPosFundAccount) {
  return !!(a && (a.QrCodeUrl || a.AccountNumber))
}

function ci(id?: number, i?: number) {
  return ((id ?? i ?? 0) % 8)
}

export function InternalOrderPanel({
  cart, onQty, onRemove, onClear, onUpdateItem, onSave, onOpenOrderSearch, saving, settings, totals, perItemTax,
  tableLabel, fromOrderManager, hasTableOrder, onBack,
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
  const [qrAccount, setQrAccount] = useState<TPosFundAccount | null>(null)

  const { subTotal, orderDiscount, serviceFee, totalTax, total } = totals
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
    const hasCustomer = !!(selectedCustomer || customerValue)
    if (!hasCustomer && money.isCustomersDebt) {
      money.setIsCustomersDebt(false)
      money.setShortage(0)
    }
  }, [customerValue, money.isCustomersDebt, money.setIsCustomersDebt, money.setShortage, selectedCustomer])

  useEffect(() => {
    if ((selectedCustomer || customerValue) && money.shortage > 0 && !money.isCustomersDebt) {
      money.setIsCustomersDebt(true)
    }
  }, [customerValue, money.isCustomersDebt, money.setIsCustomersDebt, money.shortage, selectedCustomer])

  useEffect(() => {
    if (!debtEnabled || money.shortage <= total) return
    money.setShortage(total)
  }, [debtEnabled, money, total])

  useEffect(() => {
    if (fundTypeId != null || !fundTypes.length) return
    const first = fundTypes.find(f => /tien mat|cash/.test(normalizeName(f.Name))) ?? fundTypes[0]
    setFundTypeId(first.Id ?? null)
    onFundTypeChange(first, first.Items?.length === 1 ? first.Items[0].Id : undefined)
  }, [fundTypes, fundTypeId, onFundTypeChange])

  const selectedFund = fundTypes.find(f => f.Id === fundTypeId)
  const accounts = selectedFund?.Items?.length
    ? selectedFund.Items
    : hasAccountInfo(selectedFund) ? [selectedFund as TPosFundAccount] : []

  const setFund = (f: TPosFundType) => {
    setFundTypeId(f.Id ?? null)
    const list = f.Items?.length ? f.Items : (hasAccountInfo(f) ? [f as TPosFundAccount] : [])
    const first = list[0]
    onFundTypeChange(f, first?.Id)
    setQrAccount(first?.QrCodeUrl ? first : null)
  }

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

      {panelTab === 'invoice' && <SellInvoiceTab form={invoiceForm} setForm={setInvoiceForm} />}

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
                    const rowTotal = itemAmount(item, perItemTax)
                    return (
                      <tr key={item.product.Id ?? idx} className="hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-1.5 text-center text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-1.5 max-w-[140px]">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[c]}`} />
                            <div className="min-w-0 flex items-center gap-1">
                              {/* Per-item VAT badge only earns its place when tax is actually
                                  set per line (perItemTax) — otherwise a single order-level
                                  "% Thuế" already covers it (see the summary block below), so
                                  repeating it on every row would just be noise. */}
                              {perItemTax && (
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
                              )}
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

          <div className="border-t px-2.5 pt-2 pb-2 space-y-1.5 shrink-0 bg-muted/20">
            <div className="grid grid-cols-2 gap-1.5">
              <input type="text" placeholder={t('pages.actives.order.orderNotePlaceholder')} value={note} onChange={e => setNoteVal(e.target.value)}
                className="w-full rounded-lg border border-input px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground" />
              <input type="text" placeholder={t('pages.actives.order.detailPlaceholder')} value={detail} onChange={e => setDetail(e.target.value)}
                className="w-full rounded-lg border border-input px-2.5 py-1.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground text-foreground" />
            </div>

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

                {settings?.IsServiceFee && (
                  <MoneyRow label={t('pages.actives.order.serviceFeeLabel')}>
                    <div className="flex flex-1 items-center gap-1">
                      <NumInput value={money.serviceFeePercent} onChange={v => money.setServiceFeePercent(Math.min(100, Math.max(0, v)))} suffix="%" className="w-20" />
                      <span className="flex-1 text-right text-xs font-semibold tabular-nums text-foreground">{fmt(serviceFee)}</span>
                    </div>
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

            <OrderActions
              fromOrderManager={fromOrderManager}
              tableLabel={tableLabel}
              hasTableOrder={hasTableOrder}
              saving={saving}
              cartLength={cart.length}
              onBack={onBack}
              onSave={onSave}
              onOpenOrderSearch={onOpenOrderSearch}
            />
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
