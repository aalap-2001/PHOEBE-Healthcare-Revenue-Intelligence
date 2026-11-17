import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, Lightbulb, RotateCcw, X } from 'lucide-react'
import { APP_NAME, CLINIC, CODES, PAYERS, PAYER_SHARE } from '../data/clinic'
import { BackBar } from '../components/BackBar'
import { Combobox } from '../components/Combobox'
import { Donut } from '../components/Donut'
import { Slider } from '../components/Slider'
import { buildInsights, coveredUsd, type Insight, type Priority } from '../lib/insights'
import { DEFAULT_ASSUMPTIONS, computeOpportunity, targetLabel, targetPercentile, type Assumptions } from '../lib/opportunity'
import { fmtInt, fmtMoney } from '../lib/format'
import { useProfile } from '../profile'

type View = 'payer' | 'code'

/** Lower-case only the first letter, so names like "Payer B" keep their capitals mid-sentence. */
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const PRIORITY_STYLE: Record<Priority, { chip: string; dot: string }> = {
  'Quick win': { chip: 'bg-good-soft text-good-ink', dot: '#1F9E8A' },
  'Big bet': { chip: 'bg-brand-soft text-brand', dot: '#2F5BEA' },
  'Easy add': { chip: 'bg-warn-soft text-warn-ink', dot: '#E36C00' },
  Later: { chip: 'bg-ground text-muted', dot: '#8A96A8' },
}

/* ── Priority matrix: revenue impact (up) × ease of implementing (right) ── */

function PriorityMatrix({
  insights,
  total,
  hover,
  setHover,
  openId,
  onOpen,
}: {
  insights: Insight[]
  total: number
  hover: string | null
  setHover: (id: string | null) => void
  openId: string | null
  onOpen: (id: string) => void
}) {
  const maxImpact = Math.max(1, ...insights.map((i) => i.impactUsd))
  const yOf = (usd: number) => Math.min(0.9 - 0.8 * Math.min(1, usd / maxImpact), 0.78)
  const threshold = Math.min(0.9, Math.max(0.1, 0.9 - 0.8 * Math.min(1, (total * 0.15) / maxImpact)))
  // Spread suggestions that share an ease level so their dots don't overlap.
  const xOf = (i: Insight) => {
    const same = insights.filter((x) => x.ease === i.ease)
    const k = same.indexOf(i)
    // Each ease level owns a horizontal band; dots spread evenly inside it.
    const [lo, hi] = { Low: [0.04, 0.3], Medium: [0.36, 0.6], High: [0.62, 0.97] }[i.ease]
    return lo + ((k + 0.5) * (hi - lo)) / same.length
  }
  const tip = insights.find((i) => i.id === hover)

  return (
    <div className="flex flex-col">
      <div className="relative h-[270px]" role="group" aria-label="Priority matrix: suggestions by revenue impact and ease of implementing">
        <div className="absolute inset-0 overflow-hidden rounded-xl border border-line" aria-hidden="true">
          <div className="absolute left-0 top-0 bg-brand-soft/60" style={{ width: '33%', height: `${threshold * 100}%` }} />
          <div className="absolute right-0 top-0 bg-good-soft/70" style={{ left: '33%', height: `${threshold * 100}%` }} />
          <div className="absolute bottom-0 left-0 bg-ground" style={{ width: '33%', top: `${threshold * 100}%` }} />
          <div className="absolute bottom-0 right-0 bg-warn-soft/50" style={{ left: '33%', top: `${threshold * 100}%` }} />
          <span className="absolute left-2 top-1.5 text-[11px] font-semibold text-brand">Big bets</span>
          <span className="absolute right-2 top-1.5 text-[11px] font-semibold text-good-ink">Quick wins</span>
          <span className="absolute bottom-1.5 left-2 text-[11px] font-semibold text-muted">Later</span>
          <span className="absolute bottom-1.5 right-2 text-[11px] font-semibold text-warn-ink">Easy adds</span>
        </div>
        {insights.map((ins, n) => {
          const active = hover === ins.id || openId === ins.id
          return (
            <button
              key={ins.id}
              type="button"
              aria-label={`${n + 1}. ${ins.title}`}
              aria-expanded={openId === ins.id}
              onMouseEnter={() => setHover(ins.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(ins.id)}
              onBlur={() => setHover(null)}
              onClick={() => onOpen(ins.id)}
              className={`focus-ring absolute grid size-7 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 text-[12px] font-bold text-white shadow transition-transform ${
                active ? 'z-10 scale-125' : ''
              } ${openId === ins.id ? 'border-ink' : 'border-white'}`}
              style={{ left: `${xOf(ins) * 100}%`, top: `${yOf(ins.impactUsd) * 100}%`, background: PRIORITY_STYLE[ins.priority].dot }}
            >
              {insights.indexOf(ins) + 1}
            </button>
          )
        })}
        {/* Hover/focus shows the title only; clicking opens the full suggestion. */}
        {tip && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 w-max max-w-[240px] rounded-lg bg-ink px-2.5 py-1.5 text-[12px] font-semibold leading-snug text-white shadow-lg"
            style={{
              left: `${Math.min(Math.max(xOf(tip), 0.3), 0.7) * 100}%`,
              top: `${yOf(tip.impactUsd) * 100}%`,
              transform: yOf(tip.impactUsd) < 0.3 ? 'translate(-50%, 22px)' : 'translate(-50%, calc(-100% - 22px))',
            }}
          >
            {insights.indexOf(tip) + 1}. {tip.title}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>Harder</span>
        <span className="font-semibold">Ease of implementing →</span>
        <span>Easier</span>
      </div>
      <div className="text-[11px] text-muted">Height = revenue impact per year</div>
    </div>
  )
}

/* ── Opened suggestion ── */

function InsightDetail({
  ins,
  n,
  onClose,
  onOpenCode,
}: {
  ins: Insight
  n: number
  onClose: () => void
  onOpenCode: (l: { code: string; payer?: string }) => void
}) {
  return (
    <div className="rounded-xl border border-brand/40 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <span className="grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: PRIORITY_STYLE[ins.priority].dot }}>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-snug">{ins.title}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLE[ins.priority].chip}`}>{ins.priority}</span>
            <span className="rounded-full bg-ground px-2 py-0.5 text-muted">Ease: {ins.ease}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-[15px] font-extrabold ${ins.impactKind === 'gain' ? 'text-[#E36C00]' : ins.impactKind === 'protect' ? 'text-good-ink' : 'text-muted'}`}>
            {ins.impactKind === 'confidence' ? 'Confirms all figures' : `${ins.impactKind === 'gain' ? '+' : ''}${fmtMoney(ins.impactUsd)}/yr`}
          </div>
          <div className="text-[11px] text-muted">
            {ins.impactKind === 'protect' ? 'revenue protected' : ins.impactKind === 'gain' ? 'revenue impact' : 'turns estimates into actuals'}
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close suggestion" className="focus-ring -mr-1 -mt-1 grid size-7 cursor-pointer place-items-center rounded-md text-muted hover:bg-ground">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <p className="m-0 mt-2 text-[13px] leading-relaxed">{ins.summary}</p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>Why this ease: {ins.easeWhy}</span>
        {ins.link && (
          <button type="button" onClick={() => onOpenCode(ins.link!)} className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded font-semibold text-brand hover:underline">
            Open in code detail <ArrowRight size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Page ── */

export function Opportunity() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS)
  const [view, setView] = useState<View>('payer')
  const [sel, setSel] = useState<{ kind: View; key: string } | null>(null)
  const [hoverInsight, setHoverInsight] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const o = useMemo(() => computeOpportunity(a), [a])
  const insights = useMemo(() => buildInsights(o), [o])

  const set = <K extends keyof Assumptions>(k: K, v: Assumptions[K]) => setA((x) => ({ ...x, [k]: v }))
  const changed = JSON.stringify(a) !== JSON.stringify(DEFAULT_ASSUMPTIONS)

  const filteredGaps = sel ? o.gaps.filter((g) => (sel.kind === 'payer' ? g.payer === sel.key : g.code === sel.key)) : o.gaps
  const selectedLabel = sel ? (sel.kind === 'payer' ? o.byPayer : o.byCode).find((s) => s.key === sel.key)?.label : null
  const openInsight = insights.find((i) => i.id === openId) ?? null
  const protect = insights.find((i) => i.impactKind === 'protect')

  const quickWins = insights.filter((i) => i.priority === 'Quick win' && i.impactKind === 'gain')
  // Union of the gaps quick wins cover, so overlapping suggestions are not double counted.
  const quickUsd = coveredUsd(quickWins, o)
  const lead = insights.find((i) => i.impactKind === 'gain')

  const assumptionRows = [
    { label: 'Benchmark target', value: targetLabel(a.target) },
    { label: 'Commercial-to-Medicare volume ratio', value: `${a.ratio.toFixed(1)}×` },
    { label: `${a.focusPayer} market share`, value: `${Math.round(a.focusShare * 100)}%` },
  ]

  // The PDF library loads on first export, keeping it out of the page bundle.
  const exportPack = async () => {
    const { downloadPack } = await import('../lib/exportPack')
    downloadPack({
      appName: APP_NAME,
      clinic: profile.clinicName,
      specialty: profile.specialty,
      location: profile.cityState,
      ratesAsOf: CLINIC.ratesAsOf,
      feeScheduleYear: CLINIC.feeScheduleYear,
      generatedOn: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      assumptions: assumptionRows,
      opportunity: o,
    })
  }

  return (
    <div className="@container mx-auto flex max-w-[1440px] flex-col gap-3 p-3 sm:p-4">
      <BackBar current="Opportunity summary" />

      <div>
        <h1 className="text-[20px] font-extrabold leading-tight tracking-tight">Opportunity summary</h1>
        <div className="text-[13px] text-muted">Move the sliders to build your negotiation strategy. Every figure updates live.</div>
      </div>

      {/* ── Summary + assumptions ── */}
      <div className="grid gap-3 @min-[860px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card flex flex-col">
          <div className="rounded-xl bg-ink px-4 py-3 text-white">
            <div className="text-[11px] font-semibold tracking-[.08em] text-navy-mute">ESTIMATED ANNUAL UPSIDE</div>
            <div className="mt-2 text-[44px] font-extrabold leading-none tracking-tight text-[#FF8A00]" aria-live="polite">
              {fmtMoney(o.high)}
            </div>
            <div className="mt-2 text-[12px] text-navy-soft">
              If every gap closes to the {targetLabel(a.target)} · {PAYERS.length} payers · {CODES.length} codes
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold leading-tight">Biggest gaps</h2>
            {selectedLabel && (
              <button
                type="button"
                onClick={() => setSel(null)}
                className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-semibold text-brand"
              >
                {selectedLabel.split(' · ')[0]} only <X size={13} aria-label="Clear filter" />
              </button>
            )}
          </div>
          <ol className="m-0 mt-1 list-none p-0">
            {filteredGaps.slice(0, 5).map((g, i) => (
              <li key={`${g.payer}-${g.code}`} className="border-t border-hair">
                <Link
                  to={`/codes/${g.code}?payer=${encodeURIComponent(g.payer)}`}
                  className="focus-ring flex items-center gap-3 rounded-md px-1 py-1.5 text-ink no-underline hover:bg-ground"
                >
                  <span className="w-4 shrink-0 text-[13px] text-muted">{i + 1}.</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px]">
                      {g.service} <span className="text-muted">·</span> {g.payer}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {g.code} · you {g.you}% → target {Math.round(g.target)}% · {fmtInt(g.cases)} cases/yr
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-bold text-[#E36C00]">{fmtMoney(g.gapUsd)}</span>
                </Link>
              </li>
            ))}
            {filteredGaps.length === 0 && <li className="border-t border-hair px-1 py-2 text-[13px] text-muted">No gap at this target.</li>}
          </ol>
          <p className="mt-auto pt-2 text-[11px] text-muted">Every figure is an estimate until the group shares remittance data.</p>
        </div>

        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold leading-tight">Assumptions (adjust live)</h2>
            <button
              type="button"
              onClick={() => setA(DEFAULT_ASSUMPTIONS)}
              disabled={!changed}
              className="focus-ring inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-brand hover:bg-brand-soft disabled:cursor-default disabled:text-axis disabled:hover:bg-transparent"
            >
              <RotateCcw size={13} aria-hidden="true" /> Reset
            </button>
          </div>

          <Slider
            label="Benchmark target"
            value={a.target}
            min={0}
            max={1}
            step={0.04}
            display={a.target <= 0 ? 'Median' : a.target >= 1 ? '75th pct' : `${targetPercentile(a.target)}th pct`}
            valueText={targetLabel(a.target)}
            hint="Peer median to 75th percentile"
            onChange={(v) => set('target', v)}
          />
          <Slider
            label="Commercial-to-Medicare ratio"
            value={a.ratio}
            min={0.5}
            max={3}
            step={0.1}
            display={`${a.ratio.toFixed(1)}×`}
            hint="Commercial cases per Medicare case (volume proxy)"
            onChange={(v) => set('ratio', Math.round(v * 10) / 10)}
          />
          <div>
            <Combobox
              label="Payer"
              value={a.focusPayer}
              options={PAYERS.map((p) => ({ value: p.name, label: p.name, hint: `${Math.round((PAYER_SHARE[p.name] ?? 0) * 100)}%` }))}
              onChange={(p) => setA((x) => ({ ...x, focusPayer: p, focusShare: PAYER_SHARE[p] ?? x.focusShare }))}
              className="mb-1.5 w-40"
            />
            <Slider
              label={`${a.focusPayer} market share`}
              value={a.focusShare}
              min={0.02}
              max={0.5}
              step={0.01}
              display={`${Math.round(a.focusShare * 100)}%`}
              hint="Other payers' shares scale to keep the total at 100%"
              onChange={(v) => set('focusShare', Math.round(v * 100) / 100)}
            />
          </div>

          <button
            type="button"
            onClick={exportPack}
            className="focus-ring mt-auto flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-brand/70 bg-brand-soft text-[14px] font-bold text-ink hover:bg-[#E2E9FC]"
          >
            <Download size={17} aria-hidden="true" /> Export negotiation pack
          </button>
          <div className="-mt-2 text-center text-[11px] text-muted">PDF text note with assumptions, upside and biggest gaps</div>
        </div>
      </div>

      {/* ── Interactive donut with a By payer / By code switch ── */}
      <div className="card @container">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold leading-tight">Where the upside is</h2>
            <div className="text-[12px] text-muted">Share of estimated gap revenue per year · click a slice to filter Biggest gaps</div>
          </div>
          <div role="tablist" aria-label="Group by" className="inline-flex rounded-lg border border-line bg-ground p-0.5">
            {(['payer', 'code'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => {
                  setView(v)
                  setSel(null)
                }}
                className={`focus-ring h-7 cursor-pointer rounded-md px-3 text-[12px] font-semibold transition-colors ${
                  view === v ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                By {v}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <Donut
            slices={view === 'payer' ? o.byPayer : o.byCode}
            selected={sel?.kind === view ? sel.key : null}
            onSelect={(key) => setSel(key ? { kind: view, key } : null)}
            label={view === 'payer' ? 'Upside by payer' : 'Upside by code'}
          />
        </div>
      </div>

      {/* ── Phoebe action insights ── */}
      <div className="card @container">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-[16px] font-bold leading-tight">
              <Lightbulb size={17} className="text-[#E36C00]" aria-hidden="true" /> Phoebe action insights
            </h2>
            <div className="text-[12px] text-muted">Revenue intelligence · suggestions ranked by revenue impact and ease of implementing</div>
          </div>
          <div className="flex gap-2 text-[12px]">
            <span className="rounded-full bg-good-soft px-2.5 py-1 font-semibold text-good-ink">Quick wins {fmtMoney(quickUsd)}/yr</span>
            <span className="rounded-full bg-ground px-2.5 py-1 font-semibold text-muted">{insights.length} suggestions</span>
          </div>
        </div>

        <div className="mt-3 grid gap-4 @min-[760px]:grid-cols-[320px_minmax(0,1fr)]">
          <PriorityMatrix insights={insights} total={o.high} hover={hoverInsight} setHover={setHoverInsight} openId={openInsight?.id ?? null} onOpen={(id) => setOpenId(openId === id ? null : id)} />

          <div className="flex min-w-0 flex-col gap-3">
            {/* Highlighted summary */}
            <div className="rounded-xl border-2 border-[#FF8A00]/60 bg-warn-soft/50 px-4 py-3">
              <div className="text-[11px] font-bold tracking-[.08em] text-warn-ink">SUMMARY</div>
              <ul className="m-0 mt-1.5 list-none space-y-1.5 p-0 text-[13.5px] leading-snug">
                {lead && (
                  <li>
                    Start with <b>{lcFirst(lead.title)}</b>, worth about <b className="text-[#E36C00]">{fmtMoney(lead.impactUsd)}/yr</b>.
                  </li>
                )}
                <li>
                  Quick wins together cover <b className="text-[#E36C00]">{fmtMoney(quickUsd)}/yr</b>,{' '}
                  {o.high > 0 ? Math.round((quickUsd / o.high) * 100) : 0}% of the high-end upside at the {targetLabel(a.target)}.
                </li>
                {protect && (
                  <li>
                    Protect: {lcFirst(protect.title)}, <b className="text-good-ink">{fmtMoney(protect.impactUsd)}/yr</b> at risk.
                  </li>
                )}
              </ul>
            </div>

            {openInsight ? (
              <InsightDetail
                ins={openInsight}
                n={insights.indexOf(openInsight) + 1}
                onClose={() => setOpenId(null)}
                onOpenCode={(l) => navigate(`/codes/${l.code}${l.payer ? `?payer=${encodeURIComponent(l.payer)}` : ''}`)}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line px-4 py-6 text-center text-[13px] text-muted">
                Click a number on the matrix to open that suggestion. Hover to see its title.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Gap revenue = cases × (target rate − your rate) × Medicare amount per case, counted only where you are below target. Cases = Medicare-volume
        proxy × commercial-to-Medicare ratio × payer share. Suggestions follow fixed rules over these figures. A gap against public rates is a
        negotiation signal, not a confirmed underpayment.
      </p>
    </div>
  )
}
