// CR-029: conversion of the selection fields between the stored rule and the admin form.
import { describe, it, expect } from 'vitest'
import {
  EMPTY_SELECTION_FIELDS,
  parseDays,
  selectionFieldsFromRule,
  selectionFieldsProblem,
  selectionFieldsToPayload,
} from './selectionFields'

describe('selectionFieldsFromRule', () => {
  it('gir tomme felt uten regel eller for en gammel regel uten de nye feltene', () => {
    expect(selectionFieldsFromRule(null)).toEqual(EMPTY_SELECTION_FIELDS)
    expect(selectionFieldsFromRule(undefined)).toEqual(EMPTY_SELECTION_FIELDS)
    expect(selectionFieldsFromRule({})).toEqual(EMPTY_SELECTION_FIELDS)
    expect(selectionFieldsFromRule({ daysSinceMoveMin: null, hideIfChosen: null, housingTypes: null })).toEqual(
      EMPTY_SELECTION_FIELDS
    )
  })

  it('leser tall (også 0 og negative), lister og flagg', () => {
    expect(
      selectionFieldsFromRule({
        daysSinceMoveMin: 0,
        daysSinceMoveMax: -5,
        housingTypes: ['leilighet', 'rekkehus'],
        requiresChosenBenefitIds: ['b1'],
        hideIfChosen: true,
      })
    ).toEqual({
      daysSinceMoveMin: '0',
      daysSinceMoveMax: '-5',
      housingTypes: ['leilighet', 'rekkehus'],
      requiresChosenBenefitIds: ['b1'],
      hideIfChosen: true,
    })
  })

  it('ignorerer ugyldige lister', () => {
    expect(selectionFieldsFromRule({ housingTypes: 'leilighet', requiresChosenBenefitIds: [1, 'b1', null] })).toMatchObject({
      housingTypes: [],
      requiresChosenBenefitIds: ['b1'],
    })
  })
})

describe('parseDays', () => {
  it('tom streng og ikke-heltall blir null, hele tall (også negative og 0) beholdes', () => {
    expect(parseDays('')).toBeNull()
    expect(parseDays('  ')).toBeNull()
    expect(parseDays('abc')).toBeNull()
    expect(parseDays('1.5')).toBeNull()
    expect(parseDays('0')).toBe(0)
    expect(parseDays('60')).toBe(60)
    expect(parseDays(' -30 ')).toBe(-30)
  })
})

describe('selectionFieldsToPayload', () => {
  it('omformer til tall og null, og sender listene og flagget videre', () => {
    expect(
      selectionFieldsToPayload({
        daysSinceMoveMin: '0',
        daysSinceMoveMax: '',
        housingTypes: ['enebolig'],
        requiresChosenBenefitIds: [],
        hideIfChosen: true,
      })
    ).toEqual({
      daysSinceMoveMin: 0,
      daysSinceMoveMax: null,
      housingTypes: ['enebolig'],
      requiresChosenBenefitIds: [],
      hideIfChosen: true,
    })
  })
  it('rundtur: regel → skjema → payload gir samme verdier', () => {
    const rule = { daysSinceMoveMin: -10, daysSinceMoveMax: 90, housingTypes: ['annet'], requiresChosenBenefitIds: ['x'], hideIfChosen: false }
    expect(selectionFieldsToPayload(selectionFieldsFromRule(rule))).toEqual(rule)
  })
})

describe('selectionFieldsProblem', () => {
  const base = EMPTY_SELECTION_FIELDS
  it('ingen problem for tomme og gyldige verdier', () => {
    expect(selectionFieldsProblem(base)).toBeNull()
    expect(selectionFieldsProblem({ ...base, daysSinceMoveMin: '0', daysSinceMoveMax: '60' })).toBeNull()
    expect(selectionFieldsProblem({ ...base, daysSinceMoveMin: '5', daysSinceMoveMax: '5' })).toBeNull()
  })
  it('melder fra om fra større enn til, og om ikke-heltall', () => {
    expect(selectionFieldsProblem({ ...base, daysSinceMoveMin: '61', daysSinceMoveMax: '60' })).toContain('større')
    expect(selectionFieldsProblem({ ...base, daysSinceMoveMin: 'x' })).toContain('hele tall')
    expect(selectionFieldsProblem({ ...base, daysSinceMoveMax: '2.5' })).toContain('hele tall')
  })
})
