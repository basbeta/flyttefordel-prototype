'use client'
// CR-002: Interaktiv redemption-seksjon — montert i server component-siden.

import { useState } from 'react'
import { Button } from '@/components/shared/Button'
import type { BenefitDetail, LeadFormField } from '@/types/app'
import styles from './RedemptionSection.module.css'

type Props = { benefit: BenefitDetail }

export function RedemptionSection({ benefit }: Props) {
  const r = benefit.redemption
  if (!r) return null

  switch (r.type) {
    case 'generic_code':
      return (
        <GenericCodeSection
          code={r.genericCode}
          ctaLabel={r.ctaLabel}
          benefitId={benefit.id}
        />
      )
    case 'external_link':
      return (
        <ExternalLinkSection
          url={r.externalUrl}
          ctaLabel={r.ctaLabel}
          opensInNewTab={r.opensInNewTab}
          benefitId={benefit.id}
        />
      )
    case 'lead_form':
      return (
        <LeadFormSection
          slug={benefit.slug}
          consentText={benefit.consentText}
          fields={r.leadFormFields ?? []}
        />
      )
    case 'qr_code':
      return <QRCodeSection qrImageUrl={r.qrImageUrl} ctaLabel={r.ctaLabel} />
    case 'unique_code':
      return <UniqueCodeSection slug={benefit.slug} ctaLabel={r.ctaLabel} />
    case 'info_only':
      return null
    default:
      return (
        <div className={styles.placeholder}>
          <p>Denne fordelstypen ({r.type}) er ikke tilgjengelig i demo.</p>
        </div>
      )
  }
}

// ---- Generic code ----

function GenericCodeSection({
  code,
  ctaLabel,
  benefitId,
}: {
  code?: string
  ctaLabel: string | null
  benefitId: string
}) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  async function reveal() {
    setRevealed(true)
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'code_revealed', benefitId }),
    })
  }

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'code_copied', benefitId }),
    })
  }

  return (
    <div className={styles.section}>
      {!revealed ? (
        <Button fullWidth onClick={reveal}>
          {ctaLabel ?? 'Vis rabattkode'}
        </Button>
      ) : (
        <div className={styles.codeBox}>
          <span className={styles.code}>{code}</span>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Kopiert!' : 'Kopier'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ---- External link ----

function ExternalLinkSection({
  url,
  ctaLabel,
  opensInNewTab,
  benefitId,
}: {
  url?: string
  ctaLabel: string | null
  opensInNewTab: boolean
  benefitId: string
}) {
  if (!url) return null
  const resolvedUrl = url // const binding preserves TypeScript's string narrowing in closures

  function handleClick() {
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType: 'external_link_clicked', benefitId }),
    })
    if (opensInNewTab) {
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = resolvedUrl
    }
  }

  return (
    <div className={styles.section}>
      <Button fullWidth onClick={handleClick}>
        {ctaLabel ?? 'Gå til nettsted'}
      </Button>
    </div>
  )
}

// ---- QR code ----

function QRCodeSection({
  qrImageUrl,
  ctaLabel,
}: {
  qrImageUrl?: string
  ctaLabel: string | null
}) {
  if (!qrImageUrl) {
    return (
      <div className={styles.placeholder}>
        <p>QR-kode ikke tilgjengelig.</p>
      </div>
    )
  }

  return (
    <div className={styles.qrSection}>
      <p className={styles.qrLabel}>{ctaLabel ?? 'Vis QR-koden i kassen'}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrImageUrl} alt="QR-kode" className={styles.qrImage} />
    </div>
  )
}

// ---- Unique code ----

function UniqueCodeSection({ slug, ctaLabel }: { slug: string; ctaLabel: string | null }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function claim() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/benefits/${slug}/claim-code`, { method: 'POST' })
      const body = (await res.json()) as { code?: string; message?: string }
      if (!res.ok) throw new Error(body.message ?? 'Kunne ikke hente kode')
      setCode(body.code ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (code) {
    return (
      <div className={styles.section}>
        <div className={styles.codeBox}>
          <span className={styles.code}>{code}</span>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? 'Kopiert!' : 'Kopier'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.section}>
      {error && <p className={styles.errorMsg}>{error}</p>}
      <Button fullWidth onClick={claim} loading={loading}>
        {ctaLabel ?? 'Hent unik kode'}
      </Button>
    </div>
  )
}

// ---- Lead form ----

function LeadFormSection({
  slug,
  consentText,
  fields,
}: {
  slug: string
  consentText: string | null
  fields: LeadFormField[]
}) {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    fd.forEach((v, k) => {
      data[k] = String(v)
    })

    try {
      const res = await fetch(`/api/benefits/${slug}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = (await res.json()) as { message?: string }
        throw new Error(body.message ?? 'Innsending feilet')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className={styles.success}>
        <p>Takk! Vi har mottatt din henvendelse.</p>
      </div>
    )
  }

  const displayFields = fields.length > 0
    ? fields
    : [
        { name: 'name', label: 'Navn', type: 'text' as const, required: true },
        { name: 'email', label: 'E-post', type: 'email' as const, required: true },
      ]

  return (
    <form className={styles.leadForm} onSubmit={handleSubmit}>
      {displayFields.map((field) => (
        <div key={field.name} className={styles.field}>
          <label className={styles.label} htmlFor={field.name}>
            {field.label}
            {field.required ? ' *' : ''}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.name}
              name={field.name}
              required={field.required}
              className={styles.input}
              rows={3}
            />
          ) : (
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              required={field.required}
              className={styles.input}
            />
          )}
        </div>
      ))}
      <div className={styles.consentRow}>
        <input
          type="checkbox"
          id="consent"
          name="consent"
          value="on"
          required
          className={styles.checkbox}
        />
        <label htmlFor="consent" className={styles.consentLabel}>
          {consentText ?? 'Jeg samtykker til behandling av mine opplysninger.'}
        </label>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
      <Button type="submit" fullWidth loading={loading}>
        Send inn
      </Button>
    </form>
  )
}
