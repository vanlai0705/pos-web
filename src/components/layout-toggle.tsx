import { PanelLeft, LayoutPanelTop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppState } from '@/context/app-provider'

export function LayoutToggle() {
  const { t } = useTranslation()
  const { layoutMode, setLayoutMode } = useAppState()

  const isSidebar = layoutMode === 'sidebar'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="scale-95 rounded-full"
            onClick={() => setLayoutMode(isSidebar ? 'header' : 'sidebar')}
            aria-label={t('components.layoutToggle.toggleLayout')}
          >
            {isSidebar ? (
              <LayoutPanelTop className="size-[1.2rem]" />
            ) : (
              <PanelLeft className="size-[1.2rem]" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isSidebar
            ? t('components.layoutToggle.switchToHeaderMenu')
            : t('components.layoutToggle.switchToSidebarMenu')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
