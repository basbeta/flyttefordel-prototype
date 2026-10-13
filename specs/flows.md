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

## Flow: Bestilling i web-løpet (CR-024)

Trigger: Bruker trykker «Send inn» på `/flytting/oppsummering`.

Steps:
1. Klienten genererer en `submissionId` (UUID) per innsendingsforsøk og sender kontaktfelt, samtykker og valgte linjer til `POST /api/flow/order`.
2. Serveren sjekker rate limit (10 per time per IP, fail-open), validerer input med zod, og finner sesjonen.
3. Linjene valideres mot løpet for sesjonen (`getWebFlow`): fordelen må være i løpet, produktet må tilhøre fordelen og være aktivt, og det er maks ett produkt per fordel.
4. I én transaksjon: opprett `Order`, `OrderLine` per produkt og én `Lead` per bestilt fordel (form_data med kontaktfelt, valgt produkt og orderId).
5. Svar `201` med `orderId`. Etter commit logges `benefit_selected` per linje (channel web, fire-and-forget).
6. Klienten tømmer valgene og går til `/flytting/bekreftelse`.

Decision points:
- Samme `submissionId` finnes: svar `200` med samme `orderId`, ingen duplikat (også ved samtidige forsøk, unik indeks).
- Ugyldig linje: hele ordren avvises med `400` og liste over linjene.
- Delingssamtykke ikke gitt: `400`.
- Rate limit overskredet: `429` med Retry-After.

Error conditions:
- Prisma-feil i transaksjonen: `500`, ingenting lagres.
- Tracking feiler: svares fortsatt `201`.
- Persondata logges aldri.

Related entities: Order, OrderLine, Lead, Product, Benefit, FlowPage, UserSession
Related endpoints: POST /api/flow/order

---

## Flow: Fylle web-løpet fra admin (CR-025)

Trigger: Admin åpner `/admin/flow-pages` eller rediger fordel.

Steps:
1. Opprett en side (`FlowPage`) med navn, tekst, bilde, rekkefølge og aktiv-flagg.
2. På rediger fordel: legg til produkter (`Product`) med navn, tekst, pristekst, rekkefølge og aktiv-flagg.
3. På rediger fordel, seksjonen "Web-løpet": velg side og rekkefølge. Lagring oppretter eller oppdaterer `BenefitView` (web_card, standard) med `page_id` og `sort_order`. "Ikke i løpet" setter `page_id` til null.
4. Seksjonen viser hvorfor fordelen ikke vises i løpet (`getWebPlacementProblems`).
5. Avkrysningen "Vis i appen" styrer `Benefit.show_in_app`.

Decision points:
- Sletting av side og produkt er soft delete (ordrelinjer refererer produkter). Plasseringer på en slettet side blir stående og utelates fra løpet.
- Plasseringen er alltid på standard-varianten (variantplassering ignoreres, CR-022).
- `show_in_app = false` utelater fordelen fra appens lister, "I nærheten" og "Lagret", men ikke fra detaljside eller direktelenke.

Error conditions:
- Ingen admin-cookie: 401. Ukjent id: 404. Ugyldig input: 400. Uventet feil: 500 med JSON.
- Plassering på side som ikke finnes eller er slettet: 404.

Related entities: FlowPage, Product, BenefitView, Benefit
Related endpoints: /api/admin/flow-pages, /api/admin/benefits/[id]/products, /api/admin/benefits/[id]/web-placement, PATCH /api/admin/benefits/[id]

---

## Flow: Sette innholdsoverstyring per flate (CR-027)

Trigger: Admin åpner seksjonen "Visninger" på rediger fordel.

Steps:
1. Seksjonen viser en gruppe per format (App-kort, Web-kort) med feltene tittel, tekst, bilde (og alt-tekst) og merketekst. Tomt felt betyr "arv fra fordelen", og plassholderen viser den arvede verdien.
2. Forhåndsvisningen løser innholdet med `resolveBenefitView` på utkastet, mens admin skriver.
3. Lagre sender `PUT /api/admin/benefits/[id]/views/[format]`. Raden (fordel, format, standard) opprettes om den mangler. Tomme felt lagres som null.
4. "Tilbakestill til fordelens innhold" sender samme kall med alle felt tomme.
5. Appens liste, "I nærheten", "Lagret" og web-løpet leser overstyringene via `resolveBenefitView` (samme kort på alle flater i appen).

Decision points:
- Overstyrings-ruten oppdaterer bare innholdsfeltene. Plassering (`page_id`, `sort_order`) på web_card-raden røres kun av plasserings-ruten (CR-025).
- Kun variant standard har admin-UI. Varianter og A/B kommer senere.
- Detaljsiden er ikke en visning og påvirkes ikke.

Error conditions:
- Ingen admin-cookie: 401. Ukjent fordel eller format: 404. Ugyldig input: 400. Uventet feil: 500 med JSON.

Related entities: BenefitView, Benefit
Related endpoints: PUT /api/admin/benefits/[id]/views/[format]

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
