import { useEffect, useState } from "react"
import { Package, Printer, Barcode } from "lucide-react"
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
      toast.success("Lưu thành công", { description: "Cài đặt mặt hàng đã được cập nhật." })
    } catch {
      toast.error("Lỗi", { description: "Không thể lưu cài đặt." })
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt mặt hàng"
        description="Quy tắc quản lý sản phẩm, mã vạch và đơn vị tính"
        icon={<Package className="h-5 w-5" />}
      />

      <SettingCard title="Quy tắc sản phẩm" icon={<Package className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsUsingProductCode"
          label="Sử dụng mã sản phẩm"
          checked={form.IsUsingProductCode}
          onCheckedChange={toggle("IsUsingProductCode")}
        />
        <ToggleRow
          id="IsGenerateProductCode"
          label="Tự động sinh mã sản phẩm"
          checked={form.IsGenerateProductCode}
          onCheckedChange={toggle("IsGenerateProductCode")}
          disabled={!form.IsUsingProductCode}
        />
        <ToggleRow
          id="IsDupplicateName"
          label="Cho phép trùng tên mặt hàng"
          checked={form.IsDupplicateName}
          onCheckedChange={toggle("IsDupplicateName")}
        />
        <ToggleRow
          id="IsMultiUnit"
          label="Sử dụng nhiều đơn vị tính"
          description="Một sản phẩm có thể có nhiều đơn vị (hộp, cái, thùng…)"
          checked={form.IsMultiUnit}
          onCheckedChange={toggle("IsMultiUnit")}
        />
      </SettingCard>

      <SettingCard title="Cài đặt mã vạch" icon={<Barcode className="h-4 w-4 text-primary" />}>
        <ToggleRow
          id="IsUsingBarcode"
          label="Sử dụng mã vạch"
          checked={form.IsUsingBarcode}
          onCheckedChange={toggle("IsUsingBarcode")}
        />
        <ToggleRow
          id="IsGenerateBarcode"
          label="Tự động sinh mã vạch"
          checked={form.IsGenerateBarcode}
          onCheckedChange={toggle("IsGenerateBarcode")}
          disabled={!form.IsUsingBarcode}
        />
        <div className="border-t pt-3">
          <NumberRow
            id="BarcodeLength"
            label="Chiều dài mã vạch"
            value={form.BarcodeLength}
            onChange={v => setForm(f => ({ ...f, BarcodeLength: v }))}
            min={1}
            max={100}
            suffix="ký tự"
          />
        </div>
      </SettingCard>

      <SettingCard title="Máy in mã vạch" icon={<Printer className="h-4 w-4 text-primary" />}>
        <TextRow
          id="PrinterUrl"
          label="Đường dẫn máy in"
          description="Đường dẫn đến dịch vụ máy in cục bộ"
          value={form.PrinterUrl ?? ""}
          onChange={v => setForm(f => ({ ...f, PrinterUrl: v }))}
          placeholder="http://localhost:8000"
        />
        <TextRow
          id="BarcodePrinterName"
          label="Tên máy in mã vạch"
          value={form.BarcodePrinterName ?? ""}
          onChange={v => setForm(f => ({ ...f, BarcodePrinterName: v }))}
          placeholder="Tên máy in"
        />
      </SettingCard>

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
