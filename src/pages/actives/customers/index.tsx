import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileDown, Image as ImageIcon, MoreHorizontal, Plus, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { TreeSidebar, type TreeSidebarNode } from '@/components/layout/tree-sidebar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NumberInput } from '@/components/ui/number-input'
import { Textarea } from '@/components/ui/textarea'
import { ExcelImportDialog } from '@/components/pos/excel-import-dialog'
import { CustomerDialog, Field, emptyCustomer, buildCustomerPayload } from '@/components/pos/customer-form-dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/status-badge'
import { CodeTag } from '@/components/ui/data-tag'
import {
  useFilterCustomersQuery,
  useGenericDownloadMutation,
  useGenericPostMutation,
  useGetCustomerGroupsSimpleQuery,
  useLazyGetCustomerDetailQuery,
  useSaveCustomerGroupMutation,
  useSaveCustomerMutation,
  useUpdateCustomerGroupStatusMutation,
  useUpdateCustomerStatusMutation,
} from '@/store/slice/users/api/api'
import type { TPosCustomer, TPosCustomerGroup } from '@/store/slice/users/types/pos-types'
import { cn, query, downloadBlob } from '@/utils'
import { getImageUrl } from '@/utils/common'

const PAGE_SIZE = 15
const STATUS_ACTIVE = 0
const STATUS_LOCKED = 1
const STATUS_DELETED = 2

interface CustomerGroupNode extends TreeSidebarNode {
  CustomerCode?: string
  Image?: { Url?: string }
}

function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('vi-VN')
}

export default function CustomersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number>(0)
  const [groupSearch, setGroupSearch] = useState('')

  const [customerModal, setCustomerModal] = useState(false)
  const [customerForm, setCustomerForm] = useState<TPosCustomer>(emptyCustomer())

  const [groupModal, setGroupModal] = useState(false)
  const [groupForm, setGroupForm] = useState<TPosCustomerGroup>({ Name: '' })

  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, refetch } = useFilterCustomersQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId === '' ? undefined : statusId,
    CustomerGroupId: groupId || undefined,
  } as any)
  const { data: groups = [], refetch: refetchGroups } = useGetCustomerGroupsSimpleQuery()
  const [getCustomerDetail] = useLazyGetCustomerDetailQuery()
  const [saveCustomer, { isLoading: savingCustomer }] = useSaveCustomerMutation()
  const [updateCustomerStatus] = useUpdateCustomerStatusMutation()
  const [saveGroup, { isLoading: savingGroup }] = useSaveCustomerGroupMutation()
  const [updateGroupStatus] = useUpdateCustomerGroupStatusMutation()
  const [request] = useGenericPostMutation()
  const [downloadFile] = useGenericDownloadMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const sidebarGroups = useMemo<CustomerGroupNode[]>(
    () => [{ Id: 0, Name: 'Tất cả nhóm' }, ...(groups as CustomerGroupNode[])],
    [groups],
  )

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openAddCustomer = () => {
    setCustomerForm(emptyCustomer(groupId || undefined))
    setCustomerModal(true)
  }

  const openEditCustomer = useCallback(async (id?: number) => {
    if (!id) return
    try {
      const detail = await getCustomerDetail(id).unwrap()
      setCustomerForm({ ...emptyCustomer(), ...detail })
      setCustomerModal(true)
    } catch {
      toast.error('Không thể tải thông tin khách hàng')
    }
  }, [getCustomerDetail])

  const saveCustomerForm = async () => {
    if (!customerForm.Name?.trim()) {
      toast.error('Vui lòng nhập tên khách hàng')
      return
    }

    const payload = buildCustomerPayload(customerForm)

    try {
      await saveCustomer(payload).unwrap()
      toast.success(customerForm.Id ? 'Đã cập nhật khách hàng' : 'Đã thêm khách hàng')
      setCustomerModal(false)
      refetch()
    } catch {
      toast.error('Không thể lưu khách hàng')
    }
  }

  const toggleCustomerStatus = useCallback(async (customer: TPosCustomer) => {
    if (!customer.Id) return
    const nextStatus = customer.Status?.Id === STATUS_ACTIVE ? STATUS_LOCKED : STATUS_ACTIVE
    try {
      await updateCustomerStatus({ id: customer.Id, statusId: nextStatus }).unwrap()
      refetch()
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }, [refetch, updateCustomerStatus])

  const deleteCustomer = useCallback(async (customer: TPosCustomer) => {
    if (!customer.Id) return
    if (!window.confirm(`Xóa khách hàng "${customer.Name}"?`)) return
    try {
      await updateCustomerStatus({ id: customer.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success('Đã xóa khách hàng')
      refetch()
    } catch {
      toast.error('Không thể xóa khách hàng')
    }
  }, [refetch, updateCustomerStatus])

  const openAddGroup = () => {
    setGroupForm({ Name: '' })
    setGroupModal(true)
  }

  const openEditGroup = useCallback(async (group: CustomerGroupNode) => {
    try {
      const response = await request({ url: `customergroups/detail${query({ id: group.Id })}`, method: 'GET' }).unwrap()
      setGroupForm({ Name: '', ...(response?.Data || group) })
      setGroupModal(true)
    } catch {
      setGroupForm({ Id: group.Id, Name: group.Name || '', CustomerCode: group.CustomerCode || '' })
      setGroupModal(true)
    }
  }, [request])

  const saveCustomerGroup = async () => {
    if (!groupForm.Name?.trim()) {
      toast.error('Vui lòng nhập tên nhóm khách hàng')
      return
    }
    try {
      await saveGroup(groupForm).unwrap()
      toast.success(groupForm.Id ? 'Cập nhật nhóm khách hàng thành công' : 'Thêm nhóm khách hàng thành công')
      setGroupModal(false)
      refetchGroups()
      refetch()
    } catch {
      toast.error('Không thể lưu nhóm khách hàng')
    }
  }

  const deleteCustomerGroup = async (group: CustomerGroupNode) => {
    if (!window.confirm(`Xóa nhóm khách hàng "${group.Name}"?`)) return
    try {
      await updateGroupStatus({ id: group.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success('Xóa nhóm khách hàng thành công')
      if (groupId === group.Id) {
        setGroupId(0)
        setPage(1)
      }
      refetchGroups()
    } catch {
      toast.error('Không thể xóa nhóm khách hàng')
    }
  }

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({
        url: `customers/export-excel${query({
          PageIndex: page - 1,
          PageSize: PAGE_SIZE,
          Keyword: keyword || undefined,
          StatusId: statusId === '' ? undefined : statusId,
          CustomerGroupId: groupId || undefined,
        })}`,
      }).unwrap()
      downloadBlob(blob, 'khach-hang.xlsx')
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const columns = useMemo<ColumnDef<TPosCustomer>[]>(() => [
    {
      id: 'stt',
      header: 'STT',
      meta: { className: 'w-14 text-center' },
      cell: ({ row }) => <span className="text-slate-400">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: 'Mã',
      meta: { cellClassName: 'whitespace-nowrap' },
      cell: ({ row }) => <CodeTag value={row.original.CustomerCode || row.original.Code} />,
    },
    {
      id: 'name',
      header: 'Tên',
      accessorFn: row => row.Name ?? '',
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div className="flex min-w-[180px] items-center gap-2">
            <Avatar image={imgUrl(customer.Image?.Url)} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-800">{customer.Name}</div>
              {customer.Phone ? <div className="truncate text-xs text-slate-400">{customer.Phone}</div> : null}
            </div>
          </div>
        )
      },
    },
    {
      id: 'company',
      header: 'Tên ĐV',
      meta: { cellClassName: 'max-w-[160px] truncate text-xs text-slate-600' },
      cell: ({ row }) => row.original.CompanyName || '-',
    },
    {
      id: 'group',
      header: 'Nhóm khách hàng',
      cell: ({ row }) => {
        const customer = row.original
        const groupImage = imgUrl((customer.CustomerGroup as any)?.Image?.Url)
        return (
          <div className="flex min-w-[150px] items-center gap-2">
            {groupImage ? <Avatar image={groupImage} size="sm" /> : null}
            <span className="truncate text-xs">{customer.CustomerGroup?.Name || '-'}</span>
          </div>
        )
      },
    },
    {
      id: 'phone',
      header: 'Điện thoại',
      accessorFn: row => row.Phone ?? '',
      cell: ({ row }) => row.original.Phone || '-',
    },
    {
      id: 'address',
      header: 'Địa chỉ',
      meta: { cellClassName: 'max-w-[190px] truncate text-xs text-slate-500' },
      cell: ({ row }) => row.original.Address || '-',
    },
    {
      id: 'email',
      header: 'Email',
      meta: { cellClassName: 'max-w-[170px] truncate text-xs text-slate-500' },
      cell: ({ row }) => row.original.Email || '-',
    },
    {
      id: 'birthday',
      header: 'Sinh nhật',
      meta: { className: 'text-center whitespace-nowrap' },
      cell: ({ row }) => formatDate(row.original.Birthday),
    },
    {
      id: 'status',
      header: 'Trạng thái',
      meta: { className: 'w-28 text-center' },
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      meta: { className: 'w-28 text-center' },
      cell: ({ row }) => {
        const customer = row.original
        return (
          <div onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditCustomer(customer.Id)}>Chi tiết / sửa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleCustomerStatus(customer)}>
                  {customer.Status?.Id === STATUS_ACTIVE ? 'Tạm khóa' : 'Kích hoạt'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteCustomer(customer)}>
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [deleteCustomer, openEditCustomer, page, toggleCustomerStatus])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <TreeSidebar
          title="Nhóm khách hàng"
          items={sidebarGroups}
          selectedId={groupId}
          searchText={groupSearch}
          searchPlaceholder="Tìm kiếm nhóm..."
          emptyText="Không tìm thấy nhóm khách hàng"
          onSearchTextChange={setGroupSearch}
          onSelect={group => {
            setGroupId(group.Id)
            setPage(1)
          }}
          onCreate={openAddGroup}
          onEditItem={openEditGroup}
          onDeleteItem={deleteCustomerGroup}
          renderMeta={group => group.Id > 0 && group.Image?.Url ? (
            <img src={imgUrl(group.Image.Url) || ''} alt="" className="h-5 w-5 rounded object-cover" />
          ) : null}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <ListToolbar
            searchValue={keyword}
            searchPlaceholder="Tìm kiếm khách hàng..."
            onSearchChange={value => {
              setKeyword(value)
              setPage(1)
            }}
            filters={(
              <select
                value={statusId}
                onChange={event => {
                  setStatusId(event.target.value === '' ? '' : Number(event.target.value))
                  setPage(1)
                }}
                className="h-10 min-w-[150px] rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tất cả TT</option>
                <option value={STATUS_ACTIVE}>Hoạt động</option>
                <option value={STATUS_LOCKED}>Tạm khóa</option>
              </select>
            )}
            actions={(
              <>
                <ToolbarButton tone="neutral" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Nhập
                </ToolbarButton>
                <ToolbarButton tone="neutral" onClick={exportExcel}>
                  <FileDown className="h-4 w-4" />
                  Xuất
                </ToolbarButton>
                <ToolbarButton tone="primary" onClick={openAddCustomer}>
                  <Plus className="h-4 w-4" />
                  Thêm khách hàng
                </ToolbarButton>
              </>
            )}
          />

          <DataTable
            columns={columns}
            data={items}
            loading={isLoading}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowDoubleClick={customer => openEditCustomer(customer.Id)}
            emptyText="Không có khách hàng nào"
          />
        </section>
      </div>

      <CustomerDialog
        open={customerModal}
        form={customerForm}
        setForm={setCustomerForm}
        groups={groups}
        saving={savingCustomer}
        onClose={() => setCustomerModal(false)}
        onSave={saveCustomerForm}
      />

      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{groupForm.Id ? 'Sửa nhóm khách hàng' : 'Thêm nhóm khách hàng'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Tên nhóm" required>
              <Input value={groupForm.Name || ''} onChange={event => setGroupForm(current => ({ ...current, Name: event.target.value }))} />
            </Field>
            <Field label="Đánh mã khách hàng">
              <Input value={groupForm.CustomerCode || ''} onChange={event => setGroupForm(current => ({ ...current, CustomerCode: event.target.value }))} placeholder="VD: KH001" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Chiết khấu (%)">
                <NumberInput value={groupForm.DiscountPercent ?? 0} onChange={v => setGroupForm(current => ({ ...current, DiscountPercent: v }))} />
              </Field>
              <Field label="Điểm">
                <NumberInput value={groupForm.Point ?? 0} onChange={v => setGroupForm(current => ({ ...current, Point: v }))} />
              </Field>
            </div>
            <Field label="Ghi chú">
              <Textarea rows={2} value={groupForm.Note || ''} onChange={event => setGroupForm(current => ({ ...current, Note: event.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Hủy</Button>
            <Button onClick={saveCustomerGroup} disabled={savingGroup}>{savingGroup ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl="customers/get-excel-header"
        dataUrl="customers/get-excel-data"
        importUrl="customers/import-excel"
        onImported={refetch}
      />
    </div>
  )
}

function Avatar({ image, size = 'md' }: { image?: string | null; size?: 'sm' | 'md' }) {
  return (
    <span className={cn(
      'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-slate-50',
      size === 'sm' ? 'h-6 w-6' : 'h-9 w-9',
    )}>
      {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className={cn('text-slate-300', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
    </span>
  )
}

