import type { LookupItem } from '@/components/pos/lookup-select'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLazyFilterReportQuery } from '@/store/slice/generic/api'
import { withDomainPath } from '@/utils/domain-route'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { SelectBase, type SelectBaseHandle } from './select-base'

interface SimpleNameSelectProps {
  value?: LookupItem | null
  onChange: (item: LookupItem | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** A filter-simple style endpoint returning `{ Items, TotalItemCount }` */
  endpoint: string
  /** Domain-relative path to the entity's full management page, for "Danh sách". */
  listPath?: string
  /** Dialog title, e.g. "Thêm nhóm nhà cung cấp". */
  addTitle: string
  namePlaceholder?: string
  /** Show the "Ghi chú" field (most of these entities have one; default true). */
  noteEnabled?: boolean
  /** Persists a new `{ Name, Note? }` record — the same save mutation the
   * entity's own management page uses. Nothing is returned/selected
   * automatically (these mutations don't echo the new Id back), so after
   * saving the list just refreshes for the user to pick the new item. */
  save: (body: { Name: string; Note?: string }) => Promise<unknown>
}

/**
 * Lightweight "Thêm" for simple `{ Name, Note }` lookup entities (nhóm nhà
 * cung cấp, đơn vị tính, ca làm việc…) that don't warrant their own bespoke
 * quick-add dialog like CustomerSelect/StaffSelect/SupplierSelect do. No
 * inline "Sửa" — editing an existing record still happens on its own full
 * management page (reachable via "Danh sách").
 */
export function SimpleNameSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled,
  endpoint,
  listPath,
  addTitle,
  namePlaceholder,
  noteEnabled = true,
  save,
}: SimpleNameSelectProps) {
  const selectRef = useRef<SelectBaseHandle>(null)
  const [search] = useLazyFilterReportQuery()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  const openAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setName('')
    setNote('')
    setDialogOpen(true)
  }

  const openList = listPath
    ? (e: React.MouseEvent) => { e.stopPropagation(); window.open(withDomainPath(listPath), '_blank') }
    : undefined

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Vui lòng nhập tên')
      return
    }
    setSaving(true)
    try {
      await save({ Name: name.trim(), Note: note.trim() || undefined })
      toast.success('Đã thêm mới')
      setDialogOpen(false)
      selectRef.current?.refresh()
    } catch {
      toast.error('Không thể lưu, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <SelectBase<LookupItem>
        ref={selectRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        pageSize={20}
        getId={item => item.Id}
        getLabel={item => (item.Name as string) ?? ''}
        search={({ keyword, pageIndex, pageSize }) =>
          search({ path: endpoint, params: { PageIndex: pageIndex, PageSize: pageSize, Keyword: keyword } })
            .unwrap()
            .then(res => res as { Items?: LookupItem[]; TotalItemCount?: number })
        }
        renderItem={item => <span className="font-medium truncate">{item.Name as string}</span>}
        onAdd={openAdd}
        addTitle={addTitle}
        onOpenList={openList}
        listLabel="Danh sách"
        listTitle="Xem danh sách"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{addTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tên <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={namePlaceholder} autoFocus />
            </div>
            {noteEnabled && (
              <div className="space-y-1">
                <Label>Ghi chú</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Ghi chú" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huỷ</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
