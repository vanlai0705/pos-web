import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LookupSelect, type LookupItem } from '@/components/pos/lookup-select'
import { useLazyGenericGetQuery, useGenericPostMutation } from '@/store/slice/users/api/api'
import dayjs from 'dayjs'

/** REWARD_PUNISH_TYPE in pos_web — reward is 0, punish is 1 (not the reverse). */
export const REWARD_PUNISH_TYPE = { REWARD: 0, PUNISH: 1 } as const

export const REWARD_PUNISH_ENDPOINTS = {
  detail: 'rewardpunishs/detail',
  create: 'rewardpunishs/create',
  update: 'rewardpunishs/update',
}

export interface RewardPunish {
  Id?: number
  Name?: string
  /** The employee — the API calls this User, not Member */
  User?: LookupItem | null
  Date?: string
  RewardPunishReason?: LookupItem | null
  Amount?: number
  Type?: number
  Note?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editId?: number
  /**
   * Raised from a context that already knows the employee (bảng lương). Angular
   * sets `isEnableMember = false` in that case, so the picker is locked.
   */
  lockedUser?: LookupItem | null
  onSaved: () => void
}

export function emptyRewardPunish(): RewardPunish {
  return {
    Type: REWARD_PUNISH_TYPE.REWARD,
    Date: dayjs().format('YYYY-MM-DD'),
    Amount: 0, Note: '',
    User: null, RewardPunishReason: null,
  }
}

function errMsg(e: any) {
  return e?.data?.Errors?.[0]?.Message || e?.data?.Message || 'Không thể xử lý yêu cầu'
}

/** Create/edit form for a thưởng/phạt voucher, shared by its own list and bảng lương. */
export function RewardPunishDialog({ open, onOpenChange, editId, lockedUser, onSaved }: Props) {
  const [form, setForm] = useState<RewardPunish>(emptyRewardPunish())

  const [fetchDetail] = useLazyGenericGetQuery()
  const [request, { isLoading: saving }] = useGenericPostMutation()

  useEffect(() => {
    if (!open) return
    if (!editId) { setForm({ ...emptyRewardPunish(), User: lockedUser ?? null }); return }
    fetchDetail({ url: REWARD_PUNISH_ENDPOINTS.detail, params: { id: editId } })
      .unwrap()
      .then(res => {
        const d = (res?.Data ?? {}) as RewardPunish
        setForm({
          ...emptyRewardPunish(), ...d,
          Date: d.Date ? dayjs(d.Date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        })
      })
      .catch(e => toast.error(errMsg(e)))
    // `lockedUser` is an inline object at the call site; re-running would wipe input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId, fetchDetail])

  const handleSave = async () => {
    if (!form.User?.Id) { toast.error('Vui lòng chọn nhân viên'); return }
    if (!form.RewardPunishReason?.Id) { toast.error('Vui lòng chọn lý do'); return }
    try {
      await request({
        url: form.Id ? REWARD_PUNISH_ENDPOINTS.update : REWARD_PUNISH_ENDPOINTS.create,
        method: 'POST',
        body: { ...form, Amount: Number(form.Amount) || 0 },
      }).unwrap()
      toast.success(form.Id ? 'Cập nhật thành công' : 'Thêm thành công')
      onOpenChange(false)
      onSaved()
    } catch (e) { toast.error(errMsg(e)) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.Id ? 'Chỉnh sửa thưởng phạt' : 'Thưởng phạt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ngày</Label>
              <Input type="date" value={form.Date ?? ''} onChange={e => setForm(f => ({ ...f, Date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Số phiếu</Label>
              {/* Server-generated, shown read-only exactly like the old form. */}
              <Input value={form.Name ?? ''} disabled placeholder="Tự động" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Nhân viên <span className="text-destructive">*</span></Label>
            <LookupSelect endpoint="users/filter-simple" placeholder="Chọn nhân viên"
              disabled={!!lockedUser}
              value={form.User} onChange={v => setForm(f => ({ ...f, User: v }))} />
          </div>

          <div className="space-y-1">
            <Label>Loại</Label>
            <div className="flex gap-2">
              {[
                { v: REWARD_PUNISH_TYPE.REWARD, label: 'Thưởng' },
                { v: REWARD_PUNISH_TYPE.PUNISH, label: 'Phạt' },
              ].map(t => (
                <button key={t.v} type="button"
                  // Switching type invalidates the chosen reason — reasons are per type.
                  onClick={() => setForm(f => ({ ...f, Type: t.v, RewardPunishReason: null }))}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    form.Type === t.v ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Lý do <span className="text-destructive">*</span></Label>
            <LookupSelect endpoint="rewardpunishreasons/filter-simple" placeholder="Chọn lý do"
              params={{ Type: form.Type ?? REWARD_PUNISH_TYPE.REWARD }}
              value={form.RewardPunishReason}
              onChange={v => setForm(f => ({ ...f, RewardPunishReason: v }))} />
          </div>

          <div className="space-y-1">
            <Label>Tổng cộng</Label>
            <Input type="number" min={0} max={999999999} value={form.Amount ?? 0}
              onChange={e => setForm(f => ({ ...f, Amount: Number(e.target.value) }))} />
          </div>

          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea rows={2} value={form.Note ?? ''} onChange={e => setForm(f => ({ ...f, Note: e.target.value }))} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Huỷ</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
