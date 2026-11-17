import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  CLINIC,
  CLINICIANS,
  CODES,
  DEFAULT_CODE,
  HERO,
  PAYERS,
  TOP_CODE,
  TOP_TREATMENTS,
  TOTAL_SERVICES,
  payerPositionsFor,
} from '../data/clinic'
import { Combobox, type ComboOption } from '../components/Combobox'
import { PayerChart } from '../components/PayerChart'
import { ScrollArea } from '../components/ScrollArea'
import { fmtInt, fmtMoney, fmtPts } from '../lib/format'
import { useProfile } from '../profile'
import { DEFAULT_ASSUMPTIONS, computeOpportunity } from '../lib/opportunity'

const payerScope = PAYERS.length === 1 ? `with ${PAYERS[0].name}` : PAYERS.length === 2 ? 'across both payers' : `across all ${PAYERS.length} payers`

/** Same calculation and defaults as the Opportunity summary page, so the two always match. */
const OPP = computeOpportunity(DEFAULT_ASSUMPTIONS)
const largestGapPayer = OPP.byPayer[0]?.usd > 0 ? OPP.byPayer[0].label : null
const upsideByCode = Object.fromEntries(OPP.byCode.map((s) => [s.key, s.usd]))

const CODE_OPTIONS: ComboOption[] = [
  { value: 'all', label: 'All codes (blended)' },
  ...CODES.map((c) => ({ value: c.code, label: `${c.code} · ${c.service}`, hint: c.code === TOP_CODE ? 'Top code' : undefined })),
]

function Hero() {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl bg-ink p-5 text-white sm:p-6">
      <div>
        <div className="text-[12px] font-semibold tracking-[.08em] text-navy-mute">ESTIMATED ANNUAL UPSIDE</div>
        <div className="mt-3 text-[80px] font-extrabold leading-none tracking-tight text-[#FF8A00]" aria-live="polite">
          {fmtMoney(OPP.high)}
        </div>
        <div className="mt-3 text-[14px] text-navy-soft">if every gap closes to the local peer median {payerScope}</div>
      </div>
      <div className="flex flex-col gap-3.5 border-t border-navy-line pt-5">
        <div>
          <span className="text-[24px] font-bold">{HERO.codesBelow} of {CLINIC.codes}</span>{' '}
          <span className="text-[13px] text-navy-soft">codes below peer median</span>
        </div>
        {largestGapPayer && (
          <div>
            <span className="text-[24px] font-bold">{largestGapPayer}</span>{' '}
            <span className="text-[13px] text-navy-soft">holds the largest gap</span>
          </div>
        )}
        <div className="text-[12px] text-navy-mute">Estimate: rate gap × cases × Medicare amount per case</div>
        <Link to="/opportunities" className="focus-ring -mt-1 w-fit rounded-sm text-[12px] text-[#FF8A00] underline underline-offset-2 hover:text-[#FFB15C]">
          Opportunity summary
        </Link>
      </div>
    </div>
  )
}

function PayerPositionCard() {
  const [code, setCode] = useState(TOP_CODE)
  const payers = useMemo(() => payerPositionsFor(code), [code])
  const navigate = useNavigate()
  const openDetail = (p: { name: string }) =>
    navigate(`/codes/${code}?payer=${encodeURIComponent(p.name)}`)
  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold leading-tight">Market position by payer</h2>
          <div className="text-[12px] text-muted">Rate as % of Medicare · vs local peers</div>
        </div>
        <Combobox label="Code" value={code} options={CODE_OPTIONS} onChange={setCode} align="right" className="w-full sm:w-64" />
      </div>
      <PayerChart key={code} payers={payers} peers={CLINIC.peerCount} onOpen={openDetail} />
    </div>
  )
}

function GapBars() {
  return (
    <div className="card">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-bold leading-tight">Where you’re paid below and above peers</h2>
          <div className="text-[12px] text-muted">Top 8 of {CLINIC.codes} codes · all payers combined · points vs peer median</div>
        </div>
        <Link
          to={`/codes/${DEFAULT_CODE}`}
          className="focus-ring inline-flex h-9 items-center gap-2 rounded-[10px] bg-brand px-4 text-[13px] font-semibold text-white no-underline hover:bg-brand-dark"
        >
          Code detail <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_64px] items-center gap-3 pb-1 text-[12px] text-muted sm:grid-cols-[64px_190px_1fr_72px]">
        <span className="sm:hidden">Code</span>
        <span className="hidden sm:inline">Code</span>
        <span className="hidden sm:inline">Service</span>
        <div className="flex justify-between"><span>◀ Below</span><span className="hidden sm:inline">Median</span><span>Above ▶</span></div>
        <span className="text-right">Upside</span>
      </div>
      {CODES.map((c) => {
        const width = `${((Math.abs(c.pts) / 60) * 100).toFixed(1)}%`
        return (
          <Link
            key={c.code}
            to={`/codes/${c.code}`}
            className="focus-ring grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_64px] items-center gap-3 rounded-md border-t border-hair py-2 text-[14px] text-ink no-underline hover:bg-ground sm:grid-cols-[64px_190px_1fr_72px]"
          >
            <span className="min-w-0">
              <b>{c.code}</b>
              <span className="block truncate text-[12px] text-muted sm:hidden">{c.service}</span>
            </span>
            <span className="hidden truncate sm:inline">{c.service}</span>
            <div className="relative h-[18px]">
              <div className="absolute -bottom-1.5 -top-1.5 left-1/2 w-0.5 bg-axis" />
              <i
                className={`absolute top-0 h-[18px] whitespace-nowrap rounded px-2 text-[12px] font-bold not-italic leading-[18px] ${
                  c.pts < 0 ? 'right-1/2 bg-warn text-[#3A2600]' : 'left-1/2 bg-above text-ink'
                }`}
                style={{ width }}
              >
                {fmtPts(c.pts)}
              </i>
            </div>
            {upsideByCode[c.code] > 0 ? (
              <b className="text-right">{fmtMoney(upsideByCode[c.code])}</b>
            ) : (
              <span className="text-right text-muted">—</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

function TopTreatments() {
  const max = TOP_TREATMENTS[0].services
  return (
    <div className="card flex flex-col">
      <h2 className="text-[16px] font-bold leading-tight">Top codes</h2>
      <div className="text-[12px] text-muted">Top {TOP_TREATMENTS.length} treatments by service volume · {CLINIC.year}</div>
      <ul className="m-0 mt-2 flex flex-1 list-none flex-col justify-between p-0">
        {TOP_TREATMENTS.map((t) => (
          <li key={t.code} className="border-t border-hair py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14px]">
                <b>{t.code}</b> <span className="text-muted">·</span> {t.service}
              </span>
              <span className="shrink-0 text-[14px] font-bold">{fmtInt(t.services)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-hair">
                <div className="h-full rounded-full bg-brand" style={{ width: `${(t.services / max) * 100}%` }} />
              </div>
              <span className="shrink-0 whitespace-nowrap text-right text-[12px] text-muted">
                {Math.round((t.services / TOTAL_SERVICES) * 100)}% of services
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * On md+ the inner layout is absolutely positioned so the card takes the
 * Top codes card's height, and the clinician list scrolls within it.
 */
function Clinicians() {
  const max = Math.max(...CLINICIANS.map((c) => c.revenue))
  const total = CLINICIANS.reduce((s, c) => s + c.revenue, 0)
  return (
    <div className="card @container relative md:min-h-[300px]">
      <div className="flex flex-col md:absolute md:inset-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="text-[16px] font-bold leading-tight">Clinicians</h2>
          <span className="text-[12px] text-muted">{CLINICIANS.length} practitioners · {fmtMoney(total)}</span>
        </div>
        <div className="text-[12px] text-muted">Revenue per clinician · {CLINIC.year}</div>
        <ScrollArea label={`Clinicians, ${CLINICIANS.length}`} wrapperClassName="mt-2 md:min-h-0 md:flex-1" className="max-h-[340px] pr-1 md:h-full md:max-h-none">
          <table className="w-full border-collapse text-[14px]">
            <thead className="sticky top-0 z-[1] bg-white">
              <tr className="text-left text-[12px] text-muted shadow-[0_1px_0_var(--color-hair)]">
                <th className="pb-1 font-normal">Clinician</th>
                <th className="hidden pb-1 text-right font-normal @sm:table-cell">Services</th>
                <th className="pb-1 pl-4 text-right font-normal">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {CLINICIANS.map((c) => (
                <tr key={c.name} className="border-t border-hair">
                  <td className="py-2 pr-2">
                    <div className="font-semibold leading-tight">{c.name}, {c.credential}</div>
                    <div className="text-[12px] text-muted">{c.focus}</div>
                  </td>
                  <td className="hidden py-2 text-right @sm:table-cell">{fmtInt(c.services)}</td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center justify-end gap-3">
                      <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-hair @lg:block">
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(c.revenue / max) * 100}%` }} />
                      </div>
                      <b className="w-[64px] text-right">{fmtMoney(c.revenue)}</b>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
        <p className="mt-1.5 text-[11px] leading-snug text-muted">
          Medicare allowed amounts (CMS). Commercial remittances replace these once 835 files are connected.
        </p>
      </div>
    </div>
  )
}

export function Overview() {
  const { profile } = useProfile()
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6">
        <div>
          <h1 className="text-[20px] font-extrabold leading-tight tracking-tight">{profile.clinicName}</h1>
          <div className="text-[13px] text-muted">{profile.specialty} · {profile.cityState}</div>
        </div>
        <div className="text-[12px] text-muted md:hidden">
          Position as on {CLINIC.ratesAsOf} · {PAYERS.length} {PAYERS.length === 1 ? 'payer' : 'payers'} · {CLINIC.codes} codes
        </div>
      </div>

      <section className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Hero />
        <PayerPositionCard />
      </section>

      <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <TopTreatments />
        <Clinicians />
      </section>

      <GapBars />

      <p className="text-[11px] leading-relaxed text-muted">
        Rates as of {CLINIC.ratesAsOf} · Public in-network files from {PAYERS.length} {PAYERS.length === 1 ? 'payer' : 'payers'} · Medicare physician fee
        schedule {CLINIC.feeScheduleYear} · Peers: {profile.specialty.toLowerCase()}, {profile.cityState}, n = {CLINIC.peerCount}
        <br />
        Upside = rate gap × the group’s Medicare service volume (volume proxy). A gap against public rates is a negotiation signal, not a confirmed
        underpayment.
      </p>
    </div>
  )
}
