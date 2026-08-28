import { useAppSelector } from '@/store/hooks'
import { cn } from '@/utils'
import { getImageUrl } from '@/utils/common'
import { ImageIcon, User } from 'lucide-react'
import { useEffect, useState } from 'react'
interface PosImageProps {
  url?: string | null
  alt?: string
  className?: string
  variant?: 'image' | 'avatar'
  fallbackIcon?: React.ReactNode
}

type CachedImage = {
  src?: string
  promise?: Promise<string>
  error?: boolean
}

const authImageCache = new Map<string, CachedImage>()

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
    const cacheKey = `${token}:${fullSrc}`
    const cached = authImageCache.get(cacheKey)

    if (cached?.src) {
      setBlobSrc(cached.src)
      return
    }

    if (cached?.error) {
      setError(true)
      return
    }

    const promise = cached?.promise ?? fetch(fullSrc, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!response.ok) throw new Error('Image request failed')
        return response.blob()
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        authImageCache.set(cacheKey, { src: objectUrl })
        return objectUrl
      })
      .catch(() => {
        authImageCache.set(cacheKey, { error: true })
        throw new Error('Image request failed')
      })

    if (!cached?.promise) {
      authImageCache.set(cacheKey, { promise })
    }

    promise
      .then(src => {
        if (!cancelled) setBlobSrc(src)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
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
