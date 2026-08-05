import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import { navItems, NavItem } from '@/constants/data'
import { translateNavItems } from '@/i18n/nav-title-map'
import { posMenuToNavItems } from '@/utils/pos-menu-converter'

/**
 * Trả về NavItem[] để render sidebar/header-nav.
 * Ưu tiên menu từ API (store), fallback về navItems static.
 * Dashboard luôn được thêm vào đầu.
 */
export function useNavItems(): NavItem[] {
  const auth = useAppSelector(selectAuth)
  const posMenu = auth.menu ?? []
  const { t, i18n } = useTranslation()

  return useMemo(() => {
    if (posMenu.length === 0) return translateNavItems(navItems, t)

    const dashboard: NavItem = {
      title: t('menu.dashboard'),
      href: '/dashboard',
      icon: 'dashboard',
    }

    // The API's menu (posMenu) carries raw Vietnamese Name/ShortName fields —
    // route them through the same title→i18n-key lookup as the static
    // fallback below, otherwise every header/sidebar item stays untranslated
    // regardless of the selected language.
    return [dashboard, ...translateNavItems(posMenuToNavItems(posMenu), t)]
  }, [posMenu, t, i18n.resolvedLanguage])
}
