# 12 Åpne spørsmål og manglende grunnlag

> Opprettet: 2026-10-12
> Formål: liste det som ikke er avklart. **Ikke besvar disse med antakelser i kode.** Der et spørsmål blokkerer arbeid: lag en CR som beskriver alternativene, velg det enkleste som kan endres senere, og merk antakelsen tydelig.

---

## 1. Modell

1. Kan én fordel vises flere steder i samme kanal (for eksempel på to sider i web)? Svaret avgjør om web-visningen kan ha én plassering eller trenger flere.
2. Skal heroer som ikke handler om en fordel (kategori, redaksjonell kampanje) finnes, og i så fall som hva?
3. Hvilke flater og formater skal appen ha, og hvilke bildeformater krever de?
4. Hvor ender TemplateOffer sine felter (navn, tekst, pris per valg)? Forslag: på koblingen fordel → produkt, som da må ha egne felter. Det er en koblingstabell og må godkjennes.
5. Pakker (tiltak 11): trengs et objekt som samler fordeler?
6. Hvor skal bekreftelsessiden høre hjemme når Endpoint fjernes?
7. Én felles definisjon av faser etter flytting (60 dager i prototypen, 180 i tiltaksdokumentet).
8. Skal fordeler i appen kunne være uten produkt (ren informasjon, ekstern lenke uten avtale)?

## 2. Identitet og samtykke

9. Gir Vipps samme brukeridentifikator i web og app med dagens avtale og klientoppsett?
10. Skal SMS-innlogging videreføres i ny løsning og i appen?
11. Hvilke opplysninger samtykker brukeren til å dele ved Vipps-innlogging?
12. Hvilket samtykke kreves for generell reklame i appen etter flytteperioden? **Juridisk vurdering.**
13. Dagens løp gjør e-postsamtykke obligatorisk og gir samtykke til deling med partnere ved innlogging. Må vurderes juridisk før det videreføres.
14. Er det tillatt å lagre en enhets-ID før innlogging for å måle app-intro og koble den til personen ved innlogging? **Juridisk vurdering.** Inntil avklart: mål bare rene tellinger før innlogging.

## 3. Arkitektur

15. Skal prototypen være forslag til ny backend som erstatter dagens FF API, eller et lag som snakker med dagens API? **Standard inntil avklart: ny backend i dette repoet, med simulerte integrasjoner.**
16. Web, app og admin: én Next.js-app med tre deler, eller separate apper? **Standard inntil avklart: én app med egne route groups for web, app og admin, og felles domenelogikk i `src/lib`.**
17. Repoet auto-deployes til Coolify ved push. Store omlegginger (for eksempel fjerning av anonyme brukere) bør gjøres på en egen gren til de er klare, slik at den publiserte demoen ikke brytes.

## 4. Grunnlag som mangler

Produkteier henter så mye av dette som mulig. Inntil det finnes, bygg mot det som står i 09 og simuler resten.

- Resten av admin-test: Ordre, Bekreftelser, IDA, IDA-eksport og publiseringsknappen.
- Beskrivelse av hvem som bruker admin og til hvilke oppgaver.
- Design-spec (design-spec-optimalisert.html), kravspesifikasjon for appen, backend-utviklingsplan og kampanjepakker som 24-tiltaksdokumentet viser til.
- Visuell profil for web, eller beslutning om at web og app deler profil.
- Overgangen fra Posten: inngangs-URL, hva som sendes med, krav fra Posten.
- Forretningsregler for postkasseskilt og leverandørfiler.
- Integrasjonsbeskrivelser: Vipps, If, IDA, kundenes leads-API-er, oppslag på person og flyttedato.
- Bakgrunnsjobber: hva de gjør og hvor ofte.
- Databaseskjema for dagens FF, for migreringsforslag.
- Regler for lagring og sletting av persondata.
- Volum og sesongtopper.
- Eventuelt eget rapporteringsforslag hvis det er noe annet enn dagens statistikkadmin.
