# CR-013: Varsel om ulagrede endringer i admin-former

Status: Draft
Created: 2026-08-06

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
5. **Ny, alltid synlig dirty-indikator** (bruker-tillegg 2026-08-06): en
   liten komponent `src/components/admin/UnsavedChangesBadge.tsx` — en
   pille med en pulserende rød prikk + teksten «Ulagrede endringer».
   Rendres av hvert form når `isDirty` er `true`, `position: fixed`
   (f.eks. øvre høyre hjørne, under den eksisterende sticky topbaren i
   `AdminShell.module.css`). `position: fixed` er valgt fremfor å
   integrere i `AdminShell` sin topbar via React Context — topbaren
   ligger i layout-laget og har i dag ingen kjennskap til et gitt form
   sin `isDirty`-tilstand, og å koble dem sammen ville krevd en
   context-provider som spenner over layout + form. `position: fixed`
   garanterer synlighet uansett scroll-posisjon i lange former (som
   `BenefitForm`) uten å røre `AdminShell`/layout-laget i det hele tatt.
   Pulseringen implementeres som en enkel CSS `@keyframes`-animasjon i
   en egen `UnsavedChangesBadge.module.css` (samme per-komponent-mønster
   som `AdminShell.module.css`/`AdminSidebar.module.css`), med
   `prefers-reduced-motion`-respekt (ingen animasjon for brukere som har
   bedt om redusert bevegelse).

## Impact Analysis

Affected Specs:
- [ ] specs/entities.md — ingen endring (ingen datamodell involvert)
- [ ] specs/api.yaml — uutfylt mal i hele prosjektet, ingen ny endepunkt
      her uansett (ingen API-endring i denne CR-en)
- [ ] specs/flows.md — vurderes ved implementasjon; sannsynligvis ikke
      nødvendig, samme fravalg som CR-012 (uutfylt mal i alle 12
      foregående CRs)
- [ ] specs/architecture.md — ny `src/lib/admin/useUnsavedChangesWarning.ts`
      bør nevnes i Module Map ved implementasjon
- [ ] specs/nfr.md — uutfylt mal, ingen endring
- [ ] specs/ui-spec.md — uutfylt mal, ingen endring

Affected Components:
- Nytt: `src/lib/admin/useUnsavedChangesWarning.ts`
- Nytt: `src/components/admin/UnsavedChangesBadge.tsx` +
  `UnsavedChangesBadge.module.css`
- `src/app/admin/(protected)/benefits/BenefitForm.tsx` — isDirty-beregning
  + hook-kall + `<UnsavedChangesBadge isDirty={isDirty} />`
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
- [ ] Unit: `useUnsavedChangesWarning` — registrerer/fjerner
      `beforeunload` korrekt basert på `isDirty`; click-listener kaller
      `preventDefault` + `confirm` kun når `isDirty` er `true` og lenken
      er intern
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
- [ ] En alltid synlig «Ulagrede endringer»-pille med pulserende rød
      prikk vises så snart et felt endres, i alle fire former
- [ ] Pillen forblir synlig uansett scroll-posisjon i lange former
      (f.eks. BenefitForm)
- [ ] Pillen forsvinner umiddelbart etter vellykket lagring
- [ ] Pulseringen respekterer `prefers-reduced-motion`
- [ ] `LoginForm.tsx` er uendret

## Rollback Strategy
Additiv og isolert til én ny hook + fire small hook-kall i eksisterende
former. Ved problemer: fjern hook-kallene fra de fire formene (én linje
hver) — ingen datamigrering, ingen API-endring å reversere.

## Migration Strategy
1. Implementer og enhetstest `useUnsavedChangesWarning` isolert, uavhengig
   av formene.
2. Implementer `UnsavedChangesBadge` isolert (ren presentasjonskomponent,
   tar kun `isDirty` som prop).
3. Koble begge inn i ett form først (foreslår `CategoryForm.tsx` —
   enklest, færrest felter) og verifiser manuelt.
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
  `z-index: 10` — `UnsavedChangesBadge` sin `position: fixed`-plassering
  må velge en posisjon/z-index som ikke visuelt kolliderer med topbaren
  eller logout-knappen (f.eks. plasseres under topbaren, ikke over den).

## Dependencies
- Ingen avhengighet av andre åpne CR-er.
