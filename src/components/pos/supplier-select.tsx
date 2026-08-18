import type { LookupItem } from '@/components/pos/lookup-select'
import { emptySupplier, SupplierDialog, type TSupplier } from '@/components/pos/supplier-form-dialog'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { useLazyFilterReportQuery, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { buildModelFormData } from '@/utils/multipart'
import { withDomainPath } from '@/utils/domain-route'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { SelectBase, type SelectBaseHandle } from './select-base'
interface SupplierSelectProps {
  value?: LookupItem | null
  onChange: (supplier: LookupItem | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/** Same "Thêm"/"Sửa"/"Danh sách" combobox as CustomerSelect/StaffSelect, for suppliers. */
export function SupplierSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: SupplierSelectProps) {
  const selectRef = useRef<SelectBaseHandle>(null)

  const [search] = useLazyFilterReportQuery()
  const [fetchDetail] = useLazyGenericGetQuery()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<TSupplier>(emptySupplier())

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TSupplier) => ({ url: body.Id ? 'suppliers/update' : 'suppliers/create', method: 'POST' as const, body: buildModelFormData(body) }),
  )

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setForm(emptySupplier())
    setDialogOpen(true)
  }

  const openEdit = async (e: React.MouseEvent, item: LookupItem) => {
    e.stopPropagation()
    if (!item.Id) return
    try {
      const detail = await fetchDetail({ url: 'suppliers/detail', params: { id: item.Id } }).unwrap()
      setForm({ ...emptySupplier(), ...((detail?.Data ?? item) as TSupplier) })
      setDialogOpen(true)
    } catch {
      toast.error('Không thể tải thông tin nhà cung cấp')
    }
  }

  const openList = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(withDomainPath('/stocks/suppliers'), '_blank')
  }

  const handleSave = async () => {
    if (!form.Name?.trim()) {
      toast.error('Vui lòng nhập tên nhà cung cấp')
      return
    }
    const isNew = !form.Id
    try {
      await save(form)
      toast.success(isNew ? 'Đã thêm nhà cung cấp' : 'Đã cập nhật NCC')
      setDialogOpen(false)
      selectRef.current?.refresh()
      // No Id is returned by the raw POST endpoint, so re-selecting a
      // brand-new supplier isn't possible here — the next search will show
      // it and the user can pick it, same limitation Angular has.
      if (!isNew && value?.Id === form.Id) onChange({ ...value, Name: form.Name, Phone: form.Phone })
    } catch {
      toast.error('Không thể lưu nhà cung cấp')
    }
  }

  return (
    <>
      <SelectBase<LookupItem>
        ref={selectRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? 'Chọn nhà cung cấp'}
        searchPlaceholder="Tìm nhà cung cấp..."
        emptyText="Không tìm thấy"
        className={className}
        disabled={disabled}
        pageSize={20}
        getId={item => item.Id}
        getLabel={item => (item.Name as string) ?? ''}
        search={({ keyword, pageIndex, pageSize }) =>
          search({ path: 'suppliers/filter-simple', params: { PageIndex: pageIndex, PageSize: pageSize, Keyword: keyword } })
            .unwrap()
            .then(res => res as { Items?: LookupItem[]; TotalItemCount?: number })
        }
        renderItem={item => (
          <>
            <span className="font-medium truncate">{item.Name as string}</span>
            {!!item.Phone && <span className="text-muted-foreground shrink-0">{item.Phone as string}</span>}
          </>
        )}
        onAdd={openAdd}
        addTitle="Thêm nhà cung cấp"
        onEdit={openEdit}
        editTitle="Sửa"
        onOpenList={openList}
        listLabel="Danh sách"
        listTitle="Xem danh sách nhà cung cấp"
      />

      <SupplierDialog
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
