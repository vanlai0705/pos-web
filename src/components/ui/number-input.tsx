import { useEffect, useRef, useState } from 'react'
import { Input, type InputProps } from '@/components/ui/input'

interface DraftOptions {
  /** What an emptied field means numerically — 0 for money, 1 for a quantity. */
  emptyValue?: number
  min?: number | string
  max?: number | string
}

const toText = (v?: number | null) => (v == null ? '' : String(v))

function clamp(n: number, min?: number | string, max?: number | string) {
  if (min != null && n < Number(min)) return Number(min)
  if (max != null && n > Number(max)) return Number(max)
  return n
}

/**
 * Makes a numeric field clearable.
 *
 * `value={x} onChange={e => set(Number(e.target.value))}` looks right but traps
 * the user: deleting the last digit yields `''`, which `Number('')` turns
 * straight back into `0`, so the zero can never be erased — it has to be
 * selected and overwritten. Keeping the text under edit as a draft string lets
 * the box sit empty while the model stays a number; the draft resyncs only when
 * the value changes from outside.
 *
 * Returns the `value`/`onFocus`/`onChange`/`onBlur` props to spread onto any
 * `<input type="number">`.
 */
export function useNumberDraft(
  value: number | null | undefined,
  onChange: (value: number) => void,
  { emptyValue = 0, min, max }: DraftOptions = {},
) {
  const [draft, setDraft] = useState(() => toText(value))
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setDraft(toText(value))
  }, [value])

  return {
    value: draft,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      editing.current = true
      // Typing then replaces the value instead of appending to it.
      e.target.select()
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
      editing.current = false
      const n = draft === '' || draft === '-' ? emptyValue : Number(draft)
      const next = Number.isNaN(n) ? emptyValue : clamp(n, min, max)
      setDraft(toText(next))
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
  return <Input {...rest} type="number" min={min} max={max} {...draft} />
}
