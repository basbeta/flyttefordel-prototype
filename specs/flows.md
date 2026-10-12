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
