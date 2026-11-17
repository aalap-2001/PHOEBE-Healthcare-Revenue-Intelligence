import { NavLink } from 'react-router-dom'
import { LayoutDashboard, PieChart, ScanSearch, type LucideIcon } from 'lucide-react'

type Item = { to: string; label: string; icon: LucideIcon; end?: boolean }

/* Clinic profile opens from the account menu. */
export const NAV: Item[] = [
  { to: '/', label: 'Market position', icon: LayoutDashboard, end: true },
  { to: '/codes', label: 'Code detail', icon: ScanSearch },
  { to: '/opportunities', label: 'Opportunity summary', icon: PieChart },
]

function NavItem({ item, collapsed }: { item: Item; collapsed: boolean }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `focus-ring flex h-11 items-center gap-3 whitespace-nowrap rounded-[10px] text-[14px] font-semibold transition-colors ${
          collapsed ? 'justify-center px-0' : 'px-3'
        } ${isActive ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-ground'}`
      }
    >
      <Icon size={20} className="shrink-0" aria-hidden="true" />
      <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
    </NavLink>
  )
}

/** Desktop: a rail that pushes the content (never overlays it). */
export function SideRail({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={`sticky top-14 h-[calc(100dvh-3.5rem)] shrink-0 overflow-hidden border-r border-line bg-white transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
    >
      <nav id="app-nav" aria-label="Main" className="p-3">
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavItem item={item} collapsed={collapsed} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

/** Mobile: an in-flow panel under the top bar that pushes content down. */
export function SidePanel() {
  return (
    <nav id="app-nav" aria-label="Main" className="border-b border-line bg-white px-3 py-2">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavItem item={item} collapsed={false} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
