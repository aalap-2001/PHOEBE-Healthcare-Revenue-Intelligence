/*
 * Clinic data shown across the app.
 * All values are placeholders until the parsed payer-rate and volume CSVs
 * are loaded (handoff §8). Swap this module for API calls later.
 */

export const APP_NAME = 'Phoebe Revenue Intelligence Agent'

export const CLINIC = {
  /** Volume and revenue figures always cover the current calendar year. */
  year: new Date().getFullYear(),
  ratesAsOf: 'Oct 2026',
  feeScheduleYear: 'CY2026',
  codes: 24,
  peerCount: 38,
}

export const HERO = {
  upsideK: 486,
  codesBelow: 9,
}

/* ── Clinic profile (editable) ── */

export type FieldDef = {
  key: string
  label: string
  options?: string[]
  /** Read-only fields come from public registries (NPPES, CMS). */
  readOnly?: string
}
export type SectionDef = { title: string; fields: FieldDef[] }

export const PROFILE_SECTIONS: SectionDef[] = [
  {
    title: 'Clinic details',
    fields: [
      { key: 'clinicName', label: 'Clinic name' },
      { key: 'legalName', label: 'Legal name' },
      { key: 'groupNpi', label: 'Group NPI', readOnly: 'From NPPES' },
      { key: 'tin', label: 'Tax ID (TIN)', readOnly: 'From payer files' },
      { key: 'clinicians', label: 'Clinicians', readOnly: 'From NPPES' },
      { key: 'locations', label: 'Locations' },
    ],
  },
  {
    title: 'Geography',
    fields: [
      { key: 'cityState', label: 'Primary location' },
      { key: 'metroArea', label: 'Metro area' },
      { key: 'state', label: 'State' },
      { key: 'locality', label: 'Medicare locality', readOnly: 'From CMS' },
      { key: 'peerMarket', label: 'Peer market', options: ['Same metro, same specialty', 'Same state, same specialty'] },
    ],
  },
  {
    title: 'Practice type',
    fields: [
      {
        key: 'specialty',
        label: 'Specialty',
        options: ['Orthopedic surgery', 'Endocrinology', 'Family medicine', 'Internal medicine', 'Obstetrics and gynecology', 'Pulmonary and critical care'],
      },
      { key: 'subspecialties', label: 'Subspecialties' },
      { key: 'ownership', label: 'Ownership', options: ['Physician-owned', 'Hospital-owned', 'Private equity–backed', 'Health-system affiliated'] },
      { key: 'size', label: 'Size', options: ['Solo practice', 'Small group (2–10 clinicians)', 'Mid-size group (11–50 clinicians)', 'Large group (50+ clinicians)'] },
    ],
  },
  {
    title: 'Institution type',
    fields: [
      {
        key: 'organization',
        label: 'Organization',
        options: ['Independent physician group', 'Multispecialty group', 'Hospital-employed group', 'Academic practice'],
      },
      { key: 'sites', label: 'Sites of service' },
      { key: 'affiliation', label: 'Health-system affiliation' },
      { key: 'contracting', label: 'Payer contracting', options: ['Fee-for-service, direct contracts', 'Mixed fee-for-service and capitation', 'Mostly capitated'] },
    ],
  },
]

export type Profile = Record<string, string>

export const DEFAULT_PROFILE: Profile = {
  clinicName: 'Summit Orthopedic Group',
  legalName: 'Summit Orthopedic Group, PLLC',
  groupNpi: '•••• •• 0204',
  tin: '••-•••4821',
  clinicians: '10 (8 physicians, 2 PAs)',
  locations: '2 clinics',
  cityState: 'Denver, CO',
  metroArea: 'Denver–Aurora–Centennial, CO',
  state: 'Colorado',
  locality: 'Colorado (statewide)',
  peerMarket: 'Same metro, same specialty',
  specialty: 'Orthopedic surgery',
  subspecialties: 'Joint replacement, sports medicine, spine, hand',
  ownership: 'Physician-owned',
  size: 'Small group (2–10 clinicians)',
  organization: 'Independent physician group',
  sites: 'Office, ambulatory surgery center, hospital outpatient',
  affiliation: 'None',
  contracting: 'Fee-for-service, direct contracts',
}

export type PayerPosition = {
  name: string
  you: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  pctile: number
}

/** Rate as % of Medicare, payer-level. Any number of payers (1–n). */
export const PAYERS: PayerPosition[] = [
  { name: 'Payer A', you: 124, p10: 106, p25: 118, median: 141, p75: 163, p90: 186, pctile: 30 },
  { name: 'Payer B', you: 158, p10: 108, p25: 121, median: 138, p75: 154, p90: 176, pctile: 82 },
  { name: 'Payer C', you: 131, p10: 112, p25: 124, median: 140, p75: 157, p90: 172, pctile: 36 },
  { name: 'Payer D', you: 146, p10: 110, p25: 127, median: 144, p75: 161, p90: 179, pctile: 54 },
  { name: 'Payer E', you: 117, p10: 104, p25: 115, median: 129, p75: 146, p90: 163, pctile: 28 },
  { name: 'Payer F', you: 139, p10: 109, p25: 122, median: 137, p75: 152, p90: 168, pctile: 53 },
  { name: 'Payer G', you: 128, p10: 107, p25: 119, median: 134, p75: 150, p90: 166, pctile: 40 },
  { name: 'Payer H', you: 151, p10: 111, p25: 126, median: 143, p75: 159, p90: 175, pctile: 68 },
]

export type CodeStat = {
  code: string
  service: string
  /** Points vs peer median, both payers combined. */
  pts: number
  /** Estimated annual upside in $K; absent when at/above median. */
  upsideK?: number
  p10: number
  p25: number
  median: number
  p75: number
  p90: number
  /** Rates set aside before benchmarking, by reason. */
  setAside: { pctCharges: number; bundles: number; otherSpecialty: number }
}

export const CODES: CodeStat[] = [
  { code: '27447', service: 'Knee replacement', pts: -22, upsideK: 142, p10: 118, p25: 136, median: 152, p75: 171, p90: 192, setAside: { pctCharges: 3, bundles: 2, otherSpecialty: 1 } },
  { code: '27130', service: 'Hip replacement', pts: -18, upsideK: 96, p10: 116, p25: 133, median: 148, p75: 166, p90: 186, setAside: { pctCharges: 3, bundles: 2, otherSpecialty: 0 } },
  { code: '29827', service: 'Shoulder arthroscopy', pts: -14, upsideK: 71, p10: 124, p25: 142, median: 160, p75: 178, p90: 197, setAside: { pctCharges: 2, bundles: 1, otherSpecialty: 1 } },
  { code: '29881', service: 'Knee arthroscopy', pts: -11, upsideK: 58, p10: 121, p25: 139, median: 155, p75: 172, p90: 190, setAside: { pctCharges: 2, bundles: 0, otherSpecialty: 1 } },
  { code: '20610', service: 'Joint injection', pts: -9, upsideK: 34, p10: 108, p25: 121, median: 135, p75: 149, p90: 166, setAside: { pctCharges: 1, bundles: 0, otherSpecialty: 2 } },
  { code: '29888', service: 'ACL reconstruction', pts: -6, upsideK: 27, p10: 122, p25: 141, median: 158, p75: 175, p90: 194, setAside: { pctCharges: 2, bundles: 1, otherSpecialty: 0 } },
  { code: '99214', service: 'Office visit, established', pts: 8, p10: 104, p25: 116, median: 128, p75: 140, p90: 154, setAside: { pctCharges: 0, bundles: 0, otherSpecialty: 1 } },
  { code: '73721', service: 'Knee MRI', pts: 15, p10: 109, p25: 124, median: 140, p75: 157, p90: 175, setAside: { pctCharges: 1, bundles: 0, otherSpecialty: 0 } },
]

/** Code detail opens on all codes and procedures (and all payers) by default. */
export const DEFAULT_CODE = 'all'

/**
 * Estimated cases per year (current year) and the locality-adjusted Medicare
 * amount per case, by code. Placeholders until the volume and fee-schedule
 * files are loaded.
 */
export const CODE_VOLUME: Record<string, { cases: number; medicareUsd: number }> = {
  '27447': { cases: 410, medicareUsd: 1575 },
  '27130': { cases: 290, medicareUsd: 1640 },
  '29827': { cases: 380, medicareUsd: 1335 },
  '29881': { cases: 620, medicareUsd: 850 },
  '20610': { cases: 2310, medicareUsd: 164 },
  '29888': { cases: 180, medicareUsd: 2500 },
  '99214': { cases: 4860, medicareUsd: 132 },
  '73721': { cases: 1140, medicareUsd: 238 },
}

/** Share of the group's cases billed to each payer (sums to 1). */
export const PAYER_SHARE: Record<string, number> = {
  'Payer A': 0.22,
  'Payer B': 0.18,
  'Payer C': 0.14,
  'Payer D': 0.12,
  'Payer E': 0.1,
  'Payer F': 0.09,
  'Payer G': 0.08,
  'Payer H': 0.07,
}

/**
 * Estimated cases per year and estimated gap revenue per year for one payer
 * on one code: cases × (peer median − your rate, if below) × Medicare amount.
 * Deterministic arithmetic, not model output.
 */
export function payerCodeEstimate(code: string, payer: string) {
  const vol = CODE_VOLUME[code]
  const pos = payerPositionsFor(code).find((p) => p.name === payer)
  if (!vol || !pos) return { cases: 0, gapUsd: 0 }
  const cases = Math.round(vol.cases * (PAYER_SHARE[payer] ?? 0))
  const gapUsd = cases * (Math.max(0, pos.median - pos.you) / 100) * vol.medicareUsd
  return { cases, gapUsd }
}

/** Same estimate summed across every code (for "All codes"). */
export function payerAllCodesEstimate(payer: string) {
  return CODES.reduce(
    (s, c) => {
      const e = payerCodeEstimate(c.code, payer)
      return { cases: s.cases + e.cases, gapUsd: s.gapUsd + e.gapUsd }
    },
    { cases: 0, gapUsd: 0 },
  )
}

/** Top treatments by service volume, current year. */
export const TOP_TREATMENTS = [
  { code: '99214', service: 'Office visit, established', services: 4860 },
  { code: '20610', service: 'Joint injection', services: 2310 },
  { code: '73721', service: 'Knee MRI', services: 1140 },
  { code: '29881', service: 'Knee arthroscopy', services: 620 },
  { code: '27447', service: 'Knee replacement', services: 410 },
]

/** Code with the highest service volume: default for the payer filter. */
export const TOP_CODE = TOP_TREATMENTS[0].code

/** Interpolated percentile of a value within a peer distribution. */
function pctileWithin(v: number, q: { p10: number; p25: number; median: number; p75: number; p90: number }) {
  const pts: [number, number][] = [
    [q.p10, 10],
    [q.p25, 25],
    [q.median, 50],
    [q.p75, 75],
    [q.p90, 90],
  ]
  if (v <= pts[0][0]) return Math.max(1, Math.round(10 - ((pts[0][0] - v) / (pts[1][0] - pts[0][0])) * 15))
  if (v >= pts[4][0]) return Math.min(99, Math.round(90 + ((v - pts[4][0]) / (pts[4][0] - pts[3][0])) * 15))
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (v <= x1) return Math.round(y0 + ((v - x0) / (x1 - x0)) * (y1 - y0))
  }
  return 50
}

/**
 * Payer positions for one code, or all codes blended ('all').
 * Placeholder derivation from code-level and payer-level stats until
 * payer × code rates are loaded.
 */
export function payerPositionsFor(code: string): PayerPosition[] {
  const c = CODES.find((x) => x.code === code)
  if (!c) return PAYERS
  const seed = Number(c.code) % 97
  return PAYERS.map((p, i) => {
    const f = p.median / 140
    const s = (v: number) => Math.round(c.median * f + (v - c.median) * f)
    const q = { p10: s(c.p10), p25: s(c.p25), median: s(c.median), p75: s(c.p75), p90: s(c.p90) }
    const jitter = ((seed + i * 7) % 7) - 3
    const you = Math.round(q.median + c.pts + (p.you - p.median) * 0.5 + jitter)
    return { name: p.name, you, ...q, pctile: pctileWithin(you, q) }
  })
}
export const TOTAL_SERVICES = 12480

export type Clinician = {
  name: string
  credential: string
  focus: string
  services: number
  /** Allowed amount, current year, USD. */
  revenue: number
}

export const CLINICIANS: Clinician[] = [
  { name: 'Daniel Reyes', credential: 'MD', focus: 'Joint replacement', services: 2480, revenue: 1_420_000 },
  { name: 'Priya Nair', credential: 'MD', focus: 'Sports medicine', services: 2760, revenue: 1_180_000 },
  { name: 'Thomas Okafor', credential: 'MD', focus: 'Joint replacement', services: 1890, revenue: 1_050_000 },
  { name: 'Marcus Bell', credential: 'DO', focus: 'Spine', services: 1640, revenue: 960_000 },
  { name: 'Elena Varga', credential: 'MD', focus: 'Hand and upper extremity', services: 2110, revenue: 810_000 },
  { name: 'Samuel Ortiz', credential: 'MD', focus: 'Foot and ankle', services: 1520, revenue: 720_000 },
  { name: 'Hannah Brooks', credential: 'MD', focus: 'Sports medicine', services: 1980, revenue: 690_000 },
  { name: 'Victor Huang', credential: 'MD', focus: 'Spine', services: 1210, revenue: 640_000 },
  { name: 'Rachel Kim', credential: 'PA-C', focus: 'Physician assistant', services: 1600, revenue: 340_000 },
  { name: 'Lena Fischer', credential: 'PA-C', focus: 'Physician assistant', services: 1430, revenue: 290_000 },
]
