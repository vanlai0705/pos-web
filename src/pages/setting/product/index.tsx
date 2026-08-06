import { useEffect, useState } from "react"
import { Package, Printer, Barcode } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useGetSettingProductQuery, useUpdateSettingProductMutation } from "@/store/slice/users/api/api"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PageHeader, SettingCard, ToggleRow, NumberRow, TextRow, SaveBar } from "../components"
import type { TPosSettingProduct } from "@/store/slice/users/types"

const defaultForm: TPosSettingProduct = {
  IsUsingProductCode: true,
  IsUsingBarcode: true,
  IsGenerateBarcode: false,
  IsGenerateProductCode: false,
  IsDupplicateName: false,
  IsMultiUnit: false,
  BarcodeLength: 13,
  PrinterUrl: "",
  BarcodePrinterName: "",
}

export default function SettingProductPage() {
  const { t } = useTranslation()
  const { data, isLoading } = useGetSettingProductQuery()
  const [update, { isLoading: saving }] = useUpdateSettingProductMutation()
  const [form, setForm] = useState<TPosSettingProduct>(defaultForm)

  useEffect(() => {
    if (data) setForm({ ...defaultForm, ...data })
  }, [data])

  const toggle = (key: keyof TPosSettingProduct) => (v: boolean) =>
    setForm(f => ({ ...f, [key]: v }))

  const handleSave = async () => {
    try {
      await update(form).unwrap()
      toast.success(t('pages.setting.product.saveSuccessTitle'), { description: t('pages.setting.product.saveSuccessDescription') })
    } catch {
      toast.error(t('pages.setting.product.saveErrorTitle'), { description: t('pages.setting.product.saveErrorDescription') })
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('pages.setting.product.pageTitle')}
        description={t('pages.setting.product.pageDescription')}
        icon={<Package className="h-5 w-5" />}
      />

      <SettingCard title={t('pages.setting.product.productRulesSection')} icon={<Package className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsUsingProductCode"
          label={t('pages.setting.product.useProductCode')}
          checked={form.IsUsingProductCode}
          onCheckedChange={toggle("IsUsingProductCode")}
        />
        <ToggleRow
          id="IsGenerateProductCode"
          label={t('pages.setting.product.autoGenerateProductCode')}
          checked={form.IsGenerateProductCode}
          onCheckedChange={toggle("IsGenerateProductCode")}
          disabled={!form.IsUsingProductCode}
        />
        <ToggleRow
          id="IsDupplicateName"
          label={t('pages.setting.product.allowDuplicateProductName')}
          checked={form.IsDupplicateName}
          onCheckedChange={toggle("IsDupplicateName")}
        />
        <ToggleRow
          id="IsMultiUnit"
          label={t('pages.setting.product.useMultiUnit')}
          description={t('pages.setting.product.multiUnitDescription')}
          checked={form.IsMultiUnit}
          onCheckedChange={toggle("IsMultiUnit")}
        />
      </SettingCard>

      <SettingCard title={t('pages.setting.product.barcodeSettingsSection')} icon={<Barcode className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsUsingBarcode"
          label={t('pages.setting.product.useBarcode')}
          checked={form.IsUsingBarcode}
          onCheckedChange={toggle("IsUsingBarcode")}
        />
        <ToggleRow
          id="IsGenerateBarcode"
          label={t('pages.setting.product.autoGenerateBarcode')}
          checked={form.IsGenerateBarcode}
          onCheckedChange={toggle("IsGenerateBarcode")}
          disabled={!form.IsUsingBarcode}
        />
        <div className="border-t pt-3">
          <NumberRow
            id="BarcodeLength"
            label={t('pages.setting.product.barcodeLength')}
            value={form.BarcodeLength}
            onChange={v => setForm(f => ({ ...f, BarcodeLength: v }))}
            min={1}
            max={100}
            suffix={t('pages.setting.product.characterUnit')}
          />
        </div>
      </SettingCard>

      <SettingCard title={t('pages.setting.product.barcodePrinterSection')} icon={<Printer className="h-4 w-4 text-primary" />}>
        <TextRow
          id="PrinterUrl"
          label={t('pages.setting.product.printerUrl')}
          description={t('pages.setting.product.printerUrlDescription')}
          value={form.PrinterUrl ?? ""}
          onChange={v => setForm(f => ({ ...f, PrinterUrl: v }))}
          placeholder="http://localhost:8000"
        />
        <TextRow
          id="BarcodePrinterName"
          label={t('pages.setting.product.barcodePrinterName')}
          value={form.BarcodePrinterName ?? ""}
          onChange={v => setForm(f => ({ ...f, BarcodePrinterName: v }))}
          placeholder={t('pages.setting.product.printerNamePlaceholder')}
        />
      </SettingCard>

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
