// CR-028: the log label must never contain the error message (it can carry personal data).
import { describe, it, expect } from 'vitest'
import { safeErrorLabel } from './safeErrorLabel'

describe('safeErrorLabel', () => {
  it('gir bare navn og eventuell kode, aldri meldingen', () => {
    const err = Object.assign(new Error('Invalid prisma.user.update() data: { email: "qa@bas.no" }'), { code: 'P2002' })
    err.name = 'PrismaClientKnownRequestError'
    expect(safeErrorLabel(err)).toBe('PrismaClientKnownRequestError P2002')
    expect(safeErrorLabel(err)).not.toContain('qa@bas.no')
  })

  it('gir bare navnet når det ikke er noen kode, og et fast ord for ukjente verdier', () => {
    expect(safeErrorLabel(new TypeError('x@y.no'))).toBe('TypeError')
    expect(safeErrorLabel('qa@bas.no')).toBe('UnknownError')
    expect(safeErrorLabel(null)).toBe('UnknownError')
  })
})
