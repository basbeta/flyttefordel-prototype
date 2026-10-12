// CR-026: save controls state.
import { describe, it, expect } from 'vitest'
import { getSaveActionsState } from './saveActionsState'

const base = { isDirty: false, saving: false, saved: false, error: null as string | null }

describe('getSaveActionsState', () => {
  it('ingenting endret og ingenting å melde gir hidden (ingen knapp)', () => {
    expect(getSaveActionsState(base)).toBe('hidden')
  })

  it('endring gir dirty (knappen kommer frem)', () => {
    expect(getSaveActionsState({ ...base, isDirty: true })).toBe('dirty')
  })

  it('pågående lagring gir saving, uansett annet', () => {
    expect(getSaveActionsState({ ...base, isDirty: true, saving: true })).toBe('saving')
    expect(getSaveActionsState({ ...base, isDirty: true, saving: true, error: 'feil' })).toBe('saving')
    expect(getSaveActionsState({ ...base, saving: true })).toBe('saving')
  })

  it('nylig lagret uten nye endringer gir saved', () => {
    expect(getSaveActionsState({ ...base, saved: true })).toBe('saved')
  })

  it('ny endring etter lagring gir dirty, ikke saved (knappen kommer tilbake)', () => {
    expect(getSaveActionsState({ ...base, saved: true, isDirty: true })).toBe('dirty')
  })

  it('feil mens endringene fortsatt er ulagret gir error', () => {
    expect(getSaveActionsState({ ...base, isDirty: true, error: 'Noe gikk galt' })).toBe('error')
  })

  it('feil etter at endringene er rullet tilbake vises ikke (hidden)', () => {
    expect(getSaveActionsState({ ...base, error: 'Noe gikk galt' })).toBe('hidden')
  })

  it('tom feilstreng regnes ikke som feil', () => {
    expect(getSaveActionsState({ ...base, isDirty: true, error: '' })).toBe('dirty')
  })

  it('dekker alle 16 kombinasjoner uten å kaste og gir alltid en gyldig tilstand', () => {
    const valid = ['hidden', 'dirty', 'saving', 'error', 'saved']
    for (const isDirty of [false, true])
      for (const saving of [false, true])
        for (const saved of [false, true])
          for (const error of [null, 'feil'])
            expect(valid).toContain(getSaveActionsState({ isDirty, saving, saved, error }))
  })
})
