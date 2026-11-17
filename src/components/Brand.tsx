import { APP_NAME } from '../data/clinic'

const [BRAND_FIRST, ...rest] = APP_NAME.split(' ')
const BRAND_REST = rest.join(' ')

/** Product wordmark with the "Powered by" line. */
export function Brand({ tone = 'light', size = 'md' }: { tone?: 'light' | 'dark'; size?: 'md' | 'lg' }) {
  const onDark = tone === 'dark'
  return (
    <div className="min-w-0 leading-none">
      <div
        aria-label={APP_NAME}
        className={`truncate tracking-tight ${size === 'lg' ? 'text-[20px]' : 'text-[17px]'} ${onDark ? 'text-white' : 'text-ink'}`}
      >
        <span className="font-bold">{BRAND_FIRST}</span> <span className="font-light">{BRAND_REST}</span>
      </div>
      <div className={`mt-1 truncate text-[10.5px] tracking-[.02em] ${onDark ? 'text-navy-mute' : 'text-muted'}`}>
        Powered by healtheon.ai
      </div>
    </div>
  )
}
