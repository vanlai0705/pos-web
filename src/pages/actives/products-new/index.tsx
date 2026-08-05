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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
    () => [{ Id: 0, Name: t('pages.actives.productsNewIndex.allGroups') }, ...(groups as ProductGroupNode[])],
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
      toast.error(t('pages.actives.productsNewIndex.cannotUpdateStatus'))
    }
  }

  const deleteProduct = async (product: TPosActiveProduct) => {
    if (!product.Id) return
    if (!window.confirm(t('pages.actives.productsNewIndex.confirmDeleteProduct', { name: product.Name }))) return
    try {
      await updateProductStatus({ id: product.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success(t('pages.actives.productsNewIndex.productDeleted'))
      refetch()
    } catch {
      toast.error(t('pages.actives.productsNewIndex.cannotDeleteProduct'))
    }
  }

  const deleteSelectedProducts = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) {
      toast.warning(t('pages.actives.productsNewIndex.selectProductsToDelete'))
      return
    }
    if (!window.confirm(t('pages.actives.productsNewIndex.confirmDeleteSelectedProducts', { count: ids.length }))) return
    try {
      await request({ url: 'products/patch-delete', method: 'DELETE', body: ids }).unwrap()
      toast.success(t('pages.actives.productsNewIndex.productsDeleted'))
      setSelectedIds(new Set())
      refetch()
    } catch {
      toast.error(t('pages.actives.productsNewIndex.cannotDeleteSelectedProducts'))
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
      toast.error(t('pages.actives.productsNewIndex.enterGroupName'))
      return
    }
    try {
      await saveGroup(groupForm).unwrap()
      toast.success(
        groupForm.Id
          ? t('pages.actives.productsNewIndex.groupUpdated')
          : t('pages.actives.productsNewIndex.groupAdded'),
      )
      setGroupModal(false)
      refetchGroups()
    } catch {
      toast.error(t('pages.actives.productsNewIndex.cannotSaveGroup'))
    }
  }

  const deleteProductGroup = async (group: ProductGroupNode) => {
    if (!window.confirm(t('pages.actives.productsNewIndex.confirmDeleteGroup', { name: group.Name }))) return
    try {
      await updateGroupStatus({ id: group.Id, statusId: STATUS_DELETED }).unwrap()
      toast.success(t('pages.actives.productsNewIndex.groupDeleted'))
      if (groupId === group.Id) {
        setGroupId(0)
        setPage(1)
      }
      refetchGroups()
    } catch {
      toast.error(t('pages.actives.productsNewIndex.cannotDeleteGroup'))
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
      toast.error(t('pages.actives.productsNewIndex.cannotExportExcel'))
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
      header: t('common.image'),
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
      header: t('common.productCode'),
      meta: { cellClassName: 'whitespace-nowrap' },
      cell: ({ row }) => <CodeTag value={row.original.ProductCode || row.original.Code} />,
    },
    {
      id: 'name',
      header: t('common.name'),
      meta: { cellClassName: 'font-semibold text-slate-800 min-w-[160px]' },
      cell: ({ row }) => row.original.Name,
    },
    {
      id: 'unit',
      header: t('pages.actives.productsNewIndex.unitColumn'),
      meta: { cellClassName: 'text-xs' },
      cell: ({ row }) => row.original.Unit?.Name || '-',
    },
    {
      id: 'group',
      header: t('common.group'),
      meta: { cellClassName: 'text-xs' },
      cell: ({ row }) => row.original.ProductGroup?.Name || '-',
    },
    {
      id: 'note',
      header: t('common.note'),
      meta: { cellClassName: 'max-w-[160px] truncate text-xs text-slate-500' },
      cell: ({ row }) => row.original.Note || '-',
    },
    {
      id: 'price',
      header: t('common.salePrice'),
      meta: { className: 'text-right', cellClassName: 'text-right font-medium text-indigo-600' },
      cell: ({ row }) => <MoneyTag value={row.original.Price || 0} />,
    },
    {
      id: 'inputPrice',
      header: t('common.inputPrice'),
      meta: { className: 'text-right', cellClassName: 'text-right' },
      cell: ({ row }) => <MoneyTag value={row.original.PriceInput ?? row.original.ImportPrice ?? 0} />,
    },
    {
      id: 'quantity',
      header: t('common.inventory'),
      meta: { className: 'text-right', cellClassName: 'text-right font-medium' },
      cell: ({ row }) => (row.original.Quantity || 0).toLocaleString('vi-VN'),
    },
    {
      id: 'status',
      header: t('common.statusShort'),
      meta: { className: 'w-24 text-center' },
      cell: ({ row }) => <StatusBadge status={row.original.Status} />,
    },
    {
      id: 'actions',
      header: t('common.actions'),
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
                <DropdownMenuItem onClick={() => openEditProductById(product.Id)}>{t('common.detailEdit')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toggleProductStatus(product)}>
                  {product.Status?.Id === STATUS_ACTIVE ? t('common.lock') : t('common.activate')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteProduct(product)}>
                  {t('pages.actives.productsNewIndex.deleteAction')}
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
          title={t('pages.actives.productsNewIndex.sidebarTitle')}
          items={sidebarGroups}
          selectedId={groupId}
          searchText={groupSearch}
          searchPlaceholder={t('pages.actives.productsNewIndex.groupSearchPlaceholder')}
          emptyText={t('pages.actives.productsNewIndex.groupEmptyText')}
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
                {t('pages.actives.productsNewIndex.deleteSelected', { count: selectedIds.size })}
              </ToolbarButton>
            )}
            searchValue={keyword}
            searchPlaceholder={t('pages.actives.productsNewIndex.productSearchPlaceholder')}
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
                <option value="">{t('pages.actives.productsNewIndex.allStatusShort')}</option>
                <option value={STATUS_ACTIVE}>{t('common.active')}</option>
                <option value={STATUS_LOCKED}>{t('common.lock')}</option>
              </select>
            )}
            actions={(
              <>
                <ToolbarButton tone="neutral" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" />
                  {t('common.import')}
                </ToolbarButton>
                <ToolbarButton tone="neutral" onClick={exportExcel}>
                  <FileDown className="h-4 w-4" />
                  {t('common.export')}
                </ToolbarButton>
                <ToolbarButton tone="primary" onClick={openAddProduct}>
                  <Plus className="h-4 w-4" />
                  {t('common.addNew')}
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
            emptyText={t('pages.actives.productsNewIndex.noProductsFound')}
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
          <DialogHeader>
            <DialogTitle>
              {groupForm.Id
                ? t('pages.actives.productsNewIndex.editProductGroupTitle')
                : t('pages.actives.productsNewIndex.addProductGroupTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t('common.groupName')} <span className="text-destructive">*</span></Label>
            <Input value={groupForm.Name || ''} onChange={event => setGroupForm(current => ({ ...current, Name: event.target.value }))} />
            <Label>{t('common.note')}</Label>
            <Textarea value={groupForm.Note || ''} onChange={event => setGroupForm(current => ({ ...current, Note: event.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveProductGroup} disabled={savingGroup}>
              {savingGroup ? t('pages.actives.productsNewIndex.savingLabel') : t('common.save')}
            </Button>
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

