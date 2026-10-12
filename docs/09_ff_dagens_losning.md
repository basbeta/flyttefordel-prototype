# 09 Flyttefordel i dag: løp, admin, API, rapportering og e-post

> Opprettet: 2026-10-12
> Kilde: gjennomgang av FF web (test), admin-test, statistikkadmin, FF API (Swagger på api-test) og 24-tiltaksdokumentet.
> Formål: beskrive hvordan dagens Flyttefordel faktisk fungerer, slik at prototypen kan foreslå en bedre versjon. Dette er fakta om dagens løsning, ikke beslutninger. Beslutninger og målbilde står i 10.
> Repoet kan være offentlig. Dokumentet inneholder derfor ingen kundenavn, priser, volumtall eller persondata.

---

## 1. Navn og begreper

- Løsningen heter **Flyttefordel**, forkortet **FF**. Eldre dokumentasjon og admin bruker også "flyttehjelpen". Det er samme løsning.
- **FF web** er dagens flytteløp på nettet.
- **FF app** er den nye appen. Dette repoet ("Fordelsklubben") er prototypen for den, og skal nå utvides til felles backend for web, app og e-post.
- **Annonse, template, tilbud og fordel** brukes om hverandre i dagens løsning. I målbildet heter det **Fordel** (se 10).

## 2. Brukerens løp i FF web

1. Brukeren melder adresseendring hos Posten og sendes videre til FF.
2. **Postkasseskilt** (før innlogging): standard (78x32 mm), stor (94x58 mm) eller "Nei takk". Fire linjer, maks 20 tegn per linje, med forhåndsvisning og eksempler.
3. **Innlogging**: Vipps eller mobilnummer med SMS-kode. SMS-varianten har et eget steg der brukeren oppgir e-post. Tekst under knappene sier at brukeren ved innlogging godtar at personopplysninger deles med samarbeidspartnere.
4. **"Dine flyttefordeler"**: oppsummerer at brukeren får gratis postkasseskilt, gratis flytteforsikring fra If og tilbud fra partnere.
5. **Kategorisider**, én om gangen, i fast rekkefølge. Eksempler: til hjemmet, streaming og bredbånd, strøm, lokale tilbud, solskjerming, aviser, lesestoff, diverse. Sider kan hoppes over for en person (segmentering eller tom side). Øverst: progresjonslinje og "Neste: <kategori>".
6. **"Fullfør bestilling"**: personinformasjon, adresseendring og flyttedato (alle med "Endre"), valgte fordeler, skiltet, gratis flytteforsikring, If husforsikring med personlig pris i tre nivåer og innbo som tillegg (brukeren må velge ja eller nei), og samtykke til kommunikasjon på e-post (obligatorisk for å fullføre, teksten lover ukentlige tilbud), SMS og brev.
7. **Bekreftelse**: "Dine fordeler er nå bestilt!", info om skiltlevering, påminnelse om midlertidig merking av postkassen, og "Du kan nå lukke fanen". Ingen fordeler, ingen vei videre.

### Fordelskortet i web

Logo/bilde, overskrift, tekst, kulepunkter, vilkårslenke, **leveringsmåte** ("Få tilbudet på e-post", "på SMS", "Bli kontaktet på telefon", "Vi ringer deg for befaring") og en "Ja takk"-knapp. Noen sider har "Flere fordeler" som viser flere kort.

Viktig: **ett kort kan ha flere produktvalg**. Eksempel: en lokalavis med to knapper (digital og komplett), som er to ulike produkter.

"Ja takk" registrerer bare et ønske. Alt sendes samlet ved "Send inn" på oppsummeringen.

### Teknisk

- Frontend er Next.js. Kall mot API ser ut til å gå via Next-serveren, ikke direkte fra nettleseren.
- Google Analytics med flere målings-ID-er.
- Innsending på oppsummeringen tok over ti sekunder i test. Trolig synkrone kall til integrasjoner.

## 3. Admin i dag (admin-test, "Preferansebasen")

Meny: Forsiden (login- og ordrestatistikk), Flyttefordel (annonsetreet), Kunder, Ordre, Bekreftelser, IDA, IDA-eksport, og en knapp "Publiser nye endringer".

> Ikke gjennomgått ennå: Ordre, Bekreftelser, IDA, IDA-eksport og publiseringsknappen. Publiseringsknappen antyder at endringer først blir synlige etter publisering eller cache-oppdatering (API-et har `/api/admin/cache`).

### Annonsetreet

```
Endpoint → Page → Container → Template → TemplateOffer → Product → ProductOwner (kunde)
```

| Nivå | Hva det er | Felter (utvalg) |
|---|---|---|
| Endpoint | Toppnivå. To i bruk: flytteløpet og bekreftelse. Bare et heltall på Page. | id |
| Page | Kategoriside i løpet, sortert. | name, text, image, sortOrder, active, endpointId |
| Container | Gruppe under en side. Ofte én per side med samme navn. Ingen egen logikk. | name, sortOrder, active, pageId |
| Template | Selve annonsen. Typet (f.eks. OFFER). | header, text, logo, logo2, validToDate, limitDays, segmentation, terms, confirmText, confirmButtonText, postnummerregler |
| TemplateOffer | Kobling template → produkt med egne felter. Admin: "Tilknyttede tilbud". Gir flere produktvalg på samme kort. | templateId, productId, name, text, price, sortOrder |
| Product | Kundens produkt. Grunnlag for bestilling, lead og fakturering. | name, type (f.eks. GeneralOffer), articleId, leadPrice, kobling til kundens leads-API, apiCustomValue1-5 |
| ProductOwner | Kunden. | navn, status, tekniske kontaktfelter |

Template-innstillinger i admin: utløp, postnummerbegrensning, husholdningssegmentering, vilkår og forhåndsvisning.

Kanal er i dag delvis bakt inn i produktene: e-posttilbud ligger som egne produkter (navn med "Flyttemailen") ved siden av hovedproduktet til samme kunde.

## 4. FF API (Swagger på api-test)

Spesifikasjon: `https://api-test.flyttefordel.no/swagger/v1/swagger.json`

### Brukerflyt

- `GET /api/person/fetchtemplates/{mobilePhone}/{sessionId}`: alle annonser til løpet i ett kall, som `GetAdsVm { pages: [PrefDbAdsPage] }` med hele treet nedover. Utvelgelse per person skjer i backend.
- `GET /api/person/login/vipps/authurl`, `POST /api/person/login/vipps/validate` (tar `code`, `state`, `sessionId`; returnerer navn, e-post, fødselsdato, flyttedato, fra- og tiladresse).
- `POST /api/person/login/sms`, `POST /api/person/login/sms/validate/{mobilePhone}/{sessionId}`.
- `GET/PUT /api/person/{mobilePhone}/{sessionId}`, `PUT /api/person/mailboxsign/...`, `PUT /api/person/sessioncookie/...`.
- `POST /api/order/submit/{mobilePhone}/{sessionId}`: `CreatePersonAndOrderDto { emailConsent, dmConsent, smsConsent, ifInsuranceCoverage, orderLines: [{ productId }] }`.
- `POST /api/if/requestquote`: If-tilbud.

### E-post og puff

- `GET /api/template/puff/{templateId}` og `POST /api/order/puff/{templateId}` med `customerId` og `reference`. Ser ut til å være bestilling fra lenke i e-post uten innlogging. Må bekreftes i koden.
- `POST /api/person/unsubscribe` med samme parametre.
- Listedefinisjoner (`/api/listdefinition/...`): lagrede utvalg som testes og overføres til IDA (e-postplattformen). Jobber for å fjerne utløpte kontakter fra lister.
- `/api/admin/runidasubscribe`, `runidadeleteunsubscribed`, `runidabounce`: synkronisering med IDA.

### Admin og jobber

- CRUD for Page, Container, Template, TemplateOffer, Product, ProductOwner, pluss sortering og "setparent".
- Jobber: påminnelses-SMS, adressevedlikehold, sletting av utløpte innlogginger, sletting av utløpte templates, aggregering av ordre og innlogginger per dag.
- Oppslag på person via telefonnummer mot en ekstern tjeneste (`/api/admin/df/...`), og felter som tyder på oppslag mot register for flyttedato. Hvilken tjeneste er ikke avklart.
- `/api/packageadmin/...`: filer for postkasseskilt til leverandør.

### Funn

1. **Svarformatet er databaseentiteter** (`PrefDb...`), ikke visningsmodeller. Ifølge spesifikasjonen kan svaret til frontend inneholde interne produktfelter. Må verifiseres. Ny backend skal uansett ha smale visningsmodeller.
2. **Telefonnummer og sesjon i URL** er brukeridentiteten i nesten alle brukerkall.
3. **Vipps-identifikatoren eksponeres ikke.** Om den lagres internt er ukjent.
4. **Bestillinger knyttes til produkt, ikke til annonse** (unntatt puff). Man kan ikke se hvilken annonse eller side som ga bestillingen.
5. **Ingen registrering av visninger eller klikk.**

## 5. Rapportering i dag (statistikkadmin, EntraID-innlogging)

- **Overview**: personer som fullførte løpet, innlogginger (to kilder), leadinntekt (sum leadpris), antall bestilte produkter, inntekt per fullført person, manuelt bestilt. Sammenligning mot forrige periode, forrige måned eller i fjor. Hvert tall kan åpnes som tidsserie.
- **Products**: inntekt eller antall per produkt i en periode, filter på kilde (hovedbestilling, e-posttilbud, If, manuell), skilt med eller uten, CSV-eksport.
- **Time Series**: utvikling over tid for valgte produkter.
- **Non-invoiceable Order Lines**: ordrelinjer uten status per produkt og måned.
- **Contacts** og **Product Owners**: oppslag.

Tilsvarer `/api/adminstatistics/...`. Alt måles på produkt og bestilling. Ingen fordel-, visnings- eller kanalnivå.

## 6. E-post etter løpet

Brukere som samtykker får e-post med tilbud i etterkant av løpet. Dette er kampanjer tilpasset mottakerne, og skal videreføres. Utvalg bygges i FF (listedefinisjoner) og sendes via IDA. Åpninger og leveranser skjer i IDA. Klikk og bestillinger via puff-lenker går gjennom FF.

## 7. Prototypen i dette repoet i dag

- Next.js, Prisma, egen Postgres. Separat fra FF-backend.
- **Benefit**: tittel, kort og lang beskrivelse, ett bilde, merketekst, status, synlighet, prioritet, start og slutt, vilkår, samtykketekst, `isFeatured`, prisfelter. Én Advertiser, én Category.
- **BenefitRedemption**: generisk kode, unik kode fra kodepool, QR, ekstern lenke, leadskjema, kun info, kombinasjon.
- **Hero**: egen entitet for karusellen, CTA til fordel, kategori eller URL.
- **TargetingRule** (delt av Benefit og Hero): flyttestatus, postnummer, postnummerintervaller, kommuner, fylker, nasjonal.
- **Flater**: herokarusell, "Fordeler for deg", liste med kategorifilter, detaljside, "I nærheten", "Lagret".
- **Medier**: én bilde-URL per fordel og per hero.
- **Brukere**: anonyme sesjoner som standard. Ingen Vipps.
- **Hendelser**: `BenefitEvent` og `/api/track`.
- **Product finnes ikke.** Annonsør og priser ligger på fordelen.
- "Nylig flyttet" er definert som 0 til 60 dager.

## 8. Kobling mellom FF og prototypen

| FF i dag | Prototypen | Merknad |
|---|---|---|
| Template | Benefit | Samme konsept. Blir Fordel. |
| TemplateOffer (flere produktvalg) | (ingen) | Behovet for flere produkter per fordel må dekkes. |
| Page | (ingen) | Bare web-løpet. |
| (ingen) | Category, Hero, flater | Bare appen. |
| Segmentering, postnummer, utløp, limitDays | TargetingRule, startsAt/endsAt | Prototypens regler er mer gjennomarbeidet. |
| Product, ProductOwner | Advertiser, prisfelter på Benefit | FF bestiller og fakturerer via Product. |
| Leveringsmåte (e-post, SMS, telefon, befaring) | (ingen) | Ny egenskap i prototypen. |
| Bestilling eller lead via produkt | BenefitRedemption | Begge er innløsning. |
| Telefon og sesjon | Anonym sesjon og User | Begge skal over på innlogget person. |
