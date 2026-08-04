import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogTitle, FormDialogBody, FormDialogContent, FormDialogFooter, FormDialogHeader } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { useLazyGenericGetQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import { buildModelFormData } from '@/utils/multipart'
import dayjs from 'dayjs'

/** RECEIPT_PAYMENT_TYPE in pos_web. */
export const RECEIPT_PAYMENT_TYPE = { PAYMENT: 0, RECEIPT: 1 } as const

/** OBJECT_TYPE in pos_web — who the money moves to/from. */
export const OBJECT_TYPE = { Another: 0, Customer: 1, Supplier: 2, User: 3 } as const

/** RECEIPT_PAYMENT_FOR — what the voucher settles, so the server can link it back. */
export const RECEIPT_PAYMENT_FOR = {
  NONE: 0, LIABILITY_CUSTOMER: 1, LIABILITY_SUPPLIER: 2, SALARY_PAY: 3,
} as const

const OBJECT_TYPE_OPTIONS = [
  { value: OBJECT_TYPE.Another, label: 'Khác' },
  { value: OBJECT_TYPE.Customer, label: 'Khách hàng' },
  { value: OBJECT_TYPE.Supplier, label: 'Nhà cung cấp' },
  { value: OBJECT_TYPE.User, label: 'Nhân viên' },
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
  endpoints: { detail: string; create: string; update: string }
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

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

/**
 * Create/edit dialog shared by phiếu thu and phiếu chi — the two differ only in
 * `Type`, which also scopes the reason list.
 */
export function ReceiptPaymentDialog({ open, onOpenChange, type, endpoints, editId, initial, disableObjectType, onSaved }: Props) {
  const isReceipt = type === RECEIPT_PAYMENT_TYPE.RECEIPT
  const header = isReceipt ? 'Phiếu thu' : 'Phiếu chi'
  const [form, setForm] = useState<ReceiptPayment>(emptyReceiptPayment(type))

  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

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
      .catch(e => toast.error(errMsg(e)))
    // `initial` is intentionally not a dependency: it is an inline object at
    // every call site, and re-running would wipe what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, type, endpoints.detail, fetchDetail])

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

  const handleSave = async () => {
    if (!form.ReceiptPaymentReason?.Id) { toast.error('Vui lòng chọn lý do'); return }
    if (!Number(form.Amount)) { toast.error('Vui lòng nhập số tiền'); return }
    const payload: ReceiptPayment = {
      ...form,
      Type: type,
      ReceiptPaymentType: form.ReceiptPaymentType ?? RECEIPT_PAYMENT_FOR.NONE,
      Amount: Number(form.Amount) || 0,
      // Angular mirrors the reason name into Detail right before saving.
      Detail: form.ReceiptPaymentReason?.Name ?? '',
    }
    try {
      await request({
        url: form.Id ? endpoints.update : endpoints.create,
        method: 'POST',
        body: buildModelFormData(payload),
      }).unwrap()
      toast.success(form.Id ? 'Cập nhật thành công' : `Tạo ${header.toLowerCase()} thành công`)
      onOpenChange(false)
      onSaved()
    } catch (e) { toast.error(errMsg(e)) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <FormDialogContent className="max-w-3xl">
        <FormDialogHeader>
          <DialogTitle>{form.Id ? `Sửa ${header.toLowerCase()}` : header}</DialogTitle>
        </FormDialogHeader>

        <FormDialogBody className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Ngày</Label>
              <Input type="date" value={form.Date ?? ''} onChange={e => setForm(f => ({ ...f, Date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Số phiếu</Label>
              <Input value={form.Name ?? ''} disabled placeholder="Tự động" />
            </div>
            <div className="space-y-1">
              <Label>Loại quỹ</Label>
              <LookupSelect endpoint="fundType/filter-simple" placeholder="Chọn loại quỹ"
                value={form.FundType} onChange={v => setForm(f => ({ ...f, FundType: v }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Lý do <span className="text-destructive">*</span></Label>
              <LookupSelect endpoint="receiptpaymentreason/filter-simple" placeholder="Chọn lý do"
                params={{ Type: type }}
                value={form.ReceiptPaymentReason}
                onChange={v => setForm(f => ({ ...f, ReceiptPaymentReason: v, Detail: (v?.Name as string) ?? '' }))} />
            </div>
            <div className="space-y-1">
              <Label>Chứng từ gốc</Label>
              <Input value={form.OriginDocument ?? ''} onChange={e => setForm(f => ({ ...f, OriginDocument: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Đối tượng</Label>
              <Select value={String(form.ObjectType ?? OBJECT_TYPE.Another)} disabled={disableObjectType}
                onValueChange={v => setObjectType(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>&nbsp;</Label>
              {form.ObjectType === OBJECT_TYPE.Customer && (
                <LookupSelect endpoint="customers/filter-simple" placeholder="Chọn khách hàng" disabled={disableObjectType}
                  value={form.Customer} onChange={v => pickParty('Customer', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.Supplier && (
                <LookupSelect endpoint="suppliers/filter-simple" placeholder="Chọn nhà cung cấp" disabled={disableObjectType}
                  value={form.Supplier} onChange={v => pickParty('Supplier', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.User && (
                <LookupSelect endpoint="users/filter-simple" placeholder="Chọn nhân viên" disabled={disableObjectType}
                  value={form.User} onChange={v => pickParty('User', v)} />
              )}
              {form.ObjectType === OBJECT_TYPE.Another && (
                <Input placeholder="Tên đối tượng" value={form.ObjectName ?? ''}
                  onChange={e => setForm(f => ({ ...f, ObjectName: e.target.value }))} />
              )}
            </div>

            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              {/* Only free-text objects allow editing; the rest inherit the party's address. */}
              <Input value={form.Address ?? ''} disabled={form.ObjectType !== OBJECT_TYPE.Another}
                onChange={e => setForm(f => ({ ...f, Address: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 items-end gap-3 rounded-xl border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label>Số tiền <span className="text-destructive">*</span></Label>
              <NumberInput
                min={0}
                max={999999999}
                value={Number(form.Amount) || 0}
                onChange={v => setForm(f => ({ ...f, Amount: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Cửa hàng</Label>
              <LookupSelect endpoint="shop/filter-simple" placeholder="Chọn cửa hàng"
                value={form.Shop} onChange={v => setForm(f => ({ ...f, Shop: v }))} />
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 py-2">
              <Switch checked={!!form.IsTransfer} onCheckedChange={v => setForm(f => ({ ...f, IsTransfer: v }))} />
              <span className="text-sm font-medium">Chuyển khoản</span>
            </label>
          </div>

          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
          </div>
        </FormDialogBody>

        <FormDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </FormDialogFooter>
      </FormDialogContent>
    </Dialog>
  )
}
