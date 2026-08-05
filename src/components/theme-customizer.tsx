import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Palette } from 'lucide-react'
import { cn } from '@/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAppState, TColorTheme } from '@/context/app-provider'

type ColorPreset = {
  name: TColorTheme
  labelKey: string | null
  label: string
  color: string   // màu hiển thị swatch (CSS color)
}

const PRESETS: ColorPreset[] = [
  { name: 'default', labelKey: 'components.themeCustomizer.presetDefault', label: 'Mặc định', color: 'hsl(220.9 39.3% 11%)' },
  { name: 'blue',    labelKey: null, label: 'Blue',     color: 'hsl(221.2 83.2% 53.3%)' },
  { name: 'green',   labelKey: null, label: 'Green',    color: 'hsl(142.1 76.2% 36.3%)' },
  { name: 'purple',  labelKey: null, label: 'Purple',   color: 'hsl(262.1 83.3% 57.8%)' },
  { name: 'orange',  labelKey: null, label: 'Orange',   color: 'hsl(24.6 95% 53.1%)' },
  { name: 'rose',    labelKey: null, label: 'Rose',     color: 'hsl(346.8 77.2% 49.8%)' },
  { name: 'cyan',    labelKey: null, label: 'Cyan',     color: 'hsl(187 100% 42%)' },
]

export function ThemeCustomizer() {
  const { t } = useTranslation()
  const { colorTheme, setColorTheme, customAccentHex, setCustomAccentHex } = useAppState()
  const colorInputRef = useRef<HTMLInputElement>(null)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="scale-95 rounded-full" title={t('components.themeCustomizer.customizeColorTitle')}>
          <Palette className="size-[1.2rem]" />
          <span className="sr-only">{t('components.themeCustomizer.customizeColorTitle')}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">{t('components.themeCustomizer.themeColorHeading')}</p>

        {/* Preset swatches */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              title={preset.labelKey ? t(preset.labelKey) : preset.label}
              onClick={() => setColorTheme(preset.name)}
              className={cn(
                'relative flex h-8 w-full items-center justify-center rounded-md border-2 transition-all',
                colorTheme === preset.name
                  ? 'border-foreground scale-110 shadow-md'
                  : 'border-transparent hover:border-muted-foreground'
              )}
              style={{ backgroundColor: preset.color }}
            >
              {colorTheme === preset.name && (
                <span className="text-white text-xs font-bold drop-shadow">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Labels */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map((preset) => (
            <span key={preset.name} className="text-center text-[10px] text-muted-foreground truncate">
              {preset.labelKey ? t(preset.labelKey) : preset.label}
            </span>
          ))}
        </div>

        {/* Custom color picker */}
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t('components.themeCustomizer.customColorHeading')}</p>
          <div className="flex items-center gap-2">
            {/* Hidden native color input */}
            <input
              ref={colorInputRef}
              type="color"
              className="sr-only"
              value={customAccentHex}
              onChange={(e) => setCustomAccentHex(e.target.value)}
            />
            <button
              onClick={() => colorInputRef.current?.click()}
              className={cn(
                'h-8 w-8 flex-none rounded-md border-2 transition-all',
                colorTheme === 'custom'
                  ? 'border-foreground scale-110 shadow-md'
                  : 'border-transparent hover:border-muted-foreground'
              )}
              style={{ backgroundColor: customAccentHex }}
              title={t('components.themeCustomizer.selectCustomColorTitle')}
            />
            <span className="text-xs text-muted-foreground font-mono">
              {colorTheme === 'custom' ? customAccentHex : t('components.themeCustomizer.clickToSelectHint')}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
