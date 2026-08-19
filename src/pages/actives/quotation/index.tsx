import type { TPosQuotation } from '@/store/slice/users/types/pos-types'
import { StockDocumentDialog } from '@/components/pos/stock-document-dialog'
import { Button } from '@/components/ui/button'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { RowActions } from '@/pages/managers/components'
import { useFilterQuotationsQuery, useUpdateQuotationStatusMutation } from '@/store/slice/quotations/api'
import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DateRangeFilter, defaultDateTo, ListPageHeader, SearchBar, StatusBadge, todayDateFrom, useListFilter } from '../shared'
import { fmtDate } from '@/utils'
export default function QuotationPage() {
  const { t } = useTranslation()
  const { keyword, setKeyword, page, goPage, pageSize, setPageSize, dateFrom, setDateFrom, dateTo, setDateTo } = useListFilter(todayDateFrom(), defaultDateTo())
  const [statusId, setStatusId] = useState<number | ''>('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterQuotationsQuery({
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    StatusId: statusId,
  })
  const [updateStatus] = useUpdateQuotationStatusMutation()

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
    } catch { toast.error(t('pages.actives.quotation.updateStatusError')) }
  }

  const columns: ColumnDef<TPosQuotation>[] = [
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
          <VoucherTag value={row.original.Code} />
        </button>
      ),
    },
    {
      id: 'date',
      header: t('common.date'),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.Date)}</span>,
    },
    {
      id: 'expiredDate',
      header: t('pages.actives.quotation.expiredDate'),
      cell: ({ row }) => <span className="whitespace-nowrap">{fmtDate(row.original.ExpiredDate)}</span>,
    },
    {
      id: 'customer',
      header: t('common.customer'),
      cell: ({ row }) => row.original.Customer?.Name ?? '—',
    },
    {
      id: 'user',
      header: t('pages.actives.quotation.employee'),
      cell: ({ row }) => row.original.User?.Name ?? '—',
    },
    {
      id: 'total',
      header: t('pages.actives.quotation.subtotal'),
      cell: ({ row }) => (
        <MoneyTag value={row.original.Total ?? row.original.SubTotal} />
      ),
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
      <ListPageHeader title={t('pages.actives.quotation.title')} icon={FileText}>
        <SearchBar value={keyword} onChange={setKeyword} placeholder={t('pages.actives.quotation.searchPlaceholder')} />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={setDateFrom} onTo={setDateTo} />
        <select
          value={statusId}
          onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); goPage(1) }}
          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{t('common.allStatuses')}</option>
          <option value={0}>{t('common.active')}</option>
          <option value={1}>{t('common.locked')}</option>
          <option value={2}>{t('common.deleted')}</option>
          <option value={4}>{t('pages.actives.quotation.statusCompleted')}</option>
        </select>
        <Button size="sm" onClick={openAdd} className="h-8">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('pages.actives.quotation.createQuotation')}
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
        emptyText={t('pages.actives.quotation.emptyText')}
      />

      <StockDocumentDialog
        open={modal} onOpenChange={setModal}
        title={t('pages.actives.quotation.createQuotation')}
        endpoints={{ detail: 'quotations/detail', create: 'quotations/create', update: 'quotations/update' }}
        options={{ customer: true, sales: true, extraDateField: 'ExpiredDate', extraDateLabel: t('pages.actives.quotation.expiredDate') }}
        editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
