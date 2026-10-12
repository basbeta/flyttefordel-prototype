// CR-020: event type and channel validation.
import { describe, it, expect } from 'vitest'
import { EVENT_TYPES, CHANNELS, isChannel, isTrackableEventType } from './eventTypes'

describe('isTrackableEventType', () => {
  it('godtar alle eksisterende hendelsestyper (rapportene grupperer på dem)', () => {
    for (const t of [
      'benefit_viewed',
      'code_revealed',
      'code_copied',
      'qr_opened',
      'external_link_clicked',
      'lead_form_started',
      'lead_submitted',
      'benefit_saved',
      'benefit_unsaved',
      'hero_clicked',
    ]) {
      expect(isTrackableEventType(t)).toBe(true)
    }
  })

  it('godtar nye typer benefit_opened og benefit_selected', () => {
    expect(isTrackableEventType('benefit_opened')).toBe(true)
    expect(isTrackableEventType('benefit_selected')).toBe(true)
  })

  it('avviser ukjente verdier og ikke-strenger', () => {
    expect(isTrackableEventType('benefit_veiwed')).toBe(false)
    expect(isTrackableEventType('')).toBe(false)
    expect(isTrackableEventType(undefined)).toBe(false)
    expect(isTrackableEventType(42)).toBe(false)
  })

  it('har ingen duplikater', () => {
    expect(new Set(EVENT_TYPES).size).toBe(EVENT_TYPES.length)
  })
})

describe('isChannel', () => {
  it('godtar web, app og email', () => {
    for (const c of CHANNELS) expect(isChannel(c)).toBe(true)
  })

  it('avviser ukjente verdier', () => {
    expect(isChannel('sms')).toBe(false)
    expect(isChannel('APP')).toBe(false)
    expect(isChannel(null)).toBe(false)
  })
})
