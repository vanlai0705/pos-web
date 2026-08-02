import { useState, useEffect } from "react"
import { toast } from "sonner"
import type { TPosFilterParams } from "@/store/slice/users/types"

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
  const goPage = (p: number) => setParams(prev => ({ ...prev, PageIndex: p }))

  function makeChangeStatus(
    updateStatus: (args: { id: number; statusId: number }) => Promise<void>,
    refetch: () => void
  ) {
    return async (id: number, sid: number) => {
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
    PAGE_SIZE,
    makeChangeStatus,
    makeSave,
  }
}
