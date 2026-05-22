# architecture.md — System Architecture

> Last updated: 2026-05-22
> Claude reads this to understand what is allowed and forbidden.

---

## Tech Stack

| Lag | Teknologi | Versjon | Migreringsnotat |
|---|---|---|---|
| Frontend framework | Next.js (App Router) | 14.x | Beholdes gjennom alle faser |
| Språk | TypeScript | 5.x | Beholdes gjennom alle faser |
| Styling | CSS Modules + design tokens | — | Tokens i `/styles/tokens.css` |
| ORM | Prisma | 5.x | **Kritisk migreringssjikt** — bytt kun connection string |
| Database | Supabase (PostgreSQL 15) | — | Byttes til Bas/Posten-infrastruktur ved MVP |
| Auth | Supabase Auth | — | Isolert i `/lib/auth/` — byttes ved MVP |
| File storage | Supabase Storage | — | Byttes til S3/egnet storage ved MVP |
| Hosting | Vercel (Hobby) | — | Byttes til Vercel Pro eller egne servere ved MVP |

### Migreringsnotat: database
Prisma er eneste lag som snakker med databasen. Ved migrering til ny PostgreSQL-leverandør:
1. Oppdater `DATABASE_URL` og `DIRECT_URL` i miljøvariabler
2. Kjør `prisma migrate deploy` mot ny database
3. Ingen kodeendringer i forretningslogikk kreves

### Migreringsnotat: Supabase free tier
Supabase pauser prosjekt etter 1 uke uten aktivitet på gratis plan.
Wake-on-visit pattern er implementert i `/lib/db/client.ts` — fjernes ved overgang til betalt tier.

---

## Layering Model

```
API-ruter (Route Handlers)
    ↓
Service / lib  (forretningslogikk, targeting, koder)
    ↓
Prisma ORM  (all databasetilgang)
    ↓
Database (Supabase PostgreSQL)
```

Regel: Avhengigheter flyter kun nedover. Ingen lag importerer fra et lag over seg.

---

## Module Map

| Modul | Ansvar |
|---|---|
| `/app/(mobile)` | Sluttbruker PWA — mobil-first, ingen desktop-optimalisering |
| `/app/admin` | Backoffice admin — desktop-first |
| `/app/api/...` | Next.js Route Handlers — validering, auth-sjekk, respons-mapping |
| `/components/mobile` | Mobilapp-komponenter |
| `/components/admin` | Admin-komponenter |
| `/components/shared` | Delte UI-komponenter (Button, Card, Badge osv.) |
| `/lib/auth` | Auth-logikk — isolert for enkel migrering |
| `/lib/db` | Prisma client og database-tilkobling |
| `/lib/targeting` | Fordel- og hero-targetinglogikk (postcode, segment, prioritet) |
| `/lib/tracking` | Hendelseslogging (benefit_viewed, code_revealed osv.) |
| `/lib/validation` | Zod-schemas for input-validering |
| `/lib/codes` | Atomisk unik kode-tildeling |
| `/lib/pwa` | PWA manifest og install-helpers |
| `/lib/utils` | Generelle hjelpefunksjoner |
| `/types` | TypeScript-typer og enums |
| `/styles` | Design tokens og globals |
| `/content` | Statisk norsk copy og tekster |

---

## Forbidden Imports

- `/components/mobile` må ikke importere fra `/components/admin` (og omvendt)
- `/components/*` må ikke importere direkte fra `/lib/db`
- Forretningslogikk i `/lib/` må ikke importere Supabase SDK direkte — kun via `/lib/auth` og `/lib/db`
- API-ruter i `/app/api/` eksponerer aldri Prisma-objekter direkte — map til egne response-typer

---

## External Dependencies

- `next` 14.x — App-rammeverk
- `prisma` / `@prisma/client` 5.x — ORM
- `@supabase/supabase-js` — Auth og Storage (ikke DB-tilgang)
- `zod` — Runtime input-validering
- `qrcode` — QR-kode-generering
- `papaparse` — CSV-parsing for kodeopplasting

---

## Sikkerhetsgrenser

- Alle `/api/admin/*`-ruter validerer admin-auth via middleware
- Persondata (leads) logges aldri i klartekst
- Unik kode-tildeling skjer i databasetransaksjon
- Input valideres med Zod på alle API-endepunkter server-side

---

## Miljøvariabler (kreves)

```
# Database — byttes til ny connection string ved migrering
DATABASE_URL=
DIRECT_URL=

# Supabase — kun auth og storage, ikke DB-tilgang via Prisma
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Admin auth
ADMIN_JWT_SECRET=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Architectural Decisions

Se `sessions/DECISIONS.md` for full logg.
