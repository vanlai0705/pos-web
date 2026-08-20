import type { TPosActiveProduct,TPosCustomerSimple,TPosFundType,TPosOrder,TPosUser } from '@/store/slice/users/types/pos-types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useAuth } from '@/hooks/useAuth'
import { useGenericDownloadMutation } from '@/store/slice/generic/api'
import { useGetUserShopSettingQuery } from '@/store/slice/notifications/api'
import { useCompleteOrderMutation, useLazyGetOrderDetailQuery, useSaveOrderMutation } from '@/store/slice/orders/api'
import { useGetPaymentTypesQuery, useGetSettingOrderQuery } from '@/store/slice/settings/api'
import { useDeleteTableOrderMutation, useLazyGetOrderKitchenQuery, useLazyGetTableOrderDetailQuery, useSaveTableOrderMutation } from '@/store/slice/tables/api'
import { printData, printDatas, type PrinterSetting } from '@/utils/print-service'
import { Printer } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { withDomainPath } from '@/utils/domain-route'
import { toast } from 'sonner'
import { InternalOrderPanel } from './internal-order-panel'
import { OrderSearchDialog } from './order-search-dialog'
import { classifyFundType, normalizeName } from './order-format'
import { type CartItem, type InvoiceFormData, type OrderAction, EMPTY_INVOICE_FORM, buildCustomerInvoice, buildOrderItem, calcTotals, createCartItemFromProduct, getDeviceGuid } from './order-model'
import { ProductItemDialog } from './product-item-dialog'
import { ProductPanel } from './product-panel'

interface SalesTabProps {
  tableLabel?: string
  bookingId?: number
  initialOrderId?: number
  tableId?: number
  tableGuid?: string
  fromOrderManager?: boolean
  onBack?: () => void
}

function SalesTab({ tableLabel, bookingId, initialOrderId, tableId, tableGuid, fromOrderManager, onBack }: SalesTabProps) {
  const { t } = useTranslation()
  const [cart, setCart] = useState<CartItem[]>([])
  const [resetKey, setResetKey] = useState(0)
  const [saveOrder, { isLoading: savingOrder }] = useSaveOrderMutation()
  const [completeOrder, { isLoading: completing }] = useCompleteOrderMutation()
  const [loadTableOrder] = useLazyGetTableOrderDetailQuery()
  const [saveTableOrder, { isLoading: savingTable }] = useSaveTableOrderMutation()
  const [fetchOrderKitchen] = useLazyGetOrderKitchenQuery()
  const [baseOrder, setBaseOrder] = useState<TPosOrder | null>(null)
  const [deleteTableOrder, { isLoading: deletingTable }] = useDeleteTableOrderMutation()
  const [downloadFile] = useGenericDownloadMutation()
  const { data: settings } = useGetSettingOrderQuery()
  const { data: fundTypes = [] } = useGetPaymentTypesQuery()
  const { data: shopSetting } = useGetUserShopSettingQuery()
  const defaultStockOut = useMemo(() => {
    const shops = shopSetting?.Shops ?? []
    const selectedShop = shops.find(s => s.Id === shopSetting?.SelectedShopId) ?? shops[0]
    const shopStock = selectedShop?.Stock
    if (shopStock?.Id) return shopStock
    return settings?.StockDefault ?? null
  }, [shopSetting, settings])
  const { user: auth } = useAuth()
  const member = useMemo(() => {
    const u = auth?.data?.User
    if (!u) return null
    return { ...u, Shops: (u as { Shops?: unknown[] }).Shops ?? auth?.data?.Shops ?? [] }
  }, [auth])
  const perItemTax = !!settings?.IsTaxPerItemAllowed
  const isTableMode = !!tableLabel
  const saving = savingOrder || completing || savingTable || deletingTable

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

  const [discountPct, setDiscountPct] = useState(0)
  const [discountAmt, setDiscountAmt] = useState(0)
  const [voucher, setVoucher] = useState(0)
  const [transferCost, setTransferCost] = useState(0)
  const [serviceFeePercent, setServiceFeePercent] = useState(0)
  const [taxOverride, setTaxOverride] = useState<number | null>(null)
  const [payment, setPayment] = useState<number | ''>('')
  const [isCustomersDebt, setIsCustomersDebt] = useState(false)
  const [shortage, setShortage] = useState(0)
  const taxPct = taxOverride ?? (settings?.IsTax ? (settings.TaxPercent ?? 0) : 0)
  const defaultServiceFeePercent = settings?.IsServiceFee ? Number(settings.ServiceFeePercent ?? 0) : 0

  useEffect(() => {
    if (!settings) return
    setServiceFeePercent(defaultServiceFeePercent)
  }, [defaultServiceFeePercent, settings])

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
        setServiceFeePercent(order.ServiceFeePercent ?? defaultServiceFeePercent)
        setTaxOverride(order.Tax ?? null)
        setPayment(order.Payment ?? '')
        const orderShortage = order.Shortage ?? 0
        setIsCustomersDebt(!!order.IsCustomersDebt || orderShortage > 0)
        setShortage(orderShortage)
      })
      .catch(() => toast.error(t('pages.actives.order.loadTableOrderFailed')))
    return () => { cancelled = true }
  }, [tableId, bookingId, loadTableOrder, t, defaultServiceFeePercent])

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
    setServiceFeePercent(order.ServiceFeePercent ?? defaultServiceFeePercent)
    setTaxOverride(order.Tax ?? null)
    setPayment(order.Payment ?? '')
    const orderShortage = order.Shortage ?? 0
    setIsCustomersDebt(!!order.IsCustomersDebt || orderShortage > 0)
    setShortage(orderShortage)
  }, [defaultServiceFeePercent])

  const applyPickedOrder = useCallback(async (id?: number) => {
    if (!id) return
    try {
      const order = await loadOrderDetail(id).unwrap()
      if (!order) return
      applyOrderToCart(order, true)
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

  // Ticks the payment-method selection to match a loaded order's actual saved
  // FundType — without this, the panel silently falls back to its own
  // cash-first default and the real saved method never gets shown/reused.
  // Prefer the order's FundType.Id if it's still a valid option; otherwise
  // fall back to whichever of Transfer/Card/Cash actually has an amount, and
  // pick a fund type that classifies into that same bucket (preferring an
  // exact name match). Runs once per loaded order (keyed by Id/Guid) so it
  // never clobbers a selection the user makes afterward, and does nothing
  // for a brand-new order (baseOrder is null then).
  const syncedFundOrderKey = useRef<number | string | undefined>(undefined)
  useEffect(() => {
    if (!baseOrder || !fundTypes.length) return
    const key = baseOrder.Id ?? baseOrder.Guid
    if (key == null || syncedFundOrderKey.current === key) return
    syncedFundOrderKey.current = key

    const fundTypeId = baseOrder.FundType?.Id
    const byId = fundTypeId != null ? fundTypes.find(f => f.Id === fundTypeId) : undefined
    if (byId) {
      setFund({ type: byId, accountId: fundTypeId })
      return
    }

    const findByKind = (kind: 'cash' | 'card' | 'transfer', preferredNames: string[]) => {
      const candidates = fundTypes.filter(f => classifyFundType(f) === kind)
      return candidates.find(f => preferredNames.includes(normalizeName(f.Name))) ?? candidates[0]
    }
    let picked: TPosFundType | undefined
    if (Number(baseOrder.Transfer) > 0) picked = findByKind('transfer', ['chuyen khoan', 'transfer', 'bank transfer'])
    else if (Number(baseOrder.Card) > 0) picked = findByKind('card', ['ca the', 'card'])
    else if (Number(baseOrder.Cash) > 0) picked = findByKind('cash', ['tien mat', 'cash'])
    if (picked) setFund({ type: picked, accountId: picked.Id })
  }, [baseOrder, fundTypes])

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
    () => calcTotals(cart, {
      orderTaxPct: taxPct,
      perItemTax,
      discountPct,
      discountAmt,
      voucher,
      transferCost,
      serviceFeePercent: settings?.IsServiceFee ? serviceFeePercent : 0,
    }),
    [cart, taxPct, perItemTax, discountPct, discountAmt, voucher, transferCost, settings?.IsServiceFee, serviceFeePercent],
  )
  const { subTotal, subTotalItems, total } = totals

  const buildItems = () => cart.map(item => buildOrderItem(item, perItemTax))

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const pdfFrameRef = useRef<HTMLIFrameElement>(null)
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

  const printersOrDefault = (printers?: PrinterSetting[]): PrinterSetting[] =>
    printers?.length
      ? printers
      : settings?.PrinterUrl
        ? [{ PrinterUrl: settings.PrinterUrl, PrinterName: settings.BillPrinterName }]
        : []

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

  const printTempReceipt = (orderId: number, onDone?: () => void) => {
    if (settings?.IsPrintProvisionalInvoice) {
      printOrderPdf(orderId, onDone, true)
      return
    }
    printData(settings?.PrinterUrl, 'orders/print-order', settings?.BillPrinterName, {
      orderId,
      IsTemplateTemp: true,
    })
    onDone?.()
  }

  const printKitchenTicket = (api: string, orderPrinters?: PrinterSetting[]) => {
    if (!tableGuid) return
    printersOrDefault(orderPrinters).forEach(p =>
      printDatas(p.PrinterUrl, api, p.PrinterName, { guid: tableGuid }))
  }

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

  const withTable = (order: TPosOrder): TPosOrder => ({
    ...(baseOrder ?? {}),
    ...order,
    Id: baseOrder?.Id ?? order.Id,
    Guid: baseOrder?.Guid,
    Name: baseOrder?.Name ?? '',
    Type: baseOrder?.Type ?? 6,
    Status: baseOrder?.Status,
    Shop: baseOrder?.Shop,
    Table: baseOrder?.Table ?? (tableId ? { Id: tableId, Name: tableLabel } : null),
    deviceGuid: getDeviceGuid(),
    table: { id: tableId, name: tableLabel },
  })

  const handleSave = async (action: OrderAction) => {
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

    const fundKind = classifyFundType(fund.type)
    const isCard = fundKind === 'card'
    const isTransfer = fundKind === 'transfer'
    const debtEnabled = !!selectedCustomer && isCustomersDebt
    const shortageValue = debtEnabled ? Math.min(total, Math.max(0, shortage)) : 0
    const paid = debtEnabled ? Math.max(0, total - shortageValue) : (payment === '' ? (isTableMode ? 0 : total) : Number(payment))
    const now = new Date().toISOString()
    const cashFallback = fundTypes.find(f => classifyFundType(f) === 'cash') ?? fundTypes[0]
    const fundTypeRef = fund.accountId ?? fund.type?.Id ?? cashFallback?.Id

    const order: TPosOrder = {
      ...(isTableMode ? {} : (baseOrder ?? {})),
      Id: isTableMode ? bookingId : baseOrder?.Id,
      Guid: isTableMode ? undefined : baseOrder?.Guid,
      Name: baseOrder?.Name ?? '',
      Date: now,
      Detail: detail || t('pages.actives.order.defaultSaleDetail'),
      Note: note || '',
      Customer: selectedCustomer ?? null,
      User: user,
      Member: member,
      CreatorUser: null,
      StockOut: defaultStockOut,
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
      ServiceFeePercent: settings?.IsServiceFee ? serviceFeePercent : 0,
      OldDebit: 0,
      Cash: isCard || isTransfer ? 0 : paid,
      Card: isCard ? paid : 0,
      Transfer: isTransfer ? paid : 0,
      Shortage: shortageValue,
      Round: 0,
      Payment: paid,
      Change: Math.max(0, paid - total),
      Reserved: 0,
      Voucher: voucher,
      Type: isTableMode ? 0 : (baseOrder?.Type ?? 0),
      PaymentType: baseOrder?.PaymentType ?? 0,
      IsCustomersDebt: debtEnabled,
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

    if (action === 'update' || action === 'update-print') {
      try {
        const res = await saveOrder(order).unwrap()
        const savedId = res?.Id ?? order.Id
        toast.success(t('pages.actives.order.orderSavedSuccess'))
        if (action === 'update-print' && savedId) {
          printBill(savedId, res?.Printers)
        }
      } catch { toast.error(t('pages.actives.order.orderSaveFailed')) }
      return
    }

    if (action === 'save-exit' || action === 'print-temp' || action === 'print-kitchen' || action === 'print-label') {
      try {
        const res = await saveTableOrder({ order: withTable(order), isUpdate: !!bookingId }).unwrap()
        const savedId = res?.OrderId ?? bookingId
        toast.success(t('pages.actives.order.orderSavedSuccess'))
        const finish = () => onBack?.()

        if (action === 'save-exit') { setCart([]); printKitchenTicket('tables/print-kitchen', res?.Printers); finish(); return }
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
        setServiceFeePercent(defaultServiceFeePercent)
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
          fromOrderManager={!!fromOrderManager}
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
            serviceFeePercent, setServiceFeePercent,
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

interface PosOrderPageProps { tableLabel?: string; bookingId?: number; tableId?: number; tableGuid?: string; onBack?: () => void }

export default function PosOrderPage({ tableLabel, bookingId, tableId, tableGuid, onBack }: PosOrderPageProps = {}) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const orderId = searchParams.get('orderId')
  const fromOrderManager = searchParams.get('fromOrderManager') === '1'
  const handleBack = onBack ?? (fromOrderManager ? () => navigate(withDomainPath('/actives/order-manager')) : undefined)

  return (
    <div className="-m-4 overflow-hidden bg-muted/40" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <SalesTab
        tableLabel={tableLabel}
        bookingId={bookingId}
        initialOrderId={orderId ? Number(orderId) : undefined}
        tableId={tableId}
        tableGuid={tableGuid}
        fromOrderManager={fromOrderManager}
        onBack={handleBack}
      />
    </div>
  )
}
