import { PromotionDialog } from '@/components/pos/promotion-dialog'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { STATUS } from '@/constants/status'
import { DateRangeFilter, ListPageHeader, PAGE_SIZE, SearchBar, StatusBadge, defaultDateFrom, defaultDateTo } from '@/pages/actives/shared'
import { RowActions } from '@/pages/managers/components'
import { useFilterReportQuery, useGenericPostMutation } from '@/store/slice/generic/api'
import { Plus, Tag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
interface TPromotion {
  Id?: number
  Name?: string
  Code?: string
  DateFrom?: string
  DateTo?: string
  Type?: number
  Priority?: number
  Status?: { Id?: number; Name?: string }
}

interface Props {
  type: number
  titleKey: string
}

function errMsg(e: any, fallback: string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || fallback
}

export default function PromotionListPage({ type, titleKey }: Props) {
  const { t } = useTranslation()
  const title = t(titleKey)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultDateFrom())
  const [dateTo, setDateTo] = useState(defaultDateTo())

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<number | undefined>()

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'promotions/filter',
    params: { Keyword: keyword || undefined, DateFrom: dateFrom, DateTo: dateTo, Type: type, PageIndex: page - 1, PageSize: pageSize },
  })
  const [request] = useGenericPostMutation()

  const items = (data?.Items ?? []) as TPromotion[]
  const total = data?.TotalItemCount ?? 0

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'

  const openCreate = () => { setEditId(undefined); setModal(true) }
  const openEdit = (row: TPromotion) => { if (row.Id) { setEditId(row.Id); setModal(true) } }

  const changeStatus = async (row: TPromotion, statusId: number) => {
    if (!row.Id) return
    if (statusId === STATUS.DELETED && !await confirmAction({ description: t('promotions.list.confirmDelete') })) return
    try {
      await request({ url: `promotions/update-status?id=${row.Id}&statusId=${statusId}`, method: 'POST', body: {} }).unwrap()
      toast.success(t('common.updateSuccess'))
      refetch()
    } catch (e) { toast.error(errMsg(e, t('common.requestFailed'))) }
  }

  const columns: ColumnDef<TPromotion>[] = [
    { id: 'stt', header: t('common.index'), cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: t('common.code'), cell: ({ row }) => <CodeTag value={row.original.Code} /> },
    { id: 'name', header: t('common.programName'), cell: ({ row }) => <span className="font-medium">{row.original.Name ?? '—'}</span> },
    { id: 'from', header: t('common.fromDate'), cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateFrom)}</span> },
    { id: 'to', header: t('common.toDate'), cell: ({ row }) => <span className="text-xs">{fmtDate(row.original.DateTo)}</span> },
    { id: 'priority', header: t('promotions.list.priority'), cell: ({ row }) => <span className="text-xs">{row.original.Priority ?? 0}</span> },
    { id: 'status', header: t('common.status'), cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const r = row.original
        return (
          <RowActions
            statusId={r.Status?.Id}
            onEdit={() => openEdit(r)}
            onActivate={() => changeStatus(r, STATUS.ACTIVE)}
            onLock={() => changeStatus(r, STATUS.LOCKED)}
            onDelete={() => changeStatus(r, STATUS.DELETED)}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={title} icon={Tag}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder={t('common.searchProgram')} />
        <DateRangeFilter from={dateFrom} to={dateTo} onFrom={v => { setDateFrom(v); setPage(1) }} onTo={v => { setDateTo(v); setPage(1) }} />
        <Button size="sm" className="h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('promotions.list.addProgram')}
        </Button>
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        onRowDoubleClick={openEdit}
        emptyText={t('promotions.list.emptyByTitle', { title: title.toLowerCase() })}
      />

      <PromotionDialog
        open={modal} onOpenChange={setModal}
        type={type} title={title} editId={editId}
        onSaved={refetch}
      />
    </div>
  )
}
