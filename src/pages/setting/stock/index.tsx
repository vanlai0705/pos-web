import { Skeleton } from "@/components/ui/skeleton"
import { useGetSettingStockQuery, useUpdateSettingStockMutation } from '@/store/slice/settings/api'
import { Warehouse } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from 'react-i18next'
import { toast } from "sonner"
import { PageHeader, SaveBar, SettingCard, ToggleRow } from "../components"
export default function SettingStockPage() {
  const { t } = useTranslation()
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
      toast.success(t("pages.setting.stock.saveSuccessTitle"), { description: t("pages.setting.stock.saveSuccessDescription") })
    } catch {
      toast.error(t("pages.setting.stock.errorTitle"), { description: t("pages.setting.stock.cannotSaveSettings") })
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pages.setting.stock.pageTitle")}
        description={t("pages.setting.stock.pageDescription")}
        icon={<Warehouse className="h-5 w-5" />}
      />
      <SettingCard title={t("pages.setting.stock.receiptRulesTitle")} icon={<Warehouse className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsInputDupplicateProduct"
          label={t("pages.setting.stock.allowDuplicateProductInReceipt")}
          description={t("pages.setting.stock.allowDuplicateProductInReceiptDescription")}
          checked={form.IsInputDupplicateProduct}
          onCheckedChange={toggle("IsInputDupplicateProduct")}
        />
        <ToggleRow
          id="IsRequireUser"
          label={t("pages.setting.stock.requireUserInStockIn")}
          checked={form.IsRequireUser}
          onCheckedChange={toggle("IsRequireUser")}
        />
        <ToggleRow
          id="IsRequireSuppier"
          label={t("pages.setting.stock.requireSupplierInStockIn")}
          checked={form.IsRequireSuppier}
          onCheckedChange={toggle("IsRequireSuppier")}
        />
      </SettingCard>
      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
