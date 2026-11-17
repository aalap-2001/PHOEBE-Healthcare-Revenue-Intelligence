import { useEffect, useState } from 'react'
import type { PayerPosition } from '../data/clinic'
import { fmtPts, ordinal } from '../lib/format'
import { ScrollArea } from './ScrollArea'

/** Shared scale across all payers, padded and rounded to tidy ticks. */
function scaleFor(payers: PayerPosition[]) {
  const lo = Math.floor((Math.min(...payers.map((p) => Math.min(p.p10, p.you))) - 5) / 10) * 10
  const hi = Math.ceil((Math.max(...payers.map((p) => Math.max(p.p90, p.you))) + 5) / 10) * 10
  const span = hi - lo
  const step = span > 120 ? 40 : span > 60 ? 20 : 10
  const ticks: number[] = []
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t)
  return { pos: (v: number) => `${((v - lo) / span) * 100}%`, ticks }
}

type Tip = { p: PayerPosition; x: number; y: number; below: boolean }

function Row({
  p,
  pos,
  ticks,
  onShow,
  onHide,
  onOpen,
}: {
  p: PayerPosition
  pos: (v: number) => string
  ticks: number[]
  onShow: (p: PayerPosition, el: HTMLElement) => void
  onHide: () => void
  onOpen?: (p: PayerPosition) => void
}) {
  const gap = p.you - p.median
  const below = gap < 0
  const summary = `${p.name}: you are paid ${p.you}% of Medicare. Local peers: median ${p.median}%, middle half ${p.p25}–${p.p75}%. ${
    below ? `${Math.abs(gap)} points below` : `${gap} points above`
  } the median, ${ordinal(p.pctile)} percentile.`

  return (
    <li
      tabIndex={0}
      aria-label={summary}
      onMouseEnter={(e) => onShow(p, e.currentTarget)}
      onFocus={(e) => onShow(p, e.currentTarget)}
      onMouseLeave={onHide}
      onBlur={onHide}
      onClick={onOpen ? () => onOpen(p) : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(p)
              }
            }
          : undefined
      }
      role={onOpen ? 'link' : undefined}
      className={`${onOpen ? 'cursor-pointer ' : ''}focus-ring grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-lg border-t border-hair px-1 py-2 hover:bg-ground sm:grid-cols-[88px_minmax(0,1fr)_172px]`}
    >
      <div className="min-w-0 truncate text-[14px] font-bold">{p.name}</div>

      {/* track */}
      <div className="relative order-last col-span-2 h-7 sm:order-none sm:col-span-1" aria-hidden="true">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-y-0 w-px bg-hair" style={{ left: pos(t) }} />
        ))}
        <div className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-axis" style={{ left: pos(p.p10), right: `calc(100% - ${pos(p.p90)})` }} />
        <div className="absolute top-1/2 h-4 -translate-y-1/2 rounded-[5px] bg-band" style={{ left: pos(p.p25), right: `calc(100% - ${pos(p.p75)})` }} />
        <div
          className={`absolute top-1/2 h-1 -translate-y-1/2 ${below ? 'bg-warn' : 'bg-good'}`}
          style={{ left: pos(Math.min(p.you, p.median)), right: `calc(100% - ${pos(Math.max(p.you, p.median))})` }}
        />
        <div className="absolute top-0.5 bottom-0.5 w-[2.5px] -translate-x-1/2 rounded bg-ink" style={{ left: pos(p.median) }} />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white bg-brand shadow-[0_0_0_1px_rgba(47,91,234,.25)]"
          style={{ left: pos(p.you) }}
        />
      </div>

      {/* numbers */}
      <div className="text-right sm:text-left">
        <div className={`text-[15px] font-extrabold leading-tight ${gap === 0 ? 'text-muted' : below ? 'text-warn-ink' : 'text-good-ink'}`}>
          {gap === 0 ? '● At median' : `${below ? '▼' : '▲'} ${fmtPts(gap)} pts`}
        </div>
        <div className="whitespace-nowrap text-[12px] text-muted">
          You {p.you}% · Median {p.median}%
        </div>
      </div>
    </li>
  )
}

export function PayerChart({ payers, peers, onOpen }: { payers: PayerPosition[]; peers: number; onOpen?: (p: PayerPosition) => void }) {
  const [tip, setTip] = useState<Tip | null>(null)

  // A fixed-position tooltip goes stale when the page scrolls.
  useEffect(() => {
    if (!tip) return
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [tip])

  if (payers.length === 0) {
    return <p className="mt-3 text-[13px] text-muted">No payer rate files have been loaded yet.</p>
  }

  // Biggest shortfall first: the payers worth a conversation sit at the top.
  const sorted = [...payers].sort((a, b) => a.you - a.median - (b.you - b.median))
  const { pos, ticks } = scaleFor(payers)
  const belowCount = payers.filter((p) => p.you < p.median).length
  const worst = sorted[0]

  const showTip = (p: PayerPosition, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const below = r.top < 110
    setTip({ p, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below })
  }

  return (
    <div>
      <p className="mt-1 text-[13px] text-ink">
        {payers.length === 1 ? (
          <>
            <b>{worst.name}</b> pays you {worst.you < worst.median ? 'below' : 'at or above'} the local peer median.
          </>
        ) : belowCount === 0 ? (
          <>
            <b>All {payers.length}</b> payers pay you at or above the local peer median.
          </>
        ) : (
          <>
            <b>
              {belowCount} of {payers.length}
            </b>{' '}
            payers pay you below the local peer median
            {worst.you < worst.median && (
              <>
                {' '}· largest gap <b>{worst.name}</b> ({fmtPts(worst.you - worst.median)} pts)
              </>
            )}
          </>
        )}
      </p>

      {/* axis */}
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-x-4 px-1 sm:grid-cols-[88px_minmax(0,1fr)_172px]" aria-hidden="true">
        <span className="hidden sm:block" />
        <div className="relative h-4 text-[11px] text-muted">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
              {t}%
            </span>
          ))}
        </div>
        <span className="hidden sm:block" />
      </div>

      <ScrollArea label={`Payers, ${payers.length}`} className="mt-1 max-h-[372px] pr-1 sm:max-h-[272px]" onScroll={() => setTip(null)}>
        <ul className="m-0 list-none p-0">
          {sorted.map((p) => (
            <Row key={p.name} p={p} pos={pos} ticks={ticks} onShow={showTip} onHide={() => setTip(null)} onOpen={onOpen} />
          ))}
        </ul>
      </ScrollArea>

      {tip && (
        <div
          role="presentation"
          className="pointer-events-none fixed z-40 w-max max-w-[300px] rounded-lg bg-ink px-3 py-2 text-[12px] leading-relaxed text-white shadow-lg"
          style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}
        >
          <div className="font-semibold">{tip.p.name}</div>
          <div>
            You: {tip.p.you}% of Medicare · {ordinal(tip.p.pctile)} percentile
          </div>
          <div className="text-navy-soft">
            Peers: median {tip.p.median}% · middle half {tip.p.p25}–{tip.p.p75}% · range {tip.p.p10}–{tip.p.p90}% · n = {peers}
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hair pt-2.5 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-brand" />Your rate</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-[3px] bg-ink" />Peer median</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-[18px] rounded-[3px] bg-band" />Middle half of peers</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-[18px] bg-axis" />Peer range</span>
        <span className="hidden sm:inline">· {onOpen ? 'Hover for detail, click to open code detail' : 'Hover a payer for detail'}</span>
      </div>
    </div>
  )
}
