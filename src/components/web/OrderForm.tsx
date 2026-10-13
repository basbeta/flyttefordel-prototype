'use client'

// CR-024: Contact details, consents and "Send inn" for the web flow order.
// - Validation reuses the server's schema (same rules on both sides).
// - The submissionId is created once per mounted form, so a retry after a network error
//   reuses it and the server never creates a duplicate order.
// - The button is locked while sending (and after success, until we navigate away).
// - Consent texts are PLACEHOLDERS (not legally assessed) and are shown as such.

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/shared/Button'
import { buildLastOrder, lastOrderStore, serializeLastOrder, type SummaryItem } from '@/lib/flow'
import {
  buildOrderPayload,
  generateSubmissionId,
  postOrder,
  validateOrderPayload,
  type FieldErrors,
  type OrderFormValues,
} from '@/lib/flow/submitClient'
import { CONSENT_TEXTS } from '@/lib/orders/consentTexts'
import { useFlowSelection } from './useFlowSelection'
import styles from './OrderForm.module.css'

// CR-028: the logged-in person pre-fills name, e-mail and postcode (all still editable).
type Props = {
  items: SummaryItem[]
  defaultPostcode: string | null
  defaultName?: string | null
  defaultEmail?: string | null
}

const EMPTY: OrderFormValues = {
  name: '',
  email: '',
  phone: '',
  postcode: '',
  consentShare: false,
  consentEmail: false,
  consentMail: false,
  consentSms: false,
}

function firstError(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0]
}

export function OrderForm({ items, defaultPostcode, defaultName, defaultEmail }: Props) {
  const router = useRouter()
  const { remove, clear } = useFlowSelection()
  const [values, setValues] = useState<OrderFormValues>({
    ...EMPTY,
    name: defaultName ?? '',
    email: defaultEmail ?? '',
    postcode: defaultPostcode ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submissionId] = useState(generateSubmissionId)

  function setText(field: 'name' | 'email' | 'phone' | 'postcode', value: string) {
    setValues((v) => ({ ...v, [field]: value }))
  }
  function setFlag(
    field: 'consentShare' | 'consentEmail' | 'consentMail' | 'consentSms',
    value: boolean
  ) {
    setValues((v) => ({ ...v, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const payload = buildOrderPayload(values, items, submissionId)
    const clientErrors = validateOrderPayload(payload)
    if (clientErrors) {
      setErrors(clientErrors)
      setFormError(
        clientErrors.lines
          ? 'Du må velge minst én fordel før du kan sende inn.'
          : 'Sjekk feltene som er merket og prøv igjen.'
      )
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError(null)

    const outcome = await postOrder(payload)

    if (outcome.kind === 'ok') {
      // The confirmation page shows what was ordered; it holds no personal data.
      lastOrderStore.write(serializeLastOrder(buildLastOrder(outcome.orderId, items)))
      clear()
      router.push('/flytting/bekreftelse')
      return // stay locked until the navigation completes
    }

    setSubmitting(false)
    switch (outcome.kind) {
      case 'validation':
        setErrors(outcome.fields)
        setFormError('Sjekk feltene som er merket og prøv igjen.')
        break
      case 'invalid_lines': {
        const gone = new Set(outcome.lines.map((l) => l.benefitId))
        const titles = items.filter((i) => gone.has(i.benefitId)).map((i) => i.title)
        remove([...gone])
        setFormError(
          `${titles.length > 0 ? titles.join(', ') : 'Noen av valgene'} er ikke lenger tilgjengelig og er fjernet fra valgene dine. Sjekk oppsummeringen og send inn på nytt.`
        )
        break
      }
      case 'rate_limited':
        setFormError(
          outcome.retryAfterSeconds
            ? `For mange forsøk. Prøv igjen om ${Math.ceil(outcome.retryAfterSeconds / 60)} minutt(er).`
            : 'For mange forsøk. Prøv igjen senere.'
        )
        break
      case 'network':
        setFormError('Fikk ikke kontakt med serveren. Sjekk nettverket og prøv igjen.')
        break
      default:
        setFormError('Noe gikk galt. Prøv igjen.')
    }
  }

  const describedBy = (field: string) => (firstError(errors, field) ? `${field}-error` : undefined)

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-labelledby="order-form-title">
      <h2 id="order-form-title" className={styles.title}>
        Dine opplysninger
      </h2>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor="order-name" className={styles.label}>
          Navn <span className={styles.required}>(påkrevd)</span>
        </label>
        <input
          id="order-name"
          className={styles.input}
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(e) => setText('name', e.target.value)}
          aria-invalid={Boolean(firstError(errors, 'name'))}
          aria-describedby={describedBy('name')}
          maxLength={120}
        />
        {firstError(errors, 'name') && (
          <p id="name-error" className={styles.error}>
            {firstError(errors, 'name')}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="order-email" className={styles.label}>
          E-post <span className={styles.required}>(påkrevd)</span>
        </label>
        <input
          id="order-email"
          className={styles.input}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={(e) => setText('email', e.target.value)}
          aria-invalid={Boolean(firstError(errors, 'email'))}
          aria-describedby={describedBy('email')}
          maxLength={200}
        />
        {firstError(errors, 'email') && (
          <p id="email-error" className={styles.error}>
            {firstError(errors, 'email')}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="order-phone" className={styles.label}>
          Telefon <span className={styles.optional}>(valgfritt)</span>
        </label>
        <input
          id="order-phone"
          className={styles.input}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(e) => setText('phone', e.target.value)}
          aria-invalid={Boolean(firstError(errors, 'phone'))}
          aria-describedby={describedBy('phone')}
          maxLength={30}
        />
        {firstError(errors, 'phone') && (
          <p id="phone-error" className={styles.error}>
            {firstError(errors, 'phone')}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="order-postcode" className={styles.label}>
          Postnummer <span className={styles.optional}>(valgfritt)</span>
        </label>
        <input
          id="order-postcode"
          className={styles.input}
          type="text"
          autoComplete="postal-code"
          inputMode="numeric"
          value={values.postcode}
          onChange={(e) => setText('postcode', e.target.value)}
          aria-invalid={Boolean(firstError(errors, 'postcode'))}
          aria-describedby={describedBy('postcode')}
          maxLength={4}
        />
        {firstError(errors, 'postcode') && (
          <p id="postcode-error" className={styles.error}>
            {firstError(errors, 'postcode')}
          </p>
        )}
      </div>

      <fieldset className={styles.consents}>
        <legend className={styles.legend}>Samtykke</legend>

        <div className={styles.consent}>
          <input
            id="consent-share"
            type="checkbox"
            checked={values.consentShare}
            onChange={(e) => setFlag('consentShare', e.target.checked)}
            aria-invalid={Boolean(firstError(errors, 'consentShare'))}
            aria-describedby={describedBy('consentShare')}
          />
          <label htmlFor="consent-share">
            <span className={styles.required}>(påkrevd)</span> {CONSENT_TEXTS.share}
          </label>
        </div>
        {firstError(errors, 'consentShare') && (
          <p id="consentShare-error" className={styles.error}>
            {firstError(errors, 'consentShare')}
          </p>
        )}

        <div className={styles.consent}>
          <input
            id="consent-email"
            type="checkbox"
            checked={values.consentEmail}
            onChange={(e) => setFlag('consentEmail', e.target.checked)}
          />
          <label htmlFor="consent-email">{CONSENT_TEXTS.email}</label>
        </div>
        <div className={styles.consent}>
          <input
            id="consent-mail"
            type="checkbox"
            checked={values.consentMail}
            onChange={(e) => setFlag('consentMail', e.target.checked)}
          />
          <label htmlFor="consent-mail">{CONSENT_TEXTS.mail}</label>
        </div>
        <div className={styles.consent}>
          <input
            id="consent-sms"
            type="checkbox"
            checked={values.consentSms}
            onChange={(e) => setFlag('consentSms', e.target.checked)}
          />
          <label htmlFor="consent-sms">{CONSENT_TEXTS.sms}</label>
        </div>
      </fieldset>

      <Button type="submit" size="lg" fullWidth loading={submitting}>
        {submitting ? 'Sender inn' : 'Send inn'}
      </Button>
    </form>
  )
}
