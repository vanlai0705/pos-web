import { useEffect, useState } from 'react'
import { ImageIcon, User } from 'lucide-react'
import { getImageUrl } from '@/utils/common'
import { cn } from '@/utils'
import { useAppSelector } from '@/store/hooks'

interface PosImageProps {
  url?: string | null
  alt?: string
  className?: string
  variant?: 'image' | 'avatar'
  fallbackIcon?: React.ReactNode
}

function needsAuth(url?: string) {
  return !!url && url.includes('images/get-image-file')
}

export function PosImage({ url, alt = '', className, variant = 'image', fallbackIcon }: PosImageProps) {
  const token = useAppSelector(state => state.user.auth?.data?.SessionToken)
  const [error, setError] = useState(false)
  const [blobSrc, setBlobSrc] = useState<string | null>(null)
  const fullSrc = getImageUrl(url ?? undefined)

  useEffect(() => {
    setError(false)
  }, [url])

  useEffect(() => {
    setBlobSrc(null)
    if (!fullSrc || !needsAuth(fullSrc) || !token) return

    let cancelled = false
    let objectUrl: string | null = null

    fetch(fullSrc, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!response.ok) throw new Error('Image request failed')
        return response.blob()
      })
      .then(blob => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobSrc(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fullSrc, token])

  const src = needsAuth(fullSrc) ? blobSrc : fullSrc

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
