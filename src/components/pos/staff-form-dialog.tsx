import type { TPosMember } from '@/store/slice/users/types/pos-types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const set = (patch: Partial<TPosMember>) => setForm(current => ({ ...current, ...patch }))

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{form.Id ? t('components.staffFormDialog.editStaffTitle') : t('components.staffFormDialog.addStaffTitle')}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('components.staffFormDialog.surnameLabel')}>
              <Input value={form.Surname || ''} onChange={event => set({ Surname: event.target.value })} />
            </Field>
            <Field label={t('common.name')} required>
              <Input value={form.Name || ''} onChange={event => set({ Name: event.target.value })} />
            </Field>
          </div>
          <Field label={t('components.staffFormDialog.phoneLabel')}>
            <Input value={form.Phone || ''} onChange={event => set({ Phone: event.target.value })} />
          </Field>
          <Field label={t('common.email')}>
            <Input type="email" value={form.Email || ''} onChange={event => set({ Email: event.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? t('components.staffFormDialog.savingText') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
