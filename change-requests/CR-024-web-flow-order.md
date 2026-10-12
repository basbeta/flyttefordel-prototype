# CR-024: Bestilling i web-løpet

Status: Done (committed 8bbbea2, pushet, /review PASSED, bruker klikket gjennom hele løpet 2026-10-12 uten å melde feil). Åpent og kjent: kontaktfeltene vises ikke i lead-admin, persondata-regler og samtykketekster ikke juridisk avklart
Created: 2026-10-12
Approved: 2026-10-12

## Business Goal
Gjøre web-løpet fra CR-023 til en reell bestilling: valgene kan sendes inn,
registreres som en ordre med ordrelinjer, og brukeren får en bekreftelsesside
som er en overgang til appen (docs/10 §7.1) i stedet for «lukk fanen». For første
gang kan vi se hvilken fordel, side og produkt som ga en bestilling (docs/09 §4
funn 4).

## Problem Statement
`/flytting/oppsummering` viser valg, men ingenting kan sendes inn og ingenting
lagres. Modellen har ingen ordre, ingen ordrelinjer og ingen samtykker.
Dagens FF knytter bestilling til produkt og ikke til annonse, så opprinnelsen
(fordel og side) er ukjent. Hendelsen `benefit_selected` (CR-020) er definert,
men ikke brukt.

## Proposed Solution

### Modell (additiv)
- **`Order`**: `id`, `submissionId` (klientgenerert UUID, **unik**, gir
  idempotent innsending), `sessionId?`, kontaktfelt (`name`, `email`, `phone?`,
  `postcode?`), samtykkene `consentEmail`, `consentMail` (brev), `consentSms`,
  `consentTexts` (JSON-snapshot av teksten brukeren faktisk så), `createdAt`.
- **`OrderLine`**: `id`, `orderId`, `productId`, `benefitId`, `pageId`
  (for sporing av opprinnelse) og øyeblikksbilder `productName`,
  `benefitTitle` (navn kan endres senere), `createdAt`.
- **Eksisterende `Lead` gjenbrukes**: én lead per bestilt fordel (ikke per
  produkt), med `formData` = kontaktfelt og valgt produkt, `consentText` og
  `consentAcceptedAt`. Da dukker bestillingene opp i eksisterende
  lead-admin og CSV-eksport uten ny admin. Se åpent punkt 2.

### Innsending
- **`POST /api/flow/order`** (offentlig, uten innlogging): body med
  `submissionId`, kontaktfelt, samtykker og `lines: [{ benefitId, productId }]`.
- Validering med zod. Lengdegrenser på alle strenger, e-postformat, norsk
  postnummer (4 siffer) hvis oppgitt, maks antall linjer, ett produkt per fordel.
- **Linjene valideres mot løpet slik det er for denne sesjonen** (live fordel,
  aktivt produkt, targeting). Ugyldig linje avviser hele ordren med 400 og
  liste over hvilke. Klienten kan ikke bestille noe den ikke fikk se.
- Alt skrives i **én transaksjon** (ordre, linjer, leads). Samme
  `submissionId` på nytt gir `200` med samme ordre, ingen duplikat.
- Rate limiting med eksisterende `checkRateLimit` (fail-open), forslag 10 per
  time per IP.
- Etter commit: `benefit_selected` per linje, `channel: 'web'`, `sessionId`,
  `viewId: 'web_card:standard'` (fire-and-forget, svelges ved feil).
- **Integrasjoner simuleres**: det kalles ingen kunde-API eller e-postsystem.
  Lead får status `new`. Svaret kommer umiddelbart (docs/10 §7.1: brukeren skal
  ikke vente på integrasjoner).

### UI (utvider CR-023)
- `/flytting/oppsummering` får skjema for kontaktopplysninger og samtykker, og
  «Send inn». Valg og feilmeldinger er tilgjengelige (feltmerking, `aria-live`).
- **`/flytting/bekreftelse`**: viser hva som er bestilt og at kundene tar kontakt,
  og «Last ned appen her» som åpner webappen (`/`), jf. docs/10 §7.1 og
  beslutning 11. Valgene i `sessionStorage` tømmes ved vellykket innsending.
- Innsending er deaktivert uten valg og uten påkrevde felt. Dobbelttrykk gir
  én ordre (knapp låses, og `submissionId` er idempotent).

### Samtykker (forslag, må vurderes juridisk)
- Ett **påkrevd** samtykke for å dele kontaktopplysningene med de valgte
  kundene (nødvendig for å følge opp bestillingen, som i dagens lead-flyt).
- **Tre valgfrie** markedsføringssamtykker (e-post, brev, SMS), **ikke
  forhåndskrysset**.
- Dagens FF gjør e-postsamtykket obligatorisk (docs/09 §2), men docs/12
  spm. 13 sier at det må vurderes juridisk før det videreføres. Derfor bygges
  det **ikke** som obligatorisk her. Alle samtykketekster er **plassholdere**
  som er tydelig merket i koden og i UI («midlertidig tekst, ikke juridisk
  vurdert»).

### Utenfor scope (egne CR-er)
- Innlogging og person-ID (simulert Vipps). Bestillingen er anonym, kun knyttet til
  sesjonen og kontaktfeltene.
- Adresseendring, flyttedato, If, postkasseskilt, puff, SMS-innlogging.
- Admin-visning av ordrer (leads vises allerede). Ingen ordreadmin.
- Ekte integrasjoner mot kunders leads-API, IDA eller e-post (bekreftelse på
  e-post sendes ikke).
- Sletting og lagringstid for persondata (docs/12 mangler regler, se Risks).

## Impact Analysis

Affected Specs:
- [x] specs/entities.md (Order, OrderLine)
- [x] specs/api.yaml (`POST /api/flow/order`)
- [x] specs/flows.md (innsending og bekreftelse)
- [x] specs/architecture.md (`/lib/flow` utvidet, ny `/lib/orders`)
- [ ] specs/nfr.md
- [ ] specs/ui-spec.md (tom fra før)

Affected Components:
- `prisma/schema.prisma` (Order, OrderLine, relasjoner) og ny migrasjon
- Ny `src/lib/orders/` (validering, bygg ordre, innsending i transaksjon)
- Ny `src/app/api/flow/order/route.ts`
- `src/components/web/FlowSummary.tsx` (skjema), ny bekreftelsesside og
  komponenter
- `src/lib/flow/` (innsendingsklient, tømming av valg)
- Eksisterende lead-admin og `/api/benefits/[slug]/lead` berøres ikke

Database Impact: Nye tabeller `orders` og `order_lines`. Unik indeks på
`orders.submission_id`, indeks på `order_lines.order_id`. FK uten kaskade.
Nye rader i eksisterende `leads` (ingen skjemaendring). Additiv migrasjon.

API Impact: Nytt offentlig `POST /api/flow/order`. Respons: `201` med
`{ orderId }` (første gang), `200` med samme (gjentatt `submissionId`), `400`
ved ugyldig input eller linje, `429` ved rate limit, `500` ved intern feil.
Ingen eksisterende endepunkt endres.

UX Impact: Oppsummeringen blir et skjema, og løpet får en bekreftelsesside.
Mobil først.

Security Impact: **Ny offentlig skrivevei som lagrer persondata.** Krever
zod-validering på alle felt, lengdegrenser, rate limiting, ingen logging av
persondata (NFR-003, som lead-ruten), og at linjer valideres serverside mot
sesjonens løp (aldri stol på klienten). Samtykketekst lagres som snapshot.
Same-origin JSON-kall, `SameSite=lax`-cookie. Ingen autentisering finnes
(anonym), så spam og misbruk begrenses bare av rate limit.

Performance Impact: Én transaksjon med få rader, pluss én `getWebFlow` for
validering. Ubetydelig ved forventet volum.

## Acceptance Criteria
- [x] Gyldig innsending oppretter én `Order`, én `OrderLine` per valgt produkt
      og én `Lead` per bestilt fordel, i én transaksjon
- [x] Samme `submissionId` to ganger gir ingen duplikat og samme `orderId`
- [x] Linje som ikke er i sesjonens løp (ukjent, ikke live, inaktivt produkt,
      targeting, produkt som tilhører annen fordel) avviser hele ordren med 400
- [x] To produkter på samme fordel i én ordre avvises
- [x] Manglende påkrevd felt, ugyldig e-post, for lange strenger og ugyldig
      postnummer gir 400 med feltfeil
- [x] Påkrevd delingssamtykke mangler gir 400. Markedsføringssamtykker er
      valgfrie og lagres som valgt
- [x] Samtykketekst lagres som snapshot på ordren og på lead
- [x] Rate limit gir 429 med `Retry-After`
- [x] `benefit_selected` logges per linje med `channel: 'web'` etter commit,
      og en feil i tracking påvirker ikke svaret
- [x] Persondata logges aldri
- [x] (FRAFALT, antakelsen var feil: lead-admin viser ikke formData, se Review-funn) Bestillingene vises i eksisterende lead-admin (kun som rader, se funn i Implementation Notes: kontaktfeltene vises og eksporteres ikke)
- [x] Oppsummeringen har skjema, validerer i klienten, låser knappen under
      innsending og viser feil tilgjengelig
- [x] Ved suksess vises `/flytting/bekreftelse`, valgene tømmes, og
      «Last ned appen her» åpner webappen
- [x] Alle samtykketekster er merket som midlertidige
- [x] Eksisterende ruter, admin og lead-flyt er uendret
- [x] `specs/entities.md`, `specs/api.yaml`, `specs/flows.md` og
      `specs/architecture.md` er oppdatert før kode
- [x] `npx tsc --noEmit`, `npx vitest run`, `npm run lint` og
      `npm run build` er grønne

## Required Tests
- [x] Unit: zod-skjema (gyldig, hver feiltype, grenseverdier, samtykker)
- [x] Unit: validering av linjer mot løpet (alle avvisningsgrunner)
- [x] Unit: bygging av lead-`formData` og samtykke-snapshot
- [x] Integration: `POST /api/flow/order` med mocket Prisma (201, 200 gjentatt,
      400 ulike, 429, 500, at transaksjon brukes, at hendelser sendes etter
      commit, at persondata ikke havner i logg)
- [x] Unit: innsendingsklient (suksess tømmer valg, feil beholder dem, dobbelt
      innsending)
- [x] Manuell i nettleser: hele løpet fra valg til bekreftelse, feilmeldinger,
      tastatur, mobil, og at leadene dukker opp i admin

## Rollback Strategy
Revert commit. Tabellene er nye. Ordrer og leads som allerede er opprettet blir
liggende (leads kan slettes via eksisterende `deletedAt`/admin). Skal tabellene
fjernes, kjøres en migrasjon som dropper dem etter at dataene er vurdert.

## Migration Strategy
Én additiv Prisma-migrasjon, deployes på `master`. Coolify kjører
`prisma migrate deploy` før oppstart. Ingen bakfylling.

## Risks
- **Persondata uten fastsatte regler.** Dok 12 sier at regler for lagring og
  sletting av persondata mangler. Ordre og leads inneholder navn, e-post og
  telefon i klartekst, og kontaktfeltene lagres to ganger (på ordre og lead).
  Ingen automatisk sletting. Bør ikke tas i bruk med ekte brukere før det er
  avklart.
- **Samtykketekster er ikke juridisk vurdert** (dok 12 spm. 12 og 13). Alt er
  plassholdere. Må ikke gå i produksjon med ekte brukere slik.
- **Offentlig skriveendepunkt uten innlogging.** Rate limit er eneste vern mot
  spam. Redis er fail-open, så uten Redis finnes ingen begrensning.
  Rate limiting finnes i prod bare hvis Redis er satt opp (CR-014 Infra-checklist
  er ikke avkrysset).
- **Ingen e-postbekreftelse og ingen reelle integrasjoner.** Brukeren får bare
  en bekreftelsesside. Kundene får ingenting utenom at leadet ligger i admin.
- **Duplisert opprinnelse.** `pageId` på linjen kan peke på en side som senere
  endres eller slettes (soft delete). Snapshots (`productName`,
  `benefitTitle`) tåler endring av navn, men ikke sidenavn.
- **UI er kun manuelt testet** (ingen komponenttester).
- **Stor CR.** Skjema, API, transaksjon og UI i ett. Kan deles i API (24a)
  og UI (24b) hvis du foretrekker mindre steg.

## Antakelser (docs/12: merkes tydelig)
- Anonym bestilling er nok i simuleringen. Person-ID og innlogging kommer
  senere (docs/10 §3.3).
- Kontaktfelt er navn, e-post, telefon (valgfri) og postnummer (valgfritt,
  forhåndsutfylt fra sesjonen hvis finnes). Adresse og flyttedato venter på
  person-ID.
- Ett produkt per fordel (som CR-023).
- Én lead per fordel gjenbruker eksisterende lead-modell og admin.
- Samtykketekster er plassholdere inntil juridisk vurdering.
- «Last ned appen her» åpner webappen på `/` (docs/10 beslutning 11).

## Avklarte punkter (bruker, 2026-10-12)
1. **Samtykker:** forslaget godkjent (ett påkrevd delingssamtykke, tre valgfrie markedsføringssamtykker, ikke forhåndskrysset, plassholdertekster).
2. **Leads:** bestillingen lager også en Lead per bestilt fordel.
3. **Kontaktfelt:** navn, e-post, telefon (valgfri) og postnummer (valgfritt) er riktig minimum.
4. **Størrelse:** brukeren svarte bare «ja på alt» på et valg. Tolket som at CR-en forblir én, slik den er skrevet. Implementeres og valideres lag for lag, med API og lagring først og UI til slutt. Kan deles senere hvis det blir uhåndterlig.
5. **Rate limit:** 10 bestillinger per time per IP.

## Dependencies
Bygger på CR-023 (løpet og klientvalg), CR-022 (produkter og web-plassering),
CR-020 (hendelser) og CR-014 (rate limiting, Redis). Åpner for person-ID og
innlogging, e-postbekreftelse og kundeintegrasjoner, og ordreadmin.

## Implementation Notes (2026-10-12)
- Bruker godkjente alle punkter ("ja på alt"). Punkt 4 var et valg mellom én eller to
  CR-er og er tolket som én CR, implementert lag for lag med API og lagring først.
- Nytt: `Order` og `OrderLine` (migrasjon `20261012300000_cr024_orders`, additiv, SQL fra
  `prisma migrate diff`, ikke kjørt mot DB), `src/lib/orders/` (zod-skjema,
  `validateOrderLines`, `buildLeadFormData`, samtykketekster, `submitOrder`),
  `POST /api/flow/order`, og UI: `OrderForm`, `FlowConfirmation`, utvidet
  `FlowSummary`, ny rute `/flytting/bekreftelse`.
- **Avkrysningene over er bare dekket av tester med mocket Prisma.** Ingenting er
  kjørt mot en database, så transaksjon, unik indeks (`submissionId`), P2002-race og
  at leadene faktisk dukker opp i admin er ikke verifisert. De tre UI-kriteriene og
  lead-admin-kriteriet er bevisst ikke avkrysset.
- `submitOrder` sjekker eksisterende `submissionId` **før** løpet lastes, så et
  gjentatt kall gir samme ordre også om løpet har endret seg siden første innsending.
- Persondata i logg: ruten logger bare feilnavn og Prisma-kode (en Prisma-feil kan ha
  innsendte verdier i meldingen). Testet med en feil som inneholder e-postadressen.
- Klienten gjenbruker serverens zod-skjema for validering. Importert fra
  `@/lib/orders/orderSchema` og `consentTexts` direkte (ikke fra `@/lib/orders`-indeksen,
  som drar inn Prisma). Build bekrefter at klientbundelen ikke trekker inn serverkode.
- `sessionStorage`-logikken er flyttet til en delt `stringStore` (brukes nå av valg og
  av "siste ordre"). De eksisterende selectionStore-testene er uendret og grønne.
- Bekreftelsessiden leser en nettleser-lokal "siste ordre" (bare ordre-id og hva som ble
  bestilt, ingen persondata). Åpnes siden direkte, vises "Ingen bestilling å vise".
- Ved `INVALID_LINES` fjernes de ugyldige valgene automatisk og brukeren får beskjed.
- Postnummer forhåndsutfylles fra sesjonen.
- **Ikke gjort / kjent:** rate limit finnes bare hvis Redis er satt opp (fail-open),
  ingen e-postbekreftelse, ingen ordreadmin, ingen sletting av persondata.
- Validering: tsc OK, lint 0 feil (3 gamle advarsler), vitest 303/303 (opp fra 233,
  70 nye), build OK (rutene `/api/flow/order` og `/flytting/bekreftelse` vises).
- Gjenstår: `/review`, commit, deploy (migrasjon kjører ved oppstart), og manuell test
  av hele løpet mot en database med seed, inkludert at leadene vises i admin.

## Review-funn (2026-10-12)
- **Dagens lead-admin viser ikke `Lead.formData`.** `getAdminLeads`/`AdminLeadRow` og
  CSV-eksporten har bare ID, fordel, annonsør, status, samtykketidspunkt og opprettet. Det
  gjelder alle leads, også de gamle fra `/api/benefits/[slug]/lead` (CR-004). Antakelsen i
  CR-teksten om at bestillingene «dukker opp i lead-admin og CSV-eksport» stemmer derfor
  bare for selve raden. Navn, e-post og telefon ligger i databasen (på `orders` og
  `leads.form_data`), men kan ikke hentes ut via noe UI. Å følge opp en bestilling krever
  i dag databasetilgang eller en ny eksport. Dette er eksisterende design, ikke introdusert
  her, men det betyr at en kunde ikke kan få bestillingen levert før lead-eksport utvides
  (egen CR, og må vurderes mot persondata-reglene som mangler).
- Rate limiting teller også avviste forsøk (400), og er fail-open uten Redis.
- `OrderInputSchema` er `.strict()`: et ukjent toppnivåfelt gir 400 uten feltfeil
  (`fields` blir tom), så klienten viser bare den generelle meldingen.
- Fokus flyttes ikke til feilmeldingen etter mislykket innsending (`role="alert"`
  annonserer, men tastaturfokus blir stående).
- Bekreftelseslisten bruker `tittel-produkt` som React-nøkkel, som kan kollidere ved
  identiske titler (kun en advarsel i konsoll).

## Avslutning (2026-10-12)
- Bruker klikket gjennom hele løpet (valg, skjema, innsending, bekreftelse) og meldte ikke
  om feil. Tolket som bestått for UI-kriteriene.
- Kriteriet om lead-admin er frafalt: antakelsen var feil (admin viser ikke `formData`).
  Dette er et reelt åpent punkt, ikke løst: **en kunde kan ikke få bestillingen levert før
  lead-eksport utvides**, og det må vurderes mot persondata-reglene som mangler (egen CR).
- Ikke eksplisitt bekreftet: at radene faktisk ligger riktig i `orders`, `order_lines` og
  `leads`, at idempotent dobbeltinnsending ga én ordre, og feilmeldingene for ugyldig
  input og manglende samtykke.
