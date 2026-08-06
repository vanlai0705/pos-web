import { useEffect, useState } from "react"
import { FileText, Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  useGetUserShopSettingQuery,
  useGetSettingInvoiceQuery,
  useUpdateSettingInvoiceMutation,
} from "@/store/slice/users/api/api"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { PageHeader, SettingCard, ToggleRow, SaveBar } from "../components"
import type { TPosSettingInvoice } from "@/store/slice/users/types"

const TAX_EXPORT_OPTIONS = [
  { value: 0, labelKey: "pages.setting.invoice.taxExportNone" },
  { value: 1, labelKey: "pages.setting.invoice.taxExportManual" },
  { value: 2, labelKey: "pages.setting.invoice.taxExportAutoOnPayment" },
  { value: 3, labelKey: "pages.setting.invoice.taxExportChooseOnPayment" },
]

const INVOICE_TYPE_OPTIONS = [
  { value: 0, label: "EASY INVOICE" },
  { value: 1, label: "MINVOICE" },
]

const defaultForm: TPosSettingInvoice = {
  taxExportType: 0,
  invoiceType: 0,
  url: "",
  taxNumber: "",
  userName: "",
  password: "",
  parttern: "",
  isDraft: false,
}

export default function SettingInvoicePage() {
  const { t } = useTranslation()
  const { data: shopSetting, isLoading: shopLoading } = useGetUserShopSettingQuery()
  const shopId = shopSetting?.SelectedShopId
  const { data, isLoading: invoiceLoading } = useGetSettingInvoiceQuery(
    { shopId },
    { skip: shopId === undefined }
  )
  const [update, { isLoading: saving }] = useUpdateSettingInvoiceMutation()

  const [form, setForm] = useState<TPosSettingInvoice>(defaultForm)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (data) setForm({ ...defaultForm, ...data, shopId })
  }, [data, shopId])

  const needConfig = form.taxExportType !== 0

  const handleSave = async () => {
    try {
      await update({ ...form, shopId }).unwrap()
      toast.success(t("pages.setting.invoice.saveSuccessTitle"), {
        description: t("pages.setting.invoice.saveSuccessDescription"),
      })
    } catch {
      toast.error(t("pages.setting.invoice.saveErrorTitle"), {
        description: t("pages.setting.invoice.saveErrorDescription"),
      })
    }
  }

  if (shopLoading || invoiceLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pages.setting.invoice.pageTitle")}
        description={t("pages.setting.invoice.pageDescription")}
        icon={<FileText className="h-5 w-5" />}
      />

      {/* Export type */}
      <SettingCard title={t("pages.setting.invoice.exportMethodCardTitle")} icon={<FileText className="h-4 w-4 text-primary" />}>
        <div className="space-y-1.5">
          <Label htmlFor="taxExportType">{t("pages.setting.invoice.exportMethodLabel")}</Label>
          <select
            id="taxExportType"
            value={form.taxExportType}
            onChange={e => setForm(f => ({ ...f, taxExportType: Number(e.target.value) }))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {TAX_EXPORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
            ))}
          </select>
        </div>
      </SettingCard>

      {/* Provider config — only shown when export type != 0 */}
      {needConfig && (
        <SettingCard title={t("pages.setting.invoice.connectionInfoCardTitle")} icon={<FileText className="h-4 w-4 text-primary" />}>
          <div className="space-y-1.5">
            <Label htmlFor="invoiceType">{t("pages.setting.invoice.invoiceTypeLabel")}</Label>
            <select
              id="invoiceType"
              value={form.invoiceType}
              onChange={e => setForm(f => ({ ...f, invoiceType: Number(e.target.value) }))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {INVOICE_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">{t("pages.setting.invoice.apiUrlLabel")}</Label>
            <Input
              id="url"
              value={form.url ?? ""}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="taxNumber">{t("pages.setting.invoice.taxNumberLabel")}</Label>
            <Input
              id="taxNumber"
              value={form.taxNumber ?? ""}
              onChange={e => setForm(f => ({ ...f, taxNumber: e.target.value }))}
              placeholder="0123456789"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="userName">{t("pages.setting.invoice.usernameLabel")}</Label>
              <Input
                id="userName"
                value={form.userName ?? ""}
                onChange={e => setForm(f => ({ ...f, userName: e.target.value }))}
                placeholder="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("pages.setting.invoice.passwordLabel")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password ?? ""}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parttern">{t("pages.setting.invoice.invoicePatternLabel")}</Label>
            <Input
              id="parttern"
              value={form.parttern ?? ""}
              onChange={e => setForm(f => ({ ...f, parttern: e.target.value }))}
              placeholder="01GTKT0/001"
            />
          </div>

          <ToggleRow
            id="isDraft"
            label={t("pages.setting.invoice.draftInvoiceLabel")}
            description={t("pages.setting.invoice.draftInvoiceDescription")}
            checked={form.isDraft}
            onCheckedChange={v => setForm(f => ({ ...f, isDraft: v }))}
          />
        </SettingCard>
      )}

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
