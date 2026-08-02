import { Icons } from '@/components/icons'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils'
import { navigateTo } from '@/utils/navigation-services'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { NavItem, TNavChildren } from '../constants/data'

interface DashboardNavProps {
  items: NavItem[]
  isMobileNav?: boolean
  setOpen?: (open: boolean) => void
  isOpenMenu?: boolean
}

export function DashboardNav({
  items,
  isMobileNav = false,
  isOpenMenu,
  setOpen
}: DashboardNavProps) {
  const location = useLocation()
  const currentPathname = location.pathname
  const [openItems, setOpenItems] = useState<string[]>([])
  const { user } = useAuth()
  const userRole = user.info?.role || ''

  const toggleItem = (title: string) => {
    setOpenItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  if (!items?.length) return null

  return (
    <nav className="relative grid items-start gap-0.5">
      <TooltipProvider>
        {items.map((item: NavItem, index: number) => {
          // ── Section title ──────────────────────────────────────────────
          if (item.isTitle) {
            if (isOpenMenu && !isMobileNav) return null // hide labels when collapsed
            return (
              <div
                key={`title-${index}`}
                className="px-3 pt-4 pb-1"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {item.title}
                </span>
              </div>
            )
          }

          // ── Role filter ────────────────────────────────────────────────
          if (item.role && item.role.length > 0 && !item.role.includes(userRole)) return null

          const Icon = Icons[item.icon as keyof typeof Icons] ?? Icons.arrowRight
          const isOpen = openItems.includes(item.title)

          const filteredChildren = (item.children || []).filter((child: TNavChildren) => {
            if (!child.role || child.role.length === 0) return true
            return child.role.includes(userRole)
          })

          const isAnyChildActive = filteredChildren.some(c => currentPathname === c.href || currentPathname.startsWith((c.href ?? '') + '/'))
          const isActive = item.href
            ? currentPathname === item.href || currentPathname.startsWith(item.href + '/')
            : isAnyChildActive

          const shouldShowAsButton = !item.children || filteredChildren.length === 0

          // ── Simple nav button ──────────────────────────────────────────
          if (shouldShowAsButton) {
            return (
              <Tooltip key={item.title}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-2 overflow-hidden rounded-md py-2 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      isActive ? 'bg-accent text-accent-foreground' : 'text-foreground/70',
                      (!item.href || item.disabled) && 'cursor-not-allowed opacity-60'
                    )}
                    disabled={!item.href || item.disabled}
                    onClick={() => {
                      if (item.href) {
                        navigateTo(item.href)
                        if (isMobileNav && setOpen) setOpen(false)
                      }
                    }}
                  >
                    <Icon className="ml-3 size-4 flex-none" />
                    {(isMobileNav || (!isOpenMenu && !isMobileNav)) && (
                      <span className="mr-2 truncate">{item.title}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  align="center"
                  side="right"
                  sideOffset={8}
                  className={isOpenMenu ? 'inline-block' : 'hidden'}
                >
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          }

          // ── Collapsible group ──────────────────────────────────────────
          return (
            <Collapsible
              key={item.title}
              open={isOpen || (isAnyChildActive && !openItems.includes(`__closed_${item.title}`))}
              onOpenChange={(open) => {
                if (!open) {
                  setOpenItems(prev => [...prev.filter(i => i !== item.title), `__closed_${item.title}`])
                } else {
                  setOpenItems(prev => [...prev.filter(i => i !== `__closed_${item.title}`), item.title])
                }
              }}
            >
              <CollapsibleTrigger asChild>
                <button className={cn(
                  'flex w-full items-center gap-2 overflow-hidden rounded-md py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive ? 'text-accent-foreground' : 'text-foreground/70'
                )}>
                  <Icon className="ml-3 size-4 flex-none" />
                  {(isMobileNav || (!isOpenMenu && !isMobileNav)) && (
                    <>
                      <span className="mr-2 truncate flex-1 text-left">{item.title}</span>
                      <ChevronDown className={cn(
                        'mr-2 size-3.5 transition-transform text-muted-foreground',
                        (isOpen || isAnyChildActive) && 'rotate-180'
                      )} />
                    </>
                  )}
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent className={cn(
                isOpenMenu && !isMobileNav
                  ? 'ml-3 mt-1 w-10 rounded-md bg-popover p-1 shadow-sm'
                  : 'ml-3 border-l border-border/50 pl-2 mt-0.5'
              )}>
                {filteredChildren.map((child: TNavChildren, i: number) => {
                  const ChildIcon = child.icon
                    ? (Icons[child.icon as keyof typeof Icons] ?? Icons.arrowRight)
                    : Icons.arrowRight
                  const childActive =
                    currentPathname === child.href ||
                    currentPathname.startsWith((child.href ?? '') + '/')

                  if (isOpenMenu && !isMobileNav) {
                    return (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => { if (child.href) navigateTo(child.href) }}
                            className={cn(
                              'w-9 h-9 flex items-center justify-center rounded-md transition-colors',
                              'hover:bg-accent',
                              childActive && 'bg-accent text-accent-foreground'
                            )}
                          >
                            <ChildIcon className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center">{child.title}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (child.href) {
                          navigateTo(child.href)
                          if (isMobileNav && setOpen) setOpen(false)
                        }
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md py-1.5 px-2 text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        childActive
                          ? 'bg-accent/60 text-accent-foreground font-medium'
                          : 'text-foreground/60'
                      )}
                    >
                      <ChildIcon className="size-3.5 flex-none" />
                      <span className="truncate">{child.title}</span>
                    </button>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </TooltipProvider>
    </nav>
  )
}
