import { buildCustomerPayload, CustomerDialog, emptyCustomer } from '@/components/pos/customer-form-dialog'
import { useGetCustomerGroupsSimpleQuery, useLazyFilterCustomersSimpleQuery, useLazyGetCustomerDetailQuery, useSaveCustomerMutation } from '@/store/slice/customers/api'
import { TPosCustomer, TPosCustomerSimple } from '@/store/slice/users'
import { withDomainPath } from '@/utils/domain-route'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SelectBase, type SelectBaseHandle } from './select-base'
interface CustomerSelectProps {
  value?: TPosCustomerSimple | null
  onChange: (customer: TPosCustomerSimple | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CustomerSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: CustomerSelectProps) {
  const { t } = useTranslation()
  const selectRef = useRef<SelectBaseHandle>(null)

  const [search] = useLazyFilterCustomersSimpleQuery()

  // Inline "Thêm"/"Sửa" — mirrors Angular's view-combobox enableAdd/enableEdit,
  // which reuse the exact same detail dialog as the full Customers list page.
  const { data: groups = [] } = useGetCustomerGroupsSimpleQuery()
  const [getCustomerDetail] = useLazyGetCustomerDetailQuery()
  const [saveCustomer, { isLoading: saving }] = useSaveCustomerMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TPosCustomer>(emptyCustomer())

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setForm(emptyCustomer())
    setDialogOpen(true)
  }

  const openEdit = async (e: React.MouseEvent, item: TPosCustomerSimple) => {
    e.stopPropagation()
    if (!item.Id) return
    try {
      const detail = await getCustomerDetail(item.Id).unwrap()
      setForm({ ...emptyCustomer(), ...detail })
      setDialogOpen(true)
    } catch {
      toast.error(t('components.customerSelect.loadDetailError'))
    }
  }

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(withDomainPath('/actives/customers'), '_blank')
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) {
      toast.error(t('components.customerSelect.nameRequired'))
      return
    }
    const isNew = !form.Id
    try {
      const saved = await saveCustomer(buildCustomerPayload(form)).unwrap()
      toast.success(isNew ? t('components.customerSelect.addSuccess') : t('components.customerSelect.updateSuccess'))
      setDialogOpen(false)
      selectRef.current?.refresh()
      // A brand-new customer gets auto-selected (Angular's addChange); an edit
      // of the currently-picked one refreshes the trigger label too.
      const savedId = saved?.Id ?? form.Id
      if (isNew && savedId) onChange({ Id: savedId, Name: form.Name, Phone: form.Phone } as TPosCustomerSimple)
      else if (savedId && value?.Id === savedId) onChange({ ...value, Name: form.Name, Phone: form.Phone })
    } catch {
      toast.error(t('components.customerSelect.saveError'))
    }
  }

  return (
    <>
      <SelectBase<TPosCustomerSimple>
        ref={selectRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? t('components.customerSelect.placeholder')}
        searchPlaceholder={t('common.searchCustomer')}
        emptyText={t('components.customerSelect.noResults')}
        className={className}
        disabled={disabled}
        pageSize={20}
        getId={item => item.Id}
        getLabel={item => item.Name ?? ''}
        search={({ keyword, pageIndex, pageSize }) =>
          search({ Keyword: keyword, PageIndex: pageIndex, PageSize: pageSize }).unwrap()
        }
        renderItem={item => (
          <>
            <span className="font-medium truncate">{item.Name}</span>
            {item.Phone && <span className="text-muted-foreground shrink-0">{item.Phone}</span>}
          </>
        )}
        onAdd={openAdd}
        addTitle={t('components.customerSelect.addCustomer')}
        onEdit={openEdit}
        editTitle={t('components.customerSelect.edit')}
        onOpenList={openList}
        listLabel={t('components.customerSelect.listButton')}
        listTitle={t('components.customerSelect.customerList')}
      />

      <CustomerDialog
        open={dialogOpen}
        form={form}
        setForm={setForm}
        groups={groups}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
