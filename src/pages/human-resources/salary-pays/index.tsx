import { useState } from 'react'
import { Banknote, MoreHorizontal, Award, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFilterReportQuery } from '@/store/slice/users/api/api'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { ListPageHeader, SearchBar, PAGE_SIZE } from '@/pages/actives/shared'
import { RewardPunishDialog } from '@/components/pos/reward-punish-dialog'
import {
  ReceiptPaymentDialog, RECEIPT_PAYMENT_TYPE, RECEIPT_PAYMENT_FOR, OBJECT_TYPE,
  type ReceiptPayment,
} from '@/components/pos/receipt-payment-dialog'
import type { LookupItem } from '@/components/pos/lookup-select'
import { useTranslation } from 'react-i18next'

/** Endpoints of the phiếu chi the "Chi lương" action raises. */
const PAYMENT_ENDPOINTS = {
  detail: 'payment/detail', create: 'payment/create', update: 'payment/update',
}

interface TSalaryPay {
  Id?: number
  SalaryCode?: string
  /** The employee — the API calls this User, not Member */
  User?: LookupItem & { FullName?: string; Address?: string }
  Month?: number
  Year?: number
  Salary?: number
  Reward?: number
  Punish?: number
  AdvancePayment?: number
  Status?: { Id?: number; Name?: string }
}

/** CurencyService.salaryTotal in pos_web. */
function salaryTotal(item: TSalaryPay) {
  return (item.Salary ?? 0) + (item.Reward ?? 0) - (item.Punish ?? 0) - (item.AdvancePayment ?? 0)
}

const money = (v?: number) => (v ?? 0).toLocaleString('vi-VN')

const userName = (u?: TSalaryPay['User']) => u?.FullName || u?.Name || '—'

export default function SalaryPaysPage() {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const [rewardFor, setRewardFor] = useState<LookupItem | null>(null)
  const [payFor, setPayFor] = useState<Partial<ReceiptPayment> | null>(null)

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'salary/filter-salary-pay',
    params: { Keyword: keyword || undefined, PageIndex: page - 1, PageSize: pageSize },
  })

  const items = (data?.Items ?? []) as TSalaryPay[]
  const total = data?.TotalItemCount ?? 0

  /** Angular prefills the voucher with the employee and the outstanding total. */
  const openSalaryPay = (row: TSalaryPay) =>
    setPayFor({
      ReceiptPaymentType: RECEIPT_PAYMENT_FOR.SALARY_PAY,
      ObjectType: OBJECT_TYPE.User,
      User: row.User ?? null,
      ObjectName: userName(row.User),
      Address: row.User?.Address ?? '',
      Amount: salaryTotal(row),
    })

  const columns: ColumnDef<TSalaryPay>[] = [
    { id: 'stt', header: t('common.index'), cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    {
      id: 'month', header: t('common.month'),
      cell: ({ row }) => {
        const { Month, Year } = row.original
        return <span>{Month && Year ? `${String(Month).padStart(2, '0')}/${Year}` : '—'}</span>
      },
    },
    { id: 'user', header: t('common.employee'), cell: ({ row }) => <span className="font-medium">{userName(row.original.User)}</span> },
    { id: 'salary', header: t('humanResources.salary.salary'), cell: ({ row }) => <span className="tabular-nums">{money(row.original.Salary)}</span> },
    { id: 'reward', header: t('components.rewardPunishDialog.reward'), cell: ({ row }) => <span className="tabular-nums text-emerald-600">{money(row.original.Reward)}</span> },
    { id: 'punish', header: t('components.rewardPunishDialog.punish'), cell: ({ row }) => <span className="tabular-nums text-red-600">{money(row.original.Punish)}</span> },
    { id: 'advance', header: t('humanResources.salary.advancePayment'), cell: ({ row }) => <span className="tabular-nums text-amber-600">{money(row.original.AdvancePayment)}</span> },
    {
      id: 'remain', header: t('humanResources.salary.remaining'),
      cell: ({ row }) => <span className="tabular-nums font-bold text-sky-700">{money(salaryTotal(row.original))}</span>,
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => {
        const r = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRewardFor(r.User ?? null)}>
                <Award className="h-3.5 w-3.5 mr-2 text-amber-600" /> {t('components.rewardPunishDialog.title')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openSalaryPay(r)}>
                <Wallet className="h-3.5 w-3.5 mr-2 text-sky-600" /> {t('menu.salaryPays')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <ListPageHeader title={t('menu.salaries')} icon={Banknote}>
        <SearchBar value={keyword} onChange={v => { setKeyword(v); setPage(1) }} placeholder={t('common.searchEmployee')} />
      </ListPageHeader>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize} onPageSizeChange={setPageSize}
        onPageChange={setPage}
        emptyText={t('humanResources.salary.emptyPayroll')}
      />

      <RewardPunishDialog
        open={!!rewardFor}
        onOpenChange={o => { if (!o) setRewardFor(null) }}
        lockedUser={rewardFor}
        onSaved={refetch}
      />

      <ReceiptPaymentDialog
        open={!!payFor}
        onOpenChange={o => { if (!o) setPayFor(null) }}
        type={RECEIPT_PAYMENT_TYPE.PAYMENT}
        endpoints={PAYMENT_ENDPOINTS}
        initial={payFor ?? undefined}
        disableObjectType
        onSaved={refetch}
      />
    </div>
  )
}
