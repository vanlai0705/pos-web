import { useEffect, useState } from "react"
import { ShoppingCart, Settings2, ClipboardList, Printer } from "lucide-react"
import { useGetSettingOrderQuery, useUpdateSettingOrderMutation } from "@/store/slice/users/api/api"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { PageHeader, SettingCard, ToggleRow, NumberRow, TextRow, SaveBar } from "../components"
import type { TPosSettingOrder } from "@/store/slice/users/types"

const defaultForm: TPosSettingOrder = {
  IsDupplicateCustomerName: false,
  IsDiscount: true,
  IsUsingBarcode: false,
  IsInputQuantityWithBarcode: false,
  IsChangeDate: false,
  IsTranferCost: false,
  IsTax: false,
  IsTaxPerItemAllowed: false,
  IsStock: false,
  StockDefault: null,
  DefaultDiscount: 0,
  TaxPercent: 0,
  Rounting: 0,
  DayOfRetrurn: 7,
  IsRequireCustomer: false,
  IsRequireUser: false,
  IsRequireStock: false,
  IsDebit: true,
  IsTempOrder: true,
  IsRequireRefurnByOrderNo: false,
  IsDisplayProductImage: true,
  IsAutoPromotion: false,
  IsDisplayProductPromotion: false,
  IsVoucher: false,
  IsTranfer: false,
  IsPricePerCustomer: false,
  IsDiscountByProduct: false,
  PrintCount: 1,
  IsPrintProvisionalInvoice: false,
  PrinterUrl: "",
  BillPrinterName: "",
}

export default function SettingOrderPage() {
  const { data, isLoading } = useGetSettingOrderQuery()
  const [update, { isLoading: saving }] = useUpdateSettingOrderMutation()
  const [form, setForm] = useState<TPosSettingOrder>(defaultForm)

  useEffect(() => {
    if (data) setForm({ ...defaultForm, ...data })
  }, [data])

  const toggle = (key: keyof TPosSettingOrder) => (v: boolean) => {
    setForm(f => {
      const next = { ...f, [key]: v }
      // IsTax và IsTaxPerItemAllowed là mutually exclusive
      if (key === "IsTax" && v) next.IsTaxPerItemAllowed = false
      if (key === "IsTaxPerItemAllowed" && v) next.IsTax = false
      return next
    })
  }

  const setNum = (key: keyof TPosSettingOrder) => (v: number) =>
    setForm(f => ({ ...f, [key]: v }))

  const setStr = (key: keyof TPosSettingOrder) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  const handleSave = async () => {
    try {
      await update(form).unwrap()
      toast.success("Lưu thành công", { description: "Cài đặt đơn hàng đã được cập nhật." })
    } catch {
      toast.error("Lỗi", { description: "Không thể lưu cài đặt." })
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt đơn hàng"
        description="Cấu hình quy tắc bán hàng và in hoá đơn"
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      {/* Group 1: Cấu hình chung */}
      <SettingCard title="Cấu hình chung đơn hàng" icon={<Settings2 className="h-4 w-4 text-primary" />}>
        <ToggleRow id="IsDupplicateCustomerName" label="Cho phép trùng tên khách hàng" checked={form.IsDupplicateCustomerName} onCheckedChange={toggle("IsDupplicateCustomerName")} />
        <ToggleRow id="IsDiscount" label="Cho phép nhập giảm giá" checked={form.IsDiscount} onCheckedChange={toggle("IsDiscount")} />
        <ToggleRow id="IsUsingBarcode" label="Bán hàng dùng đầu đọc mã vạch" checked={form.IsUsingBarcode} onCheckedChange={toggle("IsUsingBarcode")} />
        <ToggleRow
          id="IsInputQuantityWithBarcode"
          label="Hiển thị cửa sổ nhập số lượng khi quét mã vạch"
          checked={form.IsInputQuantityWithBarcode}
          onCheckedChange={toggle("IsInputQuantityWithBarcode")}
          disabled={!form.IsUsingBarcode}
        />
        <ToggleRow id="IsChangeDate" label="Cho phép đổi ngày trên hóa đơn" checked={form.IsChangeDate} onCheckedChange={toggle("IsChangeDate")} />
        <ToggleRow id="IsTranferCost" label="Có phí vận chuyển" checked={form.IsTranferCost} onCheckedChange={toggle("IsTranferCost")} />
        <ToggleRow id="IsTax" label="Có thuế xuất" description="Áp dụng thuế cho toàn đơn hàng" checked={form.IsTax} onCheckedChange={toggle("IsTax")} />
        <ToggleRow
          id="IsTaxPerItemAllowed"
          label="Cho phép nhập thuế từng sản phẩm"
          description="Mỗi mặt hàng có thể có thuế suất riêng"
          checked={form.IsTaxPerItemAllowed}
          onCheckedChange={toggle("IsTaxPerItemAllowed")}
        />
        <ToggleRow id="IsStock" label="Cho phép kho trong đơn hàng" checked={form.IsStock} onCheckedChange={toggle("IsStock")} />

        <div className="border-t pt-4 space-y-3">
          <NumberRow id="DefaultDiscount" label="Mặc định giảm giá (%)" value={form.DefaultDiscount} onChange={setNum("DefaultDiscount")} min={0} max={100} suffix="%" />
          <NumberRow id="TaxPercent" label="Tỷ lệ thuế (%)" value={form.TaxPercent} onChange={setNum("TaxPercent")} min={0} max={100} suffix="%" />
          <NumberRow id="Rounting" label="Làm tròn giá (VND)" description="Ví dụ: 1000 → làm tròn đến nghìn đồng" value={form.Rounting} onChange={setNum("Rounting")} min={0} />
          <NumberRow id="DayOfRetrurn" label="Số ngày được đổi trả" value={form.DayOfRetrurn} onChange={setNum("DayOfRetrurn")} min={0} max={365} suffix="ngày" />
        </div>
      </SettingCard>

      {/* Group 2: Quy tắc & Điều kiện */}
      <SettingCard title="Quy tắc & Điều kiện bán hàng" icon={<ClipboardList className="h-4 w-4 text-primary" />}>
        <ToggleRow id="IsRequireCustomer" label="Bắt buộc nhập khách hàng" checked={form.IsRequireCustomer} onCheckedChange={toggle("IsRequireCustomer")} />
        <ToggleRow id="IsRequireUser" label="Bắt buộc nhập nhân viên bán hàng" checked={form.IsRequireUser} onCheckedChange={toggle("IsRequireUser")} />
        <ToggleRow id="IsRequireStock" label="Bắt buộc nhập kho hàng" checked={form.IsRequireStock} onCheckedChange={toggle("IsRequireStock")} />
        <ToggleRow id="IsDebit" label="Cho phép khách nợ" checked={form.IsDebit} onCheckedChange={toggle("IsDebit")} />
        <ToggleRow id="IsTempOrder" label="Cho phép tạm tính" checked={form.IsTempOrder} onCheckedChange={toggle("IsTempOrder")} />
        <ToggleRow id="IsRequireRefurnByOrderNo" label="Bắt buộc đổi trả hàng theo đơn" checked={form.IsRequireRefurnByOrderNo} onCheckedChange={toggle("IsRequireRefurnByOrderNo")} />
        <ToggleRow id="IsDisplayProductImage" label="Hiển thị ảnh sản phẩm trong giao diện bán hàng" checked={form.IsDisplayProductImage} onCheckedChange={toggle("IsDisplayProductImage")} />
        <ToggleRow id="IsAutoPromotion" label="Kích hoạt khuyến mãi tự động" checked={form.IsAutoPromotion} onCheckedChange={toggle("IsAutoPromotion")} />
        <ToggleRow id="IsDisplayProductPromotion" label="Hiển thị mặt hàng khuyến mãi khi thanh toán" checked={form.IsDisplayProductPromotion} onCheckedChange={toggle("IsDisplayProductPromotion")} />
        <ToggleRow id="IsVoucher" label="Có thanh toán voucher" checked={form.IsVoucher} onCheckedChange={toggle("IsVoucher")} />
        <ToggleRow id="IsTranfer" label="Có giao hàng" checked={form.IsTranfer} onCheckedChange={toggle("IsTranfer")} />
        <ToggleRow id="IsPricePerCustomer" label="Sử dụng giá theo khách hàng" checked={form.IsPricePerCustomer} onCheckedChange={toggle("IsPricePerCustomer")} />
        <ToggleRow id="IsDiscountByProduct" label="Sử dụng giảm giá mặc định theo mặt hàng" checked={form.IsDiscountByProduct} onCheckedChange={toggle("IsDiscountByProduct")} />
      </SettingCard>

      {/* Group 3: Máy in */}
      <SettingCard title="Cấu hình máy in hoá đơn" icon={<Printer className="h-4 w-4 text-primary" />}>
        <NumberRow id="PrintCount" label="Số lần in mặc định" value={form.PrintCount} onChange={setNum("PrintCount")} min={0} max={100} suffix="lần" />
        <ToggleRow id="IsPrintProvisionalInvoice" label="Hiển thị trước khi in" description="Xem trước bản in trước khi gửi đến máy in" checked={form.IsPrintProvisionalInvoice} onCheckedChange={toggle("IsPrintProvisionalInvoice")} />
        <div className="border-t pt-3 space-y-3">
          <TextRow
            id="PrinterUrl"
            label="Đường dẫn cục bộ máy in"
            description="Ví dụ: \\\\192.168.1.100\\PrinterName hoặc http://localhost:8000"
            value={form.PrinterUrl ?? ""}
            onChange={setStr("PrinterUrl")}
            placeholder="\\\\server\\printer"
          />
          <TextRow
            id="BillPrinterName"
            label="Tên hệ thống máy in hoá đơn"
            value={form.BillPrinterName ?? ""}
            onChange={setStr("BillPrinterName")}
            placeholder="Tên máy in"
          />
        </div>
      </SettingCard>

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
