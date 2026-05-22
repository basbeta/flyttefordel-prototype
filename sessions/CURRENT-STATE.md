# CURRENT-STATE.md

> Updated at the end of every session. Read by Claude at startup.

## Current Phase
FASE 3 FULLFØRT — Anonyme sesjoner, lagrede fordeler, profil og nær-deg implementert og validert. Klar for Fase 4 (admin-grensesnitt).

## Current Objectives
1. Fase 4: Admin-grensesnitt (fordeler, annonsører, heroer, koder, leads)
2. CR-004: Targeting-logikk (utsatt fra Fase 3)

## Current Branch
master

## Blockers
Ingen aktive blockers. Appen kjører på localhost:3000.

## Active Change Requests
- CR-001: Fase 1 — Grunnmur (Status: Done)
- CR-002: Fase 2 — Fordeler i app (Status: Done)
- CR-003: Fase 3 — Anonyme sesjoner, lagrede fordeler, profil (Status: Done)

## Recently Modified Systems
- `src/lib/queries/benefitQueries.ts` — Prisma-spørringer for fordeler og kategorier (2026-05-22)
- `src/lib/queries/heroQueries.ts` — Prisma-spørringer for heroer (2026-05-22)
- `src/lib/tracking/trackEvent.ts` — Fire-and-forget hendelseslogging (2026-05-22)
- `src/app/api/track/route.ts` — POST /api/track (2026-05-22)
- `src/app/api/benefits/[slug]/lead/route.ts` — POST /api/benefits/[slug]/lead (2026-05-22)
- `src/components/mobile/HeroCarousel.tsx` — CSS scroll-snap karusell (2026-05-22)
- `src/components/mobile/BenefitCard.tsx` — Fordelskort for liste og grid (2026-05-22)
- `src/components/mobile/CategoryFilter.tsx` — Kategorifilterkort (2026-05-22)
- `src/app/(mobile)/page.tsx` — Hjemskjerm med hero og fordelsgrid (2026-05-22)
- `src/app/(mobile)/benefits/page.tsx` — Fordelsliste med kategorifilterkort (2026-05-22)
- `src/app/(mobile)/benefits/[slug]/page.tsx` — Fordelsdetaljside (2026-05-22)
- `src/app/(mobile)/benefits/[slug]/RedemptionSection.tsx` — Interaktiv redemption (2026-05-22)

## Validation Status
✓ `npx tsc --noEmit` — ingen feil
✓ `npm run build` — bygger rent, 7 ruter generert
✓ `npx prisma migrate dev` — migrasjon kjørt (20260522100321_init)
✓ `npx prisma db seed` — testdata seeded
✓ `npm run dev` — kjører på localhost:3000

## Notes
- `<img>` brukes i stedet for `next/image` — lint warning, akseptabelt for demo (byttes ved MVP)
- Targeting ikke aktivt — alle aktive fordeler vises for alle brukere (utsatt til CR-004)
- Supabase free tier pauser etter 1 uke inaktivitet — se lib/db/client.ts
- Anonym sesjon: `anon_id` cookie (1 år) + `x-anon-id` header via middleware
- `prisma db push` brukes for schema-endringer (migrate dev er interaktiv, blokkerer i CI/scripts)
- `NEXT_PUBLIC_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY` er fortsatt placeholder — ikke nødvendig for Fase 3

## Next Recommended Actions
1. Test save/unsave på localhost:3000 — lagre en fordel, gå til /saved
2. Test /profile — sett postnummer og segment, gå til /nearby
3. Opprett CR-004 for Fase 4 (admin-grensesnitt)
