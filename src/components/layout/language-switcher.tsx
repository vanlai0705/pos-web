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
  const { i18n } = useTranslation()
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-lg hover:bg-white/10 transition-colors"
        title={current.label}
        aria-label="Switch language"
      >
        <span>{current.flag}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 py-1 overflow-hidden">
            {LANGUAGES.map(lang => {
              const active = (i18n.resolvedLanguage ?? i18n.language) === lang.code
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                    active ? 'font-semibold bg-blue-50/60 hover:bg-blue-100/60' : 'hover:bg-slate-50',
                  )}
                  // Use inline style to override [&_button]:text-white from parent RightActions
                  style={{ color: active ? '#2563eb' : '#374151' }}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                  {active && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
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
