import { Truck } from "lucide-react"
import { PosImage } from "@/components/ui/pos-image"
import {
  useFilterSupplierGroupsQuery,
  useSaveSupplierGroupMutation,
  useUpdateSupplierGroupStatusMutation,
} from "@/store/slice/users/api/api"
import type { TPosSupplierGroup } from "@/store/slice/users/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GenericManagerPage } from "../GenericManagerPage"
import { FormField } from "../components"
import { useManagerPage } from "../use-manager-page"

const empty = (): TPosSupplierGroup => ({ Name: "" })
const validate = (f: TPosSupplierGroup) => f.Name.trim() ? null : "Vui lòng nhập tên nhóm"

export default function SupplierGroupsPage() {
  const mp = useManagerPage(empty)
  const { data, isLoading, refetch } = useFilterSupplierGroupsQuery(mp.params)
  const [save, { isLoading: saving }] = useSaveSupplierGroupMutation()
  const [updateStatus] = useUpdateSupplierGroupStatusMutation()

  const onSave = mp.makeSave(d => save(d).unwrap(), validate, refetch)
  const onChangeStatus = mp.makeChangeStatus((a) => updateStatus(a).unwrap(), refetch)

  return (
    <GenericManagerPage<TPosSupplierGroup>
      title="Nhóm nhà cung cấp" Icon={Truck}
      data={data} isLoading={isLoading}
      keyword={mp.keyword} onKeyword={mp.setKeyword}
      statusId={mp.statusId} onStatus={mp.setStatusId}
      searchPlaceholder="Tìm nhóm nhà cung cấp..."
      page={mp.page} pageSize={mp.pageSize} onPage={mp.goPage} onPageSize={mp.setPageSize}
      onAdd={mp.openAdd} onEdit={mp.openEdit} onChangeStatus={onChangeStatus}
      modal={mp.modal} onCloseModal={mp.closeModal}
      modalTitle={mp.form.Id ? "Chỉnh sửa nhóm nhà cung cấp" : "Thêm nhóm nhà cung cấp"}
      onSave={onSave} saving={saving}
      columns={[
        {
          header: "Tên nhóm",
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
      <FormField label="Tên nhóm" required>
        <Input value={mp.form.Name} onChange={e => mp.setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhóm nhà cung cấp" />
      </FormField>
      <FormField label="Ghi chú">
        <Textarea value={mp.form.Note ?? ""} onChange={e => mp.setForm(f => ({ ...f, Note: e.target.value }))} placeholder="Ghi chú" rows={2} />
      </FormField>
    </GenericManagerPage>
  )
}
