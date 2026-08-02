import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils'

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'km', label: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === (i18n.resolvedLanguage ?? i18n.language)) ?? LANGUAGES[0]

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg text-foreground hover:bg-accent transition-colors"
        title={current.label}
        aria-label={t('common.switchLanguage')}
      >
        <span>{current.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border bg-popover text-popover-foreground shadow-xl shadow-slate-900/10 py-1 overflow-hidden">
            {LANGUAGES.map(lang => {
              const active = (i18n.resolvedLanguage ?? i18n.language) === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                    active ? 'font-semibold bg-primary/10 text-primary hover:bg-primary/15' : 'text-foreground hover:bg-accent',
                  )}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
