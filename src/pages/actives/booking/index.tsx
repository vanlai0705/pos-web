import type { TPosBooking } from '@/store/slice/users/types/pos-types'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { RowActions } from '@/pages/managers/components'
import { useFilterBookingsQuery, useUpdateBookingStatusMutation } from '@/store/slice/bookings/api'
import { CalendarCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateRangeFilter, ListPageHeader, SearchBar, StatusBadge, useListFilter } from '../shared'
import { fmtDate } from '@/utils'
export default function BookingPage() {
  const { t } = useTranslation()
  const { keyword, setKeyword, page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter()
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterBookingsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    StatusId: statusId,
  })
  const [updateStatus] = useUpdateBookingStatusMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const openAdd = () => { setEditId(undefined); setModal(true) }
  const openEdit = (id: number) => { setEditId(id); setModal(true) }

  const changeStatus = async (id: number, nextStatusId: number) => {
    const label = nextStatusId === 0 ? t('manager.activate') : nextStatusId === 1 ? t('manager.lock') : t('manager.delete')
    if (!await confirmAction({ description: t('components.confirmDialog.description', { action: label }) })) return
    try {
      await updateStatus({ id, statusId: nextStatusId }).unwrap()
      refetch()
      toast.success(t('common.statusUpdateSuccess'))
    } catch { toast.error(t('pages.actives.booking.toggleStatusError')) }
  }

  const columns: ColumnDef<TPosBooking>[] = [
    {
      id: 'stt',
      header: t('common.index'),
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: t('common.voucherNo'),
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer"
          onClick={() => row.original.Id && openEdit(row.original.Id)}
        >
          <VoucherTag value={row.original.Name} />
        </button>
      ),
    },

    {
      id: 'deliveryDate',
      header: t('common.deliveryDate'),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.Date)}</span>,
    },
    {
      id: 'customer',
      header: t('common.customer'),
      cell: ({ row }) => row.original.Customer?.Name ?? '—',
    },
    {
      id: 'user',
      header: t('pages.actives.booking.employee'),
      cell: ({ row }) => row.original.User?.Name ?? '—',
    },
    {
      id: 'total',
      header: t('pages.actives.booking.subtotalColumn'),
      cell: ({ row }) => (
        <MoneyTag value={row.original.Total ?? row.original.SubTotal} />
      ),
    },
    {
      id: 'note',
      header: t('common.note'),
      cell: ({ row }) => <span className="whitespace-nowrap">{row.original.Note}</span>,
    },
    {
      id: 'status',
      header: t('common.statusShort'),
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => {
        const item = row.original
        return (
          <RowActions
            statusId={item.Status?.Id}
            onEdit={() => item.Id && openEdit(item.Id)}
            onActivate={() => item.Id && changeStatus(item.Id, 0)}
            onLock={() => item.Id && changeStatus(item.Id, 1)}
            onDelete={() => item.Id && changeStatus(item.Id, 2)}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('pages.actives.booking.pageTitle')} icon={CalendarCheck}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder={t('pages.actives.booking.searchPlaceholder')} />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); goPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('pages.actives.booking.statusAll')}</option>
          <option value={0}>{t('common.active')}</option>
          <option value={1}>{t('common.locked')}</option>
          <option value={2}>{t('common.deleted')}</option>
          <option value={4}>{t('pages.actives.booking.statusCompleted')}</option>
        </select>
        <Button size="sm" onClick={openAdd} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('pages.actives.booking.createBooking')}
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={goPage}
        emptyText={t('pages.actives.booking.emptyText')}
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title={t('pages.actives.booking.dialogTitle')}
        endpoints={{ detail: 'bookings/detail', create: 'bookings/create', update: 'bookings/update' }}
        options={{ customer: true, sales: true, extraDateField: 'DeliveryDate', extraDateLabel: t('common.deliveryDate') }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
