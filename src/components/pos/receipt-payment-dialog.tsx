import dayjs from 'dayjs'
import { type LookupItem, LookupSelect } from '@/components/pos/lookup-select'
import { CustomerSelect } from '@/components/pos/customer-select'
import { StaffSelect } from '@/components/pos/staff-select'
import { SupplierSelect } from '@/components/pos/supplier-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberInput } from '@/components/ui/number-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useGenericDownloadMutation, useGenericPostMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import type { TPosCustomerSimple, TPosUser } from '@/store/slice/users'
import { useOpeningBalancesDates } from '@/hooks/useOpeningBalancesDates'
import { clampDateWithinBounds } from '@/utils/format'
import { buildModelFormData } from '@/utils/multipart'
import { Eye, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

/** RECEIPT_PAYMENT_TYPE in pos_web. */
export const RECEIPT_PAYMENT_TYPE = { PAYMENT: 0, RECEIPT: 1 } as const

/** OBJECT_TYPE in pos_web — who the money moves to/from. */
export const OBJECT_TYPE = { Another: 0, Customer: 1, Supplier: 2, User: 3 } as const

/** RECEIPT_PAYMENT_FOR — what the voucher settles, so the server can link it back. */
export const RECEIPT_PAYMENT_FOR = {
  NONE: 0, LIABILITY_CUSTOMER: 1, LIABILITY_SUPPLIER: 2, SALARY_PAY: 3,
} as const

const getObjectTypeOptions = (t: (key: string) => string) => [
  { value: OBJECT_TYPE.Another, label: t('components.receiptPaymentDialog.objectTypeOther') },
  { value: OBJECT_TYPE.Customer, label: t('common.customer') },
  { value: OBJECT_TYPE.Supplier, label: t('common.supplier') },
  { value: OBJECT_TYPE.User, label: t('common.user') },
]

export interface ReceiptPayment {
  Id?: number
  Name?: string
  Date?: string
  Type?: number
  /** RECEIPT_PAYMENT_FOR — 0 unless the voucher settles a debt or a salary */
  ReceiptPaymentType?: number
  ObjectType?: number
  ObjectName?: string
  OriginDocument?: string
  Detail?: string
  Note?: string
  Address?: string
  Phone?: string
  Amount?: number | ''
  IsTransfer?: boolean
  FundType?: LookupItem | null
  ReceiptPaymentReason?: LookupItem | null
  Customer?: LookupItem | null
  Supplier?: LookupItem | null
  User?: LookupItem | null
  Shop?: LookupItem | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** RECEIPT or PAYMENT — drives the title and which reasons are offered */
  type: number
  endpoints: {
    detail: string
    create: string
    update: string
    /** Trigger in trực tiếp (không xem trước) — dùng cho nút "Lưu và in" */
    printTrigger?: string
    /** Trả về file PDF để xem trước rồi in — dùng cho nút "Lưu xem in" */
    printPdf?: string
  }
  editId?: number
  /** Prefill for vouchers raised from elsewhere, e.g. paying an employee's salary */
  initial?: Partial<ReceiptPayment>
  /** Angular's IsDisableObjectType — the caller already fixed who is being paid */
  disableObjectType?: boolean
  onSaved: () => void
}

export function emptyReceiptPayment(type: number): ReceiptPayment {
  return {
    Name: '', Type: type, ReceiptPaymentType: RECEIPT_PAYMENT_FOR.NONE,
    ObjectType: OBJECT_TYPE.Another, ObjectName: '', OriginDocument: '',
    Detail: '', Note: '', Address: '', Phone: '', Amount: 0,
    Date: dayjs().format('YYYY-MM-DD'),
    IsTransfer: false,
    FundType: null, ReceiptPaymentReason: null, Customer: null, Supplier: null, User: null, Shop: null,
  }
}

function errMsg(e: any, t: (key: string) => string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || t('components.receiptPaymentDialog.processError')
}

/**
 * Create/edit dialog shared by phiếu thu and phiếu chi — the two differ only in
 * `Type`, which also scopes the reason list.
 */
export function ReceiptPaymentDialog({ open, onOpenChange, type, endpoints, editId, initial, disableObjectType, onSaved }: Props) {
  const { t } = useTranslation()
  const isReceipt = type === RECEIPT_PAYMENT_TYPE.RECEIPT
  const header = isReceipt ? t('components.receiptPaymentDialog.receiptTitle') : t('components.receiptPaymentDialog.paymentTitle')
  const [form, setForm] = useState<ReceiptPayment>(emptyReceiptPayment(type))
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const canPrint = !!(endpoints.printTrigger && endpoints.printPdf)

  // Only Customer/Supplier object types have a matching opening-debt date to
  // check against; Member/Another aren't tied to either.
  const { customerOpeningDebtDate, supplierOpeningDebtDate } = useOpeningBalancesDates()
  const minDate = form.ObjectType === OBJECT_TYPE.Customer
    ? customerOpeningDebtDate
    : form.ObjectType === OBJECT_TYPE.Supplier
      ? supplierOpeningDebtDate
      : null

  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()
  const [downloadFile, { isLoading: printing }] = useGenericDownloadMutation()

  useEffect(() => {
    if (!open) return
    if (!editId) { setForm({ ...emptyReceiptPayment(type), ...(initial ?? {}) }); return }
    fetchDetail({ url: endpoints.detail, params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as ReceiptPayment
        setForm({
          ...emptyReceiptPayment(type), ...d,
          Date: d.Date ? dayjs(d.Date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        })
      })
      .catch(e => toast.error(errMsg(e, t)))
    // `initial` is intentionally not a dependency: it is an inline object at
    // every call site, and re-running would wipe what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, type, endpoints.detail, fetchDetail])

  useEffect(() => () => {
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const closePdfPreview = () => {
    setPdfPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  /** Switching object type clears the parties that no longer apply. */
  const setObjectType = (v: number) =>
    setForm(f => ({
      ...f,
      ObjectType: v,
      Customer: v === OBJECT_TYPE.Customer ? f.Customer : null,
      Supplier: v === OBJECT_TYPE.Supplier ? f.Supplier : null,
      User: v === OBJECT_TYPE.User ? f.User : null,
      ...(v === OBJECT_TYPE.Another ? { ObjectName: '', Address: '' } : {}),
    }))

  /** Picking a party copies its name/address onto the voucher, like Angular. */
  const pickParty = (key: 'Customer' | 'Supplier' | 'User', item: LookupItem | null) =>
    setForm(f => ({
      ...f,
      [key]: item,
      ObjectName: (item?.Name as string) ?? '',
      Address: (item?.Address as string) ?? f.Address,
    }))

  /** Lưu phiếu (create/update), trả về Id đã lưu hoặc undefined nếu lỗi/không hợp lệ. */
  const doSave = async (): Promise<number | undefined> => {
    if (!form.ReceiptPaymentReason?.Id) { toast.error(t('components.receiptPaymentDialog.reasonRequired')); return undefined }
    if (!Number(form.Amount)) { toast.error(t('components.receiptPaymentDialog.amountRequired')); return undefined }
    const payload: ReceiptPayment = {
      ...form,
      Type: type,
      ReceiptPaymentType: form.ReceiptPaymentType ?? RECEIPT_PAYMENT_FOR.NONE,
      Amount: Number(form.Amount) || 0,
      // Angular mirrors the reason name into Detail right before saving.
      Detail: form.ReceiptPaymentReason?.Name ?? '',
    }
    try {
      const res = await request({
        url: form.Id ? endpoints.update : endpoints.create,
        method: 'POST',
        body: buildModelFormData(payload),
      }).unwrap()
      const saved = res?.Data ?? res
      const savedId = Number(saved?.Id ?? form.Id ?? 0) || form.Id
      if (form.Id) {
        toast.success(t('components.receiptPaymentDialog.updateSuccess'))
      } else {
        toast.success(isReceipt
          ? t('components.receiptPaymentDialog.createReceiptSuccess')
          : t('components.receiptPaymentDialog.createPaymentSuccess'))
      }
      return savedId
    } catch (e) {
      toast.error(errMsg(e, t))
      return undefined
    }
  }

  const handleSave = async () => {
    const savedId = await doSave()
    if (!savedId) return
    onOpenChange(false)
    onSaved()
  }

  /** "Lưu và in": lưu rồi gọi API in trực tiếp (không xem trước). Đóng dialog
   * ngay khi lưu xong — luồng in chạy nền phía sau, độc lập với dialog. */
  const handleSaveAndPrint = async () => {
    const savedId = await doSave()
    if (!savedId) return
    onOpenChange(false)
    onSaved()
    if (!endpoints.printTrigger) return
    try {
      await request({ url: endpoints.printTrigger, method: 'POST', body: { ReceiptPaymentId: savedId } }).unwrap()
    } catch (e) { toast.error(errMsg(e, t)) }
  }

  /**
   * "Lưu xem in": lưu, lấy file PDF trước (dialog nhập liệu vẫn đang mở lúc
   * chờ mạng), rồi mới đóng dialog nhập liệu — và đợi hết animation đóng của
   * Radix mới mở dialog xem PDF. Đóng — mở đồng thời trong cùng 1 lần render
   * khiến Radix xử lý 2 dialog cùng đổi trạng thái một lúc không ổn định
   * (dialog xem PDF không hiện lên dù không báo lỗi gì), nên phải tách làm 2
   * bước riêng biệt như dưới đây.
   */
  const handleSaveAndViewPrint = async () => {
    const savedId = await doSave()
    if (!savedId) return
    onSaved()
    if (!endpoints.printPdf) { onOpenChange(false); return }
    try {
      const blob = await downloadFile({ url: endpoints.printPdf, method: 'POST', body: { ReceiptPaymentId: savedId } }).unwrap()
      const pdfBlob = new Blob([blob], { type: 'application/pdf' })
      const url = URL.createObjectURL(pdfBlob)
      onOpenChange(false)
      await new Promise(resolve => setTimeout(resolve, 300))
      setPdfPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return url
      })
    } catch (e) {
      toast.error(errMsg(e, t))
      onOpenChange(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-3xl">
        <FormDialogHeader>
          <DialogTitle>
            {form.Id
              ? (isReceipt ? t('components.receiptPaymentDialog.editReceiptTitle') : t('components.receiptPaymentDialog.editPaymentTitle'))
              : header}
          </DialogTitle>
        </FormDialogHeader>

        <FormDialogBody className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
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
              <Input value={form.Name ?? ''} disabled placeholder={t('components.receiptPaymentDialog.autoPlaceholder')} />
            </div>
            <div className="space-y-1">
              <Label>{t('components.receiptPaymentDialog.fundTypeLabel')}</Label>
              <LookupSelect endpoint="fundType/filter-simple" placeholder={t('components.receiptPaymentDialog.selectFundTypePlaceholder')}
                value={form.FundType} onChange={v => setForm(f => ({ ...f, FundType: v }))} listPath="/currencies/fund-type" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>{t('components.receiptPaymentDialog.reasonLabel')} <span className="text-destructive">*</span></Label>
              <LookupSelect endpoint="receiptpaymentreason/filter-simple" placeholder={t('components.receiptPaymentDialog.selectReasonPlaceholder')}
                params={{ Type: type }}
                value={form.ReceiptPaymentReason}
                onChange={v => setForm(f => ({ ...f, ReceiptPaymentReason: v, Detail: (v?.Name as string) ?? '' }))}
                listPath="/currencies/receipt-payment-reason" />
            </div>
            <div className="space-y-1">
              <Label>{t('components.receiptPaymentDialog.originDocumentLabel')}</Label>
              <Input value={form.OriginDocument ?? ''} onChange={e => setForm(f => ({ ...f, OriginDocument: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>{t('components.receiptPaymentDialog.objectTypeLabel')}</Label>
              <Select value={String(form.ObjectType ?? OBJECT_TYPE.Another)} disabled={disableObjectType}
                onValueChange={v => setObjectType(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getObjectTypeOptions(t).map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>&nbsp;</Label>
              {form.ObjectType === OBJECT_TYPE.Customer && (
                <CustomerSelect placeholder={t('components.receiptPaymentDialog.selectCustomerPlaceholder')} disabled={disableObjectType}
                  value={form.Customer as TPosCustomerSimple | null} onChange={v => pickParty('Customer', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.Supplier && (
                <SupplierSelect placeholder={t('components.receiptPaymentDialog.selectSupplierPlaceholder')} disabled={disableObjectType}
                  value={form.Supplier} onChange={v => pickParty('Supplier', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.User && (
                <StaffSelect placeholder={t('components.receiptPaymentDialog.selectEmployeePlaceholder')} disabled={disableObjectType}
                  value={form.User as TPosUser | null} onChange={v => pickParty('User', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.Another && (
                <Input placeholder={t('components.receiptPaymentDialog.objectNamePlaceholder')} value={form.ObjectName ?? ''}
                  onChange={e => setForm(f => ({ ...f, ObjectName: e.target.value }))} />
              )}
            </div>

            <div className="space-y-1">
              <Label>{t('common.address')}</Label>
              {/* Only free-text objects allow editing; the rest inherit the party's address. */}
              <Input value={form.Address ?? ''} disabled={form.ObjectType !== OBJECT_TYPE.Another}
                onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 items-end gap-3 rounded-xl border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label>{t('components.receiptPaymentDialog.amountLabel')} <span className="text-destructive">*</span></Label>
              <NumberInput
                min={0}
                max={999999999}
                value={Number(form.Amount) || 0}
                onChange={v => setForm(f => ({ ...f, Amount: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('components.receiptPaymentDialog.shopLabel')}</Label>
              <LookupSelect endpoint="shop/filter-simple" placeholder={t('components.receiptPaymentDialog.selectShopPlaceholder')}
                value={form.Shop} onChange={v => setForm(f => ({ ...f, Shop: v }))} listPath="/managers/shops" />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 py-2">
              <Switch checked={!!form.IsTransfer} onCheckedChange={v => setForm(f => ({ ...f, IsTransfer: v }))} />
              <span className="text-sm font-medium">{t('common.transfer')}</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label>{t('common.note')}</Label>
            <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
          </div>
        </FormDialogBody>

        <FormDialogFooter className="items-center justify-between sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canPrint && (
              <>
                <Button type="button" variant="secondary" onClick={handleSaveAndPrint} disabled={saving || printing}>
                  <Printer className="mr-2 h-4 w-4" />
                  Lưu và in
                </Button>
                <Button type="button" variant="outline" onClick={handleSaveAndViewPrint} disabled={saving || printing}>
                  <Eye className="mr-2 h-4 w-4" />
                  Lưu xem in
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? t('components.receiptPaymentDialog.savingText') : t('common.save')}</Button>
          </div>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>

    <Dialog open={!!pdfPreviewUrl} onOpenChange={open => { if (!open) closePdfPreview() }}>
      <DialogContent className="flex h-[86vh] max-w-4xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-3">
          <DialogTitle>Lưu xem in</DialogTitle>
        </DialogHeader>
        {pdfPreviewUrl && (
          <iframe src={pdfPreviewUrl} title="receipt-payment-pdf" className="min-h-0 flex-1 w-full border-0" />
        )}
      </DialogContent>
    </Dialog>
    </>
  )
}
