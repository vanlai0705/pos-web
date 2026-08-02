import React from 'react'
import { cn } from '@/utils'
// Separator removed per design: no vertical divider in header
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppState } from '@/context/app-provider'
import { useIsMobile } from '@/hooks/use-mobile'

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export const Header = ({
  className,
  fixed,
  children,
  ...props
}: HeaderProps) => {
  const [offset, setOffset] = React.useState(0)
  const { isMobileMenuOpen, setMobileMenuOpen } = useAppState()
  const isMobile = useIsMobile()

  React.useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'flex min-h-14 items-center gap-3 text-white px-4 sm:gap-4',
        fixed && 'header-fixed peer/header fixed z-50 w-[inherit] rounded-md',
        offset > 10 && fixed ? 'shadow-lg' : 'shadow-none',
        className
      )}
      style={{ background: 'linear-gradient(to right, hsl(var(--primary) / 0.85), hsl(var(--primary)), hsl(var(--primary) / 0.85))' }}
      {...props}
    >
      {isMobile && (
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      {children}
    </header>
  )
}

Header.displayName = 'Header'
