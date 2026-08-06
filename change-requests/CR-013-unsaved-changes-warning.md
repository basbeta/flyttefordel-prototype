# CR-013: Varsel om ulagrede endringer i admin-former

Status: In Progress
Created: 2026-08-06
Approved: 2026-08-06

## Business Goal
Forhindre at admin-brukere utilsiktet mister endringer de har gjort i et
formfelt (tekst, dropdown, bilde osv.) ved å navigere bort uten å lagre.
Reduserer risiko for tapt arbeid og frustrasjon, spesielt nå som CR-012
har gjort bildeopplasting til en egen async handling inne i formet — et
opplastet bilde ligger allerede i S3-bucketen selv om selve fordelen/
annonsøren/heroen aldri blir lagret.

## Problem Statement
Ingen av admin sine fire redigeringsformer (`BenefitForm.tsx`,
`AdvertiserForm.tsx`, `HeroForm.tsx`, `CategoryForm.tsx`) varsler i dag
når brukeren navigerer bort — via «← Tilbake»-knapp, sidebar-lenke,
adressefelt, fane-lukking eller refresh — mens formet har ulagrede
endringer i noe felt. Dette ble oppdaget og bekreftet av bruker under
manuell testing av CR-012 (ISSUE-010 i `sessions/OPEN-ISSUES.md`), og er
et gjennomgående gap, ikke spesifikt for bildeopplasting.

`LoginForm.tsx` er **ikke** i scope — den har ingen «lagre»-tilstand å
miste, kun én enkelt innloggingshandling.

## Proposed Solution
1. Ny delt hook `src/lib/admin/useUnsavedChangesWarning.ts` — tar en
   `isDirty: boolean` og gjør to ting:
   - **`window.beforeunload`**: registrert når `isDirty` er `true`,
     fjernet når `false`. Dekker faktisk nettleser-nivå-navigasjon —
     lukk fane, refresh, skriv ny URL i adressefelt. Dette er standard
     nettleser-API og 100 % robust.
   - **Best-effort intern lenke-avskjæring**: en `document`-nivå
     click-listener som fanger klikk på interne `<a>`-lenker (f.eks.
     «← Tilbake» og sidebar-navigasjon i `AdminSidebar.tsx`) når
     `isDirty` er `true`. Kaller `event.preventDefault()` og viser
     `window.confirm('Du har ulagrede endringer. Vil du forlate siden
     uten å lagre?')` — naviger kun videre (via `router.push` på
     `href`-attributtet) hvis bruker bekrefter.
2. Hver av de fire formene beregner `isDirty` ved å bygge samme
   `payload`-objekt som allerede konstrueres i `handleSubmit` (ingen ny
   datastruktur), og sammenligne det via `JSON.stringify(...)` mot et
   baseline-snapshot tatt med `useRef` ved mount. Ingen endring til
   controlled/reducer-state — kun en avledet sammenligning lagt på toppen
   av eksisterende `useState`-felter.
3. Baseline-snapshotet nullstilles til gjeldende payload umiddelbart
   etter en vellykket lagring (`res.ok`), slik at brukeren ikke varsles
   for endringer som faktisk er lagret.
4. **Kjent begrensning, bevisst ikke løst**: nettleserens tilbake/frem-
   knapp (`popstate`) kan ikke reliably avbrytes i Next.js 14 App Router
   uten betydelig mer kompleksitet (samme begrensning de fleste SPA-er
   har — full løsning krever et History-API-lag utenfor denne CR-ens
   omfang). `beforeunload` + click-avskjæring dekker de vanligste
   tilfellene (tilsiktet navigasjon via lenke, fane-lukking, refresh).
5. **Ny, alltid synlig dirty-indikator, senere slått sammen med
   lagre-knappen** (bruker-tillegg 2026-08-06, iterert samme dag):
   - Første iterasjon: en frittstående `UnsavedChangesBadge`-pille
     (kun tekst + pulserende prikk), separat fra den eksisterende
     statiske "Lagre"-knappen nederst i formet.
   - Andre iterasjon, etter brukertest: bruker påpekte at de statiske
     "Lagre"-knappene så gammeldagse ut sammenlignet med den nye
     pillen, og ba om at de slås sammen. `UnsavedChangesBadge` fjernet
     og erstattet av `src/components/admin/FormSaveBar.tsx` — én
     flytende bar som inneholder BÅDE lagre-knappen (`type="submit"`)
     OG dirty-indikatoren (pulserende prikk + tekst). Erstatter den
     gamle statiske `formActions`-diven nederst i hvert form. Viser
     også feilmeldingen (`error`) inline i baren i stedet for som egen
     paragraf i formet, siden det er der brukerens attensjon er når de
     forsøker å lagre.
   - Tredje iterasjon, etter enda en brukertest: hele baren (inkl.
     lagre-knappen) skal IKKE vises når `isDirty` er `false` — knappen
     er nå borte fra skjermen helt til noe faktisk er endret, i stedet
     for å alltid være tilgjengelig som den gamle statiske knappen var.
     Bevisst avvik fra første instinkt (å bevare "re-lagre uendret
     data"-muligheten) — brukers eksplisitte krav trumfer det.
   - `position: fixed` (nedre høyre hjørne), samme resonnement som i
     første iterasjon: garanterer synlighet uansett scroll-posisjon i
     lange former (som `BenefitForm`) uten å røre `AdminShell`/
     layout-laget.
   - Pulseringen implementeres som en enkel CSS `@keyframes`-animasjon
     i `FormSaveBar.module.css` (samme per-komponent-mønster som
     `AdminShell.module.css`/`AdminSidebar.module.css`), med
     `prefers-reduced-motion`-respekt.
6. **Ikke naviger bort ved vellykket lagring** (bruker-tillegg
   2026-08-06). Alle fire former navigerte tidligere til listesiden
   (`router.push('/admin/benefits')` osv.) etter en vellykket lagring —
   bruker ba om at dette fjernes for alle sider med lagreknapp:
   - **Rediger-flyt** (`isEdit === true`): ingen navigasjon i det hele
     tatt. Kun `router.refresh()` (henter ev. fersk server-data på
     nytt, navigerer ikke bort) + `setSaving(false)` (nødvendig nå som
     komponenten ikke unmountes ved suksess — tidligere var dette
     implisitt siden navigasjonen unmountet formet). `isDirty` blir
     `false` idet baseline nullstilles, så `FormSaveBar` sin røde
     dirty-tilstand forsvinner (se punkt 7 for hva som vises i stedet).
   - **Opprett-flyt** (`isEdit === false`): naviger til den nyopprettede
     postens REDIGER-side (f.eks. `/admin/benefits/{id}` ved bruk av
     `id`-en fra `POST`-responsen), ikke til listen. Valgt over
     alternativet "bli på opprett-siden og nullstill formet" — brukeren
     ender opp i samme kontekst (redigerer denne posten), bare med en
     URL som nå har en ekte ID, i stedet for å måtte navigere til listen
     selv for å fortsette å jobbe med posten. Ingen "Lagret"-pille i
     denne grenen (se punkt 7) — komponenten unmountes av navigasjonen
     før den ville vist noe uansett.
7. **Grønn "Lagret"-pille etter vellykket lagring** (bruker-tillegg
   2026-08-06, samme dag). Da `FormSaveBar` sin røde dirty-tilstand
   bare forsvinner stille ved suksess, ba bruker om en tydeligere,
   men fortsatt lavmælt bekreftelse. Løsning: ny `saved`-prop på
   `FormSaveBar`. Hvert form holder en egen `justSaved`-boolean
   (`useState`, satt til `true` i `handleSubmit` sin rediger-suksess-
   gren, nullstilt via en liten `useEffect` som lytter på `isDirty` —
   så snart brukeren gjør en ny endring etter en lagring, forsvinner
   den grønne pillen til fordel for den røde dirty-tilstanden igjen).
   Pillen er statisk grønn (ingen pulsering — kun den røde,
   "krever-handling"-tilstanden pulserer) og har ingen knapp, siden det
   ikke er noe å lagre. Kun i rediger-flyten — opprett-flyten navigerer
   uansett bort før noe ville blitt vist (se punkt 6).

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md — ingen endring (ingen datamodell involvert)
- [ ] specs/api.yaml — uutfylt mal i hele prosjektet, ingen ny endepunkt
      her uansett (ingen API-endring i denne CR-en)
- [ ] specs/flows.md — vurderes ved implementasjon; sannsynligvis ikke
      nødvendig, samme fravalg som CR-012 (uutfylt mal i alle 12
      foregående CRs)
- [x] specs/architecture.md — Module Map oppdatert med `/lib/admin`-raden
      (2026-08-06)
- [ ] specs/nfr.md — uutfylt mal, ingen endring
- [ ] specs/ui-spec.md — uutfylt mal, ingen endring

Affected Components:
- Nytt: `src/lib/admin/useUnsavedChangesWarning.ts`
- Nytt: `src/components/admin/FormSaveBar.tsx` + `FormSaveBar.module.css`
  (erstatter den opprinnelig planlagte, frittstående
  `UnsavedChangesBadge` — se Proposed Solution punkt 5)
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — payload flyttet
  til `useMemo`, isDirty-beregning, hook-kall, gammel `formActions`-div
  fjernet og erstattet med `<FormSaveBar .../>`, `handleSubmit` sin
  suksess-gren endret fra "naviger til liste" til "bli/naviger til
  rediger-side for denne posten" (se Proposed Solution punkt 6), egen
  `justSaved`-state + `useEffect` for grønn "Lagret"-pille (punkt 7)
- `src/app/admin/(protected)/advertisers/AdvertiserForm.tsx` — samme
- `src/app/admin/(protected)/heroes/HeroForm.tsx` — samme
- `src/app/admin/(protected)/categories/CategoryForm.tsx` — samme
- Ingen endring i `LoginForm.tsx` eller `AdminShell.tsx`

Database Impact:
- Ingen. Ren klient-side tilstand, ingen persistens.

API Impact:
- Ingen nye eller endrede endepunkter.

UX Impact:
- Ny `window.confirm()`-dialog ved forsøk på å navigere bort med
  ulagrede endringer — dette er nettleserens standard, ikke-stilbare
  bekreftelsesdialog (samme som `beforeunload` sin native dialog).
  Konsistent med at appen ikke har noe eget modal/dialog-system i dag.
- Ny, alltid synlig «Ulagrede endringer»-pille med pulserende rød prikk,
  fast posisjonert (øvre høyre hjørne) mens formet har ulagrede
  endringer — forsvinner umiddelbart etter vellykket lagring.
- Ingen endring i skjemaenes øvrige visuelle utseende eller feltrekkefølge.

Security Impact:
- Ingen. Ingen ny dataflyt, ingen ny input som må valideres server-side.

Performance Impact:
- Ubetydelig. Én `document`-click-listener og én `beforeunload`-listener
  per aktiv form, fjernet ved unmount. `JSON.stringify`-sammenligning på
  et lite objekt (samme størrelse som eksisterende `payload`) kjøres kun
  ved render, ikke i en tight loop.

Required Tests:
- [x] Unit: `shouldInterceptClick` (den rene beslutningslogikken i
      `useUnsavedChangesWarning.ts`) — 5 tester, alle grønne (2026-08-06).
      Selve DOM-wiringen (`beforeunload`/`document`-click-listener) er
      IKKE enhetstestet — prosjektets vitest kjører i `node`-miljø uten
      jsdom/happy-dom, og å legge til det kun for denne ene hooken ble
      vurdert som uforholdsmessig footprint. Verifiseres manuelt i stedet.
- [ ] Manuell: for hver av de fire formene — endre et felt, klikk
      «← Tilbake», bekreft at varselet vises; bekreft at varselet IKKE
      vises uten endringer; bekreft at varselet IKKE vises etter
      vellykket lagring
- [ ] Manuell: refresh/lukk-fane med ulagrede endringer viser nettleserens
      native `beforeunload`-dialog
- [ ] Manuell: badge vises/forsvinner korrekt, forblir synlig ved scroll
      i BenefitForm (lengst av de fire formene), animasjon deaktivert med
      `prefers-reduced-motion: reduce` aktivert i nettleseren
- Ingen automatisert komponenttest (samme prosjektkonvensjon som
  `ImageUploadField.tsx` i CR-012 — ingen `@testing-library`-avhengighet,
  null `.test.tsx`-filer i prosjektet totalt)

## Acceptance Criteria
- [ ] Endring i et felt i BenefitForm/AdvertiserForm/HeroForm/CategoryForm
      og påfølgende forsøk på å navigere bort via intern lenke gir en
      bekreftelsesdialog
- [ ] Ingen dialog vises hvis formet ikke har ulagrede endringer
- [ ] Ingen dialog vises etter en vellykket lagring
- [ ] Refresh eller fane-lukking med ulagrede endringer trigger
      nettleserens native `beforeunload`-varsel
- [ ] En flytende bar med lagre-knapp + «Ulagrede endringer»-tekst med
      pulserende rød prikk vises så snart et felt endres, i alle fire
      former
- [ ] Baren (inkl. lagre-knappen) er IKKE synlig når formet ikke har
      ulagrede endringer — kun tilgjengelig etter en faktisk endring
- [ ] Baren forblir synlig uansett scroll-posisjon i lange former
      (f.eks. BenefitForm)
- [ ] Baren sin røde dirty-tilstand forsvinner umiddelbart etter
      vellykket lagring, erstattet av en grønn "Lagret"-pille (uten
      knapp) på rediger-sider
- [ ] Den grønne "Lagret"-pillen forsvinner (erstattet av den røde
      dirty-tilstanden) så snart brukeren gjør en ny endring
- [ ] Pulseringen (kun den røde dirty-tilstanden pulserer, ikke den
      grønne) respekterer `prefers-reduced-motion`
- [ ] Lagring på en REDIGER-side navigerer IKKE bort — brukeren blir på
      samme side, lagre-knappen forsvinner (isDirty → false)
- [ ] Lagring på en OPPRETT-side navigerer til rediger-siden for den
      nyopprettede posten (`/admin/{type}/{nytt-id}`), ikke til listen
- [ ] `LoginForm.tsx` er uendret

## Rollback Strategy
Additiv og isolert til én ny hook + fire small hook-kall i eksisterende
former. Ved problemer: fjern hook-kallene fra de fire formene (én linje
hver) — ingen datamigrering, ingen API-endring å reversere.

## Migration Strategy
1. Implementer og enhetstest `useUnsavedChangesWarning` isolert, uavhengig
   av formene.
2. Implementer `FormSaveBar` isolert (ren presentasjonskomponent, tar
   `label`/`saving`/`isDirty`/`error` som props — erstatter både den
   gamle statiske lagre-knappen og den opprinnelig planlagte
   frittstående dirty-pillen).
3. Koble begge inn i ett form først (`CategoryForm.tsx` — enklest,
   færrest felter) og verifiser manuelt.
4. Koble inn i de tre resterende formene (Benefit/Advertiser/Hero) —
   samme mønster, egne commits.

## Risks
- Click-avskjæring på `document`-nivå er en generell mekanisme — må
  begrenses til interne lenker (`href` som starter med `/admin`) for å
  ikke ved et uhell fange klikk på f.eks. eksterne lenker eller knapper
  som ikke er navigasjon.
- `window.confirm()` er en blokkerende, ikke-stilbar nettleserdialog —
  akseptabelt gitt at appen ikke har noe eget dialog-system i dag, men
  bør revurderes hvis et fremtidig design-system introduserer egne
  modaler.
- Nettleserens tilbake/frem-knapp er ikke dekket (se Proposed Solution
  punkt 4) — må kommuniseres klart som en kjent begrensning, ikke noe
  som ved et uhell antas løst.
- `AdminShell.module.css` sin sticky topbar (Logout-knapp) har allerede
  `z-index: 10` — `FormSaveBar` bruker `z-index: 20` og er plassert
  nede i høyre hjørne, ikke i konflikt med topbaren.
- `FormSaveBar` har `type="submit"` på knappen inni et `position: fixed`
  -element — fungerer fordi DOM-tilhørighet til `<form>` (via
  React-tre-plassering) er uavhengig av CSS-posisjonering, men er verdt
  å huske på om komponenten senere flyttes ut av `<form>`-treet (f.eks.
  via en portal) — da må submit håndteres eksplisitt i stedet.

## Dependencies
- Ingen avhengighet av andre åpne CR-er.
