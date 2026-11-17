import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { useProfile } from '../profile'

/** Two-letter badge from the clinic name, e.g. "Summit Orthopedic Group" → "SO". */
const clinicInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?'

export function UserMenu() {
  const { profile } = useProfile()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Clinic menu: ${profile.clinicName}`}
        className="focus-ring grid size-9 cursor-pointer place-items-center rounded-full bg-ink text-[12px] font-bold text-white"
      >
        {clinicInitials(profile.clinicName)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <div className="truncate px-3 py-2 text-[13px] text-muted">{profile.clinicName}</div>
          <div className="my-1 h-px bg-hair" />
          <Link
            role="menuitem"
            to="/profile"
            onClick={() => setOpen(false)}
            className="focus-ring flex h-10 items-center gap-2.5 rounded-lg px-3 text-[14px] font-medium text-ink no-underline hover:bg-ground"
          >
            <Building2 size={17} aria-hidden="true" /> Clinic profile
          </Link>
        </div>
      )}
    </div>
  )
}
