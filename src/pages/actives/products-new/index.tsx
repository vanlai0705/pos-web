import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FileDown,
  Image as ImageIcon,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { CodeTag, MoneyTag } from '@/components/ui/data-tag'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProductDialog } from './product-dialog'
import {
  useFilterActiveProductsQuery,
  useGenericDownloadMutation,
  useGenericPostMutation,
  useGetProductGroupsSimpleQuery,
  useSaveProductGroupMutation,
  useUpdateActiveProductStatusMutation,
  useUpdateProductGroupStatusMutation,
} from '@/store/slice/users/api/api'
import type { TPosActiveProduct, TPosProductGroupFull } from '@/store/slice/users/types/pos-types'
import { query, downloadBlob } from '@/utils'
import { getImageUrl } from '@/utils/common'
import { ExcelImportDialog } from '@/components/pos/excel-import-dialog'

const PAGE_SIZE = 15
const STATUS_ACTIVE = 0
const STATUS_LOCKED = 1
const STATUS_DELETED = 2

interface ProductGroupNode extends TreeSidebarNode {
  Image?: { Url?: string }
}

function imgUrl(url?: string | null) {
  return getImageUrl(url ?? undefined) ?? null
}

export default function ProductsNewPage() {
  const { guid } = useParams()
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [statusId, setStatusId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [groupSearch, setGroupSearch] = useState('')

  const [productModal, setProductModal] = useState(false)
  const [editingProductId, setEditingProductId] = useState<number | null>(null)

  const [groupModal, setGroupModal] = useState(false)
  const [groupForm, setGroupForm] = useState<TPosProductGroupFull>({ Name: '' })

  const [importOpen, setImportOpen] = useState(false)

  const { data, isLoading, refetch } = useFilterActiveProductsQuery({
    PageIndex: page - 1,
    PageSize: PAGE_SIZE,
    Keyword: keyword || undefined,
    StatusId: statusId === '' ? undefined : statusId,
    ProductGroupId: groupId || undefined,
  } as any)
  const { data: groups = [], refetch: refetchGroups } = useGetProductGroupsSimpleQuery()
  const [updateProductStatus] = useUpdateActiveProductStatusMutation()
  const [saveGroup, { isLoading: savingGroup }] = useSaveProductGroupMutation()
  const [updateGroupStatus] = useUpdateProductGroupStatusMutation()
  const [request] = useGenericPostMutation()
  const [downloadFile] = useGenericDownloadMutation()

  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  const sidebarGroups = useMemo<ProductGroupNode[]>(
    () => [{ Id: 0, Name: 'Tất cả nhóm' }, ...(groups as ProductGroupNode[])],
    [groups],
  )

  useEffect(() => {
    setSelectedIds(new Set())
  }, [data])

  const openAddProduct = () => {
    setEditingProductId(null)
    setProductModal(true)
  }

  const openEditProductById = (id?: number) => {
    if (!id) return
    setEditingProductId(id)
    setProductModal(true)
  }

  useEffect(() => {
    if (!guid) return
    openEditProductById(Number(guid))
  }, [guid])

  const toggleProductStatus = async (product: TPosActiveProduct) => {
    if (!product.Id) return
    const nextStatus = product.Status?.Id === STATUS_ACTIVE ? STATUS_LOCKED : STATUS_ACTIVE
    try {
      await updateProductStatus({ id: product.Id, statusId: nextStatus }).unwrap()
      refetch()
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }

  const deleteProduct = async (product: TPosActiveProduct) => {
    if (!product.Id) return
    if (!window.confirm(`Xóa mặt hàng "${product.Name}"?`)) return
    try {
      await updateProductStatus({ id: product.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success('Đã xóa mặt hàng')
      refetch()
    } catch {
      toast.error('Không thể xóa mặt hàng')
    }
  }

  const deleteSelectedProducts = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.warning('Vui lòng chọn mặt hàng cần xóa')
      return
    }
    if (!window.confirm(`Xóa ${ids.length} mặt hàng đã chọn?`)) return
    try {
      await request({ url: 'products/patch-delete', method: 'DELETE', body: ids }).unwrap()
      toast.success('Xóa mặt hàng thành công')
      setSelectedIds(new Set())
      refetch()
    } catch {
      toast.error('Không thể xóa mặt hàng đã chọn')
    }
  }

  const openAddGroup = () => {
    setGroupForm({ Name: '' })
    setGroupModal(true)
  }

  const openEditGroup = (group: ProductGroupNode) => {
    setGroupForm({ Id: group.Id, Name: group.Name || '' })
    setGroupModal(true)
  }

  const saveProductGroup = async () => {
    if (!groupForm.Name?.trim()) {
      toast.error('Vui lòng nhập tên nhóm mặt hàng')
      return
    }
    try {
      await saveGroup(groupForm).unwrap()
      toast.success(groupForm.Id ? 'Cập nhật nhóm thành công' : 'Thêm nhóm thành công')
      setGroupModal(false)
      refetchGroups()
    } catch {
      toast.error('Không thể lưu nhóm mặt hàng')
    }
  }

  const deleteProductGroup = async (group: ProductGroupNode) => {
    if (!window.confirm(`Xóa nhóm mặt hàng "${group.Name}"?`)) return
    try {
      await updateGroupStatus({ id: group.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success('Xóa nhóm mặt hàng thành công')
      if (groupId === group.Id) {
        setGroupId(0)
        setPage(1)
      }
      refetchGroups()
    } catch {
      toast.error('Không thể xóa nhóm mặt hàng')
    }
  }

  const exportExcel = async () => {
    try {
      const blob = await downloadFile({
        url: `products/export-excel${query({
          PageIndex: page - 1,
          PageSize: PAGE_SIZE,
          Keyword: keyword || undefined,
          StatusId: statusId === '' ? undefined : statusId,
          ProductGroupId: groupId || undefined,
        })}`,
      }).unwrap()
      downloadBlob(blob, 'mat-hang.xlsx')
    } catch {
      toast.error('Không thể xuất Excel')
    }
  }

  const isAllChecked = items.length > 0 && items.every(item => item.Id && selectedIds.has(item.Id))
  const isIndeterminate = items.some(item => item.Id && selectedIds.has(item.Id)) && !isAllChecked

  const toggleAll = (checked: boolean) => {
    setSelectedIds(current => {
      const next = new Set(current)
      items.forEach(item => {
        if (!item.Id) return
        if (checked) next.add(item.Id)
        else next.delete(item.Id)
      })
      return next
    })
  }

  const toggleOne = (id: number, checked: boolean) => {
    setSelectedIds(current => {
      const next = new Set(current)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const productColumns: ColumnDef<TPosActiveProduct>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={isAllChecked}
          ref={input => {
            if (input) input.indeterminate = isIndeterminate
          }}
          onChange={event => toggleAll(event.target.checked)}
        />
      ),
      meta: { className: 'w-10 text-center' },
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={!!row.original.Id && selectedIds.has(row.original.Id)}
          onChange={event => row.original.Id && toggleOne(row.original.Id, event.target.checked)}
          onClick={event => event.stopPropagation()}
        />
      ),
    },
    {
      id: 'stt',
      header: '#',
      meta: { className: 'w-14 text-center' },
      cell: ({ row }) => <span className="text-slate-400">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'image',
      header: 'Hình',
      meta: { className: 'w-16 text-center' },
      cell: ({ row }) => {
        const image = imgUrl(row.original.Images?.[0]?.Url || row.original.Image?.Url)
        return image ? (
          <img src={image} alt="" className="mx-auto h-9 w-9 rounded-md border object-cover" />
        ) : (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-md border bg-slate-50">
            <ImageIcon className="h-4 w-4 text-slate-300" />
          </div>
        )
      },
    },
    {
      id: 'code',
      header: 'Mã hàng',
      meta: { cellClassName: 'whitespace-nowrap' },
      cell: ({ row }) => <CodeTag value={row.original.ProductCode || row.original.Code} />,
    },
    {
      id: 'name',
      header: 'Tên',
      meta: { cellClassName: 'font-semibold text-slate-800 min-w-[160px]' },
      cell: ({ row }) => row.original.Name,
    },
    {
      id: 'unit',
      header: 'ĐVT',
      meta: { cellClassName: 'text-xs' },
      cell: ({ row }) => row.original.Unit?.Name || '-',
    },
    {
      id: 'group',
      header: 'Nhóm',
      meta: { cellClassName: 'text-xs' },
      cell: ({ row }) => row.original.ProductGroup?.Name || '-',
    },
    {
      id: 'note',
      header: 'Ghi chú',
      meta: { cellClassName: 'max-w-[160px] truncate text-xs text-slate-500' },
      cell: ({ row }) => row.original.Note || '-',
    },
    {
      id: 'price',
      header: 'Giá bán',
      meta: { className: 'text-right', cellClassName: 'text-right font-medium text-indigo-600' },
      cell: ({ row }) => <MoneyTag value={row.original.Price || 0} />,
    },
    {
      id: 'inputPrice',
      header: 'Giá nhập',
      meta: { className: 'text-right', cellClassName: 'text-right' },
      cell: ({ row }) => <MoneyTag value={row.original.PriceInput ?? row.original.ImportPrice ?? 0} />,
    },
    {
      id: 'quantity',
      header: 'Tồn',
      meta: { className: 'text-right', cellClassName: 'text-right font-medium' },
      cell: ({ row }) => (row.original.Quantity || 0).toLocaleString('vi-VN'),
    },
    {
      id: 'status',
      header: 'TT',
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: 'Thao tác',
      meta: { className: 'w-28 text-center' },
      cell: ({ row }) => {
        const product = row.original
        return (
          <div onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditProductById(product.Id)}>Chi tiết / sửa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleProductStatus(product)}>
                  {product.Status?.Id === STATUS_ACTIVE ? 'Khóa' : 'Kích hoạt'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteProduct(product)}>
                  Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <TreeSidebar
          title="Nhóm mặt hàng"
          items={sidebarGroups}
          selectedId={groupId}
          searchText={groupSearch}
          searchPlaceholder="Tìm kiếm nhóm..."
          emptyText="Không tìm thấy nhóm sản phẩm"
          onSearchTextChange={setGroupSearch}
          onSelect={group => {
            setGroupId(group.Id)
            setPage(1)
          }}
          onCreate={openAddGroup}
          onEditItem={openEditGroup}
          onDeleteItem={deleteProductGroup}
          renderMeta={group => group.Id > 0 && group.Image?.Url ? (
            <img src={imgUrl(group.Image.Url) || ''} alt="" className="h-5 w-5 rounded object-cover" />
          ) : null}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <ListToolbar
            left={(
              <ToolbarButton tone="danger" disabled={selectedIds.size === 0} onClick={deleteSelectedProducts}>
                <Trash2 className="h-4 w-4" />
                Xóa đã chọn ({selectedIds.size})
              </ToolbarButton>
            )}
            searchValue={keyword}
            searchPlaceholder="Tìm kiếm mặt hàng..."
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
                <option value={STATUS_LOCKED}>Khóa</option>
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
                <ToolbarButton tone="primary" onClick={openAddProduct}>
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </ToolbarButton>
              </>
            )}
          />

          <DataTable
            columns={productColumns}
            data={items}
            loading={isLoading}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowDoubleClick={product => openEditProductById(product.Id)}
            emptyText="Không có mặt hàng nào"
          />
        </section>
      </div>

      <ProductDialog
        open={productModal}
        productId={editingProductId}
        defaultGroupId={groupId || undefined}
        groups={groups}
        onClose={() => setProductModal(false)}
        onSaved={refetch}
      />

      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{groupForm.Id ? 'Sửa nhóm mặt hàng' : 'Thêm nhóm mặt hàng'}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Tên nhóm <span className="text-destructive">*</span></Label>
            <Input value={groupForm.Name || ''} onChange={event => setGroupForm(current => ({ ...current, Name: event.target.value }))} />
            <Label>Ghi chú</Label>
            <Textarea value={groupForm.Note || ''} onChange={event => setGroupForm(current => ({ ...current, Note: event.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Hủy</Button>
            <Button onClick={saveProductGroup} disabled={savingGroup}>{savingGroup ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExcelImportDialog
        open={importOpen} onOpenChange={setImportOpen}
        headerUrl="products/get-excel-header"
        dataUrl="products/get-excel-data"
        importUrl="products/import-excel"
        onImported={refetch}
      />
    </div>
  )
}

