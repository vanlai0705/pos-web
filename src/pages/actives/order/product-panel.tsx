import type { TPosActiveProduct } from '@/store/slice/users/types/pos-types'
import { PosImage } from '@/components/ui/pos-image'
import { Skeleton } from '@/components/ui/skeleton'
import { STATUS } from '@/constants/status'
import { useFilterActiveProductsQuery, useGetActiveProductsSimpleQuery } from '@/store/slice/products/api'
import { useGetProductGroupsSimpleQuery } from '@/store/slice/users'
import { cn, formatNumber } from '@/utils'
import { Eye, EyeOff, LayoutGrid, Package, Search, Table2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type UIEvent } from 'react'
import { useTranslation } from 'react-i18next'

const CARD_COLORS = [
  'from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800',
  'from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800',
  'from-emerald-500/10 to-emerald-600/5 border-emerald-200 dark:border-emerald-800',
  'from-orange-500/10 to-orange-600/5 border-orange-200 dark:border-orange-800',
  'from-pink-500/10 to-pink-600/5 border-pink-200 dark:border-pink-800',
  'from-cyan-500/10 to-cyan-600/5 border-cyan-200 dark:border-cyan-800',
  'from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800',
  'from-rose-500/10 to-rose-600/5 border-rose-200 dark:border-rose-800',
]

const PRODUCT_GRID = 'grid grid-cols-3 lg:grid-cols-4 gap-1.5'
const PRODUCT_PAGE_SIZE = 30

function colorIndex(id?: number, index?: number) {
  return ((id ?? index ?? 0) % CARD_COLORS.length)
}

function isActiveProduct(product: TPosActiveProduct) {
  return product.Status?.Id == null || product.Status.Id === STATUS.ACTIVE
}

function productKey(product: TPosActiveProduct, index: number) {
  return String(product.Id ?? product.Barcode ?? product.ProductCode ?? product.Code ?? index)
}

function uniqueProducts(items: TPosActiveProduct[]) {
  const seen = new Set<string>()
  return items.filter((product, index) => {
    const key = productKey(product, index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

interface ProductPanelProps {
  onAdd: (product: TPosActiveProduct) => void
}

export function ProductPanel({ onAdd }: ProductPanelProps) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [groupId, setGroupId] = useState<number | null>(null)
  const [showCost, setShowCost] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card')
  const [pageIndex, setPageIndex] = useState(0)
  const [products, setProducts] = useState<TPosActiveProduct[]>([])
  const gridRef = useRef<HTMLDivElement>(null)
  const scannerBuffer = useRef('')
  const scannerLastTs = useRef(0)
  const lastHandledScan = useRef<{ value: string; ts: number } | null>(null)
  const appendedPage = useRef(-1)
  const loadingNextPage = useRef(false)

  const { data: groups = [] } = useGetProductGroupsSimpleQuery()
  const { data: simpleProducts = [] } = useGetActiveProductsSimpleQuery()
  const { currentData, isFetching, isLoading } = useFilterActiveProductsQuery({
    PageIndex: pageIndex,
    PageSize: PRODUCT_PAGE_SIZE,
    Keyword: keyword || undefined,
    ProductGroupId: groupId ?? undefined,
    StatusId: STATUS.ACTIVE,
  })
  const activeGroups = groups.filter(group => (group as any).Status?.Id == null || (group as any).Status.Id === STATUS.ACTIVE)

  const resetProductPaging = () => {
    setPageIndex(0)
    setProducts([])
    appendedPage.current = -1
    loadingNextPage.current = false
    gridRef.current?.scrollTo({ top: 0 })
  }

  const changeKeyword = (value: string) => {
    resetProductPaging()
    setKeyword(value)
  }

  const changeGroup = (value: number | null) => {
    if (groupId === value) return
    resetProductPaging()
    setGroupId(value)
  }

  useEffect(() => {
    resetProductPaging()
  }, [keyword, groupId])

  useEffect(() => {
    if (!currentData || appendedPage.current === pageIndex) return
    appendedPage.current = pageIndex
    loadingNextPage.current = false
    const items = (currentData.Items ?? []).filter(isActiveProduct)
    setProducts(prev => pageIndex === 0 ? uniqueProducts(items) : uniqueProducts([...prev, ...items]))
  }, [currentData, pageIndex])

  const total = currentData?.TotalItemCount ?? 0
  const hasMore = products.length < total

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!hasMore || isFetching || loadingNextPage.current) return
    const el = event.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      loadingNextPage.current = true
      setPageIndex(page => page + 1)
    }
  }

  const scanBarcode = useCallback((value: string) => {
    const scanned = value.trim().toLowerCase()
    if (!scanned) return
    const last = lastHandledScan.current
    if (last?.value === scanned && Date.now() - last.ts < 150) return
    lastHandledScan.current = { value: scanned, ts: Date.now() }
    const exactMatch = (product: TPosActiveProduct) => {
      const barcode = String(product.Barcode ?? '').trim().toLowerCase()
      const productCode = String(product.ProductCode ?? '').trim().toLowerCase()
      const code = String(product.Code ?? '').trim().toLowerCase()
      return barcode === scanned || productCode === scanned || code === scanned
    }
    const matched = simpleProducts.filter(isActiveProduct).find(exactMatch) ?? products.find(exactMatch)
    if (!matched) return
    onAdd(matched)
    setKeyword('')
  }, [onAdd, products, simpleProducts])

  useEffect(() => {
    const handleScannerKeydown = (event: KeyboardEvent) => {
      const now = Date.now()
      if (now - scannerLastTs.current > 50) scannerBuffer.current = ''
      scannerLastTs.current = now

      if (event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt' || event.key === 'Meta') return

      if (event.key === 'Enter') {
        const scanned = scannerBuffer.current
        scannerBuffer.current = ''
        if (scanned.length >= 3) scanBarcode(scanned)
        return
      }

      if (event.key.length === 1) scannerBuffer.current += event.key
    }

    window.addEventListener('keydown', handleScannerKeydown)
    return () => window.removeEventListener('keydown', handleScannerKeydown)
  }, [scanBarcode])

  return (
    <div className="h-full flex flex-col min-h-0 rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-3 pt-3 pb-2 shrink-0 space-y-2 border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="flex-1 text-sm font-semibold text-foreground">{t('pages.actives.order.chooseProductHeading')}</span>
          <button
            type="button"
            onClick={() => setViewMode(mode => mode === 'card' ? 'table' : 'card')}
            title={t(viewMode === 'card' ? 'pages.actives.order.switchToTableView' : 'pages.actives.order.switchToCardView')}
            aria-label={t(viewMode === 'card' ? 'pages.actives.order.switchToTableView' : 'pages.actives.order.switchToCardView')}
            aria-pressed={viewMode === 'table'}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors',
              viewMode === 'table'
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {viewMode === 'card' ? <Table2 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setShowCost(value => !value)}
            title={t('pages.actives.order.toggleCostPrice')}
            aria-label={t('pages.actives.order.toggleCostPrice')}
            aria-pressed={showCost}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-lg border transition-colors',
              showCost
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-input text-muted-foreground hover:bg-muted',
            )}
          >
            {showCost ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('pages.actives.order.searchProductPlaceholder')}
            value={keyword}
            onChange={event => changeKeyword(event.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              scanBarcode(event.currentTarget.value)
            }}
            className="w-full h-9 pl-8 pr-8 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground text-foreground"
          />
          {keyword && (
            <button onClick={() => changeKeyword('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => changeGroup(null)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${groupId === null ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
          >
            {t('common.all')}
          </button>
          {activeGroups.map(group => (
            <button
              key={group.Id}
              onClick={() => changeGroup(group.Id ?? null)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${groupId === group.Id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {group.Name}
            </button>
          ))}
        </div>
      </div>

      <div ref={gridRef} onScroll={handleScroll} className={cn('flex-1 overflow-y-auto', viewMode === 'table' ? 'p-0' : 'p-2')}>
        {isLoading && pageIndex === 0 ? (
          viewMode === 'table' ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 12 }).map((_, index) => <Skeleton key={index} className="h-9 rounded-md" />)}
            </div>
          ) : (
            <div className={PRODUCT_GRID}>
              {Array.from({ length: 16 }).map((_, index) => <Skeleton key={index} className="aspect-[5/4] rounded-lg" />)}
            </div>
          )
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Package className="h-8 w-8 opacity-30" />
            <p className="text-sm">{t('pages.actives.order.productsNotFound')}</p>
          </div>
        ) : viewMode === 'table' ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted border-b">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.productName')}</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.barcode')}</th>
                <th className="px-2 py-2 text-left font-semibold text-muted-foreground">{t('common.unit')}</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('common.stock')}</th>
                <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('common.price')}</th>
                {showCost && (
                  <th className="px-2 py-2 text-right font-semibold text-muted-foreground">{t('pages.actives.order.costShort')}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product, index) => {
                const barcode = product.Barcode || product.Code || product.ProductCode || ''
                const cost = product.PriceInput ?? product.ImportPrice
                return (
                  <tr
                    key={product.Id ?? index}
                    onClick={() => onAdd(product)}
                    className="cursor-pointer transition-colors hover:bg-primary/5 active:bg-primary/10"
                  >
                    <td className="px-2 py-2 min-w-0">
                      <div className="font-semibold text-foreground line-clamp-1">{product.Name}</div>
                      {product.ProductGroup?.Name && <div className="text-[10px] text-muted-foreground truncate">{product.ProductGroup.Name}</div>}
                    </td>
                    <td className="px-2 py-2 font-mono text-muted-foreground whitespace-nowrap">{barcode || '—'}</td>
                    <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{product.Unit?.Name || '—'}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={cn(
                        'inline-flex min-w-10 justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                        (product.Quantity ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                      )}>
                        {formatNumber(product.Quantity)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-extrabold text-primary tabular-nums whitespace-nowrap">{formatNumber(product.Price)}</td>
                    {showCost && (
                      <td className="px-2 py-2 text-right text-amber-700 font-semibold tabular-nums whitespace-nowrap">
                        {cost != null ? formatNumber(cost) : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className={PRODUCT_GRID}>
            {products.map((product, index) => {
              const color = colorIndex(product.Id, index)
              const url = product.Image?.Url ?? product.Images?.[0]?.Url
              const cost = product.PriceInput ?? product.ImportPrice
              const barcode = product.Barcode || product.Code || product.ProductCode
              return (
                <button
                  key={product.Id ?? index}
                  onClick={() => onAdd(product)}
                  className={`group relative flex flex-col rounded-lg border overflow-hidden text-left transition-all active:scale-95 hover:shadow-lg hover:border-primary/50 duration-150 ${CARD_COLORS[color]}`}
                >
                  <div className="relative aspect-[4/3] shrink-0">
                    <PosImage
                      url={url}
                      alt={product.Name}
                      className="absolute inset-0 h-full w-full"
                      fallbackIcon={<Package className="h-7 w-7 opacity-50" />}
                    />
                    <div className="absolute top-0.5 left-0.5 right-0.5 flex items-start justify-between gap-0.5">
                      {product.Unit?.Name && (
                        <span className="px-1 rounded bg-black/60 backdrop-blur-sm text-[9px] font-semibold text-white/90 truncate max-w-[55%]">
                          {product.Unit.Name}
                        </span>
                      )}
                      {product.Quantity != null && (
                        <span className={cn(
                          'px-1 rounded backdrop-blur-sm text-[10px] font-bold tabular-nums ml-auto',
                          product.Quantity > 0 ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white',
                        )}>
                          {product.Quantity.toLocaleString('vi-VN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 px-1.5 py-1 space-y-0.5 bg-card">
                    <p className="text-[11px] font-bold text-foreground leading-tight line-clamp-2">
                      {product.Name}
                    </p>
                    {barcode && (
                      <p className="text-[9px] font-mono text-muted-foreground truncate">{barcode}</p>
                    )}
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      <span className="text-[12px] font-extrabold tabular-nums text-primary">
                        {formatNumber(product.Price)}
                      </span>
                      {showCost && cost != null && (
                        <span className="px-1 rounded bg-amber-400/95 text-amber-950 text-[8px] font-bold tabular-nums">
                          V:{formatNumber(cost)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        {isFetching && pageIndex > 0 && (
          viewMode === 'table' ? (
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-9 rounded-md" />)}
            </div>
          ) : (
            <div className={cn(PRODUCT_GRID, 'mt-1.5')}>
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="aspect-[4/3] rounded-lg" />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
