import { useGenericGetQuery } from '@/store/slice/generic/api'

export type TOpeningBalancesDates = {
  customerOpeningDebtDate: string | null
  supplierOpeningDebtDate: string | null
  inventoryOpeningBalanceDate: string | null
}

// .NET's DateTime.MinValue serializes as "0001-01-01T00:00:00..." -- the API
// returns that instead of null when nothing has been recorded yet for a
// category. Treat it the same as "no date" everywhere it's read.
function toRealDate(value?: string | null): string | null {
  if (!value || value.startsWith('0001-01-01')) return null
  return value
}

/**
 * `opening-balances/dates` returns the first date already used for each kind
 * of opening balance (customer debt, supplier debt, inventory). Used to know
 * whether an order/document/report date is allowed to go earlier than that
 * cutover -- see the various `min={...}` date inputs across the app.
 *
 * RTK Query dedupes identical query args across every component calling this
 * hook, so this is effectively fetched once and shared app-wide for free --
 * no extra caching layer needed (unlike the Angular app, where each lazy
 * module gets its own ApiService instance and had to build a dedicated
 * service around that).
 */
export function useOpeningBalancesDates(): TOpeningBalancesDates {
  const { data } = useGenericGetQuery({ url: 'opening-balances/dates' })
  const raw = data?.Data ?? {}

  return {
    customerOpeningDebtDate: toRealDate(raw.CustomerOpeningDebtDate),
    supplierOpeningDebtDate: toRealDate(raw.SupplierOpeningDebtDate),
    inventoryOpeningBalanceDate: toRealDate(raw.InventoryOpeningBalanceDate),
  }
}
