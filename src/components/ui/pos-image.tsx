import { useState } from 'react'
import { ImageIcon, User } from 'lucide-react'
import { getImageUrl } from '@/utils/common'
import { cn } from '@/utils'

interface PosImageProps {
  url?: string | null
  alt?: string
  className?: string
  variant?: 'image' | 'avatar'
  fallbackIcon?: React.ReactNode
}

export function PosImage({ url, alt = '', className, variant = 'image', fallbackIcon }: PosImageProps) {
  const [error, setError] = useState(false)
  const src = getImageUrl(url ?? undefined)

  if (!src || error) {
    const DefaultIcon = variant === 'avatar' ? User : ImageIcon
    return (
      <div className={cn('flex items-center justify-center bg-muted text-muted-foreground rounded', className)}>
        {fallbackIcon ?? <DefaultIcon className="size-[40%] min-w-3" />}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn('object-cover', className)}
      onError={() => setError(true)}
    />
  )
}
