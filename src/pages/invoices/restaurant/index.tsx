import { useState } from 'react'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { useNavigate } from 'react-router-dom'
import { UtensilsCrossed, Plus, RefreshCw, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  useGetAreasQuery,
  useFilterBookingsQuery,
  useLazyGetBookingDetailQuery,
  useCancelOrderMutation,
} from '@/store/slice/users/api/api'
import type { TPosBooking, TPosArea } from '@/store/slice/users/types/pos-types'
import { ListPageHeader, fmtCurrency, useListFilter } from '@/pages/actives/shared'
import { InvoiceDetailPanel, StatusChip, fmtDateTime } from '../shared'

// ─── Table card ───────────────────────────────────────────────────────────────

function TableCard({
  tableNo, booking, onClick,
}: {
  tableNo: number
  booking?: TPosBooking
  onClick: () => void
}) {
  const occupied = !!booking
  const statusId = booking?.Status?.Id

  const bgClass = occupied
    ? statusId === 2
      ? 'bg-green-50 border-green-300 dark:bg-green-950/40 dark:border-green-700'
      : 'bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700'
    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/20'

  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-2 p-3 flex flex-col gap-1.5 text-left transition-all duration-150 active:scale-95 ${bgClass}`}
    >
      {/* Table number */}
      <div className="flex items-center justify-between">
        <span className={`font-bold text-sm ${occupied ? (statusId === 2 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300') : 'text-muted-foreground'}`}>
          Bàn {tableNo}
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${occupied ? (statusId === 2 ? 'bg-green-500' : 'bg-amber-500') : 'bg-muted-foreground/30'}`} />
      </div>

      {occupied && booking ? (
        <>
          <p className="text-[10px] text-muted-foreground font-medium truncate">{booking.Code ?? '—'}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>{fmtDateTime(booking.Date).split(' ')[1] ?? '—'}</span>
          </div>
          <p className={`text-xs font-semibold tabular-nums ${statusId === 2 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {fmtCurrency(booking.Total ?? booking.SubTotal)}
          </p>
        </>
      ) : (
        <p className="text-[10px] text-muted-foreground mt-0.5">Trống</p>
      )}
    </button>
  )
}

// ─── Area tabs ───────────────────────────────────────────────────────────────

function AreaTabs({ areas, selected, onSelect }: {
  areas: TPosArea[]
  selected: number | null
  onSelect: (id: number | null) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5 shrink-0">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selected === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
      >
        Tất cả
      </button>
      {areas.map(area => (
        <button
          key={area.Id}
          onClick={() => onSelect(area.Id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${selected === area.Id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
        >
          {area.Name}
        </button>
      ))}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABLES_PER_AREA = 12

export default function RestaurantInvoicePage() {
  const navigate = useNavigate()
  const { dateFrom } = useListFilter()
  const [selectedArea, setSelectedArea] = useState<number | null>(null)
  const [selected, setSelected] = useState<TPosBooking | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const { data: areas = [], isLoading: areasLoading } = useGetAreasQuery()
  const { data, isLoading: bookingsLoading, refetch } = useFilterBookingsQuery({
    PageIndex: 0,
    PageSize: 100,
    DateFrom: dateFrom,
  })
  const [getDetail] = useLazyGetBookingDetailQuery()
  const [cancelBooking] = useCancelOrderMutation()

  const bookings = data?.Items ?? []

  const handleTableClick = async (booking?: TPosBooking) => {
    if (!booking) {
      // An empty slot has no order to show — send the user to the real floor
      // plan, which is where a table order actually gets opened.
      navigate('/actives/tables-order')
      return
    }
    if (!booking.Id) return
    setLoadingDetail(true)
    try {
      const detail = await getDetail(booking.Id).unwrap()
      setSelected(detail)
    } catch {
      setSelected(booking)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCancel = async () => {
    if (!selected?.Id) return
    if (!await confirmAction({ description: `Huỷ đơn ${selected.Code}?` })) return
    try {
      await cancelBooking(selected.Id).unwrap()
      toast.success('Đã huỷ đơn')
      setSelected(null)
      refetch()
    } catch { toast.error('Không thể huỷ đơn') }
  }

  // Map bookings to virtual table slots
  const activeBookings = bookings.filter(b => b.Status?.Id === 1 || b.Status?.Id === 2)
  const tableBookings: (TPosBooking | undefined)[] = Array.from({ length: TABLES_PER_AREA }, (_, i) => activeBookings[i])

  const showDetail = selected !== null

  return (
    <div className="flex flex-col h-full gap-3">
      <ListPageHeader title="Hoá đơn nhà hàng" icon={UtensilsCrossed}>
        <Button size="sm" variant="outline" className="h-8" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" className="h-8" onClick={() => navigate('/actives/tables-order')}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tạo đơn
        </Button>
      </ListPageHeader>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-1 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
          Đang phục vụ: <strong className="text-foreground ml-0.5">{activeBookings.filter(b => b.Status?.Id === 1).length}</strong>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />
          Hoàn thành: <strong className="text-foreground ml-0.5">{activeBookings.filter(b => b.Status?.Id === 2).length}</strong>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 inline-block" />
          Trống: <strong className="text-foreground ml-0.5">{TABLES_PER_AREA - activeBookings.length}</strong>
        </div>
      </div>

      <div className="flex gap-3 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Table grid */}
        <div className={`${showDetail ? 'w-[55%]' : 'w-full'} flex flex-col gap-3 transition-all duration-200`}>
          {/* Area tabs */}
          {areasLoading ? (
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-lg" />)}
            </div>
          ) : areas.length > 0 ? (
            <AreaTabs areas={areas} selected={selectedArea} onSelect={setSelectedArea} />
          ) : null}

          {/* Table grid */}
          <div className="flex-1 overflow-auto">
            {bookingsLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: TABLES_PER_AREA }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {Array.from({ length: TABLES_PER_AREA }).map((_, i) => (
                  <TableCard
                    key={i}
                    tableNo={i + 1}
                    booking={tableBookings[i]}
                    onClick={() => handleTableClick(tableBookings[i])}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Booking list (all active) */}
          {!bookingsLoading && activeBookings.length > 0 && (
            <div className="shrink-0 rounded-xl border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-xs font-semibold">Danh sách đơn hàng ({bookings.length})</span>
              </div>
              <div className="divide-y max-h-40 overflow-y-auto">
                {bookings.slice(0, 10).map((b, idx) => (
                  <button
                    key={b.Id ?? idx}
                    onClick={() => handleTableClick(b)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/30 transition-colors flex items-center gap-3 ${selected?.Id === b.Id ? 'bg-primary/8' : ''}`}
                  >
                    <StatusChip status={b.Status} />
                    <span className="text-xs font-medium">{b.Code ?? '—'}</span>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(b.Date)}</span>
                    <span className="ml-auto text-xs font-semibold tabular-nums text-primary">{fmtCurrency(b.Total ?? b.SubTotal)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {showDetail && (
          <div className="flex-1 min-w-0 rounded-xl border bg-card overflow-hidden flex flex-col">
            <InvoiceDetailPanel
              order={selected as any}
              loading={loadingDetail}
              onClose={() => setSelected(null)}
              onCancel={handleCancel}
              onPrint={() => window.print()}
            />
          </div>
        )}
      </div>
    </div>
  )
}
