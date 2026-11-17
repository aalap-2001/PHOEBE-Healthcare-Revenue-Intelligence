import { useEffect, useState, type FormEvent } from 'react'
import { Building2, Check, Landmark, Lock, MapPin, Pencil, Stethoscope, type LucideIcon } from 'lucide-react'
import { PROFILE_SECTIONS, type FieldDef, type Profile } from '../data/clinic'
import { useProfile } from '../profile'
import { Combobox } from '../components/Combobox'

const ICONS: Record<string, LucideIcon> = {
  'Clinic details': Building2,
  Geography: MapPin,
  'Practice type': Stethoscope,
  'Institution type': Landmark,
}

const inputCls =
  'h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15'

function FieldInput({ f, value, error, onChange }: { f: FieldDef; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `field-${f.key}`
  if (f.readOnly) {
    return (
      <div className="flex min-h-9 items-center gap-2 text-[14px] font-medium">
        <span>{value}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-ground px-2 py-0.5 text-[11px] font-semibold text-muted">
          <Lock size={11} aria-hidden="true" /> {f.readOnly}
        </span>
      </div>
    )
  }
  const options = f.options && !f.options.includes(value) && value ? [value, ...f.options] : f.options
  return (
    <div>
      {options ? (
        <Combobox id={id} label={f.label} value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: o }))} />
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={f.label}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`${inputCls} ${error ? 'border-warn-ink' : ''}`}
        />
      )}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-[12px] font-medium text-warn-ink">
          {error}
        </p>
      )}
    </div>
  )
}

export function ClinicProfile() {
  const { profile, saveProfile } = useProfile()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Profile>(profile)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = window.setTimeout(() => setSaved(false), 2500)
    return () => window.clearTimeout(t)
  }, [saved])

  const startEdit = () => {
    setDraft(profile)
    setErrors({})
    setSaved(false)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setErrors({})
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    for (const s of PROFILE_SECTIONS) {
      for (const f of s.fields) {
        if (!f.readOnly && !draft[f.key]?.trim()) next[f.key] = `${f.label} can’t be empty.`
      }
    }
    setErrors(next)
    if (Object.keys(next).length) {
      document.getElementById(`field-${Object.keys(next)[0]}`)?.focus()
      return
    }
    const trimmed = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()]))
    saveProfile(trimmed)
    setEditing(false)
    setSaved(true)
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto flex max-w-[1440px] flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className="text-[11px] font-semibold tracking-[.08em] text-muted">CLINIC PROFILE</div>
          <h1 className="text-[20px] font-extrabold leading-tight tracking-tight">{profile.clinicName}</h1>
          <div className="text-[13px] text-muted">
            {profile.specialty} · {profile.cityState}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span role="status" className="text-[13px] font-semibold text-good-ink">
            {saved && (
              <span className="inline-flex items-center gap-1">
                <Check size={16} aria-hidden="true" /> Profile saved
              </span>
            )}
          </span>
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancel}
                className="focus-ring h-10 cursor-pointer rounded-[10px] border border-line bg-white px-4 text-[14px] font-semibold text-ink hover:bg-ground"
              >
                Cancel
              </button>
              <button type="submit" className="focus-ring h-10 cursor-pointer rounded-[10px] bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-dark">
                Save changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="focus-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-line bg-white px-4 text-[14px] font-semibold text-ink hover:bg-ground"
            >
              <Pencil size={16} aria-hidden="true" /> Edit profile
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {PROFILE_SECTIONS.map((section) => {
          const Icon = ICONS[section.title] ?? Building2
          return (
            <section key={section.title} className={`card ${editing ? 'ring-1 ring-brand/20' : ''}`}>
              <h2 className="flex items-center gap-2.5 text-[16px] font-bold">
                <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
                  <Icon size={17} aria-hidden="true" />
                </span>
                {section.title}
              </h2>
              <dl className="m-0 mt-2">
                {section.fields.map((f) => (
                  <div key={f.key} className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-4 border-t border-hair py-1.5 text-[14px]">
                    <dt className="text-muted">
                      {editing && !f.readOnly ? <label htmlFor={`field-${f.key}`}>{f.label}</label> : f.label}
                    </dt>
                    <dd className="m-0 min-w-0 font-medium">
                      {editing ? (
                        <FieldInput
                          f={f}
                          value={draft[f.key] ?? ''}
                          error={errors[f.key]}
                          onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                        />
                      ) : (
                        <span className="block py-1">{profile[f.key]}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        })}
      </div>
    </form>
  )
}
