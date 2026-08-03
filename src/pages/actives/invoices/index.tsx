import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Receipt, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'
import { withDomainPath } from '@/utils/domain-route'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { CodeTag, MoneyTag, VoucherTag } from '@/components/ui/data-tag'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slice/users/app'
import {
  useFilterOrderInvoicesQuery,
  useImportOrderInvoiceMutation,
  useLazyViewOrderInvoiceHtmlQuery,
  useCheckOrderInvoiceMutation,
  useCancelOrderMutation,
} from '@/store/slice/users/api/api'
import type { TPosOrderInvoice } from '@/store/slice/users/types'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, DateRangeFilter, PAGE_SIZE } from '../shared'
import { baseUrl } from '@/constants'
import dayjs from 'dayjs'

const DEFAULT_RETAIL = 'BÁN CHO NGƯỜI TIÊU DÙNG'

const STATUS_LIST = [
  { value: '' as any, label: 'Tất cả trạng thái' },
  { value: 0, label: 'Chờ phát hành' },
  { value: 1, label: 'Không xuất' },
  { value: 2, label: 'Đã phát hành' },
  { value: 3, label: 'Huỷ' },
]

function defaultMonthStart() {
  return dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD')
}
function defaultToday() {
  return dayjs().format('YYYY-MM-DD')
}

// ─── PDF / HTML viewer drawer ─────────────────────────────────────────────────

type ViewerState = { html: string | null; pdfUrl: string | null; fileName: string }

function InvoiceViewer({ state, onClose }: { state: ViewerState; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <span className="font-semibold text-sm truncate">{state.fileName || 'Hoá đơn'}</span>
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
  const navigate = useNavigate()
  const auth = useAppSelector(selectAuth)
  const token = auth.data?.SessionToken ?? ''

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
  const [cancelOrder] = useCancelOrderMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleImport = useCallback(async (invoice: TPosOrderInvoice) => {
    try {
      await importInvoice(invoice.Id).unwrap()
      toast.success('Đã phát hành hoá đơn thành công')
      refetch()
    } catch {
      toast.error('Phát hành hoá đơn thất bại')
    }
  }, [importInvoice, refetch])

  const handleView = useCallback(async (invoice: TPosOrderInvoice) => {
    if (invoice.InvoiceType === 0) {
      try {
        const res = await viewHtml(invoice.Id).unwrap()
        setViewer({ html: res?.Html ?? null, pdfUrl: null, fileName: `Hoá đơn #${invoice.OrderId}` })
      } catch {
        toast.error('Không thể tải hoá đơn')
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
        toast.error('Không thể tải file PDF')
      }
    }
  }, [viewHtml, token])

  const handleCheck = useCallback(async (invoice: TPosOrderInvoice) => {
    try {
      const res = await checkInvoice(invoice.Id).unwrap()
      const msg = res?.KeyInvoiceMsg?.Message || 'Đã hoàn tất quá trình kiểm tra'
      toast.success(msg)
    } catch {
      toast.error('Kiểm tra thất bại')
    }
  }, [checkInvoice])

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

  const handleCancel = useCallback(async (invoice: TPosOrderInvoice) => {
    if (!invoice.OrderId) {
      toast.warning('Không tìm thấy mã đơn hàng để huỷ')
      return
    }
    if (!window.confirm('Bạn có chắc là muốn huỷ hoá đơn này không?')) return
    try {
      await cancelOrder(invoice.OrderId).unwrap()
      toast.success('Huỷ hoá đơn thành công')
      refetch()
    } catch {
      toast.error('Huỷ hoá đơn thất bại')
    }
  }, [cancelOrder, refetch])

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
      header: 'Ngày',
      cell: ({ row }) => (
        <span className="whitespace-nowrap">
          {row.original.InvoiceDate ? dayjs(row.original.InvoiceDate).format('DD/MM/YYYY HH:mm') : '—'}
        </span>
      ),
    },
    {
      id: 'orderId',
      header: 'Số phiếu',
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
      header: 'Trạng thái',
      cell: ({ row }) => {
        const inv = row.original
        return inv.PublishStatus != null ? (
          <StatusBadge statusId={inv.PublishStatus} label={inv.PublishStatusName ?? inv.PublishStatus} />
        ) : '—'
      },
    },
    {
      id: 'invoiceType',
      header: 'Loại HĐ',
      cell: ({ row }) => row.original.InvoiceType === 0 ? 'EASY INVOICE' : 'MINVOICE',
    },
    {
      id: 'companyName',
      header: 'Đơn vị',
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => {
        const name = row.original.CompanyName
        return name === '' ? DEFAULT_RETAIL : (name ?? '—')
      },
    },
    {
      id: 'taxAgencyCode',
      header: 'Mã CQ Thuế',
      cell: ({ row }) => <CodeTag value={row.original.TaxAgencyCode} />,
    },
    {
      id: 'phone',
      header: 'Điện thoại',
      cell: ({ row }) => row.original.PhoneNumber || '—',
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      meta: { className: 'min-w-[180px]' },
      cell: ({ row }) => row.original.Address || '—',
    },
    {
      id: 'buyerName',
      header: 'Người mua',
      cell: ({ row }) => row.original.BuyerName || '—',
    },
    {
      id: 'paymentMethod',
      header: 'Thanh toán',
      cell: ({ row }) => row.original.PaymentMethod || '—',
    },
    {
      id: 'bankAccount',
      header: 'Số TK',
      cell: ({ row }) => row.original.BankAccount || '—',
    },
    {
      id: 'bankName',
      header: 'Ngân hàng',
      cell: ({ row }) => row.original.BankName || '—',
    },
    {
      id: 'invoiceSymbol',
      header: 'Ký hiệu',
      cell: ({ row }) => row.original.InvoiceSymbol || '—',
    },
    {
      id: 'invoiceNumber',
      header: 'Số HĐ',
      cell: ({ row }) => row.original.InvoiceNumber || '—',
    },
    {
      id: 'totalAmount',
      header: 'Tổng cộng',
      cell: ({ row }) => (
        <MoneyTag value={row.original.TotalAmount} />
      ),
    },
    {
      id: 'histories',
      header: 'Mô tả',
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
      header: 'Thao tác',
      meta: {
        headClassName: 'sticky right-0 bg-muted/40 border-l z-10',
        cellClassName: 'sticky right-0 bg-card border-l z-10',
      },
      cell: ({ row }) => {
        const inv = row.original
        return (
          <div className="flex gap-1.5">
            {(inv.PublishStatus === 0 || inv.PublishStatus === 1) && (
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                disabled={importing}
                onClick={() => handleImport(inv)}
              >
                Phát hành
              </Button>
            )}
            {inv.PublishStatus === 2 && (
              <Button
                size="sm"
                className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handleView(inv)}
              >
                Xem HĐ
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-cyan-400 text-cyan-700 hover:bg-cyan-50"
              disabled={checking}
              onClick={() => handleCheck(inv)}
            >
              Kiểm tra
            </Button>
            {inv.PublishStatus === 2 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs border-rose-400 text-rose-600 hover:bg-rose-50"
                onClick={() => handleCancel(inv)}
              >
                Huỷ
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="space-y-4">
        <ListPageHeader title="Danh sách hoá đơn" icon={Receipt}>
          <SearchBar value={keyword} onChange={onKeyword} placeholder="Tìm kiếm..." />
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
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Tải lại
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
          emptyText="Không có hoá đơn nào"
        />
      </div>

      {viewer && (
        <InvoiceViewer state={viewer} onClose={handleCloseViewer} />
      )}
    </>
  )
}
