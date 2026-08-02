import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { navItems, NavItem } from '@/constants/data'
import { posMenuToNavItems } from '@/utils/pos-menu-converter'

/**
 * Trả về NavItem[] để render sidebar/header-nav.
 * Ưu tiên menu từ API (store), fallback về navItems static.
 * Dashboard luôn được thêm vào đầu.
 */
export function useNavItems(): NavItem[] {
  const auth = useAppSelector(selectAuth)
  const posMenu = auth.menu ?? []

  return useMemo(() => {
    if (posMenu.length === 0) return navItems

    const dashboard: NavItem = {
      title: 'Tổng quan',
      href: '/dashboard',
      icon: 'dashboard',
    }

    return [dashboard, ...posMenuToNavItems(posMenu)]
  }, [posMenu])
}
