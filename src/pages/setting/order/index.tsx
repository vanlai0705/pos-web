import type { TPosSettingOrder } from "@/store/slice/users/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { baseUrl } from "@/constants"
import { useAppSelector } from "@/store/hooks"
import { useGetSettingOrderQuery, useUpdateSettingOrderMutation } from '@/store/slice/settings/api'
import { selectAuth } from "@/store/slice/users/app"
import { Check, ClipboardList, Download, Loader2, Printer, Settings2, ShoppingCart } from 'lucide-react'
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { NumberRow, PageHeader, SaveBar, SettingCard, TextRow, ToggleRow } from "../components"
import { PrinterPickerDialog } from "../printer/printer-picker-dialog"

const defaultForm: TPosSettingOrder = {
  IsDupplicateCustomerName: false,
  IsDiscount: true,
  IsUsingBarcode: false,
  IsInputQuantityWithBarcode: false,
  OrderShiftEndTime: "23:59:59",
  IsChangeDate: false,
  IsTranferCost: false,
  IsServiceFee: false,
  ServiceFeePercent: 0,
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
  const { t } = useTranslation()
  const { data, isLoading } = useGetSettingOrderQuery()
  const [update, { isLoading: saving }] = useUpdateSettingOrderMutation()
  const [form, setForm] = useState<TPosSettingOrder>(defaultForm)
  const [printerPickerOpen, setPrinterPickerOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ""

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

  const normalizeForm = (value: TPosSettingOrder): TPosSettingOrder => ({
    ...value,
    OrderShiftEndTime: value.OrderShiftEndTime || "23:59:59",
    IsServiceFee: !!value.IsServiceFee,
    ServiceFeePercent: Number(value.ServiceFeePercent ?? 0),
  })

  const handleSave = async () => {
    try {
      const next = normalizeForm(form)
      setForm(next)
      await update(next).unwrap()
      toast.success(t("pages.setting.order.saveSuccessTitle"), { description: t("pages.setting.order.saveSuccessDescription") })
    } catch {
      toast.error(t("pages.setting.order.errorTitle"), { description: t("pages.setting.order.cannotSaveSettings") })
    }
  }

  // The Windows PrinterService install doesn't run on macOS — on a Mac,
  // download our print-agent-macos bundle (a static asset served by this
  // app) instead of the backend's Windows-only installer.
  const isMacOS = () => {
    const platform = (navigator as any).userAgentData?.platform ?? navigator.platform ?? navigator.userAgent
    return /mac/i.test(platform) && !/iPhone|iPad|iPod/i.test(navigator.userAgent)
  }

  // Mirrors pos_web's onDownload(): fetches the print-agent installer via
  // setting/download_printer_service and saves it under the filename the
  // server sends back in Content-Disposition.
  const handleDownload = async () => {
    if (isMacOS()) {
      const a = document.createElement("a")
      a.href = "/print-agent-macos.zip"
      a.download = "print-agent-macos.zip"
      document.body.appendChild(a)
      a.click()
      a.remove()
      return
    }
    setDownloading(true)
    try {
      const resp = await fetch(`${baseUrl.replace(/\/+$/, "")}/setting/download_printer_service`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error("download failed")
      const blob = await resp.blob()
      const cd = resp.headers.get("content-disposition") ?? ""
      const fileNameMatch = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const fileName = fileNameMatch?.[1]?.replace(/['"]/g, "") || "PrinterService.zip"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t("pages.setting.order.errorTitle"), { description: t("pages.setting.order.cannotDownloadPrinterAgent") })
    } finally {
      setDownloading(false)
    }
  }

  // Mirrors pos_web's onCheckPrinter(): requires PrinterUrl, then queries the
  // local print-agent for its installed printers.
  const handleCheckPrinter = () => {
    if (!form.PrinterUrl) {
      toast.error(t("pages.setting.order.pleaseEnterPrinterPath"))
      return
    }
    setPrinterPickerOpen(true)
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("pages.setting.order.pageTitle")}
        description={t("pages.setting.order.pageDescription")}
        icon={<ShoppingCart className="h-5 w-5" />}
      />

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-2">
      {/* Group 1: Cấu hình chung */}
      <SettingCard title={t("pages.setting.order.generalConfigTitle")} icon={<Settings2 className="h-4 w-4 text-primary" />}>
        <ToggleRow id="IsDupplicateCustomerName" label={t("pages.setting.order.allowDuplicateCustomerName")} checked={form.IsDupplicateCustomerName} onCheckedChange={toggle("IsDupplicateCustomerName")} />
        <ToggleRow id="IsDiscount" label={t("pages.setting.order.allowDiscountInput")} checked={form.IsDiscount} onCheckedChange={toggle("IsDiscount")} />
        <ToggleRow id="IsUsingBarcode" label={t("pages.setting.order.useBarcodeScanner")} checked={form.IsUsingBarcode} onCheckedChange={toggle("IsUsingBarcode")} />
        <ToggleRow
          id="IsInputQuantityWithBarcode"
          label={t("pages.setting.order.showQuantityDialogOnBarcodeScan")}
          checked={form.IsInputQuantityWithBarcode}
          onCheckedChange={toggle("IsInputQuantityWithBarcode")}
          disabled={!form.IsUsingBarcode}
        />
        <TextRow
          id="OrderShiftEndTime"
          label={t("pages.setting.order.orderShiftEndTime")}
          description={t("pages.setting.order.orderShiftEndTimeDescription")}
          value={form.OrderShiftEndTime ?? "23:59:59"}
          onChange={setStr("OrderShiftEndTime")}
          type="time"
          step={1}
        />
        <ToggleRow id="IsChangeDate" label={t("pages.setting.order.allowChangeInvoiceDate")} checked={form.IsChangeDate} onCheckedChange={toggle("IsChangeDate")} />
        <ToggleRow id="IsTranferCost" label={t("pages.setting.order.hasShippingFee")} checked={form.IsTranferCost} onCheckedChange={toggle("IsTranferCost")} />
        <div className="flex items-center justify-between gap-4 py-1">
          <div className="min-w-0">
            <label htmlFor="IsServiceFee" className="text-sm font-medium leading-none cursor-pointer">
              {t("pages.setting.order.serviceFee")}
            </label>
          </div>
          <div className="flex flex-none items-center gap-2">
            <div className="flex items-center rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
              <input
                id="ServiceFeePercent"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={form.ServiceFeePercent ?? 0}
                onChange={e => setNum("ServiceFeePercent")(Number(e.target.value))}
                disabled={!form.IsServiceFee}
                className="w-16 bg-transparent text-right text-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="ml-1 text-sm text-muted-foreground">%</span>
            </div>
            <Switch id="IsServiceFee" checked={!!form.IsServiceFee} onCheckedChange={toggle("IsServiceFee")} />
          </div>
        </div>
        <ToggleRow id="IsTax" label={t("pages.setting.order.hasTax")} description={t("pages.setting.order.taxAppliesToWholeOrder")} checked={form.IsTax} onCheckedChange={toggle("IsTax")} />
        <ToggleRow
          id="IsTaxPerItemAllowed"
          label={t("pages.setting.order.allowPerItemTax")}
          description={t("pages.setting.order.perItemTaxDescription")}
          checked={form.IsTaxPerItemAllowed}
          onCheckedChange={toggle("IsTaxPerItemAllowed")}
        />
        <ToggleRow id="IsStock" label={t("pages.setting.order.allowStockInOrder")} checked={form.IsStock} onCheckedChange={toggle("IsStock")} />

        <div className="border-t pt-4 space-y-3">
          <NumberRow id="DefaultDiscount" label={t("pages.setting.order.defaultDiscountPercent")} value={form.DefaultDiscount} onChange={setNum("DefaultDiscount")} min={0} max={100} suffix="%" />
          <NumberRow id="TaxPercent" label={t("pages.setting.order.taxPercent")} value={form.TaxPercent} onChange={setNum("TaxPercent")} min={0} max={100} suffix="%" />
          <NumberRow id="Rounting" label={t("pages.setting.order.priceRounding")} description={t("pages.setting.order.priceRoundingDescription")} value={form.Rounting} onChange={setNum("Rounting")} min={0} />
          <NumberRow id="DayOfRetrurn" label={t("pages.setting.order.returnDays")} value={form.DayOfRetrurn} onChange={setNum("DayOfRetrurn")} min={0} max={365} suffix={t("pages.setting.order.daysSuffix")} />
        </div>
      </SettingCard>

      {/* Group 2: Quy tắc & Điều kiện */}
      <SettingCard title={t("pages.setting.order.rulesConditionsTitle")} icon={<ClipboardList className="h-4 w-4 text-primary" />}>
        <ToggleRow id="IsRequireCustomer" label={t("pages.setting.order.requireCustomer")} checked={form.IsRequireCustomer} onCheckedChange={toggle("IsRequireCustomer")} />
        <ToggleRow id="IsRequireUser" label={t("pages.setting.order.requireSalesStaff")} checked={form.IsRequireUser} onCheckedChange={toggle("IsRequireUser")} />
        <ToggleRow id="IsRequireStock" label={t("pages.setting.order.requireStock")} checked={form.IsRequireStock} onCheckedChange={toggle("IsRequireStock")} />
        <ToggleRow id="IsDebit" label={t("pages.setting.order.allowCustomerDebt")} checked={form.IsDebit} onCheckedChange={toggle("IsDebit")} />
        <ToggleRow id="IsTempOrder" label={t("pages.setting.order.allowTempOrder")} checked={form.IsTempOrder} onCheckedChange={toggle("IsTempOrder")} />
        <ToggleRow id="IsRequireRefurnByOrderNo" label={t("pages.setting.order.requireReturnByOrderNo")} checked={form.IsRequireRefurnByOrderNo} onCheckedChange={toggle("IsRequireRefurnByOrderNo")} />
        <ToggleRow id="IsDisplayProductImage" label={t("pages.setting.order.showProductImageInSalesUI")} checked={form.IsDisplayProductImage} onCheckedChange={toggle("IsDisplayProductImage")} />
        <ToggleRow id="IsAutoPromotion" label={t("pages.setting.order.enableAutoPromotion")} checked={form.IsAutoPromotion} onCheckedChange={toggle("IsAutoPromotion")} />
        <ToggleRow id="IsDisplayProductPromotion" label={t("pages.setting.order.showPromotionItemsAtCheckout")} checked={form.IsDisplayProductPromotion} onCheckedChange={toggle("IsDisplayProductPromotion")} />
        <ToggleRow id="IsVoucher" label={t("pages.setting.order.allowVoucherPayment")} checked={form.IsVoucher} onCheckedChange={toggle("IsVoucher")} />
        <ToggleRow id="IsTranfer" label={t("pages.setting.order.hasDelivery")} checked={form.IsTranfer} onCheckedChange={toggle("IsTranfer")} />
        <ToggleRow id="IsPricePerCustomer" label={t("pages.setting.order.usePricePerCustomer")} checked={form.IsPricePerCustomer} onCheckedChange={toggle("IsPricePerCustomer")} />
        <ToggleRow id="IsDiscountByProduct" label={t("pages.setting.order.useDefaultDiscountPerProduct")} checked={form.IsDiscountByProduct} onCheckedChange={toggle("IsDiscountByProduct")} />
      </SettingCard>
      </div>

      {/* Group 3: Máy in */}
      <SettingCard title={t("pages.setting.order.printerConfigTitle")} icon={<Printer className="h-4 w-4 text-primary" />}>
        <NumberRow id="PrintCount" label={t("pages.setting.order.defaultPrintCount")} value={form.PrintCount} onChange={setNum("PrintCount")} min={0} max={100} suffix={t("pages.setting.order.timesSuffix")} />
        <ToggleRow id="IsPrintProvisionalInvoice" label={t("pages.setting.order.previewBeforePrint")} description={t("pages.setting.order.previewBeforePrintDescription")} checked={form.IsPrintProvisionalInvoice} onCheckedChange={toggle("IsPrintProvisionalInvoice")} />
        <div className="border-t pt-3 space-y-3">
          <TextRow
            id="PrinterUrl"
            label={t("pages.setting.order.localPrinterPath")}
            description={t("pages.setting.order.printerPathExample")}
            value={form.PrinterUrl ?? ""}
            onChange={setStr("PrinterUrl")}
            placeholder={t("pages.setting.order.printerPathPlaceholder")}
          />
          <TextRow
            id="BillPrinterName"
            label={t("pages.setting.order.billPrinterSystemName")}
            value={form.BillPrinterName ?? ""}
            onChange={setStr("BillPrinterName")}
            placeholder={t("pages.setting.order.printerNamePlaceholder")}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {t("pages.setting.order.download")}
            </Button>
            <Button type="button" size="sm" variant="secondary" className="gap-1.5" onClick={handleCheckPrinter}>
              <Check className="h-3.5 w-3.5" />
              {t("pages.setting.order.checkPrinter")}
            </Button>
          </div>
        </div>
      </SettingCard>

      <PrinterPickerDialog
        open={printerPickerOpen}
        onOpenChange={setPrinterPickerOpen}
        printerUrl={form.PrinterUrl}
        onSelect={setStr("BillPrinterName")}
      />

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
