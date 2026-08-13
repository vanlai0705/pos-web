import { Input, type InputProps } from '@/components/ui/input'
import { useEffect, useState } from 'react'
interface DraftOptions {
  /** What an emptied field means numerically — 0 for money, 1 for a quantity. */
  emptyValue?: number
  min?: number | string
  max?: number | string
}

const toText = (v?: number | null) => (v == null ? '' : String(v))

/** Vietnamese thousands-separated form — matches this app's read-only money
 * displays (fmtCurrency/toLocaleString('vi-VN')), e.g. 2695000 -> "2.695.000". */
const toFormatted = (v?: number | null) => (v == null ? '' : v.toLocaleString('vi-VN', { maximumFractionDigits: 3 }))

function clamp(n: number, min?: number | string, max?: number | string) {
  if (min != null && n < Number(min)) return Number(min)
  if (max != null && n > Number(max)) return Number(max)
  return n
}

/**
 * Makes a numeric field clearable, and shows it thousands-formatted at rest.
 *
 * `value={x} onChange={e => set(Number(e.target.value))}` looks right but traps
 * the user: deleting the last digit yields `''`, which `Number('')` turns
 * straight back into `0`, so the zero can never be erased — it has to be
 * selected and overwritten. Keeping the text under edit as a draft string lets
 * the box sit empty while the model stays a number; the draft resyncs only when
 * the value changes from outside.
 *
 * While focused the field shows the plain digits (easiest to edit/select-all-
 * and-retype); on blur it swaps to the formatted "2.695.000" form — live
 * reformatting on every keystroke fights typing (the box resets the cursor to
 * the end after each digit) and additionally breaks entering a fractional
 * part, since a trailing "," gets stripped by the immediate reformat before
 * the next digit can follow it.
 *
 * Returns the `value`/`onFocus`/`onChange`/`onBlur` props to spread onto any
 * `<input type="text" inputMode="decimal">` (native `type="number"` cannot
 * render the "." thousands separators at all).
 */
export function useNumberDraft(
  value: number | null | undefined,
  onChange: (value: number) => void,
  { emptyValue = 0, min, max }: DraftOptions = {},
) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => toText(value))

  useEffect(() => {
    if (!editing) setDraft(toText(value))
  }, [value, editing])

  return {
    value: editing ? draft : toFormatted(value),
    inputMode: 'decimal' as const,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      setDraft(toText(value))
      setEditing(true)
      // The field still shows the old formatted text at this exact point —
      // switching `editing` only *schedules* the swap to raw digits, it
      // hasn't hit the DOM yet. Selecting now would select the pre-swap
      // text, which browsers then collapse to a stray cursor position
      // instead of a full selection once the value underneath changes.
      // Deferring one tick lets the re-render land first.
      const input = e.target
      requestAnimationFrame(() => input.select())
    },
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      setDraft(raw)
      // '' and a lone '-' are mid-edit states, not numbers.
      if (raw === '' || raw === '-') { onChange(emptyValue); return }
      const n = Number(raw)
      if (Number.isNaN(n)) return
      const capped = clamp(n, min, max)
      onChange(capped)
      // Keep what is on screen honest about what was stored.
      if (capped !== n) setDraft(String(capped))
    },
    onBlur: () => {
      setEditing(false)
      const n = draft === '' || draft === '-' ? emptyValue : Number(draft)
      const next = Number.isNaN(n) ? emptyValue : clamp(n, min, max)
      if (next !== value) onChange(next)
    },
  }
}

type Props = Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  value?: number | null
  onChange: (value: number) => void
  emptyValue?: number
}

/** The shadcn `Input` wired for numbers — see {@link useNumberDraft}. */
export function NumberInput({ value, onChange, emptyValue = 0, min, max, ...rest }: Props) {
  const draft = useNumberDraft(value, onChange, { emptyValue, min, max })
  return <Input {...rest} type="text" {...draft} />
}
