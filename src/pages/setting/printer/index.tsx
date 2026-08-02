import { useEffect, useState, useCallback } from "react"
import { Printer, RefreshCw, Cpu } from "lucide-react"
import {
  useGetSettingPrinterQuery,
  useUpdateSettingPrinterMutation,
} from "@/store/slice/users/api/api"
import type { TPosSettingPrinter, TPosInvoicePrinter, TPosKitchenPrinter } from "@/store/slice/users/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { PageHeader, SettingCard, SaveBar } from "../components"

// ─── GUID utils ───────────────────────────────────────────────────────────────

const GUID_KEY = "pos_device_guid"

function generateGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function getOrCreateGuid() {
  let g = localStorage.getItem(GUID_KEY)
  if (!g) { g = generateGuid(); localStorage.setItem(GUID_KEY, g) }
  return g
}

// ─── Printer row ─────────────────────────────────────────────────────────────

interface PrinterRowProps {
  label: string
  value: TPosInvoicePrinter | TPosKitchenPrinter
  onChange: (v: TPosInvoicePrinter | TPosKitchenPrinter) => void
}

function PrinterRow({ label, value, onChange }: PrinterRowProps) {
  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: key === "PrinterPort" ? Number(e.target.value) : e.target.value })

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">In tem</span>
          <Switch
            checked={value.IsPrintLabel ?? false}
            onCheckedChange={v => onChange({ ...value, IsPrintLabel: v })}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 sm:col-span-1 space-y-1">
          <Label className="text-xs">Tên máy in</Label>
          <Input
            value={value.PrinterName ?? ""}
            onChange={set("PrinterName")}
            placeholder="PrinterName"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">IP máy in</Label>
          <Input
            value={value.PrinterIp ?? ""}
            onChange={set("PrinterIp")}
            placeholder="192.168.1.x"
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cổng</Label>
          <Input
            type="number"
            value={value.PrinterPort ?? ""}
            onChange={set("PrinterPort")}
            placeholder="9100"
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Mode labels ─────────────────────────────────────────────────────────────

const INVOICE_MODE_OPTIONS = [
  { value: 0, label: "Không sử dụng theo khu vực" },
  { value: 1, label: "Chỉ in hoá đơn theo khu vực" },
  { value: 2, label: "In một liên tại quầy và một liên theo khu vực" },
  { value: 3, label: "In tạm tính theo khu vực và in hoá đơn tại quầy" },
]

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm: TPosSettingPrinter = {
  EnableKitchenPrintByArea: false,
  InvoicePrintByAreaMode: 0,
  KitchenPrinters: [],
  InvoicePrinters: [],
  BillPrinter: {},
  TempBillPrinter: {},
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingPrinterPage() {
  const [guid] = useState(() => getOrCreateGuid())
  const [activeTab, setActiveTab] = useState<"kitchen" | "invoice">("invoice")

  const { data, isLoading } = useGetSettingPrinterQuery({ guid })
  const [update, { isLoading: saving }] = useUpdateSettingPrinterMutation()
  const [form, setForm] = useState<TPosSettingPrinter>(defaultForm)

  useEffect(() => {
    if (data) setForm({ ...defaultForm, ...data })
  }, [data])

  const resetGuid = useCallback(() => {
    const newGuid = generateGuid()
    localStorage.setItem(GUID_KEY, newGuid)
    window.location.reload()
  }, [])

  const handleSave = async () => {
    try {
      await update({ guid, data: form }).unwrap()
      toast.success("Lưu thành công", { description: "Cài đặt máy in đã được cập nhật." })
    } catch {
      toast.error("Lỗi", { description: "Không thể lưu cài đặt." })
    }
  }

  // Helpers
  const updateKitchen = (i: number) => (v: TPosKitchenPrinter | TPosInvoicePrinter) =>
    setForm(f => {
      const arr = [...(f.KitchenPrinters ?? [])]
      arr[i] = v as TPosKitchenPrinter
      return { ...f, KitchenPrinters: arr }
    })

  const updateInvoice = (i: number) => (v: TPosInvoicePrinter | TPosKitchenPrinter) =>
    setForm(f => {
      const arr = [...(f.InvoicePrinters ?? [])]
      arr[i] = v as TPosInvoicePrinter
      return { ...f, InvoicePrinters: arr }
    })

  if (isLoading) return <Skeleton className="h-96 w-full" />

  const kitchenPrinters = form.KitchenPrinters ?? []
  const invoicePrinters = form.InvoicePrinters ?? []
  const showAreaMode = form.InvoicePrintByAreaMode !== 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cài đặt máy in"
        description="Cấu hình máy in hoá đơn và máy in bếp theo từng thiết bị"
        icon={<Printer className="h-5 w-5" />}
      />

      {/* Device info */}
      <SettingCard title="Thông tin thiết bị" icon={<Cpu className="h-4 w-4 text-primary" />}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">GUID thiết bị</p>
            <p className="text-xs font-mono text-foreground mt-0.5 truncate">{guid}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mỗi máy tính/thiết bị có một GUID riêng để cấu hình máy in độc lập.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={resetGuid} className="flex-none gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Reset GUID
          </Button>
        </div>
      </SettingCard>

      {/* In bếp theo khu vực */}
      <SettingCard title="Cấu hình in bếp" icon={<Printer className="h-4 w-4 text-primary" />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">In chế biến theo khu vực</p>
            <p className="text-xs text-muted-foreground mt-0.5">Phân chia máy in bếp theo khu vực phục vụ</p>
          </div>
          <Switch
            checked={form.EnableKitchenPrintByArea}
            onCheckedChange={v => setForm(f => ({ ...f, EnableKitchenPrintByArea: v }))}
          />
        </div>
      </SettingCard>

      {/* In hóa đơn theo khu vực */}
      <SettingCard title="Cấu hình in hoá đơn" icon={<Printer className="h-4 w-4 text-primary" />}>
        <div className="space-y-1.5">
          <Label htmlFor="InvoicePrintByAreaMode">In hoá đơn theo khu vực</Label>
          <select
            id="InvoicePrintByAreaMode"
            value={form.InvoicePrintByAreaMode}
            onChange={e => setForm(f => ({ ...f, InvoicePrintByAreaMode: Number(e.target.value) }))}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {INVOICE_MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </SettingCard>

      {/* Tabs */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        {(["invoice", "kitchen"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab === "invoice" ? "Máy in hoá đơn" : "Máy in bếp"}
          </button>
        ))}
      </div>

      {/* Invoice printers tab */}
      {activeTab === "invoice" && (
        <SettingCard title="Máy in hoá đơn" icon={<Printer className="h-4 w-4 text-primary" />}>
          {!showAreaMode ? (
            // Mode 0: fixed BillPrinter + TempBillPrinter
            <div className="space-y-3">
              <PrinterRow
                label="Máy in hoá đơn"
                value={form.BillPrinter ?? {}}
                onChange={v => setForm(f => ({ ...f, BillPrinter: v as TPosInvoicePrinter }))}
              />
              <PrinterRow
                label="Máy in yêu cầu thanh toán (tạm tính)"
                value={form.TempBillPrinter ?? {}}
                onChange={v => setForm(f => ({ ...f, TempBillPrinter: v as TPosInvoicePrinter }))}
              />
            </div>
          ) : (
            // Mode 1/2/3: per-area invoice printers
            <div className="space-y-3">
              {invoicePrinters.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có máy in theo khu vực. Thiết lập khu vực trong menu Quản lý để tự động tạo.
                </p>
              )}
              {invoicePrinters.map((p, i) => (
                <div key={i}>
                  {p.Area && (
                    <Badge variant="outline" className="mb-1.5 text-xs">{p.Area.Name}</Badge>
                  )}
                  <PrinterRow
                    label={p.Area?.Name ?? `Khu vực ${i + 1}`}
                    value={p}
                    onChange={updateInvoice(i)}
                  />
                </div>
              ))}
            </div>
          )}
        </SettingCard>
      )}

      {/* Kitchen printers tab */}
      {activeTab === "kitchen" && (
        <SettingCard title="Máy in bếp / chế biến" icon={<Printer className="h-4 w-4 text-primary" />}>
          {kitchenPrinters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có cấu hình máy in bếp. Thiết lập nhóm sản phẩm và khu vực để tự động tạo.
            </p>
          ) : (
            <div className="space-y-3">
              {kitchenPrinters.map((p, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {p.Area && <Badge variant="outline" className="text-xs">{p.Area.Name}</Badge>}
                    {p.ProductGroup && <Badge variant="secondary" className="text-xs">{p.ProductGroup.Name}</Badge>}
                  </div>
                  <PrinterRow
                    label={[p.Area?.Name, p.ProductGroup?.Name].filter(Boolean).join(" — ") || `Máy in ${i + 1}`}
                    value={p}
                    onChange={updateKitchen(i)}
                  />
                </div>
              ))}
            </div>
          )}
        </SettingCard>
      )}

      <SaveBar onSave={handleSave} loading={saving} />
    </div>
  )
}
