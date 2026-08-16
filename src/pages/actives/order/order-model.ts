import type { TPosActiveProduct, TPosCustomerInvoice, TPosOrderItem } from '@/store/slice/users/types/pos-types'

export interface CartItem {
  product: TPosActiveProduct
  qty: number
  price: number
  discountPct: number
  discountAmt: number
  note: string
  tax: number | null
}

export type OrderAction =
  | 'pay' | 'print' | 'temp' | 'update' | 'update-print'
  | 'save-exit' | 'print-temp' | 'print-kitchen' | 'print-label' | 'cancel-order'

export interface InvoiceFormData {
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

export interface TotalsOpts {
  orderTaxPct: number
  perItemTax: boolean
  discountPct: number
  discountAmt?: number
  voucher?: number
  transferCost?: number
  serviceFeePercent?: number
}

const DEVICE_GUID_KEY = 'storedGuid'
const LEGACY_DEVICE_GUID_KEY = 'guid-app'
const DEFAULT_RETAIL_CUSTOMER_NAME = 'BÁN CHO NGƯỜI TIÊU DÙNG'

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
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

export function itemDiscount(item: CartItem) {
  const base = item.price * item.qty
  return Math.min(base, base * item.discountPct / 100 + item.discountAmt)
}

export function itemSubtotal(item: CartItem) {
  return Math.max(0, item.price * item.qty - itemDiscount(item))
}

export function itemTaxPct(item: CartItem, perItemTax: boolean) {
  return perItemTax ? Number(item.tax ?? item.product.Tax) || 0 : 0
}

export function itemTaxAmount(item: CartItem, perItemTax: boolean) {
  return itemSubtotal(item) * itemTaxPct(item, perItemTax) / 100
}

export function itemAmount(item: CartItem, perItemTax: boolean) {
  return itemSubtotal(item) + itemTaxAmount(item, perItemTax)
}

export function newGuid() {
  return crypto.randomUUID()
}

export function getDeviceGuid() {
  const stored = localStorage.getItem(DEVICE_GUID_KEY)
  if (stored) return stored
  const legacy = localStorage.getItem(LEGACY_DEVICE_GUID_KEY)
  const guid = legacy ?? newGuid()
  localStorage.setItem(DEVICE_GUID_KEY, guid)
  return guid
}

export function buildCustomerInvoice(form: InvoiceFormData): TPosCustomerInvoice {
  const all: TPosCustomerInvoice = {
    Id: 0,
    CompanyName: form.companyName,
    Address: form.address,
    TaxAgencyCode: form.taxCode,
    BuyerName: form.buyerName,
    CitizenId: form.cccd,
    PaymentMethod: form.paymentMethod,
    PhoneNumber: form.phone,
    BankName: form.bankName,
    BankAccount: form.bankAccount,
    Email: form.email,
  }
  return Object.fromEntries(
    Object.entries(all).filter(([key, value]) => key === 'PaymentMethod' || (value !== '' && value != null)),
  )
}

export function calcTotals(
  cart: CartItem[],
  { orderTaxPct, perItemTax, discountPct, discountAmt = 0, voucher = 0, transferCost = 0, serviceFeePercent = 0 }: TotalsOpts,
) {
  const subTotal = cart.reduce((sum, item) => sum + itemSubtotal(item), 0)
  const orderDiscount = Math.min(subTotal * discountPct / 100 + discountAmt, subTotal)
  const totalBeforeTax = Math.max(0, subTotal - orderDiscount - voucher)
  const serviceFeeBase = Math.max(0, subTotal - orderDiscount)
  const serviceFee = serviceFeeBase * Math.max(0, serviceFeePercent) / 100
  const totalTax = perItemTax
    ? cart.reduce((sum, item) => sum + itemTaxAmount(item, true), 0)
    : totalBeforeTax * orderTaxPct / 100
  const subTotalItems = cart.reduce((sum, item) => sum + itemAmount(item, perItemTax), 0)
  return {
    subTotal,
    subTotalItems,
    orderDiscount,
    totalBeforeTax,
    serviceFee,
    totalTax,
    total: totalBeforeTax + serviceFee + totalTax + transferCost,
  }
}

export function createCartItemFromProduct(product: TPosActiveProduct): CartItem {
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

export function buildOrderItem(item: CartItem, perItemTax: boolean): TPosOrderItem {
  const tax = item.product.Tax == null ? null : itemTaxPct(item, perItemTax)
  const lineTotal = itemSubtotal(item)
  const lineAmount = itemAmount(item, perItemTax)
  return {
    Guid: newGuid(),
    Product: { ...item.product, Tax: tax, Total: lineTotal, Amount: lineAmount },
    Quantity: item.qty,
    Discount: item.discountAmt,
    DiscountPercent: item.discountPct,
    Tax: tax,
    IsPromotion: false,
    Price: item.price,
    Unit: item.product.Unit,
    QuantitySystem: 0,
    QuantityReal: 0,
    Note: item.note || '',
    ParentId: null,
    Total: lineTotal,
    Amount: lineAmount,
  }
}
