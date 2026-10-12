import { describe, it, expect } from 'vitest'
import { deriveDirtyState } from './useDirtyTracking'

describe('deriveDirtyState', () => {
  it('is clean and shows no badge on initial load', () => {
    expect(deriveDirtyState('a', 'a', null)).toEqual({ isDirty: false, showSaved: false })
  })

  it('is dirty after an edit', () => {
    expect(deriveDirtyState('b', 'a', null)).toEqual({ isDirty: true, showSaved: false })
  })

  it('shows saved badge right after saving', () => {
    expect(deriveDirtyState('b', 'b', 'b')).toEqual({ isDirty: false, showSaved: true })
  })

  it('hides saved badge and flags dirty on the next edit', () => {
    expect(deriveDirtyState('c', 'b', 'b')).toEqual({ isDirty: true, showSaved: false })
  })

  it('keeps baseline updated without a badge when showBadge is off (create flow)', () => {
    expect(deriveDirtyState('b', 'b', null)).toEqual({ isDirty: false, showSaved: false })
  })
})
