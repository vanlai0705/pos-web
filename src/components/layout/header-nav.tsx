import { useRef, useState, useLayoutEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { NavItem, TNavChildren } from '@/constants/data'
import { useNavItems } from '@/hooks/useNavItems'
import { Icons } from '@/components/icons'
import { cn } from '@/utils'
import { isRouteActive, withDomainPath } from '@/utils/domain-route'
import { ChevronDown, ChevronRight, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTranslation } from 'react-i18next'

// ─── Recursive dropdown child (supports sub-menus) ───────────────────────────

function DropdownChildItem({ child, onClose }: { child: TNavChildren; onClose: () => void }) {
  const [subOpen, setSubOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const ChildIcon = child.icon
    ? (Icons[child.icon as keyof typeof Icons] ?? Icons.arrowRight)
    : Icons.arrowRight
  const hasChildren = (child.children?.length ?? 0) > 0
  const isActive = isRouteActive(location.pathname, child.href)

  if (hasChildren) {
    return (
      <div
        className="relative px-1"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        <div className={cn(
          'flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-default select-none hover:bg-accent transition-colors',
          isActive && 'bg-accent/70 font-medium',
        )}>
          <ChildIcon className="size-4 flex-none text-muted-foreground" />
          <span className="flex-1 truncate">{child.title}</span>
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </div>
        {subOpen && (
          <div className="absolute top-0 left-full ml-1 z-50">
            <div className="min-w-[200px] rounded-md border bg-popover text-popover-foreground shadow-lg py-1">
              {child.children!.map(sub => (
                <DropdownChildItem key={sub.title} child={sub} onClose={onClose} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="px-1">
      <button
        onClick={() => { child.href && navigate(withDomainPath(child.href)); onClose() }}
        className={cn(
          'flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm text-left hover:bg-accent transition-colors',
          isActive && 'bg-accent/70 font-medium',
        )}
      >
        <ChildIcon className="size-4 flex-none text-muted-foreground" />
        <span className="truncate">{child.title}</span>
      </button>
    </div>
  )
}

// ─── Hover dropdown item (with children) ─────────────────────────────────────
// Dùng onMouseEnter/Leave thay vì CSS group-hover để tránh lỗi pointer-events
// clipping khi mouse di chuyển từ button xuống panel (khoảng gap pt-1).

function NavDropdownItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const [open, setOpen] = useState(false)
  const Icon = Icons[item.icon as keyof typeof Icons] ?? Icons.arrowRight

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={cn(
          'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none',
          isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
        )}
      >
        <Icon className="size-4 flex-none" />
        <span>{item.title}</span>
        <ChevronDown className={cn('size-3 opacity-60 transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 pt-1">
          <div className="min-w-[200px] rounded-md border bg-popover text-popover-foreground shadow-lg py-1">
            {(item.children ?? []).map(child => (
              <DropdownChildItem
                key={child.title}
                child={child}
                onClose={() => setOpen(false)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Simple nav button (no children) ─────────────────────────────────────────

function NavLinkItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const navigate = useNavigate()
  const Icon = Icons[item.icon as keyof typeof Icons] ?? Icons.arrowRight

  return (
    <button
      disabled={!item.href || item.disabled}
      onClick={() => item.href && navigate(withDomainPath(item.href))}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white',
        (!item.href || item.disabled) && 'cursor-not-allowed opacity-40',
      )}
    >
      <Icon className="size-4 flex-none" />
      <span>{item.title}</span>
    </button>
  )
}

function NavItemRenderer({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (item.children?.length ?? 0) > 0
    ? <NavDropdownItem item={item} isActive={isActive} />
    : <NavLinkItem item={item} isActive={isActive} />
}

// ─── Overflow "More" dropdown ─────────────────────────────────────────────────

function MoreMenu({ items }: { items: NavItem[] }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white whitespace-nowrap transition-colors outline-none">
        <MoreHorizontal className="size-4" />
        <span className="text-xs">{t('common.more')}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px] max-h-[70vh] overflow-y-auto">
        {items.map(item => {
          const Icon = Icons[item.icon as keyof typeof Icons] ?? Icons.arrowRight
          const children = item.children ?? []

          if (children.length > 0) {
            return (
              <div key={item.title}>
                <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold text-muted-foreground pb-0">
                  <Icon className="size-3.5" /> {item.title}
                </DropdownMenuLabel>
                {children.map(child => {
                  const ChildIcon = child.icon
                    ? (Icons[child.icon as keyof typeof Icons] ?? Icons.arrowRight)
                    : Icons.arrowRight
                  const childActive = isRouteActive(location.pathname, child.href)

                  // Sub-folder: render grandchildren inline with extra indent
                  if ((child.children?.length ?? 0) > 0) {
                    return (
                      <div key={child.title}>
                        <DropdownMenuLabel className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground pl-5 pb-0 pt-1">
                          <ChildIcon className="size-3" /> {child.title}
                        </DropdownMenuLabel>
                        {child.children!.map(sub => {
                          const SubIcon = sub.icon
                            ? (Icons[sub.icon as keyof typeof Icons] ?? Icons.arrowRight)
                            : Icons.arrowRight
                          const subActive = isRouteActive(location.pathname, sub.href)
                          return (
                            <DropdownMenuItem
                              key={sub.title}
                              onClick={() => sub.href && navigate(withDomainPath(sub.href))}
                              className={cn('pl-8 gap-2', subActive && 'bg-accent font-medium')}
                            >
                              <SubIcon className="size-3.5 text-muted-foreground" />
                              {sub.title}
                            </DropdownMenuItem>
                          )
                        })}
                      </div>
                    )
                  }

                  return (
                    <DropdownMenuItem
                      key={child.title}
                      onClick={() => child.href && navigate(withDomainPath(child.href))}
                      className={cn('pl-5 gap-2', childActive && 'bg-accent font-medium')}
                    >
                      <ChildIcon className="size-4 text-muted-foreground" />
                      {child.title}
                    </DropdownMenuItem>
                  )
                })}
                <DropdownMenuSeparator />
              </div>
            )
          }

          const isActive =
            isRouteActive(location.pathname, item.href)
          return (
            <DropdownMenuItem
              key={item.title}
              onClick={() => item.href && navigate(withDomainPath(item.href))}
              className={cn('gap-2', isActive && 'bg-accent font-medium')}
            >
              <Icon className="size-4 text-muted-foreground" />
              {item.title}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main HeaderNav with overflow detection ───────────────────────────────────

const MORE_BTN_WIDTH = 96 // px reserved for "More ▾" button
const ITEM_GAP = 2        // gap between items in px

export function HeaderNav() {
  const location = useLocation()
  const navItems = useNavItems()
  const filtered = navItems.filter(n => !n.isTitle)

  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(filtered.length)

  useLayoutEffect(() => {
    const container = containerRef.current
    const ruler = measureRef.current
    if (!container || !ruler) return

    const calc = () => {
      const available = container.clientWidth
      const children = Array.from(ruler.children) as HTMLElement[]
      const widths = children.map(el => el.offsetWidth + ITEM_GAP)

      let used = 0
      let count = 0
      for (let i = 0; i < widths.length; i++) {
        const isLast = i === widths.length - 1
        const reserve = isLast ? 0 : MORE_BTN_WIDTH
        if (used + widths[i] + reserve > available) break
        used += widths[i]
        count = i + 1
      }
      setVisibleCount(count)
    }

    const ro = new ResizeObserver(calc)
    ro.observe(container)
    calc()
    return () => ro.disconnect()
  }, [filtered.length])

  const overflow = filtered.slice(visibleCount)

  const isItemActive = (item: NavItem) => {
    const children = item.children ?? []
    if (item.href) {
      return isRouteActive(location.pathname, item.href)
    }
    return children.some(
      c => isRouteActive(location.pathname, c.href)
    )
  }

  return (
    <>
      {/* Off-screen measurement ruler */}
      <div
        ref={measureRef}
        className="absolute -top-[200px] left-0 flex items-center pointer-events-none opacity-0 select-none"
        aria-hidden
      >
        {filtered.map(item => {
          const Icon = Icons[item.icon as keyof typeof Icons] ?? Icons.arrowRight
          return (
            <div
              key={item.title}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap"
              style={{ marginRight: ITEM_GAP }}
            >
              <Icon className="size-4 flex-none" />
              <span>{item.title}</span>
              {(item.children?.length ?? 0) > 0 && <ChevronDown className="size-3" />}
            </div>
          )
        })}
      </div>

      {/* Visible nav — NO overflow:hidden so dropdown panels are not clipped */}
      <div ref={containerRef} className="flex items-center min-w-0 flex-1" style={{ gap: ITEM_GAP }}>
        {filtered.map((item, i) => (
          <div key={item.title} className={i >= visibleCount ? 'hidden' : undefined}>
            <NavItemRenderer item={item} isActive={isItemActive(item)} />
          </div>
        ))}
        {overflow.length > 0 && <MoreMenu items={overflow} />}
      </div>
    </>
  )
}
