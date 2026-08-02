import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { useGetSettingNotificationQuery, useUpdateSettingNotificationMutation } from "@/store/slice/users/api/api"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PageHeader, SettingCard, ToggleRow, SaveBar } from "../components"

export default function SettingNotificationPage() {
  const { data, isLoading } = useGetSettingNotificationQuery()
  const [update, { isLoading: saving }] = useUpdateSettingNotificationMutation()

  const [form, setForm] = useState({
    IsShowNotification: false,
    IsShowLowStock: false,
    IsShowCustomerBirthday: false,
  })

  useEffect(() => {
    if (data) setForm({ ...data })
  }, [data])

  const toggle = (key: keyof typeof form) => (v: boolean) =>
    setForm(f => ({ ...f, [key]: v }))

  const handleSave = async () => {
    try {
      await update(form).unwrap()
      toast.success("Lưu thành công", { description: "Cài đặt thông báo đã được cập nhật." })
    } catch {
      toast.error("Lỗi", { description: "Không thể lưu cài đặt." })
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Thông báo"
        description="Cấu hình các loại thông báo hiển thị trong hệ thống"
        icon={<Bell className="h-5 w-5" />}
      />
      <SettingCard title="Tuỳ chọn thông báo" icon={<Bell className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsShowNotification"
          label="Hiển thị thông báo"
          description="Bật/tắt toàn bộ hệ thống thông báo"
          checked={form.IsShowNotification}
          onCheckedChange={toggle("IsShowNotification")}
        />
        <ToggleRow
          id="IsShowLowStock"
          label="Thông báo hàng dưới mức an toàn"
          description="Cảnh báo khi tồn kho thấp hơn mức tối thiểu"
          checked={form.IsShowLowStock}
          onCheckedChange={toggle("IsShowLowStock")}
        />
        <ToggleRow
          id="IsShowCustomerBirthday"
          label="Thông báo sinh nhật khách hàng"
          description="Nhắc nhở khi khách hàng có sinh nhật"
          checked={form.IsShowCustomerBirthday}
          onCheckedChange={toggle("IsShowCustomerBirthday")}
        />
      </SettingCard>
      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
