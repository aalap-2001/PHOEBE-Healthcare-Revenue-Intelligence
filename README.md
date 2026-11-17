# Phoebe Revenue Intelligence Agent: frontend

Powered by healtheon.ai. React + TypeScript + Vite + Tailwind CSS.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. No sign-in is needed.

Production build: `npm run build` (output in `dist/`).

## Screens

| Route | Screen |
|---|---|
| `/` | Market position: upside, payer chart with code filter, top codes, clinicians, gap bars |
| `/codes/:code` | Code detail: peer distribution, position, how the number is built, by-payer table (`/codes/all` for all codes) |
| `/opportunities` | Opportunity summary: sliders, upside, biggest gaps, upside donut, Phoebe action insights, PDF export |
| `/profile` | Clinic profile (editable; opened from the account menu) |

## Where things live

- `src/data/clinic.ts`: all sample data (clinic, payers, codes, volumes, payer shares, clinicians). Placeholder values until the parsed payer-rate and volume files are loaded.
- `src/lib/opportunity.ts`: gap revenue calculator (deterministic arithmetic).
- `src/lib/insights.ts`: rule-based action insights.
- `src/lib/exportPack.ts`: negotiation pack PDF (jsPDF, loaded on first export).
- `src/pages/`: one file per screen. `src/components/`: shared UI (searchable select, donut, sliders, side menu).

Profile edits and the menu's collapsed state are stored in the browser only (localStorage). There is no backend yet.

All figures are estimates. A gap against public rates is a negotiation signal, not a confirmed underpayment.
