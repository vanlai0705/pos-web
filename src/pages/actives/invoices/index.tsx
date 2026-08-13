import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag, MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { StatusBadge } from '@/components/ui/status-badge'
import { baseUrl } from '@/constants'
import { DateRangeFilter, ListPageHeader, PAGE_SIZE, SearchBar, toUtcEndOfDay, toUtcStartOfDay } from '@/pages/actives/shared'
import { useAppSelector } from '@/store/hooks'
import { useCheckOrderInvoiceMutation, useFilterOrderInvoicesQuery, useImportOrderInvoiceMutation, useLazyViewOrderInvoiceHtmlQuery } from '@/store/slice/orders/api'
import { TPosOrderInvoice } from '@/store/slice/users'
import { selectAuth } from '@/store/slice/users/app'
import { withDomainPath } from '@/utils/domain-route'
import { Receipt, Eye, RefreshCw, SearchCheck, Send, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
function defaultMonthStart() {
  return toUtcStartOfDay(dayjs().subtract(1, 'month').startOf('month'))
}
function defaultToday() {
  return toUtcEndOfDay(dayjs())
}

// ─── PDF / HTML viewer drawer ─────────────────────────────────────────────────

type ViewerState = { html: string | null; pdfUrl: string | null; fileName: string }

function InvoiceViewer({ state, onClose }: { state: ViewerState; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-sm truncate">{state.fileName || t('pages.actives.invoices.invoiceLabel')}</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-auto">
          {state.html ? (
            <div className="p-4" dangerouslySetInnerHTML={{ __html: state.html }} />
          ) : state.pdfUrl ? (
            <iframe src={state.pdfUrl} className="w-full h-full border-0" title={state.fileName} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''

  const DEFAULT_RETAIL = t('pages.actives.invoices.defaultRetailCustomer')

  const STATUS_LIST = [
    { value: '' as any, label: t('common.allStatuses') },
    { value: 0, label: t('pages.actives.invoices.statusPending') },
    { value: 1, label: t('pages.actives.invoices.statusNotIssued') },
    { value: 2, label: t('pages.actives.invoices.statusPublished') },
    { value: 3, label: t('common.cancel') },
  ]

  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dateFrom, setDateFrom] = useState(defaultMonthStart)
  const [dateTo, setDateTo] = useState(defaultToday)
  const [publishStatus, setPublishStatus] = useState<number | ''>('')
  const [viewer, setViewer] = useState<ViewerState | null>(null)
  const pdfBlobUrlRef = useRef<string | null>(null)

  const params = {
    PageIndex: page - 1,
    PageSize: pageSize,
    Keyword: keyword || undefined,
    DateFrom: dateFrom,
    DateTo: dateTo,
    PublishStatus: publishStatus === '' ? undefined : publishStatus,
  }

  const { data, isLoading, refetch } = useFilterOrderInvoicesQuery(params)
  const [importInvoice, { isLoading: importing }] = useImportOrderInvoiceMutation()
  const [viewHtml] = useLazyViewOrderInvoiceHtmlQuery()
  const [checkInvoice, { isLoading: checking }] = useCheckOrderInvoiceMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleImport = useCallback(async (invoice: TPosOrderInvoice) => {
    try {
      await importInvoice(invoice.Id).unwrap()
      toast.success(t('pages.actives.invoices.importSuccess'))
      refetch()
    } catch {
      toast.error(t('pages.actives.invoices.importError'))
    }
  }, [importInvoice, refetch, t])

  const handleView = useCallback(async (invoice: TPosOrderInvoice) => {
    if (invoice.InvoiceType === 0) {
      try {
        const res = await viewHtml(invoice.Id).unwrap()
        setViewer({ html: res?.Html ?? null, pdfUrl: null, fileName: `${t('pages.actives.invoices.invoiceLabel')} #${invoice.OrderId}` })
      } catch {
        toast.error(t('pages.actives.invoices.viewInvoiceError'))
      }
    } else {
      try {
        // baseUrl has no trailing slash, so join explicitly instead of
        // concatenating — otherwise the path becomes ".../v1order-invoices".
        const resp = await fetch(
          `${baseUrl.replace(/\/+$/, '')}/order-invoices/get-invoice-pdf?orderInvoiceId=${invoice.Id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!resp.ok) throw new Error('fetch failed')
        const blob = await resp.blob()
        if (pdfBlobUrlRef.current) URL.revokeObjectURL(pdfBlobUrlRef.current)
        const url = URL.createObjectURL(blob)
        pdfBlobUrlRef.current = url
        const cd = resp.headers.get('content-disposition') ?? ''
        const fileNameMatch = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        const fileName = fileNameMatch?.[1]?.replace(/['"]/g, '') || `invoice-${invoice.Id}.pdf`
        setViewer({ html: null, pdfUrl: url, fileName })
      } catch {
        toast.error(t('pages.actives.invoices.viewPdfError'))
      }
    }
  }, [viewHtml, token, t])

  const handleCheck = useCallback(async (invoice: TPosOrderInvoice) => {
    try {
      const res = await checkInvoice(invoice.Id).unwrap()
      const msg = res?.KeyInvoiceMsg?.Message || t('pages.actives.invoices.checkSuccess')
      toast.success(msg)
    } catch {
      toast.error(t('pages.actives.invoices.checkError'))
    }
  }, [checkInvoice, t])

  const handleCloseViewer = useCallback(() => {
    setViewer(null)
    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current)
      pdfBlobUrlRef.current = null
    }
  }, [])

  const goOrder = useCallback((invoice: TPosOrderInvoice) => {
    if (invoice.PublishStatus === 2 || !invoice.OrderId) return
    navigate(withDomainPath(`/actives/order?orderId=${invoice.OrderId}`))
  }, [navigate])

  const onKeyword = useCallback((v: string) => { setKeyword(v); setPage(1) }, [])
  const onDateFrom = useCallback((v: string) => { setDateFrom(v); setPage(1) }, [])
  const onDateTo = useCallback((v: string) => { setDateTo(v); setPage(1) }, [])
  const onStatus = useCallback((v: string) => {
    setPublishStatus(v === '' ? '' : Number(v))
    setPage(1)
  }, [])

  const columns: ColumnDef<TPosOrderInvoice>[] = [
    {
      id: 'stt',
      header: '#',
      cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span>,
    },
    {
      id: 'date',
      header: t('common.date'),
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.InvoiceDate ? dayjs(row.original.InvoiceDate).format('DD/MM/YYYY HH:mm') : '—'}
        </span>
      ),
    },
    {
      id: 'orderId',
      header: t('common.voucherNo'),
      cell: ({ row }) => {
        const inv = row.original
        return (
          <button
            type="button"
            onClick={() => goOrder(inv)}
            className={inv.PublishStatus !== 2 ? 'cursor-pointer' : 'cursor-default'}
          >
            <VoucherTag value={inv.OrderId} className={inv.PublishStatus === 2 ? 'opacity-70' : ''} />
          </button>
        )
      },
    },
    {
      id: 'publishStatus',
      header: t('common.status'),
      cell: ({ row }) => {
        const inv = row.original
        return inv.PublishStatus != null ? (
          <StatusBadge statusId={inv.PublishStatus} label={inv.PublishStatusName ?? inv.PublishStatus} />
        ) : '—'
      },
    },
    {
      id: 'invoiceType',
      header: t('common.invoiceType'),
      cell: ({ row }) => row.original.InvoiceType === 0 ? 'EASY INVOICE' : 'MINVOICE',
    },
    {
      id: 'companyName',
      header: t('pages.actives.invoices.unitName'),
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => {
        const name = row.original.CompanyName
        return name === '' ? DEFAULT_RETAIL : (name ?? '—')
      },
    },
    {
      id: 'taxAgencyCode',
      header: t('common.taxAuthorityCode'),
      cell: ({ row }) => <CodeTag value={row.original.TaxAgencyCode} />,
    },
    {
      id: 'phone',
      header: t('common.phone'),
      cell: ({ row }) => row.original.PhoneNumber || '—',
    },
    {
      id: 'address',
      header: t('common.address'),
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => row.original.Address || '—',
    },
    {
      id: 'buyerName',
      header: t('common.buyer'),
      cell: ({ row }) => row.original.BuyerName || '—',
    },
    {
      id: 'paymentMethod',
      header: t('common.paymentMethod'),
      cell: ({ row }) => row.original.PaymentMethod || '—',
    },
    {
      id: 'bankAccount',
      header: t('common.accountNo'),
      cell: ({ row }) => row.original.BankAccount || '—',
    },
    {
      id: 'bankName',
      header: t('common.bank'),
      cell: ({ row }) => row.original.BankName || '—',
    },
    {
      id: 'invoiceSymbol',
      header: t('common.invoiceSymbol'),
      cell: ({ row }) => row.original.InvoiceSymbol || '—',
    },
    {
      id: 'invoiceNumber',
      header: t('common.invoiceNo'),
      cell: ({ row }) => row.original.InvoiceNumber || '—',
    },
    {
      id: 'totalAmount',
      header: t('pages.actives.invoices.totalAmount'),
      cell: ({ row }) => (
        <MoneyTag value={row.original.TotalAmount} />
      ),
    },
    {
      id: 'histories',
      header: t('pages.actives.invoices.descriptionHistory'),
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground space-y-0.5 max-w-[200px]">
          {(row.original.Histories ?? []).map((h, i) => (
            <p key={i}>{h.Message}</p>
          ))}
        </div>
      ),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      meta: {
        headClassName: 'sticky right-0 bg-muted/90 border-l z-20 w-[190px] min-w-[190px] text-center',
        cellClassName: 'sticky right-0 bg-card border-l z-20 w-[190px] min-w-[190px]',
      },
      cell: ({ row }) => {
        const inv = row.original
        return (
          <div className="flex items-center justify-end gap-1.5">
            {(inv.PublishStatus === 0 || inv.PublishStatus === 1) && (
              <Button
                size="sm"
                className="h-7 min-w-[86px] gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                disabled={importing}
                onClick={() => handleImport(inv)}
              >
                <Send className="h-3.5 w-3.5 shrink-0" />
                {t('pages.actives.invoices.publishAction')}
              </Button>
            )}
            {inv.PublishStatus === 2 && (
              <Button
                size="sm"
                className="h-7 min-w-[86px] gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                onClick={() => handleView(inv)}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                {t('pages.actives.invoices.viewInvoiceAction')}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 min-w-[82px] gap-1 rounded-md px-2 text-xs font-semibold whitespace-nowrap border-cyan-400 text-cyan-700 hover:bg-cyan-50"
              disabled={checking}
              onClick={() => handleCheck(inv)}
            >
              <SearchCheck className="h-3.5 w-3.5 shrink-0" />
              {t('pages.actives.invoices.checkAction')}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="flex h-[calc(100vh-7rem)] min-h-0 flex-col gap-3 overflow-hidden">
        <ListPageHeader title={t('pages.actives.invoices.pageTitle')} icon={Receipt}>
          <SearchBar value={keyword} onChange={onKeyword} placeholder={t('common.search')} />
          <select
            value={publishStatus === '' ? '' : String(publishStatus)}
            onChange={e => onStatus(e.target.value)}
            className="h-8 px-2 text-sm rounded-md border border-input bg-background"
          >
            {STATUS_LIST.map(s => (
              <option key={String(s.value)} value={s.value === '' ? '' : String(s.value)}>
                {s.label}
              </option>
            ))}
          </select>
          <DateRangeFilter from={dateFrom} to={dateTo} onFrom={onDateFrom} onTo={onDateTo} />
          <Button variant="outline" size="sm" className="h-8" onClick={() => { setPage(1); refetch() }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('common.reload')}
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
          emptyText={t('pages.actives.invoices.emptyText')}
        />
      </div>

      {viewer && (
        <InvoiceViewer state={viewer} onClose={handleCloseViewer} />
      )}
    </>
  )
}
