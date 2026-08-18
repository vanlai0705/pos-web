import type { LookupItem } from '@/components/pos/lookup-select'
import { SimpleNameSelect } from '@/components/pos/simple-name-select'
import { useSaveSupplierGroupMutation } from '@/store/slice/managers/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

// STATUS in pos_web: 0 = Actived, 1 = Locked, 2 = Deleted.
export interface TSupplier {
  Id?: number
  /** field is SupplierCode in pos_web — plain "Code" does not exist */
  SupplierCode?: string
  Name?: string
  Phone?: string
  Email?: string
  Address?: string
  Website?: string
  IsCompany?: boolean
  TaxNumber?: string
  SupplierGroup?: LookupItem | null
  Note?: string
  Status?: { Id?: number; Name?: string }
}

export function emptySupplier(): TSupplier {
  return { Name: '', Phone: '', Email: '', Address: '', IsCompany: false, SupplierGroup: null }
}

/**
 * Shared create/edit form — used by both the Suppliers list page and
 * SupplierSelect's inline "Thêm"/"Sửa" buttons (mirrors CustomerDialog/StaffDialog).
 */
export function SupplierDialog({
  open,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: TSupplier
  setForm: (value: TSupplier | ((current: TSupplier) => TSupplier)) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const set = (patch: Partial<TSupplier>) => setForm(current => ({ ...current, ...patch }))
  const [saveSupplierGroup] = useSaveSupplierGroupMutation()

  // Same lookup Angular/CustomerDialog uses — fills name/address from the
  // tax code so the user doesn't have to type them by hand.
  const searchTaxNumber = async () => {
    const taxId = (form.TaxNumber ?? '').trim()
    if (!taxId) {
      toast.warning('Vui lòng nhập mã số thuế')
      return
    }

    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${taxId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const result = await response.json()
      if (!result?.data) {
        toast.error('Không tìm thấy thông tin cho mã số thuế này')
        return
      }
      set({
        IsCompany: true,
        TaxNumber: taxId,
        Name: result.data.name || form.Name || '',
        Address: result.data.address || form.Address || '',
      })
    } catch {
      toast.error('Không thể tra cứu mã số thuế, vui lòng thử lại')
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa NCC' : 'Thêm nhà cung cấp'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mã</Label>
              <Input value={form.SupplierCode ?? ''} onChange={e => set({ SupplierCode: e.target.value })} placeholder="Tự động nếu để trống" />
            </div>
            <div className="flex items-end">
              <label className="flex h-10 cursor-pointer select-none items-center gap-2">
                <Switch checked={!!form.IsCompany} onCheckedChange={v => set({ IsCompany: v })} />
                <span className="text-sm font-medium">Là công ty</span>
              </label>
            </div>
          </div>

          {form.IsCompany && (
            <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
              <Label>Mã số thuế</Label>
              <div className="flex gap-2">
                <Input value={form.TaxNumber ?? ''} onChange={e => set({ TaxNumber: e.target.value })} placeholder="Nhập mã số thuế để tra cứu" />
                <Button type="button" size="icon" className="h-9 w-9 shrink-0" onClick={searchTaxNumber} title="Tra cứu mã số thuế">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Tên nhà cung cấp <span className="text-destructive">*</span></Label>
            <Input value={form.Name ?? ''} onChange={e => set({ Name: e.target.value })} placeholder="Tên nhà cung cấp" />
          </div>

          <div className="space-y-1">
            <Label>Nhóm nhà cung cấp</Label>
            <SimpleNameSelect endpoint="suppliergroups/filter-simple" placeholder="Chọn nhóm"
              value={form.SupplierGroup} onChange={v => set({ SupplierGroup: v })} listPath="/managers/supplier-groups"
              addTitle="Thêm nhóm nhà cung cấp" namePlaceholder="Tên nhóm nhà cung cấp"
              save={d => saveSupplierGroup(d).unwrap()} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Điện thoại</Label>
              <Input value={form.Phone ?? ''} onChange={e => set({ Phone: e.target.value })} placeholder="Số điện thoại" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.Email ?? ''} onChange={e => set({ Email: e.target.value })} placeholder="Email" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Địa chỉ</Label>
              <Input value={form.Address ?? ''} onChange={e => set({ Address: e.target.value })} placeholder="Địa chỉ" />
            </div>
            <div className="space-y-1">
              <Label>Trang web</Label>
              <Input value={form.Website ?? ''} onChange={e => set({ Website: e.target.value })} placeholder="Trang web" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea value={form.Note ?? ''} onChange={e => set({ Note: e.target.value })} rows={2} placeholder="Ghi chú" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Huỷ</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
