// CR-014: Klient-IP fra reverse-proxy-headers.
//
// RISIKO, ikke garanti: forutsetter at Coolify sin reverse-proxy (Traefik)
// faktisk videresender ekte klient-IP i x-forwarded-for. Må bekreftes i
// prod (se change-requests/CR-014-rate-limiting.md Risks), ikke antas fra
// lokal testing.

import type { NextRequest } from 'next/server'

export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}
