import { jsPDF } from 'jspdf'
import { fmtMoney } from './format'
import type { Opportunity } from './opportunity'

export type PackInput = {
  appName: string
  clinic: string
  specialty: string
  location: string
  ratesAsOf: string
  feeScheduleYear: string
  generatedOn: string
  assumptions: { label: string; value: string }[]
  opportunity: Opportunity
}

/** The built-in PDF fonts cover Latin-1 only; swap typographic characters for plain ones. */
const plain = (s: string) =>
  s
    .replace(/[−–—]/g, '-')
    .replace(/×/g, 'x')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, '|')
    .replace(/[^\x00-\xff]/g, '')

/** Builds the negotiation pack as a plain-text PDF. */
export function buildPackPdf(d: PackInput) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const left = 56
  const width = 500
  let y = 60

  const ensure = (h: number) => {
    if (y + h > 740) {
      doc.addPage()
      y = 60
    }
  }
  const text = (s: string, size = 10, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [15, 27, 45]) => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
    for (const line of doc.splitTextToSize(plain(s), width) as string[]) {
      ensure(size * 1.45)
      doc.text(line, left, y)
      y += size * 1.45
    }
  }
  const gap = (h = 8) => (y += h)
  const rule = () => {
    ensure(12)
    doc.setDrawColor(227, 232, 240)
    doc.line(left, y, left + width, y)
    y += 14
  }
  const row = (cols: string[], xs: number[], style: 'normal' | 'bold' = 'normal') => {
    ensure(15)
    doc.setFont('helvetica', style)
    doc.setFontSize(9.5)
    doc.setTextColor(15, 27, 45)
    cols.forEach((c, i) => doc.text(plain(c), left + xs[i], y, i === cols.length - 1 ? { align: 'right' } : undefined))
    y += 15
  }

  text(`${d.appName} - Negotiation pack`, 16, 'bold')
  text(`${d.clinic} | ${d.specialty} | ${d.location}`, 10, 'normal', [91, 107, 130])
  text(`Generated ${d.generatedOn} | Rates as of ${d.ratesAsOf} | Medicare fee schedule ${d.feeScheduleYear}`, 9, 'normal', [91, 107, 130])
  gap(6)
  rule()

  text('Estimated annual upside', 12, 'bold')
  text(`${fmtMoney(d.opportunity.high)} per year`, 18, 'bold', [227, 108, 0])
  text('Highest possible value: every gap closed to the target rate.', 9, 'normal', [91, 107, 130])
  gap()

  text('Assumptions', 12, 'bold')
  for (const a of d.assumptions) text(`- ${a.label}: ${a.value}`, 10)
  gap()

  text('Biggest gaps', 12, 'bold')
  row(['#', 'Code / service', 'Payer', 'Your rate', 'Target', 'Gap / yr'], [0, 18, 250, 330, 400, 500], 'bold')
  d.opportunity.gaps.slice(0, 10).forEach((g, i) =>
    row(
      [`${i + 1}`, `${g.code} ${g.service}`, g.payer, `${g.you}%`, `${Math.round(g.target)}%`, fmtMoney(g.gapUsd)],
      [0, 18, 250, 330, 400, 500],
    ),
  )
  gap()

  text('Upside by payer', 12, 'bold')
  for (const s of d.opportunity.byPayer.filter((x) => x.usd > 0)) {
    const pct = d.opportunity.high > 0 ? Math.round((s.usd / d.opportunity.high) * 100) : 0
    row([s.label, `${pct}%`, fmtMoney(s.usd)], [0, 400, 500])
  }
  gap()

  rule()
  text(
    'Every figure is an estimate until the group shares remittance data. A gap against public rates is a negotiation signal, not a confirmed underpayment. Rates are negotiated dollar rates only; percent-of-charges rates and bundles are excluded.',
    8.5,
    'normal',
    [91, 107, 130],
  )
  return doc
}

export function downloadPack(d: PackInput) {
  const safe = d.clinic.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  buildPackPdf(d).save(`Negotiation-pack-${safe}-${d.generatedOn.replace(/[^0-9A-Za-z]+/g, '-')}.pdf`)
}
