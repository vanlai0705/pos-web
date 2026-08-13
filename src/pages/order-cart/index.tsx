import { useGetTableOrderItemsByGuidQuery } from '@/store/slice/tables/api'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { fmtNum, QrOrderHeader, useDisablePageZoom } from '../order-table/shared'
import { getImageUrl } from '@/utils/common'

/** Read-only view of what's already been placed on this table's order —
 * mirrors pos_web's qr-order-cart (a separate route from the in-progress
 * review step inside order-table itself). */
export default function QrOrderCartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const guid = searchParams.get('guid') ?? ''

  useDisablePageZoom()

  const { data: items = [] } = useGetTableOrderItemsByGuidQuery(guid, { skip: !guid })

  const totals = useMemo(
    () => items.reduce((acc, item) => ({
      qty: acc.qty + (item.Quantity ?? 0),
      amount: acc.amount + (item.Amount ?? 0),
    }), { qty: 0, amount: 0 }),
    [items],
  )

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <QrOrderHeader
        left={(
          <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold ring-1 ring-white/30">
            {t('pages.orderTable.cart')}
          </div>
        )}
      />

      <div className="flex h-[calc(100dvh-64px)] flex-col bg-background">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item, i) => (
              <div key={item.Id ?? i} className="flex items-start gap-4 rounded-xl p-2 hover:bg-accent">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border">
                  <img src={getImageUrl(item.Product?.Image?.Url ?? item.Product?.Images?.[0]?.Url) ?? '/logo.png'} alt={item.Product?.Name} className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-1 justify-between gap-2">
                  <div>
                    <h3 className="line-clamp-2 text-xs font-semibold">{item.Product?.Name}</h3>
                    <div className="mt-1 text-xs font-bold text-primary">{fmtNum(item.Product?.Price)}</div>
                    {item.Product?.Note && <span className="text-xs text-muted-foreground">{item.Product.Note}</span>}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    x {item.Quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[9999] mt-3 bg-transparent px-3 pb-2">
        <button className="flex h-[64px] w-full items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-2xl transition-all active:scale-95">
          <div onClick={() => navigate(-1)} className="flex h-full w-[30%] flex-col justify-center bg-primary/80 px-4">
            <div className="text-sm font-bold">{t('pages.orderTable.back')}</div>
          </div>
          <div className="flex h-full flex-1 flex-col items-center justify-center text-sm font-bold uppercase tracking-wide">
            <div className="text-xs opacity-80">{totals.qty} {t('pages.orderTable.itemsUnit')}</div>
            <div className="text-sm font-bold">{fmtNum(totals.amount)}</div>
          </div>
        </button>
      </div>
    </div>
  )
}
