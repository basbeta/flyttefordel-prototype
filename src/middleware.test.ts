// CR-028: login wall for consumer traffic, and the admin guard's role check.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SignJWT } from 'jose'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'
import { signPersonToken } from '@/lib/identity/token'

const SECRET = 'test-secret-middleware'
const PERSON = '3f2b1c3e-8c58-4a0d-9d3e-111111111111'

function req(path: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest(`http://localhost${path}`, {
    headers: { ...(cookie ? { cookie } : {}), ...headers },
  })
}

async function adminToken() {
  return new SignJWT({ email: 'a@bas.no', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(SECRET))
}

// What a request header looks like after NextResponse.next({ request: { headers } }).
function forwarded(res: Response, name: string): string | null {
  return res.headers.get(`x-middleware-request-${name}`)
}

let original: string | undefined
beforeEach(() => {
  original = process.env.ADMIN_JWT_SECRET
  process.env.ADMIN_JWT_SECRET = SECRET
})
afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_JWT_SECRET
  else process.env.ADMIN_JWT_SECRET = original
})

describe('login wall (CR-028)', () => {
  it('sender en side uten innlogging til /logg-inn med next', async () => {
    const res = await middleware(req('/flytting/oppsummering'))
    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/logg-inn')
    expect(location.searchParams.get('next')).toBe('/flytting/oppsummering')
  })

  it('tar med query i next, og utelater next for forsiden', async () => {
    const withQuery = await middleware(req('/benefits?kategori=mat'))
    expect(new URL(withQuery.headers.get('location')!).searchParams.get('next')).toBe('/benefits?kategori=mat')
    const home = await middleware(req('/'))
    expect(new URL(home.headers.get('location')!).search).toBe('')
  })

  it('svarer 401 JSON (ikke redirect) for forbruker-API uten innlogging', async () => {
    for (const path of ['/api/track', '/api/benefits/x/save', '/api/flow/order', '/api/session/profile']) {
      const res = await middleware(req(path))
      expect(res.status, path).toBe(401)
      expect(await res.json()).toEqual({ message: 'Ikke innlogget' })
    }
  })

  it('slipper gjennom /logg-inn, /api/auth/*, /api/admin/* og manifestet uten innlogging', async () => {
    for (const path of ['/logg-inn', '/logg-inn?next=/flytting', '/api/auth/login', '/api/auth/logout', '/api/admin/benefits', '/manifest.json']) {
      const res = await middleware(req(path))
      expect(res.status, path).toBe(200)
    }
  })

  it('slipper gjennom en gyldig person og setter x-person-id fra token', async () => {
    const token = await signPersonToken(PERSON)
    const res = await middleware(req('/flytting', { person_token: token }))
    expect(res.status).toBe(200)
    expect(forwarded(res, 'x-person-id')).toBe(PERSON)
    expect(forwarded(res, 'x-anon-id')).toBeTruthy()
  })

  it('overskriver en x-person-id sendt av klienten (ingen forfalskning)', async () => {
    const token = await signPersonToken(PERSON)
    const res = await middleware(
      req('/flytting', { person_token: token }, { 'x-person-id': 'forfalsket-id' })
    )
    expect(forwarded(res, 'x-person-id')).toBe(PERSON)
  })

  it('fjerner en x-person-id fra klienten på sider uten innlogging (login-siden)', async () => {
    const res = await middleware(req('/logg-inn', {}, { 'x-person-id': 'forfalsket-id' }))
    expect(res.status).toBe(200)
    // The header is either removed or not forwarded as the forged value.
    expect(forwarded(res, 'x-person-id')).not.toBe('forfalsket-id')
  })

  it('avviser en ugyldig person-token og fjerner cookien', async () => {
    const res = await middleware(req('/flytting', { person_token: 'ikke-en-jwt' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('set-cookie') ?? '').toContain('person_token=;')
  })

  it('avviser en ADMIN-token i person_token-cookien', async () => {
    const res = await middleware(req('/flytting', { person_token: await adminToken() }))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/logg-inn')
  })

  it('feiler lukket uten hemmelighet: selv en tidligere gyldig token slipper ikke inn', async () => {
    const token = await signPersonToken(PERSON)
    delete process.env.ADMIN_JWT_SECRET
    const res = await middleware(req('/flytting', { person_token: token }))
    expect(res.status).toBe(307)
  })

  it('setter anon_id-cookie når den mangler (på login-siden)', async () => {
    const res = await middleware(req('/logg-inn'))
    expect(res.headers.get('set-cookie') ?? '').toContain('anon_id=')
  })
})

describe('admin guard (CR-028 role check)', () => {
  it('sender /admin uten token til /admin/login', async () => {
    const res = await middleware(req('/admin/benefits'))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin/login')
  })

  it('slipper en ekte admin-token inn, uten krav om person-innlogging', async () => {
    const res = await middleware(req('/admin/benefits', { admin_token: await adminToken() }))
    expect(res.status).toBe(200)
  })

  it('avviser en PERSON-token i admin_token-cookien', async () => {
    const personToken = await signPersonToken(PERSON)
    const res = await middleware(req('/admin/benefits', { admin_token: personToken }))
    expect(res.status).toBe(307)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/admin/login')
    expect(res.headers.get('set-cookie') ?? '').toContain('admin_token=;')
  })

  it('/admin/login er åpen', async () => {
    const res = await middleware(req('/admin/login'))
    expect(res.status).toBe(200)
  })
})
