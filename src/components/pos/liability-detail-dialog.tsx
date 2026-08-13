import type { TPosLiabilityVoucher } from '@/store/slice/users/types/pos-types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fmtDate } from '@/pages/actives/shared'
import { useFilterReportQuery } from '@/store/slice/generic/api'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DataPagination } from '@/components/ui/data-pagination'

const money = (v?: number) => (v ?? 0).toLocaleString('vi-VN')

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** liabilities/filter-liabilities-customer or -supplier */
  endpoint: string
  customerId?: number
  supplierId?: number
}

/**
 * Every voucher (order, receipt, payment...) that moved this customer's or
 * supplier's balance — mirrors Angular's LiabilitiesDetailComponent 1:1.
 */
export function LiabilityDetailDialog({ open, onOpenChange, endpoint, customerId, supplierId }: Props) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const { data, isLoading } = useFilterReportQuery({
    path: endpoint,
    params: {
      CustomerId: customerId, SupplierId: supplierId,
      PageIndex: page - 1, PageSize: pageSize,
    },
  }, { skip: !open })

  const items = (data?.Items ?? []) as TPosLiabilityVoucher[]
  const total = data?.TotalItemCount ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('components.liabilityDetailDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
              <tr className="h-9">
                <th className="w-10 px-2">{t('common.index')}</th>
                <th className="px-2">{t('common.date')}</th>
                <th className="px-2 text-left">{t('common.voucherNo')}</th>
                <th className="px-2 text-left">{t('common.description')}</th>
                <th className="px-2 text-right">{t('components.liabilityDetailDialog.totalAmount')}</th>
                <th className="px-2 text-right">{t('components.liabilityDetailDialog.paymentAmount')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">{t('common.loading')}</td></tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-xs text-muted-foreground">{t('components.liabilityDetailDialog.noTransactions')}</td></tr>
              )}
              {items.map((item, index) => (
                <tr key={index} className="border-t">
                  <td className="px-2 py-1.5 text-center text-muted-foreground">{(page - 1) * pageSize + index + 1}</td>
                  <td className="px-2 py-1.5 text-center">{fmtDate(item.Date)}</td>
                  <td className="px-2 py-1.5">{item.Name ?? '—'}</td>
                  <td className="px-2 py-1.5">{item.Detail ?? '—'}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(item.Total)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{money(item.Payment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DataPagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} onPageSizeChange={setPageSize} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('components.liabilityDetailDialog.close')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
