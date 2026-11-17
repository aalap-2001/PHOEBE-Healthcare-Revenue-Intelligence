import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BackBar } from '../components/BackBar'
import {
  CLINIC,
  CODES,
  DEFAULT_CODE,
  PAYERS,
  TOP_CODE,
  payerAllCodesEstimate,
  payerCodeEstimate,
  payerPositionsFor,
} from '../data/clinic'
import { Combobox, type ComboOption } from '../components/Combobox'
import { ScrollArea } from '../components/ScrollArea'
import { useProfile } from '../profile'
import { fmtInt, fmtMoney, fmtPts, ordinal } from '../lib/format'
import { peerRates, percentileOf, type Quantiles } from '../lib/peers'

const ALL = 'all'
const BIN = 10

const CODE_OPTIONS: ComboOption[] = [
  { value: ALL, label: 'All codes and procedures' },
  ...CODES.map((c) => ({
    value: c.code,
    label: `${c.code} · ${c.service}`,
    hint: c.code === TOP_CODE ? 'Top code' : undefined,
  })),
]

const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / xs.length)

/** All codes, all payers: the payer-level positions averaged into one blended view. */
const BLENDED = {
  q: {
    p10: avg(PAYERS.map((p) => p.p10)),
    p25: avg(PAYERS.map((p) => p.p25)),
    median: avg(PAYERS.map((p) => p.median)),
    p75: avg(PAYERS.map((p) => p.p75)),
    p90: avg(PAYERS.map((p) => p.p90)),
  } satisfies Quantiles,
  you: avg(PAYERS.map((p) => p.you)),
}

const SET_ASIDE_ALL = CODES.reduce(
  (s, c) => ({
    pctCharges: s.pctCharges + c.setAside.pctCharges,
    bundles: s.bundles + c.setAside.bundles,
    otherSpecialty: s.otherSpecialty + c.setAside.otherSpecialty,
  }),
  { pctCharges: 0, bundles: 0, otherSpecialty: 0 },
)

type TableRow = {
  key: string
  label: string
  sub?: string
  you: number
  median: number
  pctile: number
  cases: number
  gapUsd: number
  active: boolean
  onSelect: () => void
}

/** Largest revenue gap first; ties (e.g. $0) fall back to the biggest rate shortfall. */
const byGapRevenue = (a: TableRow, b: TableRow) => b.gapUsd - a.gapUsd || a.you - a.median - (b.you - b.median)
const PAYER_OPTIONS: ComboOption[] = [{ value: ALL, label: 'All payers' }, ...PAYERS.map((p) => ({ value: p.name, label: p.name }))]

/* ── Peer distribution chart ── */

/** Tracks an element's size so the chart draws at real pixels (labels stay readable at any width). */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

function Distribution(props: { q: Quantiles; peers: number[]; you: number; code: string }) {
  const [ref, size] = useSize<HTMLDivElement>()
  return (
    <div ref={ref} className="relative min-h-[200px] w-full flex-1">
      {size.w > 0 && (
        <div className="absolute inset-0">
          <DistributionSvg {...props} W={Math.max(240, size.w)} H={Math.max(200, Math.min(size.h, 340))} />
        </div>
      )}
    </div>
  )
}

function DistributionSvg({ q, peers, you, code, W, H }: { q: Quantiles; peers: number[]; you: number; code: string; W: number; H: number }) {
  const lo = Math.floor((Math.min(q.p10, you, ...peers) - 12) / BIN) * BIN
  const hi = Math.ceil((Math.max(q.p90, you, ...peers) + 12) / BIN) * BIN
  const L = 32
  const R = 12
  const T = 40
  const B = 30
  const plotW = W - L - R
  const plotH = H - T - B
  const sx = (v: number) => L + ((Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * plotW

  const bins = Array.from({ length: (hi - lo) / BIN }, (_, i) => lo + i * BIN)
  const counts = bins.map((b) => peers.filter((v) => v >= b && v < b + BIN).length)
  const yMax = Math.max(2, Math.ceil(Math.max(...counts) / 2) * 2)
  const sy = (c: number) => T + plotH - (c / yMax) * plotH
  const below = you < q.median
  const tickStep = hi - lo > 120 || W < 360 ? 40 : 20
  const near = Math.abs(sx(you) - sx(q.median)) < 70
  const [hover, setHover] = useState<number | null>(null)

  const hb = hover === null ? null : bins[hover]
  const hc = hover === null ? 0 : counts[hover]
  const tipX = hb === null ? 0 : Math.min(Math.max(sx(hb + BIN / 2), 110), W - 110)
  const tipY = hb === null ? 0 : Math.max(sy(hc) - 10, 64)

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="block"
      role="img"
      aria-label={`${code} peer distribution: ${peers.length} peer rates. Your rate ${you} percent of Medicare, peer median ${q.median} percent, middle half ${q.p25} to ${q.p75} percent.`}
    >
      <rect x={sx(q.p25)} y={T} width={sx(q.p75) - sx(q.p25)} height={plotH} fill="#DCE4F5" opacity="0.55" />
      {Array.from({ length: yMax / 2 + 1 }, (_, i) => i * 2).map((c) => (
        <g key={c}>
          <line x1={L} x2={W - R} y1={sy(c)} y2={sy(c)} stroke="#EEF1F6" />
          <text x={L - 8} y={sy(c) + 4} textAnchor="end" fontSize="11" fill="#5B6B82">{c}</text>
        </g>
      ))}
      {hb !== null && <rect x={sx(hb)} y={T} width={sx(hb + BIN) - sx(hb)} height={plotH} fill="#2F5BEA" opacity="0.06" />}
      {bins.map((b, i) =>
        counts[i] ? (
          <rect
            key={b}
            x={sx(b) + 2}
            y={sy(counts[i])}
            width={sx(b + BIN) - sx(b) - 4}
            height={sy(0) - sy(counts[i])}
            rx="3"
            fill={hover === i ? '#4F7FE0' : '#8FB3E8'}
            style={{ transition: 'fill .12s' }}
          />
        ) : null,
      )}
      <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke="#C5CFE0" strokeWidth="1.5" />
      {bins
        .concat(hi)
        .filter((b) => b % tickStep === 0)
        .map((b) => (
          <text key={b} x={sx(b)} y={H - 10} textAnchor={b === hi ? 'end' : b === lo ? 'start' : 'middle'} fontSize="11" fill="#5B6B82">{b}%</text>
        ))}
      <line x1={sx(q.median)} x2={sx(q.median)} y1={T - 6} y2={sy(0)} stroke="#0F1B2D" strokeWidth="2" strokeDasharray="5 4" />
      <text
        x={sx(q.median)}
        y={T - 10}
        textAnchor={near ? (you >= q.median ? 'end' : 'start') : 'middle'}
        dx={near ? (you >= q.median ? -6 : 6) : 0}
        fontSize="12"
        fill="#5B6B82"
      >
        Median {q.median}%
      </text>
      <line x1={sx(you)} x2={sx(you)} y1={20} y2={sy(0)} stroke="#2F5BEA" strokeWidth="2.5" />
      <text x={sx(you)} y={14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2F5BEA">You {you}%</text>
      <line
        x1={sx(Math.min(you, q.median))}
        x2={sx(Math.max(you, q.median))}
        y1={sy(0)}
        y2={sy(0)}
        stroke={below ? '#FF8A00' : '#1F9E8A'}
        strokeWidth="4"
      />
      <circle cx={sx(you)} cy={sy(0)} r="6" fill="#2F5BEA" stroke="#fff" strokeWidth="2" />

      {/* Hit areas: one full-height column per 10-point range, hoverable and keyboard-focusable. */}
      {bins.map((b, i) => (
        <rect
          key={`hit-${b}`}
          x={sx(b)}
          y={T}
          width={sx(b + BIN) - sx(b)}
          height={plotH}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={`${b} to ${b + BIN} percent of Medicare: ${counts[i]} peer ${counts[i] === 1 ? 'group' : 'groups'}`}
          className="cursor-crosshair outline-none"
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
        />
      ))}
    </svg>

    {hb !== null && (
      <div
        role="status"
        className="pointer-events-none absolute z-10 w-[220px] rounded-lg bg-ink px-3 py-2 text-[12px] leading-relaxed text-white shadow-lg"
        style={{ left: tipX, top: tipY, transform: 'translate(-50%, -100%)' }}
      >
        <div className="font-semibold">
          {hb}–{hb + BIN}% of Medicare
        </div>
        <div>
          {hc} of {peers.length} peer groups ({Math.round((hc / peers.length) * 100)}%)
        </div>
        <div className="text-navy-soft">
          {you >= hb && you < hb + BIN
            ? `Your rate (${you}%) is in this range`
            : `Paid ${hb + BIN}%, you’d be at the ${ordinal(percentileOf(peers, hb + BIN))} percentile`}
        </div>
      </div>
    )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-hair py-1 text-[12px]">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-right font-semibold">{children}</dd>
    </div>
  )
}

/* ── Page ── */

export function CodeDetail() {
  const { code } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { profile } = useProfile()

  const allCodes = code === ALL
  const stat = allCodes ? undefined : CODES.find((c) => c.code === code)
  const validCode = allCodes || !!stat
  const codeValue = allCodes ? ALL : (stat?.code ?? DEFAULT_CODE)
  const payerParam = params.get('payer') ?? ALL
  const payer = PAYERS.some((p) => p.name === payerParam) ? payerParam : ALL

  // Payer positions for the selected code, or payer-level positions across all codes.
  const byPayer = useMemo(() => (allCodes ? PAYERS : stat ? payerPositionsFor(stat.code) : []), [allCodes, stat])

  const view = useMemo(() => {
    if (!validCode) return null
    if (payer !== ALL) {
      const p = byPayer.find((x) => x.name === payer)!
      return { q: { p10: p.p10, p25: p.p25, median: p.median, p75: p.p75, p90: p.p90 }, you: p.you }
    }
    if (allCodes || !stat) return BLENDED
    return { q: { p10: stat.p10, p25: stat.p25, median: stat.median, p75: stat.p75, p90: stat.p90 }, you: stat.median + stat.pts }
  }, [validCode, allCodes, stat, payer, byPayer])

  const peers = useMemo(() => (view ? peerRates(view.q, CLINIC.peerCount) : []), [view])

  if (!validCode || !view) return <Navigate to={`/codes/${DEFAULT_CODE}`} replace />

  const { q, you } = view
  const gap = you - q.median
  const below = gap < 0
  const pct = percentileOf(peers, you)
  const setAside = stat ? stat.setAside : SET_ASIDE_ALL
  const setAsideTotal = setAside.pctCharges + setAside.bundles + setAside.otherSpecialty
  const codeTitle = stat ? `${stat.code} · ${stat.service}` : 'All codes and procedures'
  const codeShort = stat ? stat.code : 'All codes'

  // Filter changes replace the history entry, so Back returns to where you came from.
  const setCode = (c: string) => navigate({ pathname: `/codes/${c}`, search: params.toString() }, { replace: true })
  const setPayer = (p: string) => {
    const next = new URLSearchParams(params)
    if (p === ALL) next.delete('payer')
    else next.set('payer', p)
    setParams(next, { replace: true })
  }

  /*
   * The table follows both filters:
   *  - All payers → one row per payer, for the selected code (or blended across codes).
   *  - One payer  → that payer's rate on every code; the selected code is highlighted.
   */
  const tableRows: TableRow[] = (
    payer === ALL
      ? byPayer.map((p) => {
          const est = stat ? payerCodeEstimate(stat.code, p.name) : payerAllCodesEstimate(p.name)
          return { key: p.name, label: p.name, you: p.you, median: p.median, pctile: p.pctile, ...est, active: false, onSelect: () => setPayer(p.name) }
        })
      : CODES.map((c) => {
          const p = payerPositionsFor(c.code).find((x) => x.name === payer)!
          const est = payerCodeEstimate(c.code, payer)
          return {
            key: c.code,
            label: c.code,
            sub: c.service,
            you: p.you,
            median: p.median,
            pctile: p.pctile,
            ...est,
            active: c.code === stat?.code,
            onSelect: () => setCode(c.code),
          }
        })
  ).sort(byGapRevenue)
  const totalCases = tableRows.reduce((s, r) => s + r.cases, 0)
  const totalGap = tableRows.reduce((s, r) => s + r.gapUsd, 0)
  const maxGap = Math.max(0, ...tableRows.map((r) => r.gapUsd))
  // Gap revenue for exactly what the filters select, so the card and the table agree.
  const viewGapUsd =
    payer === ALL
      ? totalGap
      : stat
        ? payerCodeEstimate(stat.code, payer).gapUsd
        : payerAllCodesEstimate(payer).gapUsd
  const tableTitle = payer === ALL ? `${codeShort} by payer` : `${payer} by code`
  const tableHint =
    payer === ALL ? 'Largest revenue gap first · select a payer to filter' : 'Largest revenue gap first · select a code to view its distribution'

  return (
    <div className="@container mx-auto flex max-w-[1440px] flex-col gap-3 p-3 sm:p-4">
      <BackBar current="Code detail" />

      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold leading-tight tracking-tight">
            {codeTitle}
            {payer !== ALL && <span className="font-semibold text-muted"> · {payer}</span>}
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Combobox label="Code" value={codeValue} options={CODE_OPTIONS} onChange={setCode} align="right" className="w-full sm:w-64" />
          <Combobox label="Payer" value={payer} options={PAYER_OPTIONS} onChange={setPayer} align="right" className="w-full sm:w-44" />
        </div>
      </div>

      {/*
        Wide: chart + two compact cards in one row, equal height.
        Narrower: chart takes the full row, the two compact cards sit side by side below it.
      */}
      <div className="grid gap-3 @min-[520px]:grid-cols-2 @min-[760px]:grid-cols-[minmax(0,1fr)_210px_230px]">
        <div className="card flex flex-col @min-[520px]:col-span-2 @min-[760px]:col-span-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <div>
              <h2 className="text-[16px] font-bold leading-tight">Peer distribution</h2>
              <div className="text-[12px] text-muted">What local peers are paid, as a % of Medicare</div>
            </div>
            <span className="text-[12px] text-muted">{peers.length} peer groups · bars = groups per 10-point range</span>
          </div>
          <div className="mt-2 flex flex-1">
            <Distribution key={`${codeValue}-${payer}`} q={q} peers={peers} you={you} code={codeShort} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hair pt-2 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-[3px] bg-brand" />Your rate</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-3 w-[3px] border-l-2 border-dashed border-ink" />Peer median</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-[18px] rounded-[3px] bg-band" />Middle half of peers</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-[3px] bg-above" />Peer groups</span>
            <span className="hidden @min-[520px]:inline">· Hover a bar for detail</span>
          </div>
        </div>

          <div className="card !p-3">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className={`whitespace-nowrap text-[20px] font-extrabold leading-tight ${gap === 0 ? 'text-muted' : below ? 'text-warn-ink' : 'text-good-ink'}`}>
                {gap === 0 ? 'At median' : `${fmtPts(gap)} pts`}
              </div>
              {gap !== 0 && (
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${below ? 'bg-warn-soft text-warn-ink' : 'bg-good-soft text-good-ink'}`}>
                  {below ? '▼ Below median' : '▲ Above median'}
                </span>
              )}
            </div>
            <dl className="m-0 mt-1.5">
              <Row label="Your rate"><span className="text-brand">{you}%</span></Row>
              <Row label="Peer median">{q.median}%</Row>
              <Row label="Middle half">{q.p25}–{q.p75}%</Row>
              <Row label="Your percentile">{ordinal(pct)}</Row>
              <Row label="Est. gap revenue / yr">{viewGapUsd > 0 ? fmtMoney(viewGapUsd) : '—'}</Row>
            </dl>
            {viewGapUsd === 0 && <p className="mt-1 text-[11px] text-muted">At or above the peer median, so no gap revenue is counted.</p>}
          </div>

          <div className="card !p-3">
            <h2 className="text-[14px] font-bold leading-tight">How this number is built</h2>
            <dl className="m-0 mt-1">
              <Row label="Peer set">{CLINIC.peerCount} groups</Row>
              <Row label="Rates used">{peers.length} $ rates</Row>
              <Row label="Rates set aside">{setAsideTotal}{payer !== ALL && ' (all payers)'}</Row>
            </dl>
            {setAsideTotal > 0 && (
              <ul className="m-0 mb-1 list-none p-0 text-[11px] leading-snug text-muted">
                {setAside.pctCharges > 0 && <li>{setAside.pctCharges} percent-of-charges rates</li>}
                {setAside.bundles > 0 && <li>{setAside.bundles} bundled or case rates</li>}
                {setAside.otherSpecialty > 0 && <li>{setAside.otherSpecialty} billed under another specialty</li>}
              </ul>
            )}
            <dl className="m-0">
              <Row label="Benchmark">Medicare {CLINIC.feeScheduleYear}</Row>
              <Row label="Rates as of">{CLINIC.ratesAsOf}</Row>
              <Row label="Sources">{payer === ALL ? `${PAYERS.length} payer files` : `${payer} file`}</Row>
            </dl>
          </div>
      </div>

      <div className="card @container">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="text-[16px] font-bold leading-tight">{tableTitle}</h2>
          <span className="flex items-center gap-2 text-[12px] text-muted">
            {tableHint}
            {payer !== ALL && (
              <button type="button" onClick={() => setPayer(ALL)} className="focus-ring cursor-pointer rounded font-semibold text-brand hover:underline">
                Show all payers
              </button>
            )}
          </span>
        </div>
        <ScrollArea key={`${codeValue}-${payer}`} label={tableTitle} fade={false} className="mt-1.5 max-h-[300px] pr-1">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-[1] bg-white">
              <tr className="text-left text-[12px] text-muted shadow-[0_1px_0_var(--color-hair)]">
                <th className="whitespace-nowrap pb-1 font-normal">
                  <div className="flex items-center gap-3">
                    <span className={`shrink-0 ${payer === ALL ? 'w-[72px]' : 'w-[220px]'}`}>{payer === ALL ? 'Payer' : 'Code'}</span>
                    <span className="hidden whitespace-nowrap @min-[600px]:inline" title="Each row’s gap revenue relative to the largest">
                      <span className="@min-[820px]:hidden">Gap share</span>
                      <span className="hidden @min-[820px]:inline">Share of gap revenue</span>
                    </span>
                  </div>
                </th>
                <th className="w-[1%] whitespace-nowrap pb-1 pl-3 text-right font-normal">Est. gap revenue / yr</th>
                <th className="w-[1%] whitespace-nowrap pb-1 pl-4 text-right font-normal @min-[720px]:pl-8">Your rate</th>
                <th className="w-[1%] whitespace-nowrap pb-1 pl-4 text-right font-normal @min-[720px]:pl-8">Peer median</th>
                <th className="hidden w-[1%] whitespace-nowrap pb-1 pl-4 text-right font-normal @min-[600px]:table-cell @min-[720px]:pl-8">Percentile</th>
                <th className="w-[1%] whitespace-nowrap pb-1 pl-4 text-right font-normal @min-[720px]:pl-8">Est. cases / yr</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((p) => {
                  const active = p.active
                  return (
                    <tr
                      key={p.key}
                      onClick={p.onSelect}
                      className={`cursor-pointer border-t border-hair ${active ? 'bg-brand-soft' : 'hover:bg-ground'}`}
                    >
                      <td className="py-1">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            aria-current={active ? 'true' : undefined}
                            onClick={(e) => {
                              e.stopPropagation()
                              p.onSelect()
                            }}
                            className={`focus-ring shrink-0 cursor-pointer whitespace-nowrap rounded text-left font-semibold ${
                              p.sub ? 'w-[220px] truncate' : 'w-[72px]'
                            } ${active ? 'text-brand' : 'text-ink'}`}
                          >
                            {p.label}
                            {p.sub && <span className="ml-1.5 font-normal text-muted">{p.sub}</span>}
                          </button>
                          {/* Share of the table's gap revenue, filling the space beside the label. */}
                          <div className="hidden h-1.5 min-w-[40px] flex-1 overflow-hidden rounded-full bg-hair @min-[600px]:block" aria-hidden="true">
                            <div className="h-full rounded-full bg-warn" style={{ width: `${maxGap > 0 ? (p.gapUsd / maxGap) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className={`whitespace-nowrap py-1 pl-3 text-right font-bold ${p.gapUsd > 0 ? 'text-[#E36C00]' : 'text-muted'}`}>
                        {p.gapUsd > 0 ? fmtMoney(p.gapUsd) : '—'}
                      </td>
                      <td className="whitespace-nowrap py-1 pl-4 text-right @min-[720px]:pl-8 font-semibold text-brand">{p.you}%</td>
                      <td className="whitespace-nowrap py-1 pl-4 text-right @min-[720px]:pl-8">{p.median}%</td>
                      <td className="hidden whitespace-nowrap py-1 pl-4 text-right @min-[600px]:table-cell @min-[720px]:pl-8">{ordinal(p.pctile)}</td>
                      <td className="whitespace-nowrap py-1 pl-4 text-right @min-[720px]:pl-8">{fmtInt(p.cases)}</td>
                    </tr>
                  )
                })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-white">
              <tr className="text-[13px] shadow-[0_-1px_0_var(--color-line)]">
                <td className="py-1 font-semibold">Total</td>
                <td className="whitespace-nowrap py-1 pl-3 text-right font-extrabold text-[#E36C00]">{totalGap > 0 ? fmtMoney(totalGap) : '—'}</td>
                <td />
                <td />
                <td className="hidden @min-[600px]:table-cell" />
                <td className="whitespace-nowrap py-1 pl-4 text-right @min-[720px]:pl-8 font-semibold">{fmtInt(totalCases)}</td>
              </tr>
            </tfoot>
          </table>
        </ScrollArea>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Peer rates are each group’s negotiated dollar rate for {stat ? stat.code : 'each code'} divided by the {profile.cityState} Medicare amount. Percent-of-charges rates,
        bundles and rates billed under other specialties are never mixed into the benchmark. Est. gap revenue / yr = estimated cases × (peer median −
        your rate) × Medicare amount per case, counted only where you are below the median. A gap against public rates is a negotiation signal, not a
        confirmed underpayment.
      </p>
    </div>
  )
}
