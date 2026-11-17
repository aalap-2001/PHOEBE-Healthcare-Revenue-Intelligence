export type Quantiles = { p10: number; p25: number; median: number; p75: number; p90: number }

/**
 * Deterministic peer rates reconstructed from quantiles
 * (P10, P25, median, P75, P90). Placeholder until per-peer rates are loaded.
 */
export function peerRates(s: Quantiles, n: number): number[] {
  const pts: [number, number][] = [
    [0.1, s.p10],
    [0.25, s.p25],
    [0.5, s.median],
    [0.75, s.p75],
    [0.9, s.p90],
  ]
  const q = (p: number) => {
    let i = pts.findIndex(([qp]) => p <= qp)
    if (i === -1) i = pts.length - 1 // above P90: extend the top segment
    else if (i === 0) i = 1 // below P10: extend the bottom segment
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    return y0 + ((p - x0) * (y1 - y0)) / (x1 - x0)
  }
  return Array.from({ length: n }, (_, i) => Math.round(q((i + 0.5) / n)))
}

export function percentileOf(values: number[], v: number) {
  const below = values.filter((x) => x < v).length
  const equal = values.filter((x) => x === v).length
  return Math.round(((below + equal / 2) / values.length) * 100)
}
