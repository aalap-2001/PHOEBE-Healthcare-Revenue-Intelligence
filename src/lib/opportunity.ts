import { CODES, CODE_VOLUME, PAYERS, PAYER_SHARE, payerPositionsFor } from '../data/clinic'

/*
 * Opportunity calculator. Deterministic arithmetic only (no model output):
 *   target rate  = peer median + target × (peer P75 − peer median)
 *   cases        = Medicare-volume proxy × commercial-to-Medicare ratio × payer share
 *   gap revenue  = cases × max(0, target − your rate) / 100 × Medicare amount per case
 */

export type Assumptions = {
  /** 0 = peer median, 1 = peer 75th percentile. */
  target: number
  /** Commercial cases per Medicare case (volume proxy multiplier). */
  ratio: number
  /** Payer whose market share is being adjusted. */
  focusPayer: string
  /** That payer's share of the group's commercial cases (0–1). */
  focusShare: number
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  target: 0,
  ratio: 1,
  focusPayer: 'Payer A',
  focusShare: PAYER_SHARE['Payer A'],
}

export type Pair = {
  payer: string
  code: string
  service: string
  you: number
  median: number
  p25: number
  p75: number
  target: number
  gapPts: number
  cases: number
  medicareUsd: number
  gapUsd: number
  /** Revenue that would be lost if an above-median rate fell to the median. */
  atRiskUsd: number
}

export type Slice = { key: string; label: string; usd: number }

export const targetPercentile = (t: number) => Math.round(50 + 25 * t)
export const targetLabel = (t: number) => (t <= 0 ? 'peer median' : t >= 1 ? 'peer 75th percentile' : `peer ${targetPercentile(t)}th percentile`)

/** Payer shares with the focus payer overridden and the rest scaled to keep the total at 1. */
export function payerShares(a: Assumptions): Record<string, number> {
  const base = PAYER_SHARE[a.focusPayer] ?? 0
  const scale = base >= 1 ? 0 : (1 - a.focusShare) / (1 - base)
  return Object.fromEntries(PAYERS.map((p) => [p.name, p.name === a.focusPayer ? a.focusShare : (PAYER_SHARE[p.name] ?? 0) * scale]))
}

export function computeOpportunity(a: Assumptions) {
  const shares = payerShares(a)
  const pairs: Pair[] = []
  for (const c of CODES) {
    const vol = CODE_VOLUME[c.code]
    if (!vol) continue
    for (const p of payerPositionsFor(c.code)) {
      const target = p.median + a.target * (p.p75 - p.median)
      const gapPts = Math.max(0, target - p.you)
      const cases = Math.round(vol.cases * a.ratio * (shares[p.name] ?? 0))
      pairs.push({
        payer: p.name,
        code: c.code,
        service: c.service,
        you: p.you,
        median: p.median,
        p25: p.p25,
        p75: p.p75,
        target,
        gapPts,
        cases,
        medicareUsd: vol.medicareUsd,
        gapUsd: (cases * gapPts * vol.medicareUsd) / 100,
        atRiskUsd: (cases * Math.max(0, p.you - p.median) * vol.medicareUsd) / 100,
      })
    }
  }

  const high = pairs.reduce((s, x) => s + x.gapUsd, 0)
  const byPayer: Slice[] = PAYERS.map((p) => ({
    key: p.name,
    label: p.name,
    usd: pairs.filter((x) => x.payer === p.name).reduce((s, x) => s + x.gapUsd, 0),
  }))
  const byCode: Slice[] = CODES.map((c) => ({
    key: c.code,
    label: `${c.code} · ${c.service}`,
    usd: pairs.filter((x) => x.code === c.code).reduce((s, x) => s + x.gapUsd, 0),
  }))

  return {
    pairs,
    /** Low end assumes half of each gap is won; high end assumes the full gap to target. */
    low: high * 0.5,
    high,
    byPayer: byPayer.sort((x, y) => y.usd - x.usd),
    byCode: byCode.sort((x, y) => y.usd - x.usd),
    gaps: pairs.filter((x) => x.gapUsd > 0).sort((x, y) => y.gapUsd - x.gapUsd),
  }
}

export type Opportunity = ReturnType<typeof computeOpportunity>
