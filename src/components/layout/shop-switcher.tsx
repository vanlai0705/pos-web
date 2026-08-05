import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Store, ChevronDown, Check, Loader2 } from 'lucide-react'
import { getImageUrl } from '@/utils/common'

function ShopAvatar({ imageUrl, name, size = 'sm' }: { imageUrl?: string | null; name?: string; size?: 'sm' | 'md' }) {
  const [imgError, setImgError] = useState(false)
  const dim = size === 'md' ? 'w-8 h-8' : 'w-5 h-5'
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${dim} rounded-full object-cover bg-white/10 flex-none`}
        onError={() => setImgError(true)}
      />
    )
  }
  return <Store className={`${size === 'md' ? 'size-5' : 'size-4'} flex-none opacity-80`} />
}
import { cn } from '@/utils'
import {
  useGetUserShopSettingQuery,
  useSelectShopMutation,
} from '@/store/slice/users/api/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export function ShopSwitcher() {
  const { t } = useTranslation()
  const { data: shopSetting, refetch } = useGetUserShopSettingQuery()
  const [selectShop, { isLoading }] = useSelectShopMutation()
  const [open, setOpen] = useState(false)

  const shops = shopSetting?.Shops ?? []
  const currentShopId = shopSetting?.SelectedShopId ?? shops[0]?.Id
  const currentShop = shops.find(s => s.Id === currentShopId) ?? shops[0]

  if (!currentShop) return null

  const handleSelect = async (shopId: number) => {
    if (shopId === currentShopId || isLoading) return
    setOpen(false)
    try {
      await selectShop({ shops, shopId }).unwrap()
      await refetch()
      window.location.reload()
    } catch {
      toast.error(t('components.shopSwitcher.switchShopFailed'))
    }
  }

  const shopImageUrl = getImageUrl(currentShop.Image?.Url) ?? null

  // Chỉ 1 shop → hiển thị tên tĩnh
  if (shops.length <= 1) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 text-white/90 text-sm font-medium">
        <ShopAvatar imageUrl={shopImageUrl} name={currentShop.Name} />
        <span className="truncate max-w-[140px]">{currentShop.LongName || currentShop.Name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
          'text-white/90 hover:bg-white/15 hover:text-white transition-colors outline-none',
          'border border-white/20',
        )}
      >
        <ShopAvatar imageUrl={shopImageUrl} name={currentShop.Name} />
        <span className="truncate max-w-[140px]">{currentShop.LongName || currentShop.Name}</span>
        {isLoading
          ? <Loader2 className="size-3 animate-spin opacity-70" />
          : <ChevronDown className="size-3 opacity-60" />
        }
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">{t('components.shopSwitcher.selectShop')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shops.map(shop => {
          const itemImg = getImageUrl(shop.Image?.Url) ?? null
          return (
          <DropdownMenuItem
            key={shop.Id}
            onClick={() => handleSelect(shop.Id)}
            className={cn('gap-2 cursor-pointer', shop.Id === currentShopId && 'font-medium')}
          >
            <ShopAvatar imageUrl={itemImg} name={shop.Name} />
            <div className="flex-1 min-w-0">
              <div className="truncate">{shop.LongName || shop.Name}</div>
              {shop.LongName && shop.Name !== shop.LongName && (
                <div className="text-xs text-muted-foreground truncate">{shop.Name}</div>
              )}
            </div>
            {shop.Id === currentShopId && <Check className="size-4 text-primary flex-none" />}
          </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
