import { Outlet } from "react-router-dom"
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"
import { Check, Settings, Menu, Globe, SunMoon, Palette, Search, LayoutGrid } from "lucide-react"
import Sidebar from './sidebar'
import { ProfileDropdown } from '../profile-dropdown'
import { ThemeSwitch } from '../theme-switch'
import { ThemeCustomizer } from '../theme-customizer'
import { HeaderNav } from './header-nav'
import { ShopSwitcher } from './shop-switcher'
import { NotificationBell } from './notification-bell'
import { useAppState } from '@/context/app-provider'
import type { TLayoutMode } from '@/context/app-provider'
import { useLazyGetMenuQuery } from "@/store/slice/users/api/api"
import { setMenu } from "@/store/slice/users/app"
import { useSearch } from "@/context/search-context"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"
import { withDomainPath } from "@/utils/domain-route"

const HEADER_GRADIENT = 'linear-gradient(to right, hsl(var(--primary) / 0.85), hsl(var(--primary)), hsl(var(--primary) / 0.85))'

const SETTINGS_LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'km', label: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const

function CompanyLogo() {
  return (
    <a href={withDomainPath('/dashboard')} className="flex flex-none items-center gap-2 mr-1 hover:opacity-80 transition-opacity">
      <img src="/logo.png" alt="POS Mobile" className="h-8 w-8 rounded-full object-contain bg-white/10 p-0.5" />
    </a>
  )
}

// ─── Layout thumbnails ────────────────────────────────────────────────────────

function LayoutThumb({ type }: { type: string }) {
  return (
    <div className="w-10 h-7 rounded border border-current/20 overflow-hidden bg-current/5">
      {type === 'sidebar' && (
        <div className="flex h-full">
          <div className="w-3 bg-current/50 shrink-0" />
          <div className="flex-1 p-0.5 flex flex-col gap-0.5 pt-1">
            <div className="h-0.5 bg-current/30 rounded-full" />
            <div className="h-0.5 bg-current/20 rounded-full w-3/4" />
            <div className="h-0.5 bg-current/20 rounded-full w-1/2" />
          </div>
        </div>
      )}
      {type === 'compact' && (
        <div className="flex h-full">
          <div className="w-1.5 bg-current/50 shrink-0" />
          <div className="flex-1 p-0.5 flex flex-col gap-0.5 pt-1">
            <div className="h-0.5 bg-current/30 rounded-full" />
            <div className="h-0.5 bg-current/20 rounded-full w-3/4" />
            <div className="h-0.5 bg-current/20 rounded-full w-1/2" />
          </div>
        </div>
      )}
      {type === 'header' && (
        <div className="flex flex-col h-full">
          <div className="h-2.5 bg-current/50 shrink-0" />
          <div className="flex-1 p-0.5 flex flex-col gap-0.5 pt-0.5">
            <div className="h-0.5 bg-current/30 rounded-full" />
            <div className="h-0.5 bg-current/20 rounded-full w-3/4" />
          </div>
        </div>
      )}
      {type === 'floating' && (
        <div className="flex flex-col h-full">
          <div className="h-2 bg-current/40 shrink-0 flex items-center gap-0.5 px-0.5">
            <div className="flex flex-col gap-0.5">
              <div className="w-1.5 h-[1px] bg-current/70 rounded-full" />
              <div className="w-1.5 h-[1px] bg-current/70 rounded-full" />
              <div className="w-1.5 h-[1px] bg-current/70 rounded-full" />
            </div>
          </div>
          <div className="flex-1 p-0.5 flex flex-col gap-0.5 pt-0.5">
            <div className="h-0.5 bg-current/20 rounded-full" />
            <div className="h-0.5 bg-current/20 rounded-full w-3/4" />
            <div className="h-0.5 bg-current/20 rounded-full w-1/2" />
          </div>
        </div>
      )}
    </div>
  )
}

const LAYOUT_OPTIONS: { key: TLayoutMode; label: string; desc: string }[] = [
  { key: 'sidebar',  label: 'Sidebar',   desc: 'Menu dọc trái' },
  { key: 'compact',  label: 'Compact',   desc: 'Icon thu gọn'  },
  { key: 'header',   label: 'Header',    desc: 'Menu trên'     },
  { key: 'floating', label: 'Floating',  desc: 'Sidebar nổi'   },
]

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel() {
  const [open, setOpen] = useState(false)
  const { setOpen: openSearch } = useSearch()
  const { layoutMode, setLayoutMode } = useAppState()
  const { t, i18n } = useTranslation()
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language).split('-')[0]

  function Row({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {label}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="scale-95 rounded-full text-white hover:bg-white/10"
        onClick={() => setOpen(v => !v)}
        title={t('nav.settings')}
      >
        <Settings className="size-[1.2rem]" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border bg-popover text-popover-foreground shadow-xl overflow-hidden">

            {/* Search */}
            <Row icon={Search} label={t('common.search')}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs rounded-lg"
                onClick={() => { openSearch(true); setOpen(false) }}
              >
                {t('common.open')}
              </Button>
            </Row>

            <div className="border-t mx-0" />

            {/* Language */}
            <div className="px-3 py-2.5">
              <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-foreground">
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {t('language.label')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {SETTINGS_LANGUAGES.map(language => {
                  const active = currentLanguage === language.code

                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => i18n.changeLanguage(language.code)}
                      className={`flex h-9 items-center gap-2 rounded-lg border px-2.5 text-left text-xs font-semibold transition-colors ${
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-foreground hover:bg-accent'
                      }`}
                    >
                      <span className="text-base leading-none">{language.flag}</span>
                      <span className="min-w-0 flex-1 truncate">{language.label}</span>
                      {active && <Check className="h-3.5 w-3.5 flex-none" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border-t mx-0" />

            {/* Theme */}
            <Row icon={SunMoon} label={t('common.theme')}>
              <ThemeSwitch />
            </Row>

            <div className="border-t mx-0" />

            {/* Color */}
            <Row icon={Palette} label={t('common.color')}>
              <ThemeCustomizer />
            </Row>

            <div className="border-t mx-0" />

            {/* Layout */}
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-2.5">
                <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {t('common.layout')}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {LAYOUT_OPTIONS.map(({ key, label, desc }) => (
                  <button
                    key={key}
                    onClick={() => { setLayoutMode(key); setOpen(false) }}
                    title={desc}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all ${
                      layoutMode === key
                        ? 'border-primary text-primary bg-primary/8'
                        : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                    }`}
                  >
                    <LayoutThumb type={key} />
                    <span className="text-[9px] font-semibold leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

function RightActions() {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <NotificationBell />
      <SettingsPanel />
      <ProfileDropdown />
    </div>
  )
}

// ─── App layout ───────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { layoutMode, setMobileMenuOpen } = useAppState()
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [fetchMenu] = useLazyGetMenuQuery()

  useEffect(() => {
    fetchMenu().then(({ data }) => {
      if (data) dispatch(setMenu(data))
    })
  }, [])

  // ── Header nav mode ──────────────────────────────────────────────────
  if (layoutMode === 'header') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <header
          className="sticky top-0 z-50 flex min-h-14 items-center gap-3 text-white px-4 shadow-sm rounded-b-xl"
          style={{ background: HEADER_GRADIENT }}
        >
          <CompanyLogo />
          <ShopSwitcher />
          <div className="min-w-0 flex-1">
            <HeaderNav />
          </div>
          <div className="flex-none shrink-0">
            <RightActions />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 relative">
          <Outlet />
        </main>
      </div>
    )
  }

  // ── Floating mode: no persistent sidebar, hamburger opens Sheet ──────
  if (layoutMode === 'floating') {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <header
          className="relative z-40 flex-none flex min-h-14 items-center gap-2 text-white px-4 shadow-sm rounded-b-xl"
          style={{ background: HEADER_GRADIENT }}
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex-none h-8 w-8 flex items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/25 transition-colors text-white"
            aria-label={t('common.toggleMenu')}
          >
            <Menu className="h-4 w-4" />
          </button>
          <ShopSwitcher />
          <div className="flex-1" />
          <RightActions />
        </header>
        <main className="flex-1 overflow-y-auto p-4 relative">
          <Outlet />
        </main>
        {/* Sidebar renders as Sheet overlay regardless of screen size */}
        <Sidebar forceSheet />
      </div>
    )
  }

  // ── Sidebar mode (default) + Compact mode ────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar forceCollapsed={layoutMode === 'compact'} />
      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="relative z-40 flex-none flex min-h-14 items-center gap-3 text-white px-4 shadow-sm rounded-b-xl"
          style={{ background: HEADER_GRADIENT }}
        >
          <ShopSwitcher />
          <div className="ml-auto">
            <RightActions />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
