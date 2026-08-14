import type { TPosFilterParams } from "@/store/slice/users/types";
import { confirmAction } from "@/components/ui/use-confirm-action"
import { useEffect, useState } from "react"
import { toast } from "sonner"

const PAGE_SIZE = 15

export function useManagerPage<T extends { Id?: number; Status?: { Id: number } }>(
  emptyForm: () => T
) {
  const [params, setParams] = useState<TPosFilterParams>({ PageIndex: 0, PageSize: PAGE_SIZE })
  const [keyword, setKeyword] = useState("")
  const [statusId, setStatusId] = useState<number | "">("")
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<T>(emptyForm)

  useEffect(() => {
    const t = setTimeout(() =>
      setParams(p => ({
        ...p,
        PageIndex: 0,
        Keyword: keyword,
        StatusId: statusId === "" ? undefined : statusId,
      })), 400)
    return () => clearTimeout(t)
  }, [keyword, statusId])

  const openAdd = () => { setForm(emptyForm()); setModal(true) }
  const openEdit = (item: T) => { setForm({ ...item }); setModal(true) }
  const closeModal = () => setModal(false)
  const page = params.PageIndex ?? 0
  const pageSize = params.PageSize ?? PAGE_SIZE
  const goPage = (p: number) => setParams(prev => ({ ...prev, PageIndex: p }))
  // Changing size shifts every row, so start over from the first page.
  const setPageSize = (size: number) =>
    setParams(prev => ({ ...prev, PageSize: size, PageIndex: 0 }))

  function makeChangeStatus(
    updateStatus: (args: { id: number; statusId: number }) => Promise<void>,
    refetch: () => void
  ) {
    return async (id: number, sid: number) => {
      const label = sid === 0 ? 'Cho phép' : sid === 1 ? 'Khoá' : 'Xoá'
      if (!await confirmAction({ description: `Bạn có chắc là muốn "${label}" ?` })) return
      try {
        await updateStatus({ id, statusId: sid })
        refetch()
      } catch {
        toast.error("Không thể cập nhật trạng thái")
      }
    }
  }

  function makeSave(
    save: (data: T) => Promise<void>,
    validate: (f: T) => string | null,
    refetch: () => void
  ) {
    return async () => {
      const err = validate(form)
      if (err) { toast.error(err); return }
      try {
        await save(form)
        toast.success(form.Id ? "Cập nhật thành công" : "Thêm mới thành công")
        setModal(false)
        refetch()
      } catch {
        toast.error("Không thể lưu dữ liệu")
      }
    }
  }

  return {
    params, setParams,
    keyword, setKeyword,
    statusId, setStatusId,
    modal, setModal, openAdd, openEdit, closeModal,
    form, setForm,
    page, goPage,
    pageSize, setPageSize,
    PAGE_SIZE,
    makeChangeStatus,
    makeSave,
  }
}
