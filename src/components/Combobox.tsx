import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export type ComboOption = { value: string; label: string; hint?: string }

type Props = {
  id?: string
  value: string
  options: ComboOption[]
  onChange: (value: string) => void
  /** Accessible name. */
  label: string
  className?: string
  /** Popover alignment against the trigger. */
  align?: 'left' | 'right'
}

/** Searchable select: a button that opens a filterable listbox. */
export function Combobox({ id, value, options, onChange, label, className = '', align = 'left' }: Props) {
  const uid = useId()
  const listId = `${uid}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = options.find((o) => o.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))
  }, [options, query])

  const openList = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }
  const choose = (o: ComboOption) => {
    onChange(o.value)
    close()
  }

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[active]) choose(filtered[active])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label ?? 'none'}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openList()
          }
        }}
        className="focus-ring flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 text-left text-[13px] font-medium text-ink hover:border-axis"
      >
        <span className="min-w-0 truncate">{selected?.label ?? 'Select…'}</span>
        <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          className={`absolute top-full z-30 mt-1 w-full min-w-[240px] rounded-xl border border-line bg-white p-1.5 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={filtered[active] ? `${uid}-opt-${active}` : undefined}
              aria-label={`Search ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKey}
              placeholder="Search…"
              className="h-8 w-full rounded-lg border border-line bg-ground pl-8 pr-2 text-[13px] outline-none focus:border-brand focus:bg-white"
            />
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="scroll-thin m-0 mt-1 max-h-60 list-none overflow-y-auto p-0">
            {filtered.length === 0 && <li className="px-2.5 py-2 text-[13px] text-muted">No matches</li>}
            {filtered.map((o, i) => {
              const isSel = o.value === value
              return (
                <li
                  key={o.value}
                  id={`${uid}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] ${i === active ? 'bg-ground' : ''} ${
                    isSel ? 'font-semibold text-brand' : 'text-ink'
                  }`}
                >
                  <Check size={14} className={`shrink-0 ${isSel ? '' : 'invisible'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-[12px] font-normal text-muted">{o.hint}</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
