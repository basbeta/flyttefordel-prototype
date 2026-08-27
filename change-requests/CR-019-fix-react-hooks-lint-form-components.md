# CR-019: Fiks react-hooks-lint-feil i admin-skjemakomponentene

Status: Approved
Created: 2026-08-18
Approved: 2026-08-18

## Business Goal
Rette reelle React-korrekthetsbrudd (ikke bare stil-nits) i de fire
admin-skjemakomponentene, avdekket av strengere React Hooks-lintregler
som CR-018 (Next.js 16-oppgraderingen) sin nye `eslint-config-next`
aktiverte. Målet er et rent `npm run lint` og kode som følger Reacts
render-purity-kontrakt, slik at komponentene er trygge under fremtidige
React-versjoner/concurrent rendering.

## Problem Statement
`npm run lint` (kjørt i CR-018 sin oppgraderingsbranch, `eslint .` via
`eslint-config-next@16.3.1`) rapporterer 8 feil fordelt likt på 4
identiske forekomster av samme copy-paste-mønster
(bekreftet byte-identisk mellom filene og med masterversjonen via `diff`,
2026-08-18):

- `src/app/admin/(protected)/advertisers/AdvertiserForm.tsx`
- `src/app/admin/(protected)/benefits/BenefitForm.tsx`
- `src/app/admin/(protected)/categories/CategoryForm.tsx`
- `src/app/admin/(protected)/heroes/HeroForm.tsx`

Alle fire har nøyaktig dette mønsteret (del av CR-013 sin
unsaved-changes-warning/FormSaveBar-funksjon):

```ts
const baselineRef = useRef(JSON.stringify(payload))
const isDirty = JSON.stringify(payload) !== baselineRef.current   // react-hooks/refs
useUnsavedChangesWarning(isDirty)

const [justSaved, setJustSaved] = useState(false)
useEffect(() => {
  if (isDirty) setJustSaved(false)                                // react-hooks/set-state-in-effect
}, [isDirty])

// ... etter vellykket lagring:
baselineRef.current = JSON.stringify(payload)
```

To distinkte regelbrudd, ett hver, i alle fire filer:
- **`react-hooks/refs`** — `baselineRef.current` leses under selve
  render-funksjonen. Å lese en ref sin `.current` under render er ikke
  garantert trygt i React (bryter render-purity-kontrakten — en ref kan
  muteres uten å trigge re-render, noe som kan gi inkonsistent visning
  under concurrent rendering/StrictMode double-invoke, selv om det i
  praksis ofte "virker" i dagens synkrone rendering).
- **`react-hooks/set-state-in-effect`** — `setJustSaved(false)` kalles
  synkront inne i en `useEffect`, noe som kan trigge en kaskaderende
  ekstra re-render.

Ikke introdusert av CR-018 — mønsteret er identisk på master (bekreftet
via `diff` mot `AdvertiserForm.tsx` uendret siden CR-013/CR-004). Det ble
bare ikke fanget før fordi den gamle `next lint`/`eslint-config-next@14.2.3`
ikke hadde disse React Hooks-reglene aktivert.

## Proposed Solution
Restrukturer dirty-/lagret-sporingen i alle fire filer til å unngå både
ref-lesing under render og synkron `setState` i en effect. Anbefalt
retning (samme fiks i alle fire, siden mønsteret er identisk):

1. Erstatt `baselineRef` (mutert `ref.current`) med en `useState`-holdt
   baseline-snapshot (`const [baseline, setBaseline] = useState(() =>
   JSON.stringify(payload))`). `isDirty` beregnes da som
   `JSON.stringify(payload) !== baseline` — sammenligning mot `state`,
   ikke en `ref`, er trygt å lese under render. Etter vellykket lagring:
   `setBaseline(JSON.stringify(payload))` i stedet for
   `baselineRef.current = ...`.
2. Fjern det separate `justSaved`-state + `useEffect`-paret helt: avled
   "Lagret"-indikatoren direkte av om gjeldende payload fortsatt matcher
   snapshotet tatt ved siste lagring (f.eks. en `savedSnapshot`-state satt
   ved lagring, og `const showSavedBadge = savedSnapshot !== null &&
   savedSnapshot === JSON.stringify(payload)`) — badgen forsvinner da
   naturlig ved neste redigering uten noen effect.
3. Vurder (valgfritt, ikke påkrevd) å trekke dette ut i en delt hook
   (f.eks. `useDirtyTracking(payload)`) siden mønsteret er
   ordrett duplisert 4 ganger — reduserer risikoen for at én av de fire
   filene fikses annerledes enn de andre. Ikke et krav for denne CR-en;
   fire identiske inline-fikser er også en akseptabel løsning.
4. Etter fiks: `npm run lint` skal vise 0 feil for disse 4 filene (de 3
   urelaterte advarslene — `@next/next/no-img-element` x2,
   ubrukt eslint-disable i `src/lib/db/client.ts` — er utenfor scope for
   denne CR-en).
5. Manuell verifisering i nettleser av alle fire skjemaer (advertiser,
   benefit, category, hero): "ulagrede endringer"-varsel fungerer som
   før, "Lagret"-badge dukker opp etter lagring og forsvinner ved neste
   redigering — ingen synlig atferdsendring for admin-bruker.

## Impact Analysis

Affected Specs:
- [ ] specs/architecture.md, specs/api.yaml, specs/entities.md,
      specs/nfr.md, specs/ui-spec.md, specs/flows.md — sjekkes, forventes
      ingen endring (intern implementasjonsdetalj i eksisterende
      FormSaveBar-atferd fra CR-013, ingen ny funksjonalitet eller
      kontraktsendring)

Affected Components:
- `src/app/admin/(protected)/advertisers/AdvertiserForm.tsx`
- `src/app/admin/(protected)/benefits/BenefitForm.tsx`
- `src/app/admin/(protected)/categories/CategoryForm.tsx`
- `src/app/admin/(protected)/heroes/HeroForm.tsx`
- Eventuelt en ny delt hook under `src/lib/admin/` hvis punkt 3 i
  Proposed Solution velges

Database Impact:
- Ingen.

API Impact:
- Ingen.

UX Impact:
- Ingen tiltenkt — "ulagrede endringer"-varsel og "Lagret"-badge skal
  oppføre seg identisk for admin-brukeren. Hovedrisikoen i denne CR-en er
  nettopp at restruktureringen utilsiktet endrer timingen på disse
  indikatorene — dekkes av eksplisitt manuell verifisering (se Required
  Tests), siden ingen automatisert komponenttest-infrastruktur finnes i
  dette repoet i dag (kun API route-enhetstester via vitest, ingen
  jsdom/@testing-library-oppsett).

Security Impact:
- Ingen.

Performance Impact:
- Marginalt positivt — én færre `useEffect`-kjøring per redigering per
  skjema, ingen negativ effekt.

Required Tests:
- [ ] `npm run lint` viser 0 feil for de 4 berørte filene
- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run build` — ingen
      regresjon (eksisterende suite har ingen dekning av disse
      komponentene, så dette bekrefter kun at ingenting annet brekker)
- [ ] Manuell (i nettleser): for alle fire skjemaer — rediger et felt →
      "ulagrede endringer"-varsel vises; lagre → varsel forsvinner,
      "Lagret"-badge vises; rediger igjen → badge forsvinner igjen

## Acceptance Criteria
- [ ] Alle 8 `react-hooks/refs`/`react-hooks/set-state-in-effect`-feil
      borte fra `npm run lint`
- [ ] Ingen ny lint-feil introdusert
- [ ] `npx tsc --noEmit`, `npx vitest run`, `npm run build` — alle grønne
- [ ] Manuell verifisering av dirty-/lagret-indikator i alle fire skjemaer
      bekreftet uendret atferd

## Rollback Strategy
Ren kodeendring i 4 (eventuelt 5, hvis delt hook) filer, ingen
datamigrering. Ved problemer: revert commit.

## Migration Strategy
1. Fiks ett skjema først (f.eks. `CategoryForm.tsx`, minst kompleks),
   verifiser manuelt at dirty-/lagret-atferd er uendret.
2. Anvend samme fiks på de tre gjenværende skjemaene.
3. Full lokal validering (lint/tsc/vitest/build).
4. Commit med referanse til CR-019.

## Risks
- Restrukturering av dirty-tracking-logikken kan utilsiktet endre
  edge-case-timing (f.eks. hva som skjer hvis lagring feiler midt i en
  rask serie redigeringer) — mitigert av at fiksen er isolert til 4
  frittstående klientkomponenter og eksplisitt manuell verifisering er
  påkrevd før denne CR-en kan lukkes.
- Ingen automatisert testdekning finnes for denne UX-atferden i dag —
  regresjoner som ikke dekkes av den manuelle sjekklisten over kan i
  prinsippet slippe gjennom, samme kjente begrensning som CR-013 hadde
  ved sin opprinnelige implementering.

## Dependencies
- Ingen avhengighet av andre åpne CR-er. Oppdaget under og følger opp
  CR-018 (Next.js 16-oppgraderingen), men er en uavhengig, separat fiks
  som kan gjøres når som helst etter CR-018.
