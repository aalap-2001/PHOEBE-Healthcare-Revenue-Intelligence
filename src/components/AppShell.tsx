import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { CLINIC, PAYERS } from '../data/clinic'
import { Brand } from './Brand'
import { useMediaQuery } from '../lib/useMediaQuery'
import { SidePanel, SideRail } from './SideNav'
import { UserMenu } from './UserMenu'

const PREF_KEY = 'prb.navCollapsed'

function readCollapsed() {
  try {
    return localStorage.getItem(PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMobileOpen(false), [pathname])

  const expanded = isDesktop ? !collapsed : mobileOpen

  const toggle = () => {
    if (!isDesktop) return setMobileOpen((o) => !o)
    setCollapsed((c) => {
      try {
        localStorage.setItem(PREF_KEY, c ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !c
    })
  }

  const ToggleIcon = isDesktop ? (expanded ? PanelLeftClose : PanelLeftOpen) : expanded ? X : Menu

  return (
    <div className="min-h-dvh bg-ground text-ink">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-line bg-white pl-3 pr-4 sm:pr-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
            aria-expanded={expanded}
            aria-controls="app-nav"
            className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-[10px] text-ink hover:bg-ground"
          >
            <ToggleIcon size={20} aria-hidden="true" />
          </button>
          <Link to="/" aria-label="Home: market position" className="focus-ring min-w-0 rounded-md px-1 py-0.5 no-underline hover:opacity-80">
            <Brand />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-[13px] text-muted md:inline">
            Position as on {CLINIC.ratesAsOf} · {PAYERS.length} {PAYERS.length === 1 ? 'payer' : 'payers'} · {CLINIC.codes} codes
          </span>
          <UserMenu />
        </div>
      </header>

      {!isDesktop && mobileOpen && <SidePanel />}

      <div className="flex">
        {isDesktop && <SideRail collapsed={collapsed} />}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
