import { CODES, PAYERS } from '../data/clinic'
import { fmtMoney, fmtPts } from './format'
import type { Opportunity } from './opportunity'

/*
 * Phoebe action insights. Each suggestion is produced by a fixed rule over the
 * opportunity figures, so every number in it traces to the calculator.
 */

export type Ease = 'High' | 'Medium' | 'Low'
export type Priority = 'Quick win' | 'Big bet' | 'Easy add' | 'Later'

export type Insight = {
  id: string
  title: string
  summary: string
  /** Revenue impact per year in USD (gap won, or revenue protected). */
  impactUsd: number
  impactKind: 'gain' | 'protect' | 'confidence'
  ease: Ease
  easeWhy: string
  priority: Priority
  /** Code detail link target, when the insight is about one payer or code. */
  link?: { code: string; payer?: string }
  /** Payer × code gaps this suggestion covers, so totals across suggestions never double count. */
  pairKeys: string[]
}

export const pairKey = (payer: string, code: string) => `${payer}|${code}`

/** Gap revenue covered by a set of suggestions, counting each payer × code gap once. */
export function coveredUsd(insights: Insight[], o: Opportunity) {
  const keys = new Set(insights.flatMap((i) => i.pairKeys))
  return o.gaps.filter((g) => keys.has(pairKey(g.payer, g.code))).reduce((s, g) => s + g.gapUsd, 0)
}

const PRIORITY_ORDER: Priority[] = ['Quick win', 'Big bet', 'Easy add', 'Later']

function priorityOf(impactUsd: number, total: number, ease: Ease): Priority {
  const highImpact = total > 0 && impactUsd >= total * 0.15
  if (highImpact) return ease === 'Low' ? 'Big bet' : 'Quick win'
  return ease === 'Low' ? 'Later' : 'Easy add'
}

export function buildInsights(o: Opportunity): Insight[] {
  const total = o.high
  const out: Omit<Insight, 'priority'>[] = []

  // 1. Renegotiate the payers holding the most upside.
  for (const slice of o.byPayer.filter((s) => s.usd > 0).slice(0, 3)) {
    const rows = o.gaps.filter((g) => g.payer === slice.key)
    const strong = rows.filter((g) => g.you < g.p25).length
    const ratio = rows.length ? strong / rows.length : 0
    const ease: Ease = ratio >= 0.5 ? 'High' : ratio >= 0.25 ? 'Medium' : 'Low'
    const top = rows[0]
    out.push({
      id: `payer-${slice.key}`,
      title: `Renegotiate ${slice.key} on ${rows.length} ${rows.length === 1 ? 'code' : 'codes'}`,
      summary: `${slice.key} pays below target on ${rows.length} of ${CODES.length} codes. Largest gap: ${top.code} ${top.service} (${fmtPts(Math.round(top.you - top.target))} pts, ${fmtMoney(top.gapUsd)}/yr).`,
      impactUsd: slice.usd,
      impactKind: 'gain',
      ease,
      easeWhy: `${strong} of ${rows.length} codes sit below the peer 25th percentile, ${ease === 'High' ? 'strong' : ease === 'Medium' ? 'fair' : 'thin'} evidence for the ask`,
      link: { code: 'all', payer: slice.key },
      pairKeys: rows.map((g) => pairKey(g.payer, g.code)),
    })
  }

  // 2. Package the joint-replacement codes into one ask.
  const joint = o.gaps.filter((g) => g.code === '27447' || g.code === '27130')
  const jointUsd = joint.reduce((s, g) => s + g.gapUsd, 0)
  if (jointUsd > 0) {
    out.push({
      id: 'joint-bundle',
      title: 'Package knee and hip replacement (27447, 27130) as one ask',
      summary: `Both codes trail peers with ${new Set(joint.map((g) => g.payer)).size} payers. Asking for them together keeps the case simple and covers ${fmtMoney(jointUsd)}/yr.`,
      impactUsd: jointUsd,
      impactKind: 'gain',
      ease: 'Medium',
      easeWhy: 'High-value surgical codes draw more payer scrutiny',
      link: { code: '27447' },
      pairKeys: joint.map((g) => pairKey(g.payer, g.code)),
    })
  }

  // 3. Protect the strongest contract at renewal.
  const risk = PAYERS.map((p) => ({
    payer: p.name,
    usd: o.pairs.filter((x) => x.payer === p.name).reduce((s, x) => s + x.atRiskUsd, 0),
    above: o.pairs.filter((x) => x.payer === p.name && x.you > x.median).length,
  })).sort((a, b) => b.usd - a.usd)[0]
  if (risk && risk.usd > 0) {
    out.push({
      id: `protect-${risk.payer}`,
      title: `Hold ${risk.payer} rates at renewal`,
      summary: `You are paid above the peer median by ${risk.payer} on ${risk.above} codes. Conceding to the median would cost about ${fmtMoney(risk.usd)}/yr.`,
      impactUsd: risk.usd,
      impactKind: 'protect',
      ease: 'High',
      easeWhy: 'Keeping current terms needs no new evidence',
      link: { code: 'all', payer: risk.payer },
      pairKeys: [],
    })
  }

  // 4. A low-volume code with a large gap per case, judged on the code's total cases across all
  //    payers, and never a code another suggestion already asks for.
  const covered = new Set(['27447', '27130'])
  const lowVolume = CODES.map((c) => {
    const rows = o.gaps.filter((g) => g.code === c.code)
    const cases = o.pairs.filter((p) => p.code === c.code).reduce((s, p) => s + p.cases, 0)
    const usd = rows.reduce((s, g) => s + g.gapUsd, 0)
    return { code: c.code, service: c.service, rows, cases, usd }
  })
    .filter((x) => !covered.has(x.code) && x.usd > 0 && x.cases > 0 && x.cases < 250)
    .sort((a, b) => b.usd / b.cases - a.usd / a.cases)[0]
  if (lowVolume) {
    out.push({
      id: `low-volume-${lowVolume.code}`,
      title: `Leave ${lowVolume.code} ${lowVolume.service} for a later round`,
      summary: `Large gap per case (${fmtMoney(lowVolume.usd / lowVolume.cases)}), but only about ${lowVolume.cases} cases a year across all payers. Worth ${fmtMoney(lowVolume.usd)}/yr in total.`,
      impactUsd: lowVolume.usd,
      impactKind: 'gain',
      ease: 'Low',
      easeWhy: 'Low volume gives little leverage in a negotiation',
      link: { code: lowVolume.code },
      pairKeys: lowVolume.rows.map((g) => pairKey(g.payer, g.code)),
    })
  }

  // 5. Turn estimates into exact numbers.
  out.push({
    id: 'confirm-data',
    title: 'Share fee schedules and 835 remittances to confirm',
    summary: `Every figure here is an estimate from public rates and a Medicare-volume proxy. Your own contracts and payments replace estimates with exact, volume-weighted numbers.`,
    impactUsd: 0,
    impactKind: 'confidence',
    ease: 'High',
    easeWhy: 'A file upload; no payer contact needed',
    pairKeys: [],
  })

  return out
    .map((i) => ({ ...i, priority: priorityOf(i.impactUsd, total, i.ease) }))
    .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || b.impactUsd - a.impactUsd)
}
