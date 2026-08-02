import { useEffect, useState } from "react"
import { Warehouse } from "lucide-react"
import { useGetSettingStockQuery, useUpdateSettingStockMutation } from "@/store/slice/users/api/api"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PageHeader, SettingCard, ToggleRow, SaveBar } from "../components"

export default function SettingStockPage() {
  const { data, isLoading } = useGetSettingStockQuery()
  const [update, { isLoading: saving }] = useUpdateSettingStockMutation()

  const [form, setForm] = useState({
    IsInputDupplicateProduct: false,
    IsRequireUser: false,
    IsRequireSuppier: false,
  })

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  const toggle = (key: keyof typeof form) => (v: boolean) =>
    setForm(f => ({ ...f, [key]: v }))

  const handleSave = async () => {
    try {
      await update(form).unwrap()
      toast.success("Lưu thành công", { description: "Cài đặt kho hàng đã được cập nhật." })
    } catch {
      toast.error("Lỗi", { description: "Không thể lưu cài đặt." })
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt kho hàng"
        description="Quy tắc và điều kiện trong nhập/xuất kho"
        icon={<Warehouse className="h-5 w-5" />}
      />
      <SettingCard title="Quy tắc phiếu kho" icon={<Warehouse className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsInputDupplicateProduct"
          label="Cho phép nhập một mặt hàng nhiều lần trong phiếu"
          description="Cùng một sản phẩm có thể xuất hiện nhiều dòng trong phiếu kho"
          checked={form.IsInputDupplicateProduct}
          onCheckedChange={toggle("IsInputDupplicateProduct")}
        />
        <ToggleRow
          id="IsRequireUser"
          label="Bắt buộc chọn nhân viên trong nhập kho"
          checked={form.IsRequireUser}
          onCheckedChange={toggle("IsRequireUser")}
        />
        <ToggleRow
          id="IsRequireSuppier"
          label="Bắt buộc chọn nhà cung cấp trong nhập kho"
          checked={form.IsRequireSuppier}
          onCheckedChange={toggle("IsRequireSuppier")}
        />
      </SettingCard>
      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
