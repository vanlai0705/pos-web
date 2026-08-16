import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { InvoiceFormData } from './order-model'

const PAYMENT_METHODS = [
  { value: 'TM/CK', label: 'TM/CK' },
  { value: 'CK', label: 'CK' },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block">
        {required && <span className="text-destructive mr-0.5">*</span>}{label}
      </label>
      {children}
    </div>
  )
}

interface SellInvoiceTabProps {
  form: InvoiceFormData
  setForm: React.Dispatch<React.SetStateAction<InvoiceFormData>>
}

export function SellInvoiceTab({ form, setForm }: SellInvoiceTabProps) {
  const { t } = useTranslation()
  const set = (key: keyof InvoiceFormData, value: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: value }))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={form.isInvoice} onCheckedChange={value => set('isInvoice', value)} />
          <span className="text-sm font-medium">{t('pages.actives.order.exportInvoiceToggle')}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.customerTaxCode')}>
            <div className="flex gap-1.5">
              <Input
                value={form.taxCode}
                onChange={event => set('taxCode', event.target.value)}
                placeholder={t('common.customerTaxCode')}
                className="flex-1"
              />
              <Button variant="default" size="icon" className="shrink-0">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label={t('common.companyName')} required>
            <Input value={form.companyName} onChange={event => set('companyName', event.target.value)} placeholder={t('common.companyName')} />
          </Field>
        </div>

        <Field label={t('common.customerAddress')} required>
          <Textarea
            value={form.address}
            onChange={event => set('address', event.target.value)}
            placeholder={t('common.customerAddress')}
            rows={2}
            className="resize-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('common.customerName')} required>
            <Input value={form.buyerName} onChange={event => set('buyerName', event.target.value)} />
          </Field>
          <Field label={t('common.citizenId')}>
            <Input value={form.cccd} onChange={event => set('cccd', event.target.value)} placeholder={t('common.citizenId')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('pages.actives.order.phoneNumberLabel')} required>
            <Input value={form.phone} onChange={event => set('phone', event.target.value)} placeholder={t('pages.actives.order.phoneNumberLabel')} />
          </Field>
          <Field label={t('common.email')} required>
            <Input value={form.email} onChange={event => set('email', event.target.value)} placeholder={t('pages.actives.order.emailPlaceholder')} type="email" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('pages.actives.order.bankAccountNumberLabel')}>
            <Input value={form.bankAccount} onChange={event => set('bankAccount', event.target.value)} placeholder={t('pages.actives.order.bankAccountNumberLabel')} />
          </Field>
          <Field label={t('common.bankName')}>
            <Input value={form.bankName} onChange={event => set('bankName', event.target.value)} placeholder={t('common.bankName')} />
          </Field>
        </div>

        <div className="w-1/2 pr-1.5">
          <Field label={t('pages.actives.order.paymentMethodLabel')}>
            <Select value={form.paymentMethod} onValueChange={value => set('paymentMethod', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(method => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </div>
  )
}
