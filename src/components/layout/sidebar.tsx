import { cn } from '@/utils';
import { ChevronLeft } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard-nav';
import { useAppState } from '@/context/app-provider';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavItems } from '@/hooks/useNavItems';
import { withDomainPath } from '@/utils/domain-route';

const SIDEBAR_GRADIENT = 'linear-gradient(to right, hsl(var(--primary) / 0.85), hsl(var(--primary)), hsl(var(--primary) / 0.85))'

type SidebarProps = {
  className?: string
  forceCollapsed?: boolean
  forceSheet?: boolean
}

export default function Sidebar({ className, forceCollapsed = false, forceSheet = false }: SidebarProps) {
  const { isOpenMenu, setOpenMenu, isMobileMenuOpen, setMobileMenuOpen } = useAppState()
  const isMobile = useIsMobile()
  const navItems = useNavItems()

  const collapsed = forceCollapsed || isOpenMenu

  const handleToggle = () => {
    if (!forceCollapsed) setOpenMenu(!isOpenMenu)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div
        className="flex-none flex items-center justify-between px-4 h-14 text-white"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <a href={withDomainPath('/dashboard')} className="flex items-center gap-2 text-white hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="POS Mobile" className="h-8 w-8 rounded-full object-contain bg-white/10 p-0.5 flex-none" />
          {!collapsed && <span className="font-semibold text-sm truncate">POS Mobile</span>}
        </a>

        {!isMobile && !forceCollapsed && !forceSheet && (
          <button
            onClick={handleToggle}
            className="flex-none h-7 w-7 flex items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/25 transition-colors text-white"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 bg-card">
        <div className="px-2 py-1">
          <DashboardNav
            isOpenMenu={collapsed}
            items={navItems}
            isMobileNav={isMobile || forceSheet}
            setOpen={setMobileMenuOpen}
          />
        </div>
      </div>
    </div>
  )

  if (isMobile || forceSheet) {
    return (
      <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <aside className="relative h-full flex-none border-r">
            {sidebarContent}
          </aside>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'relative hidden h-screen flex-none border-r transition-[width] duration-500 md:block',
        !collapsed ? 'w-56' : 'w-[76px]',
        className
      )}
    >
      {sidebarContent}
    </aside>
  )
}
