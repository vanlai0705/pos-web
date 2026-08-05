import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { TPosCustomer } from '@/store/slice/users/types/pos-types'
import { cn } from '@/utils'

export function emptyCustomer(groupId?: number): TPosCustomer {
  return {
    Name: '',
    IsCompany: false,
    CustomerGroup: groupId ? { Id: groupId } : undefined,
  }
}

/** Mirrors each field's Angular/legacy alias pair so either name round-trips. */
export function buildCustomerPayload(form: TPosCustomer): TPosCustomer {
  return {
    ...form,
    CustomerCode: form.CustomerCode || form.Code || '',
    Code: form.Code || form.CustomerCode || '',
    TaxNumber: form.TaxNumber || form.TaxCode || '',
    TaxCode: form.TaxCode || form.TaxNumber || '',
    CitizenId: form.CitizenId || form.IdCard || '',
    IdCard: form.IdCard || form.CitizenId || '',
    CustomerGroup: form.CustomerGroup?.Id ? form.CustomerGroup : undefined,
  }
}

export function Field({ label, required, children, className }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}</Label>
      {children}
    </div>
  )
}

/**
 * Shared create/edit form — used by both the Customers list page and
 * CustomerSelect's inline "Thêm"/"Sửa" buttons (mirrors Angular's
 * view-combobox enableAdd/enableEdit reusing the same detail dialog).
 */
export function CustomerDialog({
  open,
  form,
  setForm,
  groups,
  saving,
  onClose,
  onSave,
}: {
  open: boolean
  form: TPosCustomer
  setForm: (value: TPosCustomer | ((current: TPosCustomer) => TPosCustomer)) => void
  groups: Array<{ Id?: number; Name?: string }>
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<TPosCustomer>) => setForm(current => ({ ...current, ...patch }))

  const searchTaxNumber = async () => {
    const taxId = (form.TaxNumber || form.TaxCode || '').trim()
    if (!taxId) {
      toast.warning(t('components.customerFormDialog.taxIdRequiredWarning'))
      return
    }

    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${taxId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      const result = await response.json()
      if (!result?.data) {
        toast.error(t('components.customerFormDialog.taxIdNotFoundError'))
        return
      }
      set({
        IsCompany: true,
        TaxNumber: taxId,
        TaxCode: taxId,
        CompanyName: result.data.name || form.CompanyName || '',
        Address: result.data.address || form.Address || '',
        Name: form.Name || result.data.name || '',
      })
    } catch {
      toast.error(t('components.customerFormDialog.taxLookupFailedError'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={value => !value && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form.Id ? t('components.customerFormDialog.editCustomerTitle') : t('components.customerFormDialog.addCustomerTitle')}</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('components.customerFormDialog.customerCodeLabel')}>
              <Input value={form.CustomerCode || form.Code || ''} onChange={event => set({ CustomerCode: event.target.value, Code: event.target.value })} placeholder={t('components.customerFormDialog.customerCodePlaceholder')} />
            </Field>
            <Field label={t('common.customerName')} required>
              <Input value={form.Name || ''} onChange={event => set({ Name: event.target.value })} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="flex h-10 items-center gap-3 rounded-md border bg-slate-50 px-3">
              <Switch checked={!!form.IsCompany} onCheckedChange={checked => set({ IsCompany: checked })} />
              <span className="text-sm font-medium text-slate-700">{t('components.customerFormDialog.isCompanyLabel')}</span>
            </div>
            <Field label={t('components.customerFormDialog.customerGroupLabel')}>
              <select
                value={form.CustomerGroup?.Id || ''}
                onChange={event => {
                  const id = Number(event.target.value)
                  const group = groups.find(item => item.Id === id)
                  set({ CustomerGroup: group ? { Id: group.Id, Name: group.Name } : undefined })
                }}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="">{t('components.customerFormDialog.noGroupOption')}</option>
                {groups.map(group => <option key={group.Id} value={group.Id}>{group.Name}</option>)}
              </select>
            </Field>
          </div>

          {form.IsCompany ? (
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-3 sm:grid-cols-2">
              <Field label={t('components.customerFormDialog.taxNumberLabel')}>
                <div className="flex gap-2">
                  <Input value={form.TaxNumber || form.TaxCode || ''} onChange={event => set({ TaxNumber: event.target.value, TaxCode: event.target.value })} />
                  <Button type="button" size="icon" className="h-10 w-10" onClick={searchTaxNumber}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </Field>
              <Field label={t('components.customerFormDialog.companyNameLabel')}>
                <Input value={form.CompanyName || ''} onChange={event => set({ CompanyName: event.target.value })} />
              </Field>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('components.customerFormDialog.phoneLabel')}>
              <Input value={form.Phone || ''} onChange={event => set({ Phone: event.target.value })} />
            </Field>
            <Field label={t('components.customerFormDialog.citizenIdLabel')}>
              <Input value={form.CitizenId || form.IdCard || ''} onChange={event => set({ CitizenId: event.target.value, IdCard: event.target.value })} />
            </Field>
            <Field label={t('components.customerFormDialog.emailLabel')}>
              <Input type="email" value={form.Email || ''} onChange={event => set({ Email: event.target.value })} />
            </Field>
            <Field label={t('components.customerFormDialog.birthdayLabel')}>
              <Input type="date" value={form.Birthday?.slice(0, 10) || ''} onChange={event => set({ Birthday: event.target.value })} />
            </Field>
          </div>

          <Field label={t('common.address')}>
            <Input value={form.Address || ''} onChange={event => set({ Address: event.target.value })} />
          </Field>
          <Field label={t('components.customerFormDialog.noteLabel')}>
            <Textarea rows={3} value={form.Note || ''} onChange={event => set({ Note: event.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? t('components.customerFormDialog.savingStatus') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
