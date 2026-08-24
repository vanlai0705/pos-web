import { ListToolbar, ToolbarButton } from '@/components/layout/list-toolbar'
import { TreeSidebar, type TreeSidebarNode } from '@/components/layout/tree-sidebar'
import { ExcelImportDialog } from '@/components/pos/excel-import-dialog'
import { emptySupplier, SupplierDialog, type TSupplier } from '@/components/pos/supplier-form-dialog'
import { Button } from '@/components/ui/button'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag } from '@/components/ui/data-tag'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PosImage } from '@/components/ui/pos-image'
import { Textarea } from '@/components/ui/textarea'
import { confirmAction } from '@/components/ui/use-confirm-action'
import { STATUS } from '@/constants/status'
import { PAGE_SIZE, StatusBadge } from '@/pages/actives/shared'
import { RowActions } from '@/pages/managers/components'
import { useFilterSupplierGroupsQuery, useLazyGetSupplierGroupDetailQuery, useSaveSupplierGroupMutation, useUpdateSupplierGroupStatusMutation } from '@/store/slice/managers/api'
import { useFilterReportQuery, useGenericDownloadMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import type { TPosSupplierGroup } from '@/store/slice/users'
import { downloadBlob, query } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { Download, Plus, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

interface SupplierGroupNode extends TreeSidebarNode {
  Image?: { Url?: string }
}

export default function SuppliersPage() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number>(0)
  const [groupSearch, setGroupSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<TSupplier>(emptySupplier())
  const [importOpen, setImportOpen] = useState(false)

  const [groupModal, setGroupModal] = useState(false)
  const [groupForm, setGroupForm] = useState<TPosSupplierGroup>({ Name: '' })

  const { data, isLoading, refetch } = useFilterReportQuery({
    path: 'suppliers/filter',
    params: { Keyword: keyword || undefined, StatusId: statusId || undefined, SupplierGroupId: groupId || undefined, PageIndex: page - 1, PageSize: pageSize },
  })
  const { data: groupsData, isLoading: loadingGroups, refetch: refetchGroups } = useFilterSupplierGroupsQuery({ PageIndex: 0, PageSize: 1000, StatusId: STATUS.ACTIVE })
  const [fetchDetail] = useLazyGenericGetQuery()
  const [downloadFile, { isLoading: exporting }] = useGenericDownloadMutation()
  const [getGroupDetail] = useLazyGetSupplierGroupDetailQuery()
  const [saveGroup, { isLoading: savingGroup }] = useSaveSupplierGroupMutation()
  const [updateGroupStatus] = useUpdateSupplierGroupStatusMutation()

  const groups = useMemo(() => (groupsData?.Items ?? []) as SupplierGroupNode[], [groupsData])
  const sidebarGroups = useMemo<SupplierGroupNode[]>(
    () => [{ Id: 0, Name: 'Tất cả' }, ...groups],
    [groups],
  )

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({
        url: `suppliers/export-excel${query({
          Keyword: keyword || undefined,
          StatusId: statusId === '' ? undefined : statusId,
          SupplierGroupId: groupId || undefined,
          PageIndex: page - 1,
          PageSize: pageSize,
        })}`,
      }).unwrap()
      downloadBlob(blob, 'nha-cung-cap.xlsx')
      toast.success('Xuất Excel thành công')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const { mutate: save, isLoading: saving } = useApiMutation(
    (body: TSupplier) => ({ url: body.Id ? 'suppliers/update' : 'suppliers/create', method: 'POST' as const, body: buildModelFormData(body) }),
    {
      onSuccess: () => { toast.success(form.Id ? 'Đã cập nhật NCC' : 'Đã thêm NCC'); setModal(false); setForm(emptySupplier()); refetch() },
      onError: () => toast.error('Không thể lưu nhà cung cấp'),
    }
  )

  const { mutate: toggleStatus } = useApiMutation(
    ({ id, statusId }: { id: number; statusId: number }) => ({ url: `suppliers/update-status?id=${id}&statusId=${statusId}`, method: 'POST' as const, body: {} }),
    { onSuccess: refetch, onError: () => toast.error('Không thể cập nhật trạng thái') }
  )

  const changeStatus = async (id: number, statusId: number) => {
    if (statusId === STATUS.DELETED && !await confirmAction({ description: 'Xoá nhà cung cấp này?' })) return
    toggleStatus({ id, statusId })
  }

  // The filter row is missing `Note` (SupplierModel has no note property) —
  // opening edit re-fetches the full SupplierDetailModel.
  const openEdit = async (row: TSupplier) => {
    if (!row.Id) return
    try {
      const res = await fetchDetail({ url: 'suppliers/detail', params: { id: row.Id } }).unwrap()
      setForm({ ...emptySupplier(), ...((res?.Data ?? row) as TSupplier) })
      setModal(true)
    } catch {
      setForm(row)
      setModal(true)
    }
  }

  const openAddGroup = () => {
    setGroupForm({ Name: '' })
    setGroupModal(true)
  }

  const openEditGroup = async (group: SupplierGroupNode) => {
    try {
      const detail = await getGroupDetail(group.Id).unwrap()
      setGroupForm(detail ?? { Id: group.Id, Name: group.Name || '' })
    } catch {
      setGroupForm({ Id: group.Id, Name: group.Name || '' })
    }
    setGroupModal(true)
  }

  const saveSupplierGroup = async () => {
    if (!groupForm.Name?.trim()) { toast.error('Vui lòng nhập tên nhóm'); return }
    try {
      await saveGroup(groupForm).unwrap()
      toast.success(groupForm.Id ? 'Đã cập nhật nhóm' : 'Đã thêm nhóm')
      setGroupModal(false)
      refetchGroups()
      refetch()
    } catch {
      toast.error('Không thể lưu nhóm nhà cung cấp')
    }
  }

  const deleteSupplierGroup = async (group: SupplierGroupNode) => {
    if (!await confirmAction({ description: `Xoá nhóm nhà cung cấp "${group.Name}"?` })) return
    try {
      await updateGroupStatus({ id: group.Id, statusId: STATUS.DELETED }).unwrap()
      toast.success('Đã xoá nhóm nhà cung cấp')
      if (groupId === group.Id) { setGroupId(0); setPage(1) }
      refetchGroups()
    } catch {
      toast.error('Không thể xoá nhóm nhà cung cấp')
    }
  }

  const items = (data?.Items ?? []) as TSupplier[]
  const total = data?.TotalItemCount ?? 0

  const columns: ColumnDef<TSupplier>[] = [
    { id: 'stt', header: 'STT', cell: ({ row }) => <span className="text-muted-foreground">{(page - 1) * pageSize + row.index + 1}</span> },
    { id: 'code', header: 'Mã NCC', cell: ({ row }) => <CodeTag value={row.original.SupplierCode} /> },
    { id: 'name', header: 'Tên nhà cung cấp', cell: ({ row }) => <span className="font-medium">{row.original.Name}</span> },
    { id: 'group', header: 'Nhóm', cell: ({ row }) => <span className="text-xs">{row.original.SupplierGroup?.Name ?? '—'}</span> },
    { id: 'phone', header: 'Điện thoại', cell: ({ row }) => <span className="text-sm">{row.original.Phone ?? '—'}</span> },
    { id: 'email', header: 'Email', cell: ({ row }) => <span className="text-xs">{row.original.Email ?? '—'}</span> },
    { id: 'address', header: 'Địa chỉ', cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.Address ?? '—'}</span> },
    { id: 'status', header: 'TT', cell: ({ row }) => <StatusBadge status={row.original.Status} /> },
    {
      id: 'actions', header: 'Thao tác',
      cell: ({ row }) => {
        const item = row.original
        if (!item.Id) return null
        return (
          <RowActions
            statusId={item.Status?.Id}
            onEdit={() => openEdit(item)}
            onActivate={() => changeStatus(item.Id!, STATUS.ACTIVE)}
            onLock={() => changeStatus(item.Id!, STATUS.LOCKED)}
            onDelete={() => changeStatus(item.Id!, STATUS.DELETED)}
          />
        )
      },
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <TreeSidebar
          title="Nhóm nhà cung cấp"
          items={sidebarGroups}
          selectedId={groupId}
          searchText={groupSearch}
          searchPlaceholder="Tìm nhóm nhà cung cấp..."
          loading={loadingGroups}
          emptyText="Không tìm thấy nhóm nhà cung cấp"
          onSearchTextChange={setGroupSearch}
          onSelect={group => { setGroupId(group.Id); setPage(1) }}
          onCreate={openAddGroup}
          onEditItem={openEditGroup}
          onDeleteItem={deleteSupplierGroup}
          renderMeta={group => group.Id > 0 && group.Image?.Url ? (
            <PosImage url={group.Image.Url} alt="" className="h-5 w-5 rounded object-cover" />
          ) : null}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <ListToolbar
            searchValue={keyword}
            searchPlaceholder="Tìm nhà cung cấp..."
            onSearchChange={value => { setKeyword(value); setPage(1) }}
            filters={(
              <select value={statusId} onChange={e => { setStatusId(e.target.value === '' ? '' : Number(e.target.value)); setPage(1) }}
                className="h-10 min-w-[150px] rounded-md border bg-background px-3 text-sm font-semibold shadow-sm outline-none focus:ring-2 focus:ring-ring">
                <option value="">Tất cả TT</option>
                <option value={STATUS.ACTIVE}>Hoạt động</option>
                <option value={STATUS.LOCKED}>Đã khoá</option>
              </select>
            )}
            actions={(
              <>
                <ToolbarButton tone="neutral" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Nhập
                </ToolbarButton>
                <ToolbarButton tone="neutral" disabled={exporting} onClick={exportExcel}>
                  <Download className="h-4 w-4" />
                  Xuất
                </ToolbarButton>
                <ToolbarButton tone="primary" onClick={() => { setForm(emptySupplier()); setModal(true) }}>
                  <Plus className="h-4 w-4" />
                  Thêm NCC
                </ToolbarButton>
              </>
            )}
          />

          <DataTable columns={columns} data={items} loading={isLoading} total={total} page={page} pageSize={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} onRowDoubleClick={openEdit} emptyText="Không có nhà cung cấp nào" />
        </section>
      </div>

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl="suppliers/get-excel-header"
        dataUrl="suppliers/get-excel-data"
        importUrl="suppliers/import-excel"
        onImported={refetch}
      />

      <SupplierDialog
        open={modal}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setModal(false)}
        onSave={() => { if (!form.Name?.trim()) { toast.error('Vui lòng nhập tên'); return } save(form) }}
      />

      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{groupForm.Id ? 'Chỉnh sửa nhóm nhà cung cấp' : 'Thêm nhóm nhà cung cấp'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Tên nhóm <span className="text-destructive">*</span></Label>
              <Input value={groupForm.Name} onChange={e => setGroupForm(f => ({ ...f, Name: e.target.value }))} placeholder="Tên nhóm nhà cung cấp" />
            </div>
            <div className="space-y-1">
              <Label>Ghi chú</Label>
              <Textarea rows={2} value={groupForm.Note ?? ''} onChange={e => setGroupForm(f => ({ ...f, Note: e.target.value }))} placeholder="Ghi chú" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Huỷ</Button>
            <Button onClick={saveSupplierGroup} disabled={savingGroup}>{savingGroup ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
