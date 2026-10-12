# flows.md — Business Flows

> Define all critical user and system flows.
> Each flow maps to implementation in the service layer.

## Flow: Web-løpet, lesemodell (CR-022)

Trigger: Server-side kall til `getWebFlow(session)` (`src/lib/queries/flowQueries.ts`). Ingen HTTP-endepunkt.

Steps:
1. Hent aktive `FlowPage` (ikke slettet) sortert på `sort_order`, med `BenefitView`-rader av format `web_card` og variant `standard` som peker på siden.
2. Behold bare kort der fordelen er live: status `active`, ikke slettet, innenfor `starts_at`/`ends_at`.
3. Filtrer på targeting med `matchesSession()`.
4. Løs kortinnhold med `resolveBenefitView(..., 'web_card')`.
5. Hent aktive, ikke-slettede `Product` per fordel sortert på `sort_order`.
6. Utelat sider uten synlige kort. Returner smale visningsmodeller (`WebFlowPage`).

Decision points:
- Fordel uten produkter: beholdes som kort med `products: []`.
- Placering (`page_id`, `sort_order`) leses bare fra `standard`-raden. Varianter ignoreres for placering.
- Fordel uten `web_card`-rad med `page_id`: vises ikke i løpet (web-plassering er eksplisitt).

Error conditions:
- Ingen sider eller ingen synlige kort: tom liste.
- Prisma-feil kastes til kalleren (Server Component håndterer).

Related entities: FlowPage, BenefitView, Benefit, Product, Advertiser, TargetingRule
Related endpoints: ingen

---

## Flow: Web-løpet, sider og klientvalg (CR-023)

Trigger: Besøk på `/flytting` (ruter i `src/app/(web)/flytting`).

Steps:
1. `/flytting` henter løpet med `getWebFlow(session)` og sender til første synlige side, eller viser tom tilstand når løpet er tomt.
2. `/flytting/[pageId]` viser én side: progresjon ("Side X av N", "Neste: <navn>"), sidens navn og tekst, og kortene.
3. Hvert produkt på et kort har en knapp. Trykk velger produktet, trykk igjen angrer, trykk på et annet produkt på samme kort bytter. Valg er ett produkt per fordel.
4. Valgene holdes kun i klienten (`sessionStorage`, nøkkel `flyttefordel.flow.selection.v1`) som {fordelId: produktId}. Ingenting lagres på serveren og ingen hendelser sendes.
5. Siste side har lenke til `/flytting/oppsummering`, som lister valgene gruppert på side. Ingen innsending (CR-024).

Decision points:
- `pageId` som ikke finnes i personens synlige løp: send til første synlige side.
- Fordel uten produkter: vises som ren informasjon uten valgknapp.
- Lagret valg som peker på produkt eller fordel som ikke lenger er i løpet: droppes ved lesing.
- `sessionStorage` utilgjengelig: siden virker, og valg huskes i minnet så lenge siden ikke lastes på nytt (klient-navigasjon mellom sidene beholder dem).

Error conditions:
- Tomt løp: tom tilstand med forklaring, ingen feil.
- Ugyldig JSON i lagret valg: tolkes som ingen valg.
- Prisma-feil i `getWebFlow`: kastes til Next sin feilside.

Related entities: FlowPage, Benefit, Product, BenefitView
Related endpoints: ingen

---

## Flow: [Name]

Trigger: [What starts this flow?]

Steps:
1. [Step description]
2. [Step description]

Decision points:
- If [condition]: [path A]
- If [condition]: [path B]

Error conditions:
- [Error]: [How it is handled]

Related entities: [Entity names]
Related endpoints: [API endpoint paths]
