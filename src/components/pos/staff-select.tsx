import { useLazyFilterUsersSimpleQuery } from '@/store/slice/customers/api'
import { useLazyGetMemberDetailQuery, useSaveMemberMutation } from '@/store/slice/human-resources/api'
import { TPosMember, TPosUser } from '@/store/slice/users'
import { withDomainPath } from '@/utils/domain-route'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { SelectBase, type SelectBaseHandle } from './select-base'
import { StaffDialog, emptyStaff } from './staff-form-dialog'
interface StaffSelectProps {
  value?: TPosUser | null
  onChange: (user: TPosUser | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function StaffSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: StaffSelectProps) {
  const { t } = useTranslation()
  const selectRef = useRef<SelectBaseHandle>(null)

  const [search] = useLazyFilterUsersSimpleQuery()

  // Inline "Thêm"/"Sửa" — profile-only subset of the full staff wizard in
  // human-resources/members (no login account), same idea as CustomerSelect.
  const [getMemberDetail] = useLazyGetMemberDetailQuery()
  const [saveMember, { isLoading: saving }] = useSaveMemberMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TPosMember>(emptyStaff())

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setForm(emptyStaff())
    setDialogOpen(true)
  }

  const openEdit = async (e: React.MouseEvent, item: TPosUser) => {
    e.stopPropagation()
    if (!item.Id) return
    try {
      const detail = await getMemberDetail(item.Id).unwrap()
      setForm({ ...emptyStaff(), ...detail })
      setDialogOpen(true)
    } catch {
      toast.error(t('components.staffSelect.loadDetailError'))
    }
  }

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(withDomainPath('/human-resources/members'), '_blank')
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) {
      toast.error(t('components.staffSelect.nameRequired'))
      return
    }
    const isNew = !form.Id
    try {
      const saved = await saveMember({ model: form, file: null }).unwrap()
      toast.success(isNew ? t('components.staffSelect.addSuccess') : t('components.staffSelect.updateSuccess'))
      setDialogOpen(false)
      selectRef.current?.refresh()
      const savedId = saved?.Id ?? form.Id
      const fullName = `${form.Surname ?? ''} ${form.Name ?? ''}`.trim() || form.Name
      if (isNew && savedId) {
        onChange({ Id: savedId, Name: form.Name, Surname: form.Surname, FullName: fullName } as TPosUser)
      } else if (savedId && value?.Id === savedId) {
        onChange({ ...value, Name: form.Name, Surname: form.Surname, FullName: fullName } as TPosUser)
      }
    } catch {
      toast.error(t('components.staffSelect.saveError'))
    }
  }

  return (
    <>
      <SelectBase<TPosUser>
        ref={selectRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? t('components.staffSelect.placeholder')}
        searchPlaceholder={t('common.searchEmployee')}
        emptyText={t('components.staffSelect.notFound')}
        className={className}
        disabled={disabled}
        pageSize={20}
        getId={item => item.Id}
        getLabel={item => item.FullName || item.Name || ''}
        search={({ keyword, pageIndex, pageSize }) =>
          search({ Keyword: keyword, PageIndex: pageIndex, PageSize: pageSize }).unwrap()
        }
        renderItem={item => (
          <>
            <span className="font-medium truncate">{item.FullName || item.Name}</span>
            {item.Surname && <span className="text-muted-foreground shrink-0">{item.Surname}</span>}
          </>
        )}
        onAdd={openAdd}
        addTitle={t('components.staffSelect.addStaff')}
        onEdit={openEdit}
        editTitle={t('components.staffSelect.editStaff')}
        onOpenList={openList}
        listLabel={t('components.staffSelect.staffList')}
        listTitle={t('components.staffSelect.staffListTitle')}
      />

      <StaffDialog
        open={dialogOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  )
}
