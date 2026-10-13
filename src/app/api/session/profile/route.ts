// CR-003: Update anonymous session profile (postcode + movingStatus).
// CR-028: Disabled. Postcode and moving status belong to the logged-in person (set at login),
// so the profile is read-only. To test another case, switch person. Kept as a route that answers
// 403 (not deleted) so an old client gets a clear answer instead of a 404.

import { NextResponse } from 'next/server'

export async function PATCH() {
  return NextResponse.json(
    { message: 'Profilen styres av innlogget person. Bytt person for å endre.' },
    { status: 403 }
  )
}
