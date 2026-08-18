import { useLazyFilterReportQuery } from '@/store/slice/generic/api'
import { withDomainPath } from '@/utils/domain-route'
import { useTranslation } from 'react-i18next'
import { SelectBase } from './select-base'
export interface LookupItem {
  Id?: number
  Name?: string
  [key: string]: unknown
}

interface LookupSelectProps<T extends LookupItem> {
  /** A filter-simple style endpoint returning `{ Items, TotalItemCount }` */
  endpoint: string
  value?: T | null
  onChange: (item: T | null) => void
  placeholder?: string
  /** Extra query params, e.g. `{ Type: 0 }` to scope reasons to reward/punish */
  params?: Record<string, unknown>
  /** Secondary line under the name (phone, code…) */
  subtitle?: (item: T) => string | undefined
  disabled?: boolean
  className?: string
  /**
   * Domain-relative path to this entity's full management page (e.g.
   * "/stocks/suppliers") — shows a "Danh sách" button that opens it in a new
   * tab, same as CustomerSelect/StaffSelect. Omit for plain filter dropdowns
   * (group/status filters on a list page) where "view the list" makes no
   * sense, or when no management page exists yet for the entity.
   */
  listPath?: string
}

/**
 * Click-to-open searchable picker shared by every plain lookup combobox
 * (supplier, fund, reason…) — thin wrapper around `SelectBase`. Unlike
 * CustomerSelect/StaffSelect it has no inline "Thêm"/"Sửa" (there's no
 * generic quick-add form across arbitrary entity types), but it can still
 * offer "Danh sách" via `listPath`.
 */
export function LookupSelect<T extends LookupItem>({
  endpoint, value, onChange, placeholder, params, subtitle, disabled, className, listPath,
}: LookupSelectProps<T>) {
  const { t } = useTranslation()
  const [search] = useLazyFilterReportQuery()

  const openList = listPath
    ? (e: React.MouseEvent) => { e.stopPropagation(); window.open(withDomainPath(listPath), '_blank') }
    : undefined

  return (
    <SelectBase<T>
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      size="md"
      pageSize={50}
      getId={item => item.Id}
      getLabel={item => item.Name || ''}
      search={({ keyword, pageIndex, pageSize }) =>
        search({ path: endpoint, params: { PageIndex: pageIndex, PageSize: pageSize, Keyword: keyword, ...params } })
          .unwrap()
          .then(res => res as { Items?: T[]; TotalItemCount?: number })
      }
      renderItem={item => (
        <>
          <span className="truncate font-medium">{item.Name}</span>
          {subtitle?.(item) && (
            <span className="ml-2 shrink-0 text-xs text-muted-foreground">{subtitle(item)}</span>
          )}
        </>
      )}
      onOpenList={openList}
      listLabel={t('components.lookupSelect.listButton')}
      listTitle={t('components.lookupSelect.listButtonTitle')}
    />
  )
}
