'use client'
// CR-028: The login form. Pick a test person, give a test e-mail (required), log in.
// «Ny testperson» creates a person for cases the seeded ones do not cover.
// The e-mail is personal data: it is only sent to /api/auth/login, never put in a URL or logged.

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/shared/Button'
import { describePerson, MOVING_STATUS_LABELS, HOUSING_TYPE_LABELS } from '@/lib/identity/labels'
import { safeNext } from '@/lib/identity/safeNext'
import type { PersonSummary } from '@/lib/identity/types'
import styles from './page.module.css'

type Props = { initialPersons: PersonSummary[]; loadFailed: boolean; next: string }

type NewPersonForm = {
  name: string
  postcode: string
  movingStatus: string
  movedAt: string
  fromAddress: string
  toAddress: string
  housingType: string
}

const EMPTY_NEW: NewPersonForm = {
  name: '',
  postcode: '',
  movingStatus: 'unknown',
  movedAt: '',
  fromAddress: '',
  toAddress: '',
  housingType: '',
}

async function readMessage(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string }
  return data.message ?? 'Noe gikk galt'
}

export function LoginClient({ initialPersons, loadFailed, next }: Props) {
  const [persons, setPersons] = useState(initialPersons)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState<NewPersonForm>(EMPTY_NEW)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedId) return setError('Velg en testperson')
    if (!email.trim()) return setError('Fyll inn en test-e-postadresse')
    setLoggingIn(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: selectedId, email: email.trim() }),
      })
      if (!res.ok) {
        setError(await readMessage(res))
        setLoggingIn(false)
        return
      }
      // Full navigation: the new cookie must be sent and server components must re-render.
      window.location.assign(safeNext(next))
    } catch {
      setError('Nettverksfeil, prøv igjen')
      setLoggingIn(false)
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreating(true)
    try {
      const res = await fetch('/api/auth/test-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        setCreateError(await readMessage(res))
        setCreating(false)
        return
      }
      const data = (await res.json()) as { person: PersonSummary }
      setPersons((p) => [...p, data.person])
      setSelectedId(data.person.id)
      setForm(EMPTY_NEW)
      setShowNew(false)
    } catch {
      setCreateError('Nettverksfeil, prøv igjen')
    }
    setCreating(false)
  }

  function setField<K extends keyof NewPersonForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Logg inn</h1>
      <p className={styles.lead}>
        Dette er en <strong>simulert</strong> innlogging (som Vipps). Velg en testperson og oppgi en
        test-e-postadresse. Adressen lagres på personen og er der fremtidig kommunikasjon sendes.
      </p>

      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Test-e-post</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            value={email}
            maxLength={200}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="navn@bas.no"
            required
          />
        </div>

        <fieldset className={styles.persons}>
          <legend className={styles.label}>Testperson</legend>
          {loadFailed && (
            <p className={styles.errorMsg}>
              Kunne ikke hente testpersonene. Prøv å laste siden på nytt, eller opprett en ny testperson.
            </p>
          )}
          {!loadFailed && persons.length === 0 && (
            <p className={styles.hint}>
              Ingen testpersoner finnes ennå. Kjør <code>npm run db:seed-persons</code>, eller opprett en ny
              testperson under.
            </p>
          )}
          {persons.map((p) => (
            <label key={p.id} className={`${styles.card} ${selectedId === p.id ? styles.cardSelected : ''}`}>
              <input
                type="radio"
                name="person"
                value={p.id}
                checked={selectedId === p.id}
                onChange={() => setSelectedId(p.id)}
                className={styles.radio}
              />
              <span className={styles.cardBody}>
                <span className={styles.cardName}>
                  {p.name}
                  {!p.seeded && <span className={styles.tag}>Ny</span>}
                </span>
                <span className={styles.cardSummary}>
                  {p.postcode ?? 'Ingen postnummer'} · {MOVING_STATUS_LABELS[p.movingStatus]}
                </span>
                <dl className={styles.params}>
                  {describePerson(p).map((d) => (
                    <div key={d.label} className={styles.param}>
                      <dt>{d.label}</dt>
                      <dd>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </span>
            </label>
          ))}
        </fieldset>

        {error && <p className={styles.errorMsg} role="alert">{error}</p>}
        <Button type="submit" fullWidth loading={loggingIn}>
          Logg inn
        </Button>
      </form>

      <section className={styles.newSection}>
        {!showNew ? (
          <Button type="button" variant="secondary" fullWidth onClick={() => setShowNew(true)}>
            Ny testperson
          </Button>
        ) : (
          <form className={styles.form} onSubmit={handleCreate}>
            <h2 className={styles.subtitle}>Ny testperson</h2>
            <p className={styles.hint}>Bruk fiktive navn og adresser. E-posten oppgir du ved innlogging.</p>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-name">Navn</label>
              <input id="np-name" className={styles.input} value={form.name} maxLength={80} required
                onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-postcode">Postnummer</label>
              <input id="np-postcode" className={styles.input} value={form.postcode} inputMode="numeric"
                maxLength={4} placeholder="Tomt = ingen"
                onChange={(e) => setField('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-status">Flyttestatus</label>
              <select id="np-status" className={styles.input} value={form.movingStatus}
                onChange={(e) => setField('movingStatus', e.target.value)}>
                {Object.entries(MOVING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-moved">Flyttedato</label>
              <input id="np-moved" type="date" className={styles.input} value={form.movedAt}
                onChange={(e) => setField('movedAt', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-from">Fra-adresse</label>
              <input id="np-from" className={styles.input} value={form.fromAddress} maxLength={120}
                onChange={(e) => setField('fromAddress', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-to">Til-adresse</label>
              <input id="np-to" className={styles.input} value={form.toAddress} maxLength={120}
                onChange={(e) => setField('toAddress', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="np-housing">Boligtype</label>
              <select id="np-housing" className={styles.input} value={form.housingType}
                onChange={(e) => setField('housingType', e.target.value)}>
                <option value="">Ingen</option>
                {Object.entries(HOUSING_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {createError && <p className={styles.errorMsg} role="alert">{createError}</p>}
            <div className={styles.actions}>
              <Button type="submit" loading={creating}>Opprett</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowNew(false); setCreateError(null) }}>
                Avbryt
              </Button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
