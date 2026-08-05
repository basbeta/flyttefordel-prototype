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
| Database | Selvhostet PostgreSQL (Hetzner/Coolify) | — | CR-011: migrert fra Supabase (se migreringsnotat) |
| Auth (admin) | Egen JWT (`/lib/admin/auth`) | — | Uendret av CR-011 — bruker aldri Supabase Auth |
| File storage | Ikke i bruk | — | `@supabase/supabase-js` var aldri koblet til noe lagringskall — fjernet i CR-011 |
| Hosting | Coolify på Hetzner | — | CR-011: migrert fra Vercel (Hobby) |

### Migreringsnotat: CR-011 (Hetzner/Coolify, 2026-08-05)
Migrert fra Vercel + Supabase til selvhostet Coolify/Hetzner, se
`docs/MIGRATION-PLAYBOOK-HETZNER-COOLIFY.md` og `change-requests/CR-011-*.md`
for full kontekst. Sentrale endringer:
- Dockerfile lagt til (single-stage, `node:22-alpine`, `prisma migrate deploy`
  ved oppstart — trygt fordi baseline-migrasjonen ble regenerert fra
  `schema.prisma` for en fersk database, se `prisma/migrations/`).
- `@supabase/supabase-js` fjernet — var installert men aldri importert noe
  sted i `src/`.
- `connect_timeout`/`socket_timeout` lagt til på `DATABASE_URL` i
  `src/lib/db/client.ts` — nødvendig fordi en lang-levende container (i
  motsetning til Vercel) aldri dreper en hengende DB-tilkobling selv.
- Alle 19 API-ruter under `src/app/api/` garanterer nå JSON-feilrespons ved
  uventet feil (tidligere kun delvis dekket — se CR-011 impact-analyse).
- `timeZone: 'Europe/Oslo'` lagt til på de 6 stedene som formaterer datoer
  til visning (admin: benefits, heroes, leads, codes).
- Fersk Postgres-instans (ikke `pg_dump`/restore) — demo-data er disposable.

### Migreringsnotat: database
Prisma er eneste lag som snakker med databasen. Ved migrering til ny PostgreSQL-leverandør:
1. Oppdater `DATABASE_URL` og `DIRECT_URL` i miljøvariabler
2. Kjør `prisma migrate deploy` mot ny database
3. Ingen kodeendringer i forretningslogikk kreves

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
# Database — Coolify Postgres-instans (CR-011). Sett gjerne
# ?connect_timeout=10&socket_timeout=10 direkte i URL-en også —
# src/lib/db/client.ts legger dem til automatisk om de mangler.
DATABASE_URL=
DIRECT_URL=

# Admin auth
ADMIN_JWT_SECRET=
ADMIN_EMAILS=
ADMIN_PASSWORD=

# App
NEXT_PUBLIC_APP_URL=
```

CR-011: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` og
`SUPABASE_SERVICE_ROLE_KEY` er fjernet — ingen kode i `src/` brukte dem
(verifisert via full-repo grep før fjerning av `@supabase/supabase-js`).

---

## Architectural Decisions

Se `sessions/DECISIONS.md` for full logg.
