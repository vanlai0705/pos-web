import { PanelLeft, LayoutPanelTop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppState } from '@/context/app-provider'

export function LayoutToggle() {
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
            aria-label="Đổi kiểu layout"
          >
            {isSidebar ? (
              <LayoutPanelTop className="size-[1.2rem]" />
            ) : (
              <PanelLeft className="size-[1.2rem]" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isSidebar ? 'Chuyển sang menu header' : 'Chuyển sang menu sidebar'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
