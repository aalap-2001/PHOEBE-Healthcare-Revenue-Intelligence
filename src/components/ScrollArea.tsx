import { useLayoutEffect, useRef, useState, type ReactNode, type UIEvent } from 'react'

type Props = {
  /** Max-height utility classes, e.g. "max-h-[272px]". */
  className?: string
  /** Classes for the outer wrapper (e.g. flex sizing). */
  wrapperClassName?: string
  label: string
  children: ReactNode
  onScroll?: (e: UIEvent<HTMLDivElement>) => void
  /** Bottom fade while more rows are hidden. Turn off when a sticky footer marks the end. */
  fade?: boolean
}

/**
 * Inner scroll container for long lists. Shows a soft fade at the bottom
 * while more rows are hidden below.
 */
export function ScrollArea({ className = '', wrapperClassName = '', label, children, onScroll, fade = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)

  const update = () => {
    const el = ref.current
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [])

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        onScroll={(e) => {
          update()
          onScroll?.(e)
        }}
        className={`scroll-thin focus-ring overflow-y-auto overscroll-contain ${className}`}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent transition-opacity ${
          more && fade ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
