import { type LucideIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { TPosFilterData } from "@/store/slice/users/types"
import {
  SearchBar, PaginationBar, RowActions,
  CrudModal, TableCard, THead, Th, Td, StatusBadge,
} from "./components"
import { useTranslation } from "react-i18next"
import { translateKnownText } from "@/i18n/nav-title-map"

export interface Column<T> {
  header: string
  render: (item: T) => React.ReactNode
  className?: string
}

interface Props<T extends { Id?: number; Name: string; Status?: { Id: number } }> {
  // header
  title: string
  Icon: LucideIcon
  // data
  data?: TPosFilterData<T>
  isLoading: boolean
  // table
  columns: Column<T>[]
  // search
  keyword: string
  onKeyword: (v: string) => void
  statusId: number | ""
  onStatus: (v: number | "") => void
  searchPlaceholder?: string
  addLabel?: string
  // pagination
  page: number
  pageSize: number
  onPage: (p: number) => void
  onPageSize?: (size: number) => void
  // row actions
  onEdit: (item: T) => void
  onChangeStatus: (id: number, statusId: number) => void
  // modal
  modal: boolean
  onAdd: () => void
  onCloseModal: () => void
  modalTitle: string
  onSave: () => void
  saving?: boolean
  children: React.ReactNode
}

export function GenericManagerPage<T extends { Id?: number; Name: string; Status?: { Id: number } }>({
  title, Icon,
  data, isLoading,
  columns,
  keyword, onKeyword, statusId, onStatus, searchPlaceholder, addLabel,
  page, pageSize, onPage, onPageSize,
  onEdit, onChangeStatus,
  modal, onAdd, onCloseModal, modalTitle, onSave, saving,
  children,
}: Props<T>) {
  const { t } = useTranslation()
  const items = data?.Items ?? []
  const total = data?.TotalItemCount ?? 0

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">{translateKnownText(title, t)}</h1>
      </div>

      <SearchBar
        keyword={keyword} onKeyword={onKeyword}
        statusId={statusId} onStatus={onStatus}
        onAdd={onAdd}
        placeholder={searchPlaceholder}
        addLabel={addLabel}
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <TableCard>
          <THead>
            <Th className="w-10">#</Th>
            {columns.map(col => (
              <Th key={col.header} className={col.className}>{translateKnownText(col.header, t)}</Th>
            ))}
            <Th>{t('common.status')}</Th>
            <Th className="w-10"></Th>
          </THead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {t('common.noData')}
                </td>
              </tr>
            ) : items.map((item, i) => (
              <tr key={item.Id} className="hover:bg-muted/30 transition-colors">
                <Td className="text-muted-foreground text-xs">{page * pageSize + i + 1}</Td>
                {columns.map(col => (
                  <Td key={col.header} className={col.className}>
                    {col.render(item)}
                  </Td>
                ))}
                <Td><StatusBadge statusId={item.Status?.Id} /></Td>
                <Td>
                  <RowActions
                    statusId={item.Status?.Id}
                    onEdit={() => onEdit(item)}
                    onActivate={item.Status?.Id !== 0 ? () => onChangeStatus(item.Id!, 0) : undefined}
                    onLock={item.Status?.Id !== 1 ? () => onChangeStatus(item.Id!, 1) : undefined}
                    onDelete={() => onChangeStatus(item.Id!, 2)}
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
      )}

      <PaginationBar page={page} total={total} pageSize={pageSize} onChange={onPage} onPageSizeChange={onPageSize} />

      <CrudModal
        open={modal} onClose={onCloseModal}
        title={modalTitle} onSave={onSave} loading={saving}
      >
        {children}
      </CrudModal>
    </div>
  )
}
