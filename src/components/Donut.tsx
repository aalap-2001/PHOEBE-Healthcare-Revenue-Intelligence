import { useState } from 'react'
import { fmtMoney } from '../lib/format'
import type { Slice } from '../lib/opportunity'

export const SLICE_COLORS = ['#2F5BEA', '#E36C00', '#1F9E8A', '#8E5BD8', '#D6457A', '#3AA0D8', '#B58A00', '#5B6B82']

type Props = {
  slices: Slice[]
  selected: string | null
  onSelect: (key: string | null) => void
  label: string
}

const polar = (cx: number, cy: number, r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)]

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0, y0] = polar(cx, cy, r1, a0)
  const [x1, y1] = polar(cx, cy, r1, a1)
  const [x2, y2] = polar(cx, cy, r0, a1)
  const [x3, y3] = polar(cx, cy, r0, a0)
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`
}

/** Interactive donut: hover to read a slice, click (or use the legend) to filter. */
export function Donut({ slices, selected, onSelect, label }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const shown = slices.filter((s) => s.usd > 0)
  const total = shown.reduce((s, x) => s + x.usd, 0)
  const focus = hover ?? selected
  const focusSlice = shown.find((s) => s.key === focus)

  const size = 220
  const c = size / 2
  let angle = -Math.PI / 2

  return (
    <div className="grid items-center gap-x-6 gap-y-3 @min-[420px]:grid-cols-[176px_minmax(0,1fr)]">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-[176px] max-w-full" role="img" aria-label={`${label}: ${shown.map((s) => `${s.label} ${fmtMoney(s.usd)}`).join(', ')}`}>
        {total === 0 && <circle cx={c} cy={c} r={84} fill="none" stroke="#EEF1F6" strokeWidth={36} />}
        {shown.map((s) => {
          const a0 = angle
          const a1 = angle + (s.usd / total) * Math.PI * 2 - (shown.length > 1 ? 0.012 : 0)
          angle += (s.usd / total) * Math.PI * 2
          const active = focus === s.key
          const dim = focus !== null && !active
          const color = SLICE_COLORS[slices.indexOf(s) % SLICE_COLORS.length]
          return (
            <path
              key={s.key}
              d={arc(c, c, active ? 62 : 66, active ? 108 : 102, a0, Math.max(a0 + 0.001, a1))}
              fill={color}
              opacity={dim ? 0.35 : 1}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelect(selected === s.key ? null : s.key)}
            />
          )
        })}
        <text x={c} y={c - 8} textAnchor="middle" fontSize="11" fill="#5B6B82">
          {focusSlice ? focusSlice.label.split(' · ')[0] : 'Total upside'}
        </text>
        <text x={c} y={c + 14} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0F1B2D">
          {fmtMoney(focusSlice ? focusSlice.usd : total)}
        </text>
        <text x={c} y={c + 31} textAnchor="middle" fontSize="11" fill="#5B6B82">
          {focusSlice ? `${Math.round((focusSlice.usd / total) * 100)}% of total` : 'per year'}
        </text>
      </svg>

      {/* Two compact columns when there's room, so labels and amounts stay close together. */}
      <ul className="m-0 grid list-none gap-x-4 gap-y-1 p-0 @min-[620px]:grid-cols-2" aria-label={`${label} legend`}>
        {shown.map((s) => {
          const color = SLICE_COLORS[slices.indexOf(s) % SLICE_COLORS.length]
          const active = selected === s.key
          return (
            <li key={s.key}>
              <button
                type="button"
                aria-pressed={active}
                title={`${s.label}: ${fmtMoney(s.usd)} (${Math.round((s.usd / total) * 100)}%)`}
                onMouseEnter={() => setHover(s.key)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(s.key)}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(active ? null : s.key)}
                className={`focus-ring flex w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                  active ? 'border-brand/50 bg-brand-soft' : focus === s.key ? 'border-line bg-ground' : 'border-hair bg-white'
                }`}
              >
                <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: color }} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate leading-tight ${active ? 'font-semibold text-brand' : 'font-medium'}`}>{s.label}</span>
                  {/* share bar */}
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-hair">
                    <span className="block h-full rounded-full" style={{ width: `${(s.usd / total) * 100}%`, background: color }} />
                  </span>
                </span>
                <span className="shrink-0 text-right leading-tight">
                  <span className="block font-bold">{fmtMoney(s.usd)}</span>
                  <span className="block text-[11px] text-muted">{Math.round((s.usd / total) * 100)}%</span>
                </span>
              </button>
            </li>
          )
        })}
        {shown.length === 0 && <li className="px-2 py-1 text-[13px] text-muted">No gap at this target.</li>}
      </ul>
    </div>
  )
}
