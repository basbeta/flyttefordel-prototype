// CR-024: Consent texts for the web flow order.
// PLACEHOLDERS: not legally assessed (docs/12 questions 12 and 13). They must be
// replaced before real users order. The server always uses these constants (the
// client never sends text), and a snapshot is stored on the order.

export const CONSENT_PLACEHOLDER_NOTICE = 'Midlertidig tekst, ikke juridisk vurdert.'

export const CONSENT_TEXTS = {
  share: `Jeg godtar at navn, e-post og telefon deles med kundene jeg har valgt, slik at de kan følge opp bestillingen min. (${CONSENT_PLACEHOLDER_NOTICE})`,
  email: `Jeg vil gjerne motta tilbud fra Flyttefordel og samarbeidspartnere på e-post. (${CONSENT_PLACEHOLDER_NOTICE})`,
  mail: `Jeg vil gjerne motta tilbud fra Flyttefordel og samarbeidspartnere i posten. (${CONSENT_PLACEHOLDER_NOTICE})`,
  sms: `Jeg vil gjerne motta tilbud fra Flyttefordel og samarbeidspartnere på SMS. (${CONSENT_PLACEHOLDER_NOTICE})`,
} as const

export type ConsentTexts = typeof CONSENT_TEXTS

// Snapshot of exactly what the user was shown, stored as Order.consentTexts.
export function buildConsentSnapshot(): ConsentTexts {
  return { ...CONSENT_TEXTS }
}
