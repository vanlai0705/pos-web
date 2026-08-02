import { useState } from "react"
import { Settings, Monitor, Moon, Sun, Sidebar, PanelTop, Check, Pipette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/utils"
import { TColorTheme, TLayoutMode, TTheme, useAppState } from "@/context/app-provider"

// ─── Color swatches ────────────────────────────────────────────────────────────
const COLOR_PRESETS: {
  value: TColorTheme
  label: string
  bg: string
  darkBg: string
}[] = [
  { value: "default", label: "Mặc định", bg: "bg-slate-800", darkBg: "dark:bg-slate-200" },
  { value: "blue",    label: "Xanh dương", bg: "bg-blue-500",   darkBg: "dark:bg-blue-400" },
  { value: "green",   label: "Xanh lá",  bg: "bg-emerald-500", darkBg: "dark:bg-emerald-400" },
  { value: "purple",  label: "Tím",       bg: "bg-violet-500",  darkBg: "dark:bg-violet-400" },
  { value: "orange",  label: "Cam",       bg: "bg-orange-500",  darkBg: "dark:bg-orange-400" },
  { value: "rose",    label: "Hồng",      bg: "bg-rose-500",    darkBg: "dark:bg-rose-400" },
  { value: "cyan",    label: "Xanh ngọc", bg: "bg-cyan-500",    darkBg: "dark:bg-cyan-400" },
]

// ─── Theme options ─────────────────────────────────────────────────────────────
const THEME_OPTIONS: { value: TTheme; label: string; icon: typeof Sun }[] = [
  { value: "light",  label: "Sáng",   icon: Sun },
  { value: "dark",   label: "Tối",    icon: Moon },
  { value: "system", label: "Hệ thống", icon: Monitor },
]

// ─── Layout options ────────────────────────────────────────────────────────────
const LAYOUT_OPTIONS: { value: TLayoutMode; label: string; icon: typeof Sidebar }[] = [
  { value: "sidebar", label: "Sidebar",   icon: Sidebar },
  { value: "header",  label: "Header",    icon: PanelTop },
]

export function LayoutSettings() {
  const {
    theme, setTheme,
    colorTheme, setColorTheme,
    customAccentHex, setCustomAccentHex,
    layoutMode, setLayoutMode,
  } = useAppState()
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Tuỳ chỉnh giao diện"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-72">
        <SheetHeader className="mb-4">
          <SheetTitle>Tuỳ chỉnh giao diện</SheetTitle>
        </SheetHeader>

        {/* ── Theme (dark/light/system) ── */}
        <section className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chế độ
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs transition-colors hover:bg-accent",
                  theme === value && "border-primary bg-accent text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>

        <Separator className="my-4" />

        {/* ── Màu sắc ── */}
        <section className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Màu chủ đạo
          </p>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_PRESETS.map(({ value, label, bg, darkBg }) => (
              <button
                key={value}
                title={label}
                onClick={() => setColorTheme(value)}
                className={cn(
                  "relative flex h-9 w-full items-center justify-center rounded-lg border-2 transition-all",
                  colorTheme === value ? "border-foreground scale-105" : "border-transparent",
                  bg, darkBg,
                )}
              >
                {colorTheme === value && (
                  <Check className="h-3.5 w-3.5 text-white drop-shadow" />
                )}
              </button>
            ))}

            {/* Custom color picker */}
            <label
              title="Màu tuỳ chỉnh"
              className={cn(
                "relative flex h-9 w-full cursor-pointer items-center justify-center rounded-lg border-2 transition-all overflow-hidden",
                colorTheme === "custom" ? "border-foreground scale-105" : "border-dashed border-muted-foreground/40",
              )}
              style={colorTheme === "custom" ? { backgroundColor: customAccentHex } : undefined}
            >
              {colorTheme !== "custom" && (
                <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {colorTheme === "custom" && (
                <Check className="h-3.5 w-3.5 text-white drop-shadow" />
              )}
              <input
                type="color"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={customAccentHex}
                onChange={(e) => setCustomAccentHex(e.target.value)}
              />
            </label>
          </div>
        </section>

        <Separator className="my-4" />

        {/* ── Layout mode ── */}
        <section className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Kiểu bố cục
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setLayoutMode(value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs transition-colors hover:bg-accent",
                  layoutMode === value && "border-primary bg-accent text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </section>
      </SheetContent>
    </Sheet>
  )
}
