// CR-028: The ?next= parameter on /logg-inn. Only site-relative paths are accepted, so the
// login cannot be used as an open redirect. Anything else becomes "/".

export const LOGIN_PATH = '/logg-inn'

export function safeNext(next: string | null | undefined): string {
  if (typeof next !== 'string' || next === '') return '/'
  if (!next.startsWith('/')) return '/'
  // "//host" and "/\host" are treated as absolute URLs by browsers.
  if (next.startsWith('//') || next.startsWith('/\\')) return '/'
  // Control characters and backslashes can be used to smuggle other targets.
  if (/[\u0000-\u001f\\]/.test(next)) return '/'
  // Never send people back into the login page or to an API route.
  if (next === LOGIN_PATH || next.startsWith(`${LOGIN_PATH}/`) || next.startsWith(`${LOGIN_PATH}?`)) return '/'
  if (next.startsWith('/api/')) return '/'
  return next
}
