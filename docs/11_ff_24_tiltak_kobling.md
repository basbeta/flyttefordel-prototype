# 11 De 24 tiltakene koblet mot målbildet

> Opprettet: 2026-10-12
> Kilde: "Flyttefordel: 24 tiltak i dybden" (eget dokument, ikke i repoet) og målbildet i 10.
> Formål: vise hva modellen må støtte for at tiltakene skal være mulige, og hvor tiltakene ikke stemmer med retningen. Brukes når tiltak skal prioriteres og bygges.

---

## 1. Tiltakene kort

| # | Tiltak | Effekt | Innsats | Risiko |
|---|---|---|---|---|
| 1 | Bekreftelsesside som fortsettelse, ikke "lukk fanen" | 5 | 2 | L |
| 2 | Drip-e-post etter bestilling | 5 | 2 | L |
| 3 | Sosiale bevis på kort | 4 | 1 | L |
| 4 | Tydelig progresjon | 4 | 1 | L |
| 5 | "Mest valgt" per kategori | 4 | 1 | L |
| 6 | If tidligere i løpet | 5 | 2 | L |
| 7 | Segmentering på boligtype | 4 | 2 | L |
| 8 | Handlekurv-indikator | 3 | 2 | L |
| 9 | Segmentert kryssalg i e-post | 4 | 2 | L |
| 10 | A/B: scroll mot paginert | 5 | 3 | M |
| 11 | Ferdigpakker | 5 | 3 | M |
| 12 | Tidsbegrensning etter registrering | 4 | 2 | M |
| 13 | Posten.no til FF | 5 | 3 | M |
| 14 | Min side | 4 | 3 | L |
| 15 | Direkte bestilling for høyverdi | 4 | 3 | M |
| 16 | Prisanker på If | 4 | 2 | L |
| 17 | E-post ved ny annonsør i kategori | 3 | 2 | L |
| 18 | Konkrete kulepunkter på kort | 3 | 1 | L |
| 19 | Deling på bekreftelsessiden | 3 | 2 | L |
| 20 | Mobilapp | 5 | 5 | M |
| 21 | "Fast fordel" etter dag 180 | 5 | 4 | M |
| 22 | CPA-prising | 4 | 3 | M |
| 23 | Ukentlig nyhetsbrev | 3 | 2 | L |
| 24 | Chatbot | 3 | 4 | M |

## 2. Hvilken del av modellen tiltakene avhenger av

| Del av modellen | Tiltak |
|---|---|
| Hendelsesstrøm | 3, 5, 9, 17, 19, 22 |
| Utvelgelse | 7, 9, 12, 17, 23 |
| A/B-lag | 10, 16, i praksis 6 |
| E-postkanal | 2, 9, 17, 23 |
| Innløsning | 15, 22 |
| Inntektsmodell på fordel | 21, 22 |
| Visninger og kanaler | 1, 20, 21 |
| Ren frontend | 4, 8, 18 |

**Hendelsesstrømmen og utvelgelsen bærer over halvparten av tiltakene.** De bør bygges først.

## 3. Hva tiltakene tilfører modellen

- **Boligtype** (7) er ny personopplysning for utvelgelsen. Dagens husholdningssegmentering kan være et tidlig forsøk på det samme. Boligtype spørres eksplisitt, Vipps gir den ikke.
- **Regler basert på tidligere valg** (9, 17) bygger på hendelsesstrømmen. Ikke nytt objekt.
- **Tidsakse** (12, 21): én felles definisjon av faser fra flyttedato. Se 10, seksjon 3.4.
- **Tellinger** (3, 5) regnes per fordel fra hendelser og eksponeres i visningsmodellen. Regel fra tiltakene: under 100 valg skjules tallet, ellers eksakt tall. "Mest valgt" settes automatisk, aldri redaksjonelt.
- **Strukturelle tester** (10) har effekt 5 og må planlegges inn i A/B-laget fra start.
- **Kulepunkter** (18): maks 3, under 8 ord hver, som felt på visningen.

## 4. Der tiltakene ikke stemmer med retningen

- **20 Mobilapp** er beskrevet som React Native med push. Beslutningen er webapp, push utenfor scope nå.
- **14 Min side** og appen dekker samme behov. Med innloggingskrav i appen er Min side appen.
- **1 Bekreftelsesside** er overgangen til appen ("Last ned appen her").
- **11 Pakker** krever trolig et objekt som samler flere fordeler. Det er i spenning med regelen om ingen nye mellomlag. Skal vurderes eksplisitt og avklares før bygging.
- **6 og 16 If** er spesialtilfelle med eget pris-API. Kan trenge eget spor.
- **13 Posten.no** og **24 Chatbot** ligger utenfor det modellen påvirker nå.

## 5. Påstander overfor brukeren

Tiltak 5 og 12 gir påstander ("mest valgt", "gyldig i 7 dager"). De må være sanne og håndheves av systemet, ikke settes manuelt.
