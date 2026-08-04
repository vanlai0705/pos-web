import { useRef } from 'react'
import { Camera, ImageIcon, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/utils'
import { getImageUrl } from '@/utils/common'

const MAX_SIZE_MB = 3
const MAX_SLOTS = 6

export interface ImageSlot {
  Id: number
  Url: string
  /** Newly picked, not-yet-uploaded file — takes priority over Url for preview. */
  File?: File
}

function emptySlot(): ImageSlot {
  return { Id: 0, Url: '' }
}

/** Always keeps exactly one trailing empty "add" tile, up to MAX_SLOTS. */
function withTrailingEmpty(images: ImageSlot[]): ImageSlot[] {
  if (images.length >= MAX_SLOTS) return images
  const last = images[images.length - 1]
  if (!last || last.Id !== 0 || last.Url !== '' || last.File) {
    return [...images, emptySlot()]
  }
  return images
}

/**
 * Grid of up to 6 square image tiles — matches Angular's view-image-uploads:
 * picking a file fills a slot and a fresh empty tile appears until the cap.
 */
export function ProductImageUploads({ images, onChange }: { images: ImageSlot[]; onChange: (images: ImageSlot[]) => void }) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const handlePick = (index: number) => {
    inputRefs.current[index]?.click()
  }

  const handleFile = (index: number, file: File | null) => {
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Kích thước file tối đa ${MAX_SIZE_MB}Mb`)
      return
    }
    const next = [...images]
    next[index] = { Id: 0, Url: '', File: file }
    onChange(withTrailingEmpty(next))
  }

  const handleRemove = (index: number) => {
    const next = images.filter((_, i) => i !== index)
    onChange(withTrailingEmpty(next))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image, index) => {
        const preview = image.File ? URL.createObjectURL(image.File) : (image.Url ? getImageUrl(image.Url) : null)
        const filled = !!(image.Url || image.File)
        return (
          <div key={index} className="group relative h-[100px] w-[100px] shrink-0">
            <button
              type="button"
              onClick={() => handlePick(index)}
              className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/40 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
            >
              {preview ? (
                <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-primary shadow-sm">
                    <ImageIcon className="h-4 w-4" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest">Chọn ảnh</span>
                </div>
              )}
              {filled && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-[10px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-3 w-3" /> Thay đổi
                </div>
              )}
              <input
                ref={el => { inputRefs.current[index] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { handleFile(index, e.target.files?.[0] || null); e.target.value = '' }}
              />
            </button>
            {filled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className={cn(
                  'absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background text-destructive shadow-md transition-transform hover:scale-110',
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { emptySlot, withTrailingEmpty }
