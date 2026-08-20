import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useGenericPostMutation, useLazyGenericGetQuery } from '@/store/slice/generic/api'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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

function errMsg(e: any, fallback: string) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || fallback
}

/**
 * Permission matrix for a nhóm quyền — Xem/Thêm/Sửa/Xoá per function, plus a
 * "Tất cả" toggle and a "Khoá" toggle that zero everything out. Mirrors
 * Angular's UserGroupPermissionComponent 1:1: `permission/detail?userGroupId=`
 * loads every function row, `permission/update` saves the whole group back.
 */
export function UserGroupPermissionDialog({ open, onOpenChange, groupId, groupName }: Props) {
  const { t } = useTranslation()
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
      .catch(e => toast.error(errMsg(e, t('components.userGroupPermissionDialog.processError'))))
  }, [open, groupId, fetchDetail, t])

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
      toast.success(t('components.userGroupPermissionDialog.saveSuccess'))
      onOpenChange(false)
    } catch (e) { toast.error(errMsg(e, t('components.userGroupPermissionDialog.processError'))) }
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
          <DialogTitle>{t('components.userGroupPermissionDialog.permissionsTitle')}{groupName ? ` — ${groupName}` : ''}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder={t('components.userGroupPermissionDialog.searchFunctionPlaceholder')} className="h-8 max-w-xs" />

          <div className="max-h-[60vh] overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
                <tr className="h-9">
                  <th className="w-10 px-2">{t('common.index')}</th>
                  <th className="px-2 text-left">{t('components.userGroupPermissionDialog.columnFunctionGroup')}</th>
                  <th className="px-2 text-left">{t('components.userGroupPermissionDialog.columnFunction')}</th>
                  <th className="px-2">{t('common.all')}</th>
                  <th className="px-2">{t('components.userGroupPermissionDialog.columnView')}</th>
                  <th className="px-2">{t('components.userGroupPermissionDialog.columnAdd')}</th>
                  <th className="px-2">{t('components.userGroupPermissionDialog.columnEdit')}</th>
                  <th className="px-2">{t('components.userGroupPermissionDialog.columnDelete')}</th>
                  <th className="px-2">{t('common.lock')}</th>
                </tr>
              </thead>
              <tbody>
                {isFetching && (
                  <tr><td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">{t('common.loading')}</td></tr>
                )}
                {!isFetching && filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-4 text-center text-xs text-muted-foreground">{t('components.userGroupPermissionDialog.emptyFunctions')}</td></tr>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || isFetching}>{saving ? t('components.userGroupPermissionDialog.saving') : t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
