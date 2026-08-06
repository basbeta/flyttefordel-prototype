'use client'
// CR-013: Varsel om ulagrede endringer i admin-former.
//
// beforeunload dekker faktisk nettleser-navigasjon (lukk fane, refresh,
// skriv ny URL) — 100 % robust, standard nettleser-API.
//
// Klikk på interne <a>-lenker (f.eks. "← Tilbake", sidebar) er best-effort:
// avskjæres i capture-fasen på document, FØR Next.js sin <Link> (som lytter
// i bubble-fasen via Reacts synthetic events) får kjørt sin egen navigasjon —
// Link sjekker selv event.defaultPrevented og hopper over navigasjonen hvis
// vi har satt den.
//
// MIGRATION NOTE: nettleserens tilbake/frem-knapp (popstate) dekkes IKKE —
// se change-requests/CR-013-unsaved-changes-warning.md, Risks.

import { useEffect } from 'react'

export function shouldInterceptClick(opts: {
  href: string | null
  targetAttr: string | null
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  const { href, targetAttr, metaKey, ctrlKey, shiftKey, altKey } = opts
  if (!href) return false
  if (!href.startsWith('/admin')) return false
  if (targetAttr === '_blank') return false
  if (metaKey || ctrlKey || shiftKey || altKey) return false
  return true
}

export const UNSAVED_CHANGES_MESSAGE = 'Du har ulagrede endringer. Vil du forlate siden uten å lagre?'

export function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return

      const intercept = shouldInterceptClick({
        href: anchor.getAttribute('href'),
        targetAttr: anchor.getAttribute('target'),
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
      })
      if (!intercept) return

      if (!window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        e.preventDefault()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [isDirty])
}
