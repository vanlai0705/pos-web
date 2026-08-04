import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLazyGenericGetQuery, useGenericPostMutation } from '@/store/slice/users/api/api'

interface Permission {
  Id?: number
  Function?: { Id?: number; Name?: string; FunctionGroup?: { Id?: number; Name?: string } }
  IsView?: boolean
  IsAdd?: boolean
  IsEdit?: boolean
  IsDelete?: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: number
  groupName?: string
}

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

/**
 * Permission matrix for a nhóm quyền — Xem/Thêm/Sửa/Xoá per function, plus a
 * "Tất cả" toggle and a "Khoá" toggle that zero everything out. Mirrors
 * Angular's UserGroupPermissionComponent 1:1: `permission/detail?userGroupId=`
 * loads every function row, `permission/update` saves the whole group back.
 */
export function UserGroupPermissionDialog({ open, onOpenChange, groupId, groupName }: Props) {
  const [rows, setRows] = useState<Permission[]>([])
  const [keyword, setKeyword] = useState('')
  const [fetchDetail, { isFetching }] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  useEffect(() => {
    if (!open || !groupId) return
    setKeyword('')
    fetchDetail({ url: 'permission/detail', params: { userGroupId: groupId } })
      .unwrap()
      .then(res => setRows(((res?.Data ?? []) as Permission[])))
      .catch(e => toast.error(errMsg(e)))
  }, [open, groupId, fetchDetail])

  const setRow = (id: number | undefined, patch: Partial<Permission>) =>
    setRows(list => list.map(r => (r.Id === id ? { ...r, ...patch } : r)))

  const setAll = (id: number | undefined, enable: boolean) =>
    setRow(id, { IsView: enable, IsAdd: enable, IsEdit: enable, IsDelete: enable })

  const handleSave = async () => {
    if (!groupId) return
    try {
      await request({
        url: 'permission/update',
        method: 'POST',
        // Angular only sends rows that are not fully open — send everything
        // instead so a row that used to be full-access but was just narrowed
        // is not silently dropped from the payload.
        body: { UserGroupId: groupId, Permissions: rows },
      }).unwrap()
      toast.success('Đã lưu phân quyền')
      onOpenChange(false)
    } catch (e) { toast.error(errMsg(e)) }
  }

  const filtered = keyword.trim()
    ? rows.filter(r =>
        `${r.Function?.FunctionGroup?.Name ?? ''} ${r.Function?.Name ?? ''}`
          .toLowerCase().includes(keyword.trim().toLowerCase()))
    : rows

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Phân quyền{groupName ? ` — ${groupName}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm chức năng..." className="h-8 max-w-xs" />

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-xs text-muted-foreground">
                <tr className="h-9">
                  <th className="w-10 px-2">STT</th>
                  <th className="px-2 text-left">Nhóm chức năng</th>
                  <th className="px-2 text-left">Chức năng</th>
                  <th className="px-2">Tất cả</th>
                  <th className="px-2">Xem</th>
                  <th className="px-2">Thêm</th>
                  <th className="px-2">Sửa</th>
                  <th className="px-2">Xoá</th>
                  <th className="px-2">Khoá</th>
                </tr>
              </thead>
              <tbody>
                {isFetching && (
                  <tr><td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">Đang tải...</td></tr>
                )}
                {!isFetching && filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">Không có chức năng nào</td></tr>
                )}
                {filtered.map((r, index) => {
                  const fullAccess = !!(r.IsView && r.IsAdd && r.IsEdit && r.IsDelete)
                  const locked = !r.IsView && !r.IsAdd && !r.IsEdit && !r.IsDelete
                  return (
                    <tr key={r.Id ?? index} className="border-t">
                      <td className="px-2 py-1.5 text-center text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-1.5">{r.Function?.FunctionGroup?.Name ?? '—'}</td>
                      <td className="px-2 py-1.5">{r.Function?.Name ?? '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={fullAccess} onCheckedChange={v => setAll(r.Id, v)} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={!!r.IsView} onCheckedChange={v => setRow(r.Id, { IsView: v })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={!!r.IsAdd} onCheckedChange={v => setRow(r.Id, { IsAdd: v })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={!!r.IsEdit} onCheckedChange={v => setRow(r.Id, { IsEdit: v })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={!!r.IsDelete} onCheckedChange={v => setRow(r.Id, { IsDelete: v })} />
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Switch checked={locked} onCheckedChange={v => setAll(r.Id, !v)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving || isFetching}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
