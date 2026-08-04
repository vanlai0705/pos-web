import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { TPosMember } from '@/store/slice/users/types/pos-types'
import { Field } from './customer-form-dialog'

export function emptyStaff(): TPosMember {
  return { Name: '', Surname: '', Phone: '', Email: '', Shops: [], Image: null }
}

/**
 * Lightweight profile-only create/edit — the sell screen only needs a
 * name to attribute the sale, not the full staff wizard's login-account
 * step (`pages/human-resources/members`), so this deliberately skips it.
 */
export function StaffDialog({
  open,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: TPosMember
  setForm: (value: TPosMember | ((current: TPosMember) => TPosMember)) => void
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const set = (patch: Partial<TPosMember>) => setForm(current => ({ ...current, ...patch }))

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.Id ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên'}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Họ">
              <Input value={form.Surname || ''} onChange={event => set({ Surname: event.target.value })} />
            </Field>
            <Field label="Tên" required>
              <Input value={form.Name || ''} onChange={event => set({ Name: event.target.value })} />
            </Field>
          </div>
          <Field label="Số điện thoại">
            <Input value={form.Phone || ''} onChange={event => set({ Phone: event.target.value })} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.Email || ''} onChange={event => set({ Email: event.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
