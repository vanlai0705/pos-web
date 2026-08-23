import { useGenericGetQuery, useGenericPostMutation } from '@/store/slice/generic/api'

// The API returns a full datetime ("2026-08-21T00:00:00+00:00"), and .NET's
// DateTime.MinValue ("0001-01-01T00:00:00...") instead of null when nothing
// has been set yet. Consumers bind this straight into native
// <input type="date">, which silently renders blank for anything that isn't
// exactly YYYY-MM-DD -- so normalize both here.
function toRealDate(value?: string | null): string | null {
  if (!value || value.startsWith('0001-01-01')) return null
  return value.split('T')[0]
}

/**
 * `setting/get-opening-balance-date` / `setting/update-opening-balance-date`
 * hold a single, shared "ngày chốt" (closing date) setting used by all 3
 * opening-balance screens (customer debt, supplier debt, inventory): once
 * saved, none of them can be edited to a date after it.
 *
 * Unlike `useOpeningBalancesDates` (3 read-only dates derived from actually
 * recorded data, used for `min` checks elsewhere), this is a single writable
 * value the 3 screens themselves update on save.
 */
export function useOpeningBalanceSetting() {
  const { data, refetch } = useGenericGetQuery({ url: 'setting/get-opening-balance-date' })
  const [postSetting] = useGenericPostMutation()

  const raw = data?.Data ?? {}
  const openingDate = toRealDate(raw.Date)

  // Only call this once the data itself has actually saved -- otherwise a
  // failed data save could still move the shared cutover.
  const updateOpeningDate = async (date: string) => {
    await postSetting({
      url: 'setting/update-opening-balance-date',
      method: 'POST',
      body: { Id: raw.Id ?? 0, Date: date },
    }).unwrap()

    // Re-fetching (rather than trusting the POST's own response body, which
    // isn't guaranteed) keeps `openingDate` in sync with whatever the server
    // actually persisted -- callers just read the hook's `openingDate` again,
    // no local state to juggle.
    await refetch()
  }

  return { openingDate, updateOpeningDate }
}
