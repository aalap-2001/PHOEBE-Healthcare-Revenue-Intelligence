import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'

/** Back button + breadcrumb. Back returns to the previous in-app page, else to Market position. */
export function BackBar({ current }: { current: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => (location.key !== 'default' && window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px]">
      <button
        type="button"
        onClick={goBack}
        className="focus-ring -ml-2 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2 font-semibold text-brand hover:bg-brand-soft"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </button>
      <span className="text-axis" aria-hidden="true">|</span>
      <button type="button" onClick={() => navigate('/')} className="focus-ring cursor-pointer rounded px-1.5 text-muted hover:text-ink">
        Market position
      </button>
      <ChevronRight size={14} className="text-axis" aria-hidden="true" />
      <span aria-current="page" className="font-medium text-ink">{current}</span>
    </nav>
  )
}
