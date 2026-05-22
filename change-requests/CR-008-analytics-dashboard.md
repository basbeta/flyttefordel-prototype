# CR-008: Analytics Dashboard

Status: Draft
Created: 2026-05-22

## Business Goal

Admins og annonsører trenger innsikt i hvilke fordeler som presterer — visninger, innløsninger og leads per fordel. I dag samles BenefitEvent-data men vises ikke noe sted. Et analytics-dashboard er det viktigste salgsargumentet overfor annonsørene i en demo-setting.

## Problem Statement

`BenefitEvent`-tabellen logger alle relevante hendelser (benefit_viewed, code_revealed, code_copied, lead_submitted osv.), men dataene er utilgjengelige. Admin-dashboardet viser kun enkle tellere (antall aktive fordeler, leads siste 7 dager). Det finnes ingen per-fordel-oversikt, ingen konverteringsfunnel, og ingen tidsfiltrering.

## Proposed Solution

Ny admin-side `/admin/analytics` med:

1. **Globale nøkkeltall øverst** — totalt antall visninger, innløsninger og leads for valgt tidsperiode
2. **Per-fordel-tabell** — én rad per aktiv fordel med kolonner: Visninger, Kode-avsløringer, Kode-kopiert, Leads, Lagret, Konverteringsrate (code_revealed / benefit_viewed)
3. **Tidsfilter** — 7 dager / 30 dager / Totalt (query-param `?period=7d|30d|all`)
4. **Enkel visuell indikator** — CSS-basert prosentbar i konverteringskolonnen (ingen eksternt chart-bibliotek)
5. **Lenke fra eksisterende dashboard** — StatCard eller hurtiglenke til `/admin/analytics`

Ingen nye avhengigheter. All aggregering skjer server-side i én GROUP BY-spørring.

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md — BenefitEvent er allerede dokumentert, ingen endringer
- [ ] specs/api.yaml — ikke i bruk (intern admin-rute)
- [ ] specs/flows.md — ikke berørt
- [ ] specs/architecture.md — ingen strukturelle endringer
- [ ] specs/nfr.md — ikke berørt
- [ ] specs/ui-spec.md — ikke berørt

Affected Components:
- `src/lib/queries/adminQueries.ts` — ny funksjon `getAnalytics(period)`
- `src/types/admin.ts` — ny type `AdminAnalyticsRow`
- `src/app/admin/(protected)/analytics/page.tsx` — ny side
- `src/app/admin/(protected)/page.tsx` — lenke til analytics lagt til i hurtighandlinger
- `src/components/admin/AdminSidebar.tsx` — ny nav-lenke «Analytics»

Database Impact:
- Ingen schemaendringer. Bruker eksisterende BenefitEvent-tabell.
- Aggregeringsspørring: `GROUP BY benefitId, eventType` med `WHERE createdAt >= ?`
- Ytelse: BenefitEvent kan vokse stor over tid. For demo (< 10 000 rader) er in-memory aggregering OK. Spørringen bør ha `createdAt`-filter alltid (aldri full tabellscan uten periode).

API Impact:
- Ingen nye API-ruter. Siden er server-rendered med `force-dynamic`.
- Data hentes direkte i Server Component via `getAnalytics()`.

UX Impact:
- Ny side i admin-navigasjon: «Analytics»
- Tidsfilter via `<select>` → router.push med query-param (client component)
- Tabell sortert etter visninger DESC
- Konverteringsrate vises som prosent med CSS-bredde-bar (0–100%)
- Tom tilstand vises hvis ingen events finnes for perioden

Security Impact:
- Siden er bak eksisterende admin JWT-guard — ingen ny auth-logikk.
- Ingen persondata eksponeres — BenefitEvent inneholder ikke navn eller e-post.

Performance Impact:
- GROUP BY på BenefitEvent uten index på `createdAt` kan bli treg ved stor datamengde. Akseptabelt for demo. Noteres som fremtidig forbedring (index eller materialized view ved MVP).

## Acceptance Criteria

- [ ] `/admin/analytics` vises i admin-navigasjonen og er tilgjengelig via sidebar
- [ ] Siden viser per-fordel-tabell med kolonner: Fordel, Visninger, Kode-avslørt, Kode-kopiert, Leads, Lagret, Konv.rate
- [ ] Tidsfilter (7 dager / 30 dager / Totalt) endrer data uten full page-reload (router.push)
- [ ] Konverteringsrate beregnes som `code_revealed / benefit_viewed` (0 hvis ingen visninger)
- [ ] Fordeler uten events vises med 0 i alle kolonner (LEFT JOIN-semantikk)
- [ ] Globale nøkkeltall (totalt visninger, innløsninger, leads) vises øverst
- [ ] Eksisterende dashboard-side lenker til `/admin/analytics`
- [ ] Siden håndterer tom event-tabell uten feil

## Required Tests

- [ ] Unit: `getAnalytics('7d')` — aggregerer korrekt per benefitId og eventType
- [ ] Unit: `getAnalytics('all')` — ingen dato-filter, returnerer alle events
- [ ] Unit: konverteringsrate-beregning — 0 visninger gir 0%, ikke division by zero

## Rollback Strategy

Ingen schemaendring. Rollback = revert PR. Eksisterende sider er uberørt.

## Migration Strategy

Ingen.

## Risks

- **Ytelse ved stor event-tabell:** GROUP BY uten index kan gi treg respons. Midlertidig OK for demo. Legg til `@@index([createdAt])` på BenefitEvent ved MVP.
- **Manglende historiske data:** Events som ble logget uten `benefitId` (f.eks. hero_clicked) vil ikke vises i per-fordel-tabellen. Akseptert.

## Dependencies

- Ingen uløste avhengigheter. Bygger på CR-002 (trackEvent) og CR-004 (admin-arkitektur).
