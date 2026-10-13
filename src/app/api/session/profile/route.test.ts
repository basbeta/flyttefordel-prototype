// CR-028: the profile is read-only for a logged-in person.
import { describe, it, expect } from 'vitest'
import { PATCH } from './route'

describe('PATCH /api/session/profile', () => {
  it('svarer 403: postnummer og flyttestatus eies av innlogget person', async () => {
    const res = await PATCH()
    expect(res.status).toBe(403)
    expect(((await res.json()) as { message: string }).message).toContain('Bytt person')
  })
})
