import { Layers } from "lucide-react"
import { PosImage } from "@/components/ui/pos-image"
import {
  useFilterProductGroupsQuery,
  useSaveProductGroupMutation,
  useUpdateProductGroupStatusMutation,
  useGetProductGroupsQuery,
} from "@/store/slice/users/api/api"
import type { TPosProductGroupFull } from "@/store/slice/users/types"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { GenericManagerPage } from "../GenericManagerPage"
import { FormField } from "../components"
import { useManagerPage } from "../use-manager-page"

const empty = (): TPosProductGroupFull => ({ Name: "" })
const validate = (f: TPosProductGroupFull) => f.Name.trim() ? null : "Vui lòng nhập tên nhóm"

export default function ProductGroupsPage() {
  const mp = useManagerPage(empty)
  const { data, isLoading, refetch } = useFilterProductGroupsQuery(mp.params)
  const { data: groupList = [] } = useGetProductGroupsQuery()
  const [save, { isLoading: saving }] = useSaveProductGroupMutation()
  const [updateStatus] = useUpdateProductGroupStatusMutation()

  const onSave = mp.makeSave(d => save(d).unwrap(), validate, refetch)
  const onChangeStatus = mp.makeChangeStatus((a) => updateStatus(a).unwrap(), refetch)

  return (
    <GenericManagerPage<TPosProductGroupFull>
      title="Nhóm mặt hàng" Icon={Layers}
      data={data} isLoading={isLoading}
      keyword={mp.keyword} onKeyword={mp.setKeyword}
      statusId={mp.statusId} onStatus={mp.setStatusId}
      searchPlaceholder="Tìm nhóm mặt hàng..."
      page={mp.page} pageSize={mp.PAGE_SIZE} onPage={mp.goPage}
      onAdd={mp.openAdd} onEdit={mp.openEdit} onChangeStatus={onChangeStatus}
      modal={mp.modal} onCloseModal={mp.closeModal}
      modalTitle={mp.form.Id ? "Chỉnh sửa nhóm mặt hàng" : "Thêm nhóm mặt hàng"}
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
        { header: "Mã", render: item => <span className="text-muted-foreground">{item.Code ?? "—"}</span> },
        { header: "Thuộc nhóm", render: item => <span className="text-muted-foreground text-xs">{item.ProductGroup?.Name ?? "—"}</span> },
      ]}
    >
      <FormField label="Tên nhóm" required>
        <Input value={mp.form.Name} onChange={e => mp.setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhóm mặt hàng" />
      </FormField>
      <FormField label="Mã">
        <Input value={mp.form.Code ?? ""} onChange={e => mp.setForm(f => ({ ...f, Code: e.target.value }))} placeholder="Mã nhóm (tuỳ chọn)" />
      </FormField>
      <FormField label="Thuộc nhóm">
        <select
          value={mp.form.ProductGroup?.Id ?? ""}
          onChange={e => {
            const id = Number(e.target.value)
            const found = groupList.find(g => g.Id === id)
            mp.setForm(f => ({ ...f, ProductGroup: found ? { Id: found.Id, Name: found.Name } : undefined }))
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">— Không có —</option>
          {groupList.filter(g => g.Id !== mp.form.Id).map(g => (
            <option key={g.Id} value={g.Id}>{g.Name}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Ghi chú">
        <Textarea value={mp.form.Note ?? ""} onChange={e => mp.setForm(f => ({ ...f, Note: e.target.value }))} placeholder="Ghi chú" rows={2} />
      </FormField>
    </GenericManagerPage>
  )
}
