import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useAppState } from '@/context/app-provider'
import { useNavItems } from '@/hooks/useNavItems'
import { useSearch } from '@/context/search-context'
import { navigateTo } from '@/utils/navigation-services'
import {
  IconArrowRightDashed,
  IconDeviceLaptop,
  IconMoon,
  IconSun,
} from '@tabler/icons-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const { setTheme } = useAppState()
  const { open, setOpen } = useSearch()
  const navItems = useNavItems()
  const { t } = useTranslation()

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('components.commandMenu.placeholder')} />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pr-1'>
          <CommandEmpty>{t('components.commandMenu.noResults')}</CommandEmpty>
          <CommandGroup>
            {navItems.map((navItem, i) => {
              if (navItem.href)
                return (
                  <CommandItem
                    key={`${navItem.href}-${i}`}
                    value={navItem.title}
                    onSelect={() => {
                      runCommand(() => navigateTo(navItem.href as string))
                    }}
                  >
                    <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                      <IconArrowRightDashed className='size-2 text-muted-foreground/80' />
                    </div>
                    {navItem.title}
                  </CommandItem>
                )

              return navItem.children?.map((subItem: any, i) => (
                <CommandItem
                  key={`${subItem.href}-${i}`}
                  value={subItem.title}
                  onSelect={() => {
                    runCommand(() => navigateTo(subItem.href as string))
                  }}
                >
                  <div className='mr-2 flex h-4 w-4 items-center justify-center'>
                    <IconArrowRightDashed className='size-2 text-muted-foreground/80' />
                  </div>
                  {subItem.title}
                </CommandItem>
              ))
            })}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t('common.theme')}>
            <CommandItem
              value={t('components.commandMenu.themeLight')}
              onSelect={() => runCommand(() => setTheme('light'))}
            >
              <IconSun /> <span>{t('components.commandMenu.themeLight')}</span>
            </CommandItem>
            <CommandItem
              value={t('components.commandMenu.themeDark')}
              onSelect={() => runCommand(() => setTheme('dark'))}
            >
              <IconMoon className='scale-90' />
              <span>{t('components.commandMenu.themeDark')}</span>
            </CommandItem>
            <CommandItem
              value={t('components.commandMenu.themeSystem')}
              onSelect={() => runCommand(() => setTheme('system'))}
            >
              <IconDeviceLaptop />
              <span>{t('components.commandMenu.themeSystem')}</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
