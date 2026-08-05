import { useEffect, useRef, useState } from "react"
import { Check, List, Play, RefreshCw } from "lucide-react"
import {
  useGetAreasQuery,
  useGetProductGroupsQuery,
  useGetSettingOrderQuery,
  useGetSettingPrinterQuery,
  useUpdateSettingPrinterMutation,
} from "@/store/slice/users/api/api"
import type { TPosArea, TPosInvoicePrinter, TPosKitchenPrinter, TPosProductGroup, TPosSettingPrinter } from "@/store/slice/users/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/utils"
import { printData } from "@/utils/print-service"
import { PrinterPickerDialog } from "./printer-picker-dialog"

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

// ─── Kitchen printer grid helpers (mirrors Angular's build*/clone helpers) ─────

function cloneKitchenPrinters(items: TPosKitchenPrinter[]): TPosKitchenPrinter[] {
  return items.map(item => ({ ...item, Area: item.Area ? { ...item.Area } : undefined, ProductGroup: item.ProductGroup ? { ...item.ProductGroup } : undefined }))
}

function buildKitchenPrintersGrid(areas: TPosArea[], groups: TPosProductGroup[], existing: TPosKitchenPrinter[]): TPosKitchenPrinter[] {
  const map = new Map<string, TPosKitchenPrinter>()
  existing.forEach(item => map.set(`${item.Area?.Id ?? 0}_${item.ProductGroup?.Id ?? 0}`, item))

  const result: TPosKitchenPrinter[] = []
  areas.forEach(area => {
    groups.forEach(group => {
      const cur = map.get(`${area.Id}_${group.Id}`)
      result.push({
        IsPrintLabel: cur?.IsPrintLabel ?? false,
        Area: { Id: area.Id, Name: area.Name },
        ProductGroup: { Id: group.Id, Name: group.Name },
        PrinterIp: cur?.PrinterIp ?? "",
        PrinterPort: cur?.PrinterPort ?? 0,
        PrinterName: cur?.PrinterName ?? "",
      })
    })
  })
  return result
}

function buildKitchenPrintersByGroups(groups: TPosProductGroup[]): TPosKitchenPrinter[] {
  return groups.map(group => ({
    IsPrintLabel: false,
    Area: undefined,
    ProductGroup: { Id: group.Id, Name: group.Name },
    PrinterIp: "",
    PrinterPort: 0,
    PrinterName: "",
  }))
}

// ─── Mode options ───────────────────────────────────────────────────────────────

const INVOICE_MODE_OPTIONS = [
  { value: 0, label: "Không sử dụng" },
  { value: 1, label: "Chỉ in hoá đơn theo khu vực" },
  { value: 2, label: "In một liên tại quầy và một liên theo khu vực" },
  { value: 3, label: "In tạm tính theo khu vực và in hoá đơn tại quầy" },
]

const defaultForm: TPosSettingPrinter = {
  EnableKitchenPrintByArea: false,
  InvoicePrintByAreaMode: 0,
  KitchenPrinters: [],
  InvoicePrinters: [],
  BillPrinter: {},
  TempBillPrinter: {},
}

// ─── Printer table row ──────────────────────────────────────────────────────────

interface PrinterTableRowProps {
  index?: number
  /** Rendered verbatim — callers resolve their own empty-state fallback text
   * ("Chưa gán khu vực" vs "Chưa gán loại đồ") since it differs by column. */
  areaLabel?: string
  groupLabel?: string
  value: TPosKitchenPrinter | TPosInvoicePrinter
  onChange: (v: TPosKitchenPrinter | TPosInvoicePrinter) => void
  onPick: () => void
}

function PrinterTableRow({ index, areaLabel, groupLabel, value, onChange, onPick }: PrinterTableRowProps) {
  const set = (key: "PrinterName" | "PrinterIp" | "PrinterPort") => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [key]: key === "PrinterPort" ? Number(e.target.value) : e.target.value })

  const handleTest = () => {
    if (!value.PrinterIp || !value.PrinterPort) { toast.warning("Vui lòng nhập IP và PORT máy in"); return }
    if (!value.PrinterName) { toast.warning("Vui lòng chọn tên máy in"); return }
    printData(`http://${value.PrinterIp}:${value.PrinterPort}`, "setting/print-test", value.PrinterName, {})
  }

  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/30">
      {index != null && (
        <td className="px-2 py-2 text-center">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index}</span>
        </td>
      )}
      {areaLabel != null && <td className="px-2 py-2 text-sm">{areaLabel}</td>}
      {groupLabel != null && <td className="px-2 py-2 text-sm">{groupLabel}</td>}
      <td className="px-2 py-2">
        <input value={value.PrinterName ?? ""} onChange={set("PrinterName")} placeholder="Nhập tên máy in"
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </td>
      <td className="px-2 py-2">
        <input value={value.PrinterIp ?? ""} onChange={set("PrinterIp")} placeholder="VD: 192.168.1.10"
          className="w-36 rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </td>
      <td className="px-2 py-2">
        <input type="number" value={value.PrinterPort ?? ""} onChange={set("PrinterPort")} placeholder="9100"
          className="w-20 rounded-md border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </td>
      <td className="px-2 py-2 text-center">
        <button type="button" onClick={() => onChange({ ...value, IsPrintLabel: !value.IsPrintLabel })}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
            value.IsPrintLabel ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground/40",
          )}>
          <Check className="h-4 w-4" />
        </button>
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col items-stretch gap-1">
          <Button type="button" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onPick}>
            <List className="h-3.5 w-3.5" /> Kiểm tra
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-7 gap-1 px-2 text-xs" onClick={handleTest}>
            <Play className="h-3.5 w-3.5" /> Test
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingPrinterPage() {
  const [guid] = useState(() => getOrCreateGuid())
  const [activeTab, setActiveTab] = useState<"kitchen" | "invoice">("kitchen")
  const [picker, setPicker] = useState<{ onSelect: (name: string) => void } | null>(null)

  const { data, isLoading } = useGetSettingPrinterQuery({ guid })
  const { data: settingOrder } = useGetSettingOrderQuery()
  const { data: areas = [] } = useGetAreasQuery()
  const { data: productGroups = [] } = useGetProductGroupsQuery()
  const [update, { isLoading: saving }] = useUpdateSettingPrinterMutation()
  const [form, setForm] = useState<TPosSettingPrinter>(defaultForm)

  const kitchenBeforeAreaMode = useRef<TPosKitchenPrinter[]>([])

  useEffect(() => {
    if (data) setForm({ ...defaultForm, ...data })
  }, [data])

  // Reconciles the area×group grid against the current master data every
  // time settings or master data (re)load — mirrors Angular's
  // ensureKitchenPrintersByAreaMode, which runs unconditionally (not just
  // when the grid is empty) so a newly added/removed area or product group
  // is reflected on the very next load, not only after re-toggling the
  // checkbox by hand.
  useEffect(() => {
    if (!data || !areas.length || !productGroups.length) return
    setForm(f => {
      if (!f.EnableKitchenPrintByArea) return f
      return { ...f, KitchenPrinters: buildKitchenPrintersGrid(areas, productGroups, f.KitchenPrinters) }
    })
  }, [data, areas, productGroups])

  const resetGuid = () => {
    const newGuid = generateGuid()
    localStorage.setItem(GUID_KEY, newGuid)
    window.location.reload()
  }

  const handleSave = async () => {
    try {
      await update({ guid, data: form }).unwrap()
      toast.success("Cài đặt máy in đã được lưu")
    } catch {
      toast.error("Không thể lưu cài đặt máy in")
    }
  }

  const toggleKitchenByArea = (enabled: boolean) => {
    // Matches Angular: flip the flag but don't touch KitchenPrinters until
    // areas/productGroups have loaded — the reconcile effect above builds
    // the grid as soon as they arrive.
    if (!areas.length || !productGroups.length) {
      toast.warning("Đang tải khu vực và nhóm sản phẩm, vui lòng thử lại")
      setForm(f => ({ ...f, EnableKitchenPrintByArea: enabled }))
      return
    }
    if (enabled) {
      kitchenBeforeAreaMode.current = cloneKitchenPrinters(form.KitchenPrinters)
      setForm(f => ({ ...f, EnableKitchenPrintByArea: true, KitchenPrinters: buildKitchenPrintersGrid(areas, productGroups, []) }))
      return
    }
    const restored = kitchenBeforeAreaMode.current.length
      ? cloneKitchenPrinters(kitchenBeforeAreaMode.current)
      : buildKitchenPrintersByGroups(productGroups)
    setForm(f => ({ ...f, EnableKitchenPrintByArea: false, KitchenPrinters: restored }))
  }

  const updateKitchen = (i: number) => (v: TPosKitchenPrinter) =>
    setForm(f => { const arr = [...f.KitchenPrinters]; arr[i] = v; return { ...f, KitchenPrinters: arr } })

  const updateInvoiceArea = (i: number) => (v: TPosInvoicePrinter) =>
    setForm(f => { const arr = [...f.InvoicePrinters]; arr[i] = v; return { ...f, InvoicePrinters: arr } })

  const openPicker = (onSelect: (name: string) => void) => {
    if (!settingOrder?.PrinterUrl) {
      toast.warning("Vui lòng nhập đường dẫn máy in ở cài đặt đơn hàng")
      return
    }
    setPicker({ onSelect })
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />

  const showAreaMode = form.InvoicePrintByAreaMode !== 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Cài đặt máy in</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý máy in chế biến và máy in hóa đơn theo khu vực</p>
      </div>

      {/* Option panel + device GUID */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input type="checkbox" checked={form.EnableKitchenPrintByArea}
              onChange={e => toggleKitchenByArea(e.target.checked)}
              className="h-4 w-4 rounded border-input" />
            In chế biến theo khu vực
          </label>
          <div className="flex items-center gap-2">
            <label htmlFor="InvoicePrintByAreaMode" className="text-sm font-medium whitespace-nowrap">In hóa đơn theo khu vực</label>
            <select
              id="InvoicePrintByAreaMode"
              value={form.InvoicePrintByAreaMode}
              onChange={e => setForm(f => ({ ...f, InvoicePrintByAreaMode: Number(e.target.value) }))}
              className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {INVOICE_MODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={resetGuid} className="flex-none gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Reset GUID
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border overflow-hidden w-fit">
        {(["kitchen", "invoice"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {tab === "kitchen" ? "Máy in chế biến" : "Máy in hóa đơn"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground">
              {activeTab === "kitchen" ? (
                <tr>
                  <th className="px-2 py-2 text-center w-12">#</th>
                  {form.EnableKitchenPrintByArea && <th className="px-2 py-2">Khu vực</th>}
                  <th className="px-2 py-2">Loại đồ</th>
                  <th className="px-2 py-2">Máy in</th>
                  <th className="px-2 py-2 w-36">IP</th>
                  <th className="px-2 py-2 w-20">PORT</th>
                  <th className="px-2 py-2 text-center w-16">In tem</th>
                  <th className="px-2 py-2 w-24">Kiểm tra máy in</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-2 py-2">{showAreaMode ? "Khu vực" : "Loại máy in"}</th>
                  <th className="px-2 py-2">Máy in</th>
                  <th className="px-2 py-2 w-36">IP</th>
                  <th className="px-2 py-2 w-20">PORT</th>
                  <th className="px-2 py-2 text-center w-16">In tem</th>
                  <th className="px-2 py-2 w-24">Kiểm tra</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === "kitchen" && (
                form.KitchenPrinters.length === 0 ? (
                  <tr><td colSpan={form.EnableKitchenPrintByArea ? 8 : 7} className="px-2 py-8 text-center text-sm text-muted-foreground italic">Không có dữ liệu</td></tr>
                ) : form.KitchenPrinters.map((item, i) => (
                  <PrinterTableRow
                    key={i}
                    index={i + 1}
                    areaLabel={form.EnableKitchenPrintByArea ? (item.Area?.Name || "Chưa gán khu vực") : undefined}
                    groupLabel={item.ProductGroup?.Name || "Chưa gán loại đồ"}
                    value={item}
                    onChange={updateKitchen(i)}
                    onPick={() => openPicker(name => updateKitchen(i)({ ...item, PrinterName: name }))}
                  />
                ))
              )}

              {activeTab === "invoice" && !showAreaMode && (
                <>
                  <PrinterTableRow
                    groupLabel="Máy in hoá đơn (sử dụng máy in mặc định nếu để trống)"
                    value={form.BillPrinter ?? {}}
                    onChange={v => setForm(f => ({ ...f, BillPrinter: v as TPosInvoicePrinter }))}
                    onPick={() => openPicker(name => setForm(f => ({ ...f, BillPrinter: { ...(f.BillPrinter ?? {}), PrinterName: name } })))}
                  />
                  <PrinterTableRow
                    groupLabel="Máy in yêu cầu thanh toán (sử dụng máy in mặc định nếu để trống)"
                    value={form.TempBillPrinter ?? {}}
                    onChange={v => setForm(f => ({ ...f, TempBillPrinter: v as TPosInvoicePrinter }))}
                    onPick={() => openPicker(name => setForm(f => ({ ...f, TempBillPrinter: { ...(f.TempBillPrinter ?? {}), PrinterName: name } })))}
                  />
                </>
              )}

              {activeTab === "invoice" && showAreaMode && (
                form.InvoicePrinters.length === 0 ? (
                  <tr><td colSpan={6} className="px-2 py-8 text-center text-sm text-muted-foreground italic">Không có dữ liệu</td></tr>
                ) : form.InvoicePrinters.map((item, i) => (
                  <PrinterTableRow
                    key={i}
                    areaLabel={item.Area?.Name || "Chưa gán khu vực"}
                    value={item}
                    onChange={updateInvoiceArea(i)}
                    onPick={() => openPicker(name => updateInvoiceArea(i)({ ...item, PrinterName: name }))}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">Cập nhật</Button>
      </div>

      {picker && (
        <PrinterPickerDialog
          open
          onOpenChange={open => { if (!open) setPicker(null) }}
          printerUrl={settingOrder?.PrinterUrl}
          onSelect={name => picker.onSelect(name)}
        />
      )}
    </div>
  )
}
