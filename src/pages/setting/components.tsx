import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save } from "lucide-react"
import { ReactNode } from "react"
import { useTranslation } from "react-i18next"

// ── Card section ─────────────────────────────────────────────────────────────

interface SettingCardProps {
  title: string
  icon?: ReactNode
  children: ReactNode
}
export function SettingCard({ title, icon, children }: SettingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

// ── Toggle row ────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
}
export function ToggleRow({ id, label, description, checked, onCheckedChange, disabled }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}

// ── Number input row ──────────────────────────────────────────────────────────

interface NumberRowProps {
  id: string
  label: string
  description?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}
export function NumberRow({ id, label, description, value, onChange, min = 0, max, step = 1, suffix }: NumberRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium leading-none">{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-none">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-20 rounded-md border bg-background px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Text input row ────────────────────────────────────────────────────────────

interface TextRowProps {
  id: string
  label: string
  description?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}
export function TextRow({ id, label, description, value, onChange, placeholder, type = "text" }: TextRowProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}

// ── Select row ────────────────────────────────────────────────────────────────

interface SelectRowProps {
  id: string
  label: string
  description?: string
  value: number | string
  onChange: (v: string) => void
  options: { value: number | string; label: string }[]
}
export function SelectRow({ id, label, description, value, onChange, options }: SelectRowProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Save button ───────────────────────────────────────────────────────────────

interface SaveBarProps {
  onSave: () => void
  loading?: boolean
  label?: string
}
export function SaveBar({ onSave, loading, label }: SaveBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex justify-end pt-2">
      <Button onClick={onSave} disabled={loading} className="gap-2 min-w-[120px]">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label ?? t('pages.setting.saveSettings')}
      </Button>
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  description?: string
  icon?: ReactNode
}
export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-5">
      {icon && (
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-lg font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  )
}
