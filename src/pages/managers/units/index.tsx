import { useSaveUnitMutation, useUpdateUnitStatusMutation, useFilterUnitsQuery } from '@/store/slice/managers/api'
import { Input } from '@/components/ui/input'
import { PosImage } from '@/components/ui/pos-image'
import { Textarea } from '@/components/ui/textarea'
import { TPosUnit } from '@/store/slice/users'
import { Ruler } from 'lucide-react'
import { GenericManagerPage } from '../GenericManagerPage'
import { FormField } from '../components'
import { useManagerPage } from '../use-manager-page'

const empty = (): TPosUnit => ({ Name: "" })
const validate = (f: TPosUnit) => f.Name.trim() ? null : "Vui lòng nhập tên đơn vị"

export default function UnitsPage() {
  const mp = useManagerPage(empty)
  const { data, isLoading, refetch } = useFilterUnitsQuery(mp.params)
  const [save, { isLoading: saving }] = useSaveUnitMutation()
  const [updateStatus] = useUpdateUnitStatusMutation()

  const onSave = mp.makeSave(d => save(d).unwrap(), validate, refetch)
  const onChangeStatus = mp.makeChangeStatus((a) => updateStatus(a).unwrap(), refetch)

  return (
    <GenericManagerPage<TPosUnit>
      title="Đơn vị tính" Icon={Ruler}
      data={data} isLoading={isLoading}
      keyword={mp.keyword} onKeyword={mp.setKeyword}
      statusId={mp.statusId} onStatus={mp.setStatusId}
      searchPlaceholder="Tìm đơn vị tính..."
      page={mp.page} pageSize={mp.pageSize} onPage={mp.goPage} onPageSize={mp.setPageSize}
      onAdd={mp.openAdd} onEdit={mp.openEdit} onChangeStatus={onChangeStatus}
      modal={mp.modal} onCloseModal={mp.closeModal}
      modalTitle={mp.form.Id ? "Chỉnh sửa đơn vị tính" : "Thêm đơn vị tính"}
      onSave={onSave} saving={saving}
      columns={[
        {
          header: "Tên đơn vị",
          render: item => (
            <div className="flex items-center gap-2">
              {item.Image?.Url && <PosImage url={item.Image.Url} alt="" className="h-7 w-7 rounded flex-none" />}
              <span className="font-medium">{item.Name}</span>
            </div>
          ),
        },
        { header: "Ghi chú", render: item => <span className="text-muted-foreground text-xs">{item.Note ?? "—"}</span>, className: "max-w-xs truncate" },
      ]}
    >
      <FormField label="Tên đơn vị" required>
        <Input value={mp.form.Name} onChange={e => mp.setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Ví dụ: Cái, Hộp, Kg..." />
      </FormField>
      <FormField label="Ghi chú">
        <Textarea value={mp.form.Note ?? ""} onChange={e => mp.setForm(f => ({ ...f, Note: e.target.value }))} placeholder="Ghi chú" rows={2} />
      </FormField>
    </GenericManagerPage>
  )
}
