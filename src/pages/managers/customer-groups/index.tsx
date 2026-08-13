import { useSaveCustomerGroupMutation, useUpdateCustomerGroupStatusMutation, useFilterCustomerGroupsQuery } from '@/store/slice/managers/api'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { PosImage } from '@/components/ui/pos-image'
import { Textarea } from '@/components/ui/textarea'
import { TPosCustomerGroup } from '@/store/slice/users'
import { Users } from 'lucide-react'
import { GenericManagerPage } from '../GenericManagerPage'
import { FormField } from '../components'
import { useManagerPage } from '../use-manager-page'

const empty = (): TPosCustomerGroup => ({ Name: "" })
const validate = (f: TPosCustomerGroup) => f.Name.trim() ? null : "Vui lòng nhập tên nhóm"

export default function CustomerGroupsPage() {
  const mp = useManagerPage(empty)
  const { data, isLoading, refetch } = useFilterCustomerGroupsQuery(mp.params)
  const [save, { isLoading: saving }] = useSaveCustomerGroupMutation()
  const [updateStatus] = useUpdateCustomerGroupStatusMutation()

  const onSave = mp.makeSave(d => save(d).unwrap(), validate, refetch)
  const onChangeStatus = mp.makeChangeStatus((a) => updateStatus(a).unwrap(), refetch)

  return (
    <GenericManagerPage<TPosCustomerGroup>
      title="Nhóm khách hàng" Icon={Users}
      data={data} isLoading={isLoading}
      keyword={mp.keyword} onKeyword={mp.setKeyword}
      statusId={mp.statusId} onStatus={mp.setStatusId}
      searchPlaceholder="Tìm nhóm khách hàng..."
      page={mp.page} pageSize={mp.pageSize} onPage={mp.goPage} onPageSize={mp.setPageSize}
      onAdd={mp.openAdd} onEdit={mp.openEdit} onChangeStatus={onChangeStatus}
      modal={mp.modal} onCloseModal={mp.closeModal}
      modalTitle={mp.form.Id ? "Chỉnh sửa nhóm khách hàng" : "Thêm nhóm khách hàng"}
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
        { header: "Mã KH", render: item => <span className="text-muted-foreground">{item.CustomerCode ?? "—"}</span> },
        { header: "Giảm giá %", render: item => <span className="text-muted-foreground">{item.DiscountPercent != null ? `${item.DiscountPercent}%` : "—"}</span> },
        { header: "Điểm tích luỹ", render: item => <span className="text-muted-foreground">{item.Point ?? "—"}</span> },
      ]}
    >
      <FormField label="Tên nhóm" required>
        <Input value={mp.form.Name} onChange={e => mp.setForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhóm khách hàng" />
      </FormField>
      <FormField label="Đánh mã khách hàng">
        <Input value={mp.form.CustomerCode ?? ""} onChange={e => mp.setForm(f => ({ ...f, CustomerCode: e.target.value }))} placeholder="Ví dụ: KH001" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Tỷ lệ giảm giá (%)">
          <NumberInput
            min={0} max={100}
            value={mp.form.DiscountPercent ?? 0}
            onChange={v => mp.setForm(f => ({ ...f, DiscountPercent: v }))}
            placeholder="0"
          />
        </FormField>
        <FormField label="Điểm tích luỹ">
          <NumberInput
            min={0}
            value={mp.form.Point ?? 0}
            onChange={v => mp.setForm(f => ({ ...f, Point: v }))}
            placeholder="0"
          />
        </FormField>
      </div>
      <FormField label="Ghi chú">
        <Textarea value={mp.form.Note ?? ""} onChange={e => mp.setForm(f => ({ ...f, Note: e.target.value }))} placeholder="Ghi chú" rows={2} />
      </FormField>
    </GenericManagerPage>
  )
}
