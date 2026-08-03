import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, FileText, MoreHorizontal, Plus, RefreshCw, Upload } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import {
  useGenericDownloadMutation,
  useGenericPostMutation,
} from '@/store/slice/users/api/api'
import { cn, query, downloadBlob } from '@/utils'
import { buildModelFormData } from '@/utils/multipart'

const PAGE_SIZE = 10
const STATUS_ACTIVE = 0
const STATUS_LOCKED = 1
const REPORT_TEMPLATE_PRODUCT = 0
const MAX_FILE_SIZE_MB = 10

const TEMPLATE_TYPE_OPTIONS = [
  { Value: 0, Name: 'Báo cáo theo mặt hàng' },
  { Value: 1, Name: 'Báo cáo theo đơn hàng' },
  { Value: 2, Name: 'Báo cáo tiền theo tháng' },
]

interface InvoiceTemplateGroup extends TreeSidebarNode {
  ParentId?: number
  SortOrder?: number
  IsSystem?: boolean
  IsActive?: boolean
  Parent?: { Id?: number; Code?: string; Name?: string }
}

interface InvoiceTemplate {
  Id?: number
  TemplateGroupId?: number
  TemplateType?: number
  Code?: string
  Name?: string
  IsDefault?: boolean
  IsActive?: boolean
  Description?: string
  FileName?: string
  OriginalFileName?: string
  FileExtension?: string
  ContentType?: string
  FilePath?: string
  FileSize?: number
  IsLocked?: boolean
  VersionNo?: number
  TemplateGroup?: { Id?: number; Code?: string; Name?: string }
  FileContent?: string
  PasswordHash?: string
  Files?: Array<{ Id?: number; Url?: string }>
}

interface CloneTenantOption {
  Value: number
  Name: string
  SearchText: string
}

function emptyGroup(): InvoiceTemplateGroup {
  return {
    Id: 0,
    Code: '',
    Name: '',
    ParentId: 0,
    SortOrder: 0,
    IsSystem: true,
    IsActive: true,
    Childrens: [],
    Childrents: [],
  }
}

function emptyTemplate(): InvoiceTemplate {
  return {
    Id: 0,
    TemplateGroupId: 0,
    TemplateType: REPORT_TEMPLATE_PRODUCT,
    Code: '',
    Name: '',
    IsDefault: false,
    IsActive: true,
    Description: '',
    FileName: '',
    OriginalFileName: '',
    FileExtension: '',
    ContentType: '',
    FilePath: '',
    FileSize: 0,
    IsLocked: false,
    VersionNo: 0,
    Files: [],
  }
}

function getChildren(item?: InvoiceTemplateGroup) {
  return item?.Childrents || item?.Childrens || []
}

function flattenGroups(groups: InvoiceTemplateGroup[]): InvoiceTemplateGroup[] {
  return groups.reduce<InvoiceTemplateGroup[]>((items, group) => {
    items.push(group)
    items.push(...flattenGroups(getChildren(group)))
    return items
  }, [])
}

function getTemplateTypeName(value?: number) {
  return TEMPLATE_TYPE_OPTIONS.find(item => item.Value === Number(value))?.Name || '-'
}

function getFileExtension(fileName: string) {
  const parts = fileName.split('.')
  return parts.length > 1 ? `.${parts.pop()}` : ''
}

export default function TemplatesPage() {
  const [groups, setGroups] = useState<InvoiceTemplateGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState(0)
  const [selectedTemplateId, setSelectedTemplateId] = useState(0)
  const [groupSearchText, setGroupSearchText] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusId, setStatusId] = useState<number | ''>('')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([])

  const [groupModal, setGroupModal] = useState(false)
  const [groupParent, setGroupParent] = useState<InvoiceTemplateGroup | null>(null)
  const [groupForm, setGroupForm] = useState<InvoiceTemplateGroup>(emptyGroup())

  const [templateModal, setTemplateModal] = useState(false)
  const [templateForm, setTemplateForm] = useState<InvoiceTemplate>(emptyTemplate())
  const [templateFile, setTemplateFile] = useState<File | null>(null)
  const [templateFileName, setTemplateFileName] = useState('')

  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [cloneModal, setCloneModal] = useState(false)
  const [cloneSourceTemplate, setCloneSourceTemplate] = useState<InvoiceTemplate | null>(null)
  const [cloneTargetTenantId, setCloneTargetTenantId] = useState(0)
  const [cloneTenantOptions, setCloneTenantOptions] = useState<CloneTenantOption[]>([])
  const [cloneLoading, setCloneLoading] = useState(false)

  const templateInputRef = useRef<HTMLInputElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const [request] = useGenericPostMutation()
  const [downloadTemplate, { isLoading: exporting }] = useGenericDownloadMutation()

  const selectedGroup = useMemo(
    () => flattenGroups(groups).find(group => Number(group.Id) === Number(selectedGroupId)),
    [groups, selectedGroupId],
  )
  const groupOptions = useMemo(() => flattenGroups(groups), [groups])

  const filteredTemplates = useMemo(() => {
    let items = [...templates]
    const normalizedKeyword = keyword.trim().toLowerCase()

    if (normalizedKeyword) {
      items = items.filter(item =>
        [item.Name, item.Code, item.Description, item.TemplateGroup?.Name, getTemplateTypeName(item.TemplateType)]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(normalizedKeyword)),
      )
    }

    if (statusId !== '') {
      const active = statusId === STATUS_ACTIVE
      items = items.filter(item => !!item.IsActive === active)
    }

    if (sort) {
      items.sort((left, right) => {
        const leftValue = getSortValue(left, sort.key, selectedGroup?.Name)
        const rightValue = getSortValue(right, sort.key, selectedGroup?.Name)
        const compared = `${leftValue}`.localeCompare(`${rightValue}`, undefined, { numeric: true, sensitivity: 'base' })
        return sort.desc ? compared * -1 : compared
      })
    }

    return items
  }, [keyword, selectedGroup?.Name, sort, statusId, templates])

  const pagedTemplates = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredTemplates.slice(start, start + PAGE_SIZE)
  }, [filteredTemplates, page])

  const selectedTemplate = templates.find(item => Number(item.Id) === Number(selectedTemplateId))

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true)
    try {
      const response = await request({ url: 'report-template-groups/get-list', method: 'GET' }).unwrap()
      const nextGroups = (response?.Data?.Items || response?.Data || []) as InvoiceTemplateGroup[]
      const flat = flattenGroups(nextGroups)
      setGroups(nextGroups)
      setSelectedGroupId(current => flat.some(item => item.Id === current) ? current : flat[0]?.Id || 0)
    } catch {
      toast.error('Không thể tải nhóm mẫu hóa đơn')
    } finally {
      setGroupsLoading(false)
    }
  }, [request])

  const loadTemplatesByGroup = useCallback(async (groupId: number) => {
    setTemplatesLoading(true)
    setSelectedTemplateId(0)
    try {
      const response = await request({
        url: `report-templates/filter${groupId ? query({ TemplateGroupId: groupId }) : ''}`,
        method: 'GET',
      }).unwrap()
      setTemplates((response?.Data?.Items || []) as InvoiceTemplate[])
    } catch {
      setTemplates([])
      toast.error('Không thể tải mẫu hóa đơn')
    } finally {
      setTemplatesLoading(false)
    }
  }, [request])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    loadTemplatesByGroup(selectedGroupId)
  }, [loadTemplatesByGroup, selectedGroupId])

  useEffect(() => {
    setPage(1)
    setSelectedTemplateId(0)
  }, [selectedGroupId, keyword, statusId])

  const openCreateGroup = () => {
    setGroupParent(null)
    setGroupForm(emptyGroup())
    setGroupModal(true)
  }

  const openCreateChildGroup = (parent: InvoiceTemplateGroup) => {
    setGroupParent(parent)
    setGroupForm({
      ...emptyGroup(),
      ParentId: parent.Id,
      Parent: { Id: parent.Id, Code: parent.Code, Name: parent.Name },
    })
    setGroupModal(true)
  }

  const openEditGroup = async (group = selectedGroup) => {
    if (!group?.Id) {
      toast.error('Vui lòng chọn nhóm mẫu cần sửa')
      return
    }
    try {
      setSelectedGroupId(group.Id)
      const response = await request({ url: `report-template-groups/detail${query({ id: group.Id })}`, method: 'GET' }).unwrap()
      const detail = response?.Data || group
      setGroupParent(null)
      setGroupForm({
        ...emptyGroup(),
        ...detail,
        ParentId: detail.ParentId ?? group.ParentId ?? 0,
        Childrens: detail.Childrens || detail.Childrents || [],
        Childrents: detail.Childrents || detail.Childrens || [],
      })
      setGroupModal(true)
    } catch {
      toast.error('Không lấy được chi tiết nhóm mẫu')
    }
  }

  const saveGroup = async () => {
    if (!groupForm.Name?.trim()) {
      toast.error('Vui lòng nhập tên nhóm mẫu')
      return
    }

    const isUpdate = !!groupForm.Id
    const payload = isUpdate
      ? {
          Id: groupForm.Id,
          Code: groupForm.Code || '',
          Name: groupForm.Name || '',
          ParentId: groupForm.ParentId ?? 0,
          SortOrder: groupForm.SortOrder ?? 0,
          IsSystem: !!groupForm.IsSystem,
          IsActive: !!groupForm.IsActive,
          Parent: groupForm.ParentId ? groupForm.Parent : undefined,
        }
      : {
          Code: groupForm.Code || '',
          Name: groupForm.Name || '',
          ParentId: groupParent?.Id || 0,
          SortOrder: groupForm.SortOrder ?? 0,
          IsSystem: !!groupForm.IsSystem,
          IsActive: !!groupForm.IsActive,
          Parent: groupParent ? { Id: groupParent.Id, Code: groupParent.Code || '', Name: groupParent.Name || '' } : undefined,
        }

    setSaving(true)
    try {
      await request({
        url: isUpdate ? 'report-template-groups/update' : 'report-template-groups/create',
        method: isUpdate ? 'PUT' : 'POST',
        body: payload,
      }).unwrap()
      toast.success(isUpdate ? 'Cập nhật nhóm thành công' : 'Tạo nhóm thành công')
      setGroupModal(false)
      await loadGroups()
    } catch {
      toast.error('Không thể lưu nhóm mẫu')
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async (group = selectedGroup) => {
    if (!group?.Id) {
      toast.error('Vui lòng chọn nhóm mẫu cần xóa')
      return
    }
    if (!window.confirm(`Xóa nhóm mẫu "${group.Name || group.Code}"?`)) return

    try {
      await request({ url: `report-template-groups/delete${query({ id: group.Id })}`, method: 'DELETE' }).unwrap()
      toast.success('Xóa nhóm thành công')
      if (selectedGroupId === group.Id) setSelectedGroupId(0)
      await loadGroups()
    } catch {
      toast.error('Không thể xóa nhóm mẫu')
    }
  }

  const openCreateTemplate = () => {
    if (!groupOptions.length) {
      toast.error('Chưa có nhóm mẫu hóa đơn để chọn')
      return
    }
    const group = selectedGroup || groupOptions[0]
    setTemplateForm({
      ...emptyTemplate(),
      TemplateGroupId: group.Id,
      TemplateGroup: { Id: group.Id, Code: group.Code, Name: group.Name },
    })
    setTemplateFile(null)
    setTemplateFileName('')
    setTemplateModal(true)
  }

  const openEditTemplate = async (item?: InvoiceTemplate) => {
    if (!item?.Id) {
      toast.error('Vui lòng chọn template cần sửa')
      return
    }

    try {
      const response = await request({ url: `report-templates/detail${query({ id: item.Id })}`, method: 'GET' }).unwrap()
      const detail = response?.Data || item
      const templateGroupId = Number(detail.TemplateGroupId || detail.TemplateGroup?.Id || selectedGroupId) || 0
      const group = groupOptions.find(option => Number(option.Id) === templateGroupId)
      setSelectedTemplateId(detail.Id)
      setTemplateForm({
        ...emptyTemplate(),
        ...detail,
        TemplateGroupId: templateGroupId,
        TemplateGroup: group ? { Id: group.Id, Code: group.Code, Name: group.Name } : detail.TemplateGroup,
        Files: Array.isArray(detail.Files) ? detail.Files : [],
      })
      setTemplateFile(null)
      setTemplateFileName(detail.OriginalFileName || detail.FileName || '')
      setTemplateModal(true)
    } catch {
      toast.error('Không lấy được chi tiết template')
    }
  }

  const saveTemplate = async () => {
    if (!templateForm.Name?.trim()) {
      toast.error('Vui lòng nhập tên template')
      return
    }
    if (!templateForm.TemplateGroupId) {
      toast.error('Vui lòng chọn nhóm mẫu hóa đơn')
      return
    }

    const group = groupOptions.find(option => Number(option.Id) === Number(templateForm.TemplateGroupId))
    const isUpdate = !!templateForm.Id
    const payload = {
      id: templateForm.Id ?? 0,
      templateGroupId: templateForm.TemplateGroupId,
      code: templateForm.Code || '',
      name: templateForm.Name || '',
      TemplateType: Number(templateForm.TemplateType) || REPORT_TEMPLATE_PRODUCT,
      isDefault: !!templateForm.IsDefault,
      isActive: !!templateForm.IsActive,
      description: templateForm.Description || '',
      fileName: templateForm.FileName || templateFile?.name || '',
      originalFileName: templateForm.OriginalFileName || templateFile?.name || '',
      fileExtension: templateForm.FileExtension || (templateFile ? getFileExtension(templateFile.name) : ''),
      contentType: templateForm.ContentType || templateFile?.type || 'application/octet-stream',
      filePath: templateForm.FilePath || '',
      fileSize: templateForm.FileSize || templateFile?.size || 0,
      isLocked: !!templateForm.IsLocked,
      versionNo: templateForm.VersionNo || 0,
      fileContent: templateForm.FileContent || '',
      passwordHash: templateForm.PasswordHash || '',
      files: Array.isArray(templateForm.Files) ? templateForm.Files : [],
      templateGroup: {
        id: templateForm.TemplateGroupId,
        code: group?.Code || templateForm.TemplateGroup?.Code || '',
        name: group?.Name || templateForm.TemplateGroup?.Name || '',
      },
    }

    setSaving(true)
    try {
      await request({
        url: isUpdate ? 'report-templates/update-multipart' : 'report-templates/create-multipart',
        method: isUpdate ? 'PUT' : 'POST',
        body: buildModelFormData(payload, templateFile ? [templateFile] : []),
      }).unwrap()
      toast.success(isUpdate ? 'Cập nhật template thành công' : 'Tạo template thành công')
      setTemplateModal(false)
      const nextGroupId = Number(templateForm.TemplateGroupId) || selectedGroupId
      setSelectedGroupId(nextGroupId)
      loadTemplatesByGroup(nextGroupId)
    } catch {
      toast.error('Không thể lưu template')
    } finally {
      setSaving(false)
    }
  }

  const openCloneTemplate = async (item: InvoiceTemplate) => {
    if (!item.Id) {
      toast.error('Vui lòng chọn template cần clone')
      return
    }
    setCloneSourceTemplate(item)
    setCloneTargetTenantId(0)
    setCloneTenantOptions([])
    setCloneModal(true)
    setCloneLoading(true)
    try {
      const response = await request({ url: `tenants/filter${query({ PageIndex: 0, PageSize: 20 })}`, method: 'GET' }).unwrap()
      const options = ((response?.Data?.Items || []) as any[])
        .filter(tenant => tenant?.Id)
        .map(tenant => ({
          Value: tenant.Id,
          Name: tenant.Name,
          SearchText: [tenant?.Name, tenant?.TenancyName, tenant?.TenantSetting?.Email].filter(Boolean).join(' '),
        }))
      setCloneTenantOptions(options)
      setCloneTargetTenantId(options[0]?.Value || 0)
    } catch {
      toast.error('Không thể tải danh sách tenant')
    } finally {
      setCloneLoading(false)
    }
  }

  const cloneTemplateToTenant = async () => {
    if (!cloneSourceTemplate?.Id) {
      toast.error('Không xác định được template nguồn')
      return
    }
    if (!cloneTargetTenantId) {
      toast.error('Vui lòng chọn tenant đích')
      return
    }

    setSaving(true)
    try {
      await request({
        url: 'report-templates/clone',
        method: 'POST',
        body: { id: cloneSourceTemplate.Id, targetTenantId: cloneTargetTenantId },
      }).unwrap()
      toast.success('Clone template thành công')
      setCloneModal(false)
    } catch {
      toast.error('Không thể clone template')
    } finally {
      setSaving(false)
    }
  }

  const updateTemplateStatus = async (item: InvoiceTemplate, nextActive: boolean) => {
    if (!item.Id) return
    const group = groupOptions.find(option => Number(option.Id) === Number(item.TemplateGroupId))
    try {
      await request({
        url: 'report-templates/update',
        method: 'PUT',
        body: {
          id: item.Id,
          templateGroupId: item.TemplateGroupId,
          code: item.Code || '',
          name: item.Name || '',
          TemplateType: Number(item.TemplateType) || REPORT_TEMPLATE_PRODUCT,
          isDefault: !!item.IsDefault,
          isActive: nextActive,
          description: item.Description || '',
          templateGroup: {
            id: item.TemplateGroupId,
            code: group?.Code || item.TemplateGroup?.Code || '',
            name: group?.Name || item.TemplateGroup?.Name || selectedGroup?.Name || '',
          },
        },
      }).unwrap()
      toast.success('Cập nhật trạng thái thành công')
      loadTemplatesByGroup(selectedGroupId)
    } catch {
      toast.error('Không thể cập nhật trạng thái')
    }
  }

  const deleteTemplate = async (item: InvoiceTemplate) => {
    if (!item.Id) return
    if (!window.confirm(`Xóa template "${item.Name || item.Code}"?`)) return
    try {
      await request({ url: `report-templates/delete${query({ id: item.Id })}`, method: 'DELETE' }).unwrap()
      toast.success('Xóa template thành công')
      loadTemplatesByGroup(selectedGroupId)
    } catch {
      toast.error('Không thể xóa template')
    }
  }

  const exportSelectedTemplate = async () => {
    if (!selectedTemplate?.Id) {
      toast.error('Vui lòng chọn template cần export')
      return
    }
    try {
      const blob = await downloadTemplate({ url: `report-templates/export-template${query({ id: selectedTemplate.Id })}` }).unwrap()
      downloadBlob(blob, `${selectedTemplate.Code || selectedTemplate.Name || 'report-template'}.zip`)
    } catch {
      toast.error('Không thể export template')
    }
  }

  const submitImportTemplate = async () => {
    if (!selectedTemplate?.Id) {
      toast.error('Vui lòng chọn template cần import')
      return
    }
    if (!importFile) {
      toast.error('Vui lòng chọn file import')
      return
    }

    setSaving(true)
    try {
      await request({
        url: `report-templates/import-template${query({ id: selectedTemplate.Id })}`,
        method: 'POST',
        body: buildModelFormData(null, [importFile]),
      }).unwrap()
      toast.success('Import template thành công')
      setImportModal(false)
      setImportFile(null)
      loadTemplatesByGroup(selectedGroupId)
    } catch {
      toast.error('Không thể import template')
    } finally {
      setSaving(false)
    }
  }

  const onTemplateFileChanged = (file?: File) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Kích thước file tối đa ${MAX_FILE_SIZE_MB}MB`)
      return
    }
    setTemplateFile(file)
    setTemplateFileName(file.name)
    setTemplateForm(form => ({
      ...form,
      FileName: file.name,
      OriginalFileName: file.name,
      FileExtension: getFileExtension(file.name),
      ContentType: file.type || 'application/octet-stream',
      FileSize: file.size,
    }))
  }

  const onImportFileChanged = (file?: File) => {
    if (!file) return
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`Kích thước file tối đa ${MAX_FILE_SIZE_MB}MB`)
      return
    }
    setImportFile(file)
  }

  const setTemplateGroup = (groupId: number) => {
    const group = groupOptions.find(option => Number(option.Id) === Number(groupId))
    setTemplateForm(form => ({
      ...form,
      TemplateGroupId: groupId,
      TemplateGroup: group ? { Id: group.Id, Code: group.Code, Name: group.Name } : undefined,
    }))
  }

  const toggleSort = (key: string) => {
    setSort(current => current?.key === key ? { key, desc: !current.desc } : { key, desc: false })
  }

  const templateColumns: ColumnDef<InvoiceTemplate>[] = [
    {
      id: 'stt',
      header: () => <SortableHeader label="STT" sortKey="Id" sort={sort} onSort={toggleSort} />,
      meta: { className: 'w-[72px] text-center' },
      cell: ({ row }) => <span className="text-slate-500">{(page - 1) * PAGE_SIZE + row.index + 1}</span>,
    },
    {
      id: 'code',
      header: () => <SortableHeader label="Mã" sortKey="Code" sort={sort} onSort={toggleSort} />,
      meta: { cellClassName: 'font-medium text-emerald-700 whitespace-nowrap' },
      cell: ({ row }) => row.original.Code || '-',
    },
    {
      id: 'name',
      header: () => <SortableHeader label="Tên" sortKey="Name" sort={sort} onSort={toggleSort} />,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="line-clamp-2 font-medium">{row.original.Name || '-'}</span>
        </div>
      ),
    },
    {
      id: 'group',
      header: () => <SortableHeader label="Nhóm mẫu" sortKey="Group" sort={sort} onSort={toggleSort} />,
      cell: ({ row }) => row.original.TemplateGroup?.Name || selectedGroup?.Name || '-',
    },
    {
      id: 'description',
      header: () => <SortableHeader label="Ghi chú" sortKey="Description" sort={sort} onSort={toggleSort} />,
      meta: { cellClassName: 'text-slate-600' },
      cell: ({ row }) => row.original.Description || '-',
    },
    {
      id: 'default',
      header: () => <SortableHeader label="Mặc định" sortKey="IsDefault" sort={sort} onSort={toggleSort} />,
      meta: { className: 'w-[110px] text-center' },
      cell: ({ row }) => row.original.IsDefault ? 'Có' : 'Không',
    },
    {
      id: 'status',
      header: () => <SortableHeader label="Trạng thái" sortKey="Status" sort={sort} onSort={toggleSort} />,
      meta: { className: 'w-[130px] text-center' },
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
          row.original.IsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )}>
          {row.original.IsActive ? 'Hoạt động' : 'Tạm khóa'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      meta: { className: 'w-[110px] text-center' },
      cell: ({ row }) => {
        const item = row.original
        return (
          <div onClick={event => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditTemplate(item)}>Chi tiết / sửa</DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCloneTemplate(item)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Clone template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {item.IsActive ? (
                  <DropdownMenuItem onClick={() => updateTemplateStatus(item, false)}>Tạm khóa</DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => updateTemplateStatus(item, true)}>Kích hoạt</DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteTemplate(item)}>
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
          title="Nhóm mẫu hóa đơn"
          items={groups}
          selectedId={selectedGroupId}
          searchText={groupSearchText}
          loading={groupsLoading}
          searchPlaceholder="Tìm kiếm nhóm..."
          emptyText="Không tìm thấy nhóm mẫu"
          onSearchTextChange={setGroupSearchText}
          onSelect={item => setSelectedGroupId(item.Id)}
          onCreate={openCreateGroup}
          onCreateChild={openCreateChildGroup}
          onEditItem={openEditGroup}
          onDeleteItem={deleteGroup}
        />

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          <ListToolbar
            searchValue={keyword}
            searchPlaceholder="Tìm kiếm"
            onSearchChange={setKeyword}
            filters={(
              <select
                value={statusId}
                onChange={event => setStatusId(event.target.value === '' ? '' : Number(event.target.value))}
                className="h-10 min-w-[180px] rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Tất cả</option>
                <option value={STATUS_ACTIVE}>Hoạt động</option>
                <option value={STATUS_LOCKED}>Tạm khóa</option>
              </select>
            )}
            actions={(
              <>
                <ToolbarButton type="button" tone="neutral" onClick={exportSelectedTemplate} disabled={!selectedTemplateId || exporting}>
                  <Download className="h-4 w-4" />
                  Xuất
                </ToolbarButton>
                <ToolbarButton type="button" tone="neutral" disabled={!selectedTemplateId} onClick={() => setImportModal(true)}>
                  <Upload className="h-4 w-4" />
                  Nhập
                </ToolbarButton>
                <ToolbarButton type="button" tone="primary" onClick={openCreateTemplate}>
                  <Plus className="h-4 w-4" />
                  Thêm mới
                </ToolbarButton>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => { loadGroups(); loadTemplatesByGroup(selectedGroupId) }} title="Tải lại">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
          />

          <DataTable
            columns={templateColumns}
            data={pagedTemplates}
            loading={templatesLoading}
            total={filteredTemplates.length}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onRowClick={item => setSelectedTemplateId(item.Id || 0)}
            onRowDoubleClick={openEditTemplate}
            rowClassName={item => Number(item.Id) === Number(selectedTemplateId) ? 'bg-sky-100 hover:bg-sky-100' : ''}
            emptyText="Chưa có template trong nhóm này"
          />
        </section>
      </div>

      <Dialog open={groupModal} onOpenChange={setGroupModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{groupForm.Id ? 'Sửa nhóm mẫu hóa đơn' : groupParent ? 'Tạo hóa đơn con' : 'Tạo nhóm mẫu hóa đơn'}</DialogTitle>
          </DialogHeader>
          {groupParent ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Nhóm cha: <strong>{groupParent.Name || groupParent.Code}</strong>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mã nhóm">
              <Input value={groupForm.Code || ''} onChange={event => setGroupForm(form => ({ ...form, Code: event.target.value }))} />
            </Field>
            <Field label="Tên nhóm" required>
              <Input value={groupForm.Name || ''} onChange={event => setGroupForm(form => ({ ...form, Name: event.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Switch checked={!!groupForm.IsActive} onCheckedChange={value => setGroupForm(form => ({ ...form, IsActive: value }))} />
              Hoạt động
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupModal(false)}>Hủy</Button>
            <Button onClick={saveGroup} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateModal} onOpenChange={setTemplateModal}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateForm.Id ? 'Sửa mẫu hóa đơn' : 'Tạo mẫu hóa đơn'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nhóm mẫu hóa đơn" required>
              <select
                value={templateForm.TemplateGroupId || ''}
                onChange={event => setTemplateGroup(Number(event.target.value))}
                className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              >
                <option value="">Chọn nhóm</option>
                {groupOptions.map(group => (
                  <option key={group.Id} value={group.Id}>{group.Name || group.Code}</option>
                ))}
              </select>
            </Field>
            <Field label="Mã mẫu">
              <Input value={templateForm.Code || ''} onChange={event => setTemplateForm(form => ({ ...form, Code: event.target.value }))} />
            </Field>
            <Field label="Tên mẫu" required>
              <Input value={templateForm.Name || ''} onChange={event => setTemplateForm(form => ({ ...form, Name: event.target.value }))} />
            </Field>
            <Field label="Loại mẫu">
              <select
                value={templateForm.TemplateType ?? REPORT_TEMPLATE_PRODUCT}
                onChange={event => setTemplateForm(form => ({ ...form, TemplateType: Number(event.target.value) }))}
                className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              >
                {TEMPLATE_TYPE_OPTIONS.map(option => (
                  <option key={option.Value} value={option.Value}>{option.Name}</option>
                ))}
              </select>
            </Field>
            <Field label="Ghi chú" className="sm:col-span-2">
              <Textarea value={templateForm.Description || ''} onChange={event => setTemplateForm(form => ({ ...form, Description: event.target.value }))} rows={2} />
            </Field>
            <div className="flex items-center gap-5 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Switch checked={!!templateForm.IsDefault} onCheckedChange={value => setTemplateForm(form => ({ ...form, IsDefault: value }))} />
                Mặc định
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Switch checked={!!templateForm.IsActive} onCheckedChange={value => setTemplateForm(form => ({ ...form, IsActive: value }))} />
                Hoạt động
              </label>
            </div>
            <div className="sm:col-span-2">
              <input
                ref={templateInputRef}
                type="file"
                className="hidden"
                onChange={event => {
                  onTemplateFileChanged(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <div className="rounded-md border border-dashed bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-700">{templateFileName || templateForm.OriginalFileName || 'Chưa chọn file template'}</div>
                    <div className="mt-1 text-xs text-slate-500">Dung lượng tối đa {MAX_FILE_SIZE_MB}MB</div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => templateInputRef.current?.click()}>Chọn file</Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setTemplateFile(null)
                        setTemplateFileName('')
                        setTemplateForm(form => ({ ...form, Files: [], FileName: '', OriginalFileName: '', FilePath: '', FileSize: 0 }))
                      }}
                    >
                      Xóa tệp
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateModal(false)}>Hủy</Button>
            <Button onClick={saveTemplate} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importModal} onOpenChange={setImportModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Nhập file cho template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Template đích: <strong>{selectedTemplate?.Name || selectedTemplate?.Code || '-'}</strong>
            </div>
            <input
              ref={importInputRef}
              type="file"
              className="hidden"
              onChange={event => {
                onImportFileChanged(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <div className="rounded-md border border-dashed bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700">{importFile?.name || 'Chưa chọn file import'}</div>
                  <div className="mt-1 text-xs text-slate-500">Chỉ cho phép 1 file, dung lượng tối đa {MAX_FILE_SIZE_MB}MB</div>
                </div>
                <Button type="button" onClick={() => importInputRef.current?.click()}>Chọn file</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportModal(false)}>Hủy</Button>
            <Button onClick={submitImportTemplate} disabled={saving || !importFile}>{saving ? 'Đang import...' : 'Nhập'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloneModal} onOpenChange={setCloneModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clone report template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Template nguồn: <strong>{cloneSourceTemplate?.Name || cloneSourceTemplate?.Code || '-'}</strong>
            </div>
            <Field label="Tenant đích">
              {cloneLoading ? (
                <Skeleton className="h-9 w-full rounded-md" />
              ) : (
                <select
                  value={cloneTargetTenantId || ''}
                  onChange={event => setCloneTargetTenantId(Number(event.target.value))}
                  className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                >
                  <option value="">Chọn tenant</option>
                  {cloneTenantOptions.map(option => (
                    <option key={option.Value} value={option.Value}>{option.Name}</option>
                  ))}
                </select>
              )}
            </Field>
            {!cloneLoading && cloneTenantOptions.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Không có tenant đích khả dụng.
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneModal(false)}>Hủy</Button>
            <Button onClick={cloneTemplateToTenant} disabled={saving || cloneLoading || !cloneTargetTenantId}>
              {saving ? 'Đang clone...' : 'Clone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getSortValue(item: InvoiceTemplate, key: string, fallbackGroupName?: string) {
  switch (key) {
    case 'Code':
      return item.Code || ''
    case 'Name':
      return item.Name || ''
    case 'Group':
      return item.TemplateGroup?.Name || fallbackGroupName || ''
    case 'Description':
      return item.Description || ''
    case 'IsDefault':
      return item.IsDefault ? 1 : 0
    case 'Status':
      return item.IsActive ? 1 : 0
    default:
      return item.Id || 0
  }
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: string
  sort: { key: string; desc: boolean } | null
  onSort: (key: string) => void
}) {
  const active = sort?.key === sortKey

  return (
    <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(sortKey)}>
      {label}
      <span className={cn('text-[10px] text-slate-400', active && 'text-slate-700')}>
        {active ? (sort.desc ? '↓' : '↑') : '↕'}
      </span>
    </button>
  )
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('space-y-1.5 text-sm font-medium text-slate-700', className)}>
      <span>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  )
}
