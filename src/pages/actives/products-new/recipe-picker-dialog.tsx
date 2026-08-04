import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLazyFilterActiveProductsQuery } from '@/store/slice/users/api/api'
import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { getImageUrl } from '@/utils/common'

/**
 * "Thêm định lượng" picker — mirrors Angular's recipe-picker-dialog exactly:
 * the product search is NOT pre-filtered to IsRecipe products (Angular's own
 * `[IsRecipe]="true"` input on view-product-search is dead code, never wired
 * to a query param) — every product is searchable, and only picking one
 * without IsRecipe is rejected, with a toast, at add-time.
 */
export function RecipePickerDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (products: TPosActiveProduct[]) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<TPosActiveProduct[]>([])
  const [search, { data, isFetching }] = useLazyFilterActiveProductsQuery()

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setSelected([])
    search({ PageIndex: 0, PageSize: 30 })
  }, [open, search])

  const runSearch = (v: string) => {
    setKeyword(v)
    search({ PageIndex: 0, PageSize: 30, Keyword: v || undefined })
  }

  const pick = (product: TPosActiveProduct) => {
    if (!product.IsRecipe) {
      toast.error('Chỉ được chọn mặt hàng có Định lượng (IsRecipe)')
      return
    }
    if (selected.some(p => p.Id === product.Id)) return
    setSelected(prev => [...prev, product])
  }

  const removeSelected = (index: number) => {
    setSelected(prev => prev.filter((_, i) => i !== index))
  }

  const confirm = () => {
    if (!selected.length) {
      toast.error('Vui lòng chọn mặt hàng')
      return
    }
    onConfirm(selected)
  }

  const items = data?.Items ?? []

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex h-[80vh] max-h-[80vh] min-h-[560px] w-full max-w-4xl flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={confirm}>Lưu</Button>
            <Button size="sm" variant="outline" onClick={onClose}>Đóng</Button>
          </div>
          <span className="text-sm text-muted-foreground">Đã chọn: {selected.length}</span>
        </div>

        <div className="border-b bg-muted/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Danh sách tạm</div>
          {selected.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa chọn mặt hàng nào</div>
          ) : (
            <div className="max-h-28 space-y-1 overflow-auto">
              {selected.map((item, i) => (
                <div key={item.Id ?? i} className="flex items-center justify-between rounded border bg-background px-2 py-1 text-sm">
                  <span className="truncate pr-2">{item.Name || '-'}</span>
                  <button type="button" className="text-destructive hover:text-destructive/80" onClick={() => removeSelected(i)}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
          <Input value={keyword} onChange={e => runSearch(e.target.value)} placeholder="Tìm mặt hàng..." />
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
            {isFetching ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Không tìm thấy mặt hàng</div>
            ) : (
              <div className="divide-y">
                {items.map(item => {
                  const isSelected = selected.some(p => p.Id === item.Id)
                  const image = getImageUrl(item.Images?.[0]?.Url || item.Image?.Url)
                  return (
                    <button
                      key={item.Id}
                      type="button"
                      onClick={() => pick(item)}
                      className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">{item.Name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.ProductCode || item.Code || '-'} · {item.Unit?.Name || '-'}
                          {!item.IsRecipe && <span className="ml-1 text-amber-600 dark:text-amber-400">(không phải mặt hàng định lượng)</span>}
                        </div>
                      </div>
                      {isSelected && <span className="shrink-0 text-xs font-semibold text-primary">Đã chọn</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
