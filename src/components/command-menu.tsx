import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { navItems } from '@/constants/data'
import { useAppState } from '@/context/app-provider'
import { useSearch } from '@/context/search-context'
import { navigateTo } from '@/utils/navigation-services'
import {
  IconArrowRightDashed,
  IconDeviceLaptop,
  IconMoon,
  IconSun,
} from '@tabler/icons-react'
import React from 'react'
import { ScrollArea } from './ui/scroll-area'

export function CommandMenu() {
  const { setTheme } = useAppState()
  const { open, setOpen } = useSearch()

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog modal open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <ScrollArea type='hover' className='h-72 pr-1'>
          <CommandEmpty>No results found.</CommandEmpty>
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
          <CommandGroup heading='Theme'>
            <CommandItem
              value='Light'
              onSelect={() => runCommand(() => setTheme('light'))}
            >
              <IconSun /> <span>Light</span>
            </CommandItem>
            <CommandItem
              value='Dark'
              onSelect={() => runCommand(() => setTheme('dark'))}
            >
              <IconMoon className='scale-90' />
              <span>Dark</span>
            </CommandItem>
            <CommandItem
              value='System'
              onSelect={() => runCommand(() => setTheme('system'))}
            >
              <IconDeviceLaptop />
              <span>System</span>
            </CommandItem>
          </CommandGroup>
        </ScrollArea>
      </CommandList>
    </CommandDialog>
  )
}
