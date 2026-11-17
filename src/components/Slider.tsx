import { useId, type ReactNode } from 'react'

type Props = {
  label: ReactNode
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
  hint?: string
  /** Text for screen readers when the number alone isn't meaningful. */
  valueText?: string
}

export function Slider({ label, value, min, max, step, display, onChange, hint, valueText }: Props) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="shrink-0 text-[13px] font-bold tabular-nums">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText ?? display}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range mt-1.5 w-full cursor-pointer"
        style={{ background: `linear-gradient(to right, #2F5BEA ${pct}%, #E3E8F0 ${pct}%)` }}
      />
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}
