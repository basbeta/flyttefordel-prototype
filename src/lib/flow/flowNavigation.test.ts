// CR-023: navigation in the web flow.
import { describe, it, expect } from 'vitest'
import { getFirstPageId, resolveFlowStep } from './flowNavigation'
import type { WebFlowPage } from '@/types/app'

function page(id: string): WebFlowPage {
  return { id, name: `Side ${id}`, text: null, imageUrl: null, imageAlt: null, cards: [] }
}

describe('getFirstPageId', () => {
  it('gir første side, eller null for tomt løp', () => {
    expect(getFirstPageId([page('a'), page('b')])).toBe('a')
    expect(getFirstPageId([])).toBeNull()
  })
})

describe('resolveFlowStep', () => {
  const pages = [page('a'), page('b'), page('c')]

  it('tomt løp gir empty', () => {
    expect(resolveFlowStep([], 'a')).toEqual({ status: 'empty' })
  })

  it('første side har ingen forrige og peker på neste', () => {
    const step = resolveFlowStep(pages, 'a')
    expect(step).toEqual({
      status: 'ok',
      position: {
        pageId: 'a',
        position: 1,
        total: 3,
        previous: null,
        next: { id: 'b', name: 'Side b' },
      },
    })
  })

  it('midtre side har både forrige og neste', () => {
    const step = resolveFlowStep(pages, 'b')
    expect(step.status === 'ok' && step.position.previous).toEqual({ id: 'a', name: 'Side a' })
    expect(step.status === 'ok' && step.position.next).toEqual({ id: 'c', name: 'Side c' })
    expect(step.status === 'ok' && step.position.position).toBe(2)
  })

  it('siste side har ingen neste', () => {
    const step = resolveFlowStep(pages, 'c')
    expect(step.status === 'ok' && step.position.next).toBeNull()
    expect(step.status === 'ok' && step.position.previous).toEqual({ id: 'b', name: 'Side b' })
  })

  it('én side er både første og siste', () => {
    const step = resolveFlowStep([page('a')], 'a')
    expect(step.status === 'ok' && step.position.previous).toBeNull()
    expect(step.status === 'ok' && step.position.next).toBeNull()
    expect(step.status === 'ok' && step.position.total).toBe(1)
  })

  it('ukjent, inaktiv eller utelatt side sender til første synlige side', () => {
    expect(resolveFlowStep(pages, 'finnes-ikke')).toEqual({ status: 'redirect', pageId: 'a' })
    expect(resolveFlowStep(pages, '')).toEqual({ status: 'redirect', pageId: 'a' })
  })
})
