# CR-012: Bildeopplasting i admin-grensesnittet

Status: In Progress
Created: 2026-08-06
Approved: 2026-08-06

## Business Goal
Gjøre det mulig for admin å laste opp faktiske bildefiler for fordeler,
annonsørlogoer og hero-bilder, i stedet for å måtte hoste bilder eksternt
og lime inn en URL. Nødvendig for at reelle kampanjer (ikke bare demo-data)
skal kunne ha egne bilder uten avhengighet av tredjeparts bildehosting, og
for å lukke et funksjonshull der to av tre bilde-felter ikke engang er
redigerbare i admin i dag.

## Problem Statement
- `Benefit.imageUrl`/`imageAlt` finnes i schema, men `BenefitForm.tsx` har
  **ingen** felt for dem — admin kan ikke sette bilde på en fordel i det
  hele tatt via UI i dag.
- `Advertiser.logoUrl` finnes i schema, men `AdvertiserForm.tsx` har
  **ingen** felt for det — samme hull for annonsørlogo.
- `Hero.imageUrl` er det eneste av de tre som er redigerbart i dag
  (`HeroForm.tsx`), men kun som ren tekst-URL-input — admin må selv hoste
  bildet et annet sted og lime inn lenken.
- Ingen lagringsbackend finnes i kodebasen. CR-011 fjernet
  `@supabase/supabase-js` (aldri koblet til noe lagringskall), og
  `specs/architecture.md` dokumenterer i dag eksplisitt
  **"File storage | Ikke i bruk"**. Docker-oppsettet har ingen persistent
  volum for filer skrevet til disk i containeren.
- Konsekvens: reelle kampanjebilder er i praksis ikke mulig å administrere
  selvstendig i dag — kun en teoretisk mulighet via ekstern URL for Hero.

## Proposed Solution
1. Ny lagringsmodul `src/lib/storage/` — kapsler inn en S3-kompatibel
   klient (bruker offisiell AWS S3 SDK, som støtter alle S3-kompatible
   leverandører via `endpoint`-konfigurasjon — Hetzner Object Storage,
   Cloudflare R2, MinIO, e.l. uten leverandørspesifikk kode). Isolert
   modul, samme mønster som `/lib/auth` og `/lib/db` — enkel å bytte
   leverandør senere (kun miljøvariabler, ingen kodeendring i
   forretningslogikk), i tråd med `specs/architecture.md` sitt
   migreringsprinsipp.
2. Ny API-rute `POST /api/admin/upload` — tar multipart/form-data,
   validerer filtype (jpg/png/webp) og størrelse (maks 5 MB) server-side,
   laster opp til bucket, returnerer offentlig URL. Admin-auth-guardet som
   alle andre `/api/admin/*`-ruter.
3. Ny delt komponent `src/components/admin/ImageUploadField.tsx` —
   fil-input + forhåndsvisning + progressindikator, kaller
   opplastingsruten og setter resultat-URL-en i formets state. Brukes i
   alle tre forms.
4. `BenefitForm.tsx` og `AdvertiserForm.tsx`: legg til de manglende
   bilde-feltene (`imageUrl`+`imageAlt` / `logoUrl`) med
   `ImageUploadField`.
5. `HeroForm.tsx`: bytt ut tekst-URL-inputen med `ImageUploadField`.
6. **Ingen schema-endring** — `imageUrl`/`logoUrl` forblir en URL-streng i
   databasen. Opplasting fyller bare feltet med bucket-URL-en i stedet for
   en admin-limt ekstern URL. Eksisterende demo-data med eksterne URL-er
   fortsetter å fungere uendret, siden forbrukerappen allerede rendrer
   `<img src={imageUrl}>` uavhengig av opphav (ingen migrering av
   eksisterende data nødvendig).
7. Nye miljøvariabler for storage-endpoint/bucket/credentials/offentlig
   base-URL (se Affected Components).
8. **Ikke i scope**: `BenefitRedemption.qrImageUrl` — genereres server-side
   av `qrcode`-biblioteket ved kode-innløsning, lastes ikke opp av admin.
   Ingen endring i den flyten.

## Impact Analysis

Affected Specs:
- [x] specs/architecture.md — oppdatert (2026-08-06): "File storage"-raden,
      ny `/lib/storage`-modul i Module Map, ny S3-klient i External
      Dependencies, migreringsnotat, nye miljøvariabler
- [x] specs/entities.md — oppdatert (2026-08-06): `imageUrl`/`logoUrl`
      dokumentert som populert via opplasting eller direkte URL
- [ ] specs/api.yaml — ikke oppdatert. Filen har stått som uutfylt mal
      (`# Define endpoints here`) gjennom alle 11 foregående CRs, inkl.
      CR-004 og CR-007 som la til en rekke admin-API-ruter — ingen
      etablert praksis i dette prosjektet for å holde den ved like.
      Samme fravalg gjøres her, ikke unikt for CR-012.
- [ ] specs/ui-spec.md — samme situasjon: uutfylt mal
      (design tokens i `[hex]`/`[value]`-placeholders) gjennom alle
      foregående CRs. Ikke oppdatert her av samme grunn.
- [ ] specs/flows.md — vurdert, men admin-opplasting er en
      formkomponent-endring, ikke en ny end-to-end-brukerflyt — ikke
      ansett vesentlig nok til egen flyt-dokumentasjon.
- [ ] specs/nfr.md — samme situasjon som api.yaml/ui-spec.md: uutfylt mal
      (`[target, e.g. < 200ms]` osv.) gjennom hele prosjektets historie.
      Filstørrelse-/filtype-grensen er i stedet dokumentert i denne CR-en
      (Proposed Solution/Security Impact) og i kode/tester.

Affected Components:
- Nytt: `src/lib/storage/` — S3-klient, `uploadImage()`-funksjon,
  filtype-/størrelsesvalidering
- Nytt: `src/app/api/admin/upload/route.ts`
- Nytt: `src/components/admin/ImageUploadField.tsx`
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — nye felter
  `imageUrl`/`imageAlt`
- `src/app/admin/(protected)/advertisers/AdvertiserForm.tsx` — nytt felt
  `logoUrl`
- `src/app/admin/(protected)/heroes/HeroForm.tsx` — URL-tekstinput byttes
  til `ImageUploadField`
- `src/app/api/admin/benefits/route.ts` + `[id]/route.ts` — Zod-schema må
  tillate `imageUrl`/`imageAlt` i POST/PATCH-body (usikkert i dag om de
  allerede er der uten at formet sender dem — verifiseres ved
  implementasjon)
- `src/app/api/admin/advertisers/route.ts` + tilhørende `[id]`-rute —
  samme verifisering for `logoUrl`
- `.env.example`, `specs/architecture.md` — nye miljøvariabler for storage
- `package.json` — ny avhengighet for S3-kompatibel klient (f.eks.
  `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)

Database Impact:
- Ingen skjemaendring. `imageUrl`/`imageAlt`/`logoUrl` finnes allerede på
  `Benefit`, `Hero` og `Advertiser`.

API Impact:
- Ny endepunkt `POST /api/admin/upload` — ikke en breaking change, additiv.
- Eksisterende `POST`/`PATCH` på benefits/advertisers må evt. utvides til å
  akseptere de nye feltene i request-body (avhenger av om Zod-schema
  allerede tillater dem uten å bruke dem — verifiseres, ikke antas).

UX Impact:
- Admin får filopplasting i stedet for URL-inn-liming for Hero (endring i
  eksisterende flyt), og helt nye bilde-felter for Benefit/Advertiser
  (ingen regresjon — feltene fantes ikke før).
- Ingen endring i forbrukerappens visning — `<img src={imageUrl}>` er
  uendret uansett hvor URL-en kom fra.

Security Impact:
- Filopplastingsruten må validere filtype og størrelse server-side (ikke
  stole på klient-side MIME-type alene — sjekk faktisk filinnhold/magic
  bytes for å unngå at vilkårlige filer lastes opp som "bilde").
- Storage-credentials (access key/secret) er nye hemmeligheter som må
  provisjoneres i Coolify sine miljøvariabler, aldri committes.
- Opplastingsruten er admin-auth-guardet som alle andre `/api/admin/*`
  -ruter — ingen anonym opplasting.
- Vurder om bucket skal være offentlig lesbar (enklest, bilder er ikke
  sensitive) eller kreve signerte URL-er ved lesing — offentlig lesbar
  bucket er sannsynligvis riktig her siden bildene allerede vises åpent i
  forbrukerappen uten auth.

Performance Impact:
- Opplasting går via Next.js API-ruten (server-side proxy til S3), ikke
  direkte klient→bucket presigned upload — enklere å implementere og
  validere, men legger opplastingstrafikken gjennom app-containeren i
  stedet for direkte til storage. Akseptabelt for forventet volum
  (admin-opplasting, ikke sluttbruker-volum); kan revurderes til presigned
  direct-upload senere hvis filstørrelse/frekvens øker.

Required Tests:
- [x] Unit: `src/lib/storage/` — filtype-/størrelsesvalidering (avvis for
      stor fil, avvis ikke-tillatt filtype, aksepter gyldig fil) — 13
      tester, `validateImage.test.ts` + `client.test.ts` + `uploadImage.test.ts`
      (2026-08-06)
- [x] Unit: opplastingsruten — 401 uten admin-auth, 400 ved ugyldig fil,
      201 ved gyldig opplasting (mock S3-klient) — 5 tester,
      `route.test.ts` (2026-08-06)
- [ ] Integration: manuell test — last opp bilde for en fordel, annonsør
      og hero i admin MOT EKTE BUCKET, bekreft bildet vises korrekt i
      forbrukerappen. IKKE gjort ennå — kodearbeidet er ferdig og testet
      med mock, men ingen faktisk opplasting mot `basbeta-pub-object-storage`
      er utført.
- [ ] E2E: ingen automatisert E2E-suite finnes i dag (samme gap som
      CR-011 dokumenterte) — ikke antatt dekket

## Acceptance Criteria
- [ ] Admin kan laste opp et bilde for en fordel og se det i
      forbrukerappens fordelsdetalj-side — kode ferdig, IKKE manuelt
      verifisert mot ekte bucket ennå
- [ ] Admin kan laste opp en logo for en annonsør — kode ferdig, IKKE
      manuelt verifisert ennå
- [ ] Admin kan laste opp et hero-bilde (erstatter dagens URL-tekstfelt)
      — kode ferdig, IKKE manuelt verifisert ennå
- [ ] Opplastingsruten avviser filer over 5 MB og filtyper utenfor
      jpg/png/webp med tydelig feilmelding i UI — logikk enhetstestet,
      feilmelding-i-UI IKKE manuelt verifisert i nettleser ennå
- [ ] Eksisterende demo-data med eksterne bilde-URL-er vises fortsatt
      korrekt, uendret — ingen kodeendring i rendering, men ikke
      re-verifisert i denne CR-en
- [x] Alle nye/endrede miljøvariabler dokumentert i `.env.example` og
      `specs/architecture.md` (2026-08-06)
- [x] `specs/architecture.md` sin "File storage"-rad oppdatert fra
      "Ikke i bruk" til faktisk løsning (2026-08-06)

## Rollback Strategy
Additiv endring — eksisterende URL-baserte bilde-felter og rendering i
forbrukerappen er uendret. Ved problemer kan `ImageUploadField` rulles
tilbake til ren tekst-URL-input (kun UI-endring) uten datamigrering, siden
underliggende felt fortsatt er en enkel URL-streng.

## Migration Strategy
1. Velg og provisjonér S3-kompatibel leverandør (brukeroppgave, se
   Infra-checklist under) før kodearbeidet starter — trengs for lokal
   testing av opplastingsruten.
2. Implementer `/lib/storage` + opplastingsruten isolert, med unit-tester
   mot mock-klient (krever ikke ekte bucket for testene).
3. Legg til `ImageUploadField` og koble den til hvert av de tre formene,
   ett om gangen, egne commits.
4. Manuell smoke test mot ekte bucket i dev/staging før admin-brukere
   tar det i bruk i prod.

## Infra-checklist (brukeroppgave — Claude har ikke tilgang til S3-leverandør)
1. ~~**Velg leverandør**~~ — LØST (2026-08-06): Coolify sin innebygde
   S3-kompatible object storage-ressurs, endepunkt
   `https://fsn1.your-objectstorage.com`, region `fsn1`.
2. **Opprett en NY, separat bucket** — `basbeta-pub-object-storage` (ikke gjenbruk av
   `basbeta-backup`, se DECISIONS.md 2026-08-06: backup-bucketen bør
   forbli privat siden den kan inneholde persondata fra `pg_dump`, mens
   bilde-bucketen skal være offentlig lesbar). Sett offentlig lesbar,
   ikke offentlig skrivbar.
3. **Opprett access key/secret** via "Manage credentials" på bucketen.
   BEKREFTET (2026-08-06): Hetzner Object Storage-nøkler er
   **prosjekt-nivå, ikke bucket-scoped** ("Credentials are valid for all
   Buckets within this project") — nøkkelparet vil derfor også kunne nå
   `basbeta-backup`. Opprett likevel et eget, dedikert nøkkelpar for denne
   appen (fremfor å gjenbruke et eksisterende) — gir uavhengig
   rotering/revokering selv om selve rettigheten er bredere enn ønsket.
   Sett som Coolify-miljøvariabler på app-ressursen (`S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`) — aldri i `.env` committet til git, aldri limt
   inn i chat/samtale.
4. **Bekreft CORS-oppsett** på bucketen tillater opplasting fra appens
   domene om noe skjer client-side (sannsynligvis ikke nødvendig siden
   opplasting går via server-side API-rute — bekreft ved implementasjon).
5. **Smoke test etter deploy**: last opp ett faktisk bilde per entitetstype
   (fordel, annonsør, hero) i prod-admin, bekreft synlig i forbrukerappen.

Bekreftede, ikke-hemmelige miljøvariabler (2026-08-06):
```
S3_ENDPOINT=https://fsn1.your-objectstorage.com
S3_REGION=fsn1
S3_BUCKET=basbeta-pub-object-storage
S3_ACCESS_KEY_ID=       # settes av bruker i Coolify, ikke i git
S3_SECRET_ACCESS_KEY=   # settes av bruker i Coolify, ikke i git
```

## Risks
- Uklart om Zod-schemaene i `POST`/`PATCH`-rutene for benefits/advertisers
  allerede tillater `imageUrl`/`imageAlt`/`logoUrl` i body — må verifiseres
  ved implementasjon, ikke antas OK basert på at feltene finnes i Prisma-
  schemaet.
- Server-side proxy-opplasting (se Performance Impact) legger
  filoverføringen gjennom app-containeren — bør revurderes hvis
  bildestørrelse eller opplastingsfrekvens øker vesentlig utover
  admin-bruk.
- Valg av S3-leverandør er ikke gjort før implementasjon starter — første
  steg i Migration Strategy blokkerer resten av arbeidet.

## Dependencies
- Ingen avhengighet av andre åpne CR-er.
- Avhenger av brukervalg av S3-leverandør og bucket-provisjonering (se
  Infra-checklist) før lokal utvikling mot ekte storage kan verifiseres —
  unit-tester med mock-klient kan derimot skrives uavhengig av dette.
