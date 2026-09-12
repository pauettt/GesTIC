# Pla dels tutorials

Decidit l'11 i el 12 de setembre de 2026. Aquest document existeix perquè demà
no s'hagi de tornar a discutir el que ja està decidit: recull **què es fa, en
quin ordre i per què**. Quan una peça es tanqui, marca-la i apunta la data.

---

## Decisió de fons: no es fa cap bot

La idea era substituir els tutorials per un bot que respongués a partir del
material de suport de la Conselleria. Descartat, i convé recordar per què:

1. **El corpus no encaixa.** [suportgestib.caib.es](https://suportgestib.caib.es/)
   va de matrícula, faltes, notes i tasques de tutor — gestió acadèmica. El que
   entra per gesTIC són avaries i entorn Google (mira l'enum `GoogleService` a
   `prisma/schema.prisma`) més projectors, carros i wifi. El bot s'alimentaria
   d'un material que no cobreix el gruix de les preguntes del claustre.
2. **El format no es deixa ingerir.** WordPress + PDFs + WikiGestib + YouTube +
   un Google Sites d'IBSTEAM. Cinc formats, sense API ni RSS fiable. Caldria un
   scraper d'HTML, un extractor de PDF i reindexació periòdica: funciona el dia
   que es construeix i es podreix en silenci quan ells redissenyen.
3. **Caducitat.** Si la Conselleria canvia un circuit al setembre i l'índex és
   de juny, el bot dicta amb tota la seguretat el procediment vell. Amb un
   enllaç, qui el clica veu sempre la versió vigent. **Per a procediments
   oficials, enllaçar guanya a resumir, sempre.**

A més, suportgestib porta activada la protecció de contingut: copiar-lo a un bot
propi obre una conversa amb la Conselleria que no cal tenir.

**Què el faria viable més endavant**: un bot que s'apoiï en els *nostres*
articles i dubtes — que per llavors ja portaran els enllaços oficials a dins —
i que respongui el "aquí ho fem així" i passi l'enllaç oficial. Fase 3, com a
mínim, i només amb la biblioteca ja escrita.

---

## Com queda el repartiment de l'ajuda

| On | Què hi va |
|---|---|
| **Tutorials** | Com ho fem **aquí**: quin carro, quina aula, qui té la clau, la wifi. Això no ho escriu ningú més. |
| **Enllaç dins el tutorial** | El procediment **oficial** (GestIB, ADI, certificats). Sempre vigent perquè no el copiem. |
| **Consultes** | Quan no hi ha resposta escrita. Ja existeix i el botó ja hi és a `src/app/(app)/dubtes/page.tsx`. |

Queda obert si val la pena **fusionar Dubtes freqüents i Tutorials** en una sola
secció amb cercador. Avui són dues entrades de menú de dotze i el professorat no
sap quina obrir. No bloqueja res: decidir-ho quan hi hagi contingut de debò.

---

## 1. Les cinc categories

No són inventades: surten dels enums de `prisma/schema.prisma` (línies 300-322).

| Categoria | Què hi recull |
|---|---|
| **Chromebooks i carros** | `PANTALLA`, `TECLAT`, `TOUCHPAD`, `NO_S_ENCEN` + com reservar |
| **Entorn Google** | els 9 valors de `GoogleService`: Classroom, compte, Gmail, Drive, Meet, Calendar, YouTube, Chrome |
| **Aula: projector, wifi i cables** | `WIFI_INTERNET` i tot el material físic de l'aula |
| **GestIB i tràmits** | gairebé tot enllaç a la Conselleria |
| **Com funciona gesTIC** | la pròpia app: reservar, reportar, demanar claus (avui "Primers passos") |

**Regla per no acabar amb quinze categories**: si una cosa no encaixa en cap de
les cinc, no és un tutorial — és una consulta.

Que les categories calquin els enums no és estètica: és el que permetrà la
fase 2 (deflexió des de "Nova incidència").

---

## 2. Format d'article

Quatre blocs i res més:

1. **Què passa** — una línia, amb les paraules que faria servir el professorat
2. **Prova això** — 3 passos com a màxim
3. **Si no funciona** — "obre una incidència" / "fes una consulta"
4. **Enllaç oficial** — si n'hi ha

**Regla dura: ha de cabre en una pantalla de mòbil sense fer scroll.** Si no hi
cap, no és un tutorial: és una formació, i per a això ja hi ha `/formacio`.

---

## 3. Feina a fer, per ordre

- [ ] **`sourceUrl` a `TutorialArticle`** — camp opcional. Toca
      `prisma/schema.prisma` (model a la línia 485), l'esquema Zod de
      `src/lib/validations/tutorials.ts`, el diàleg
      `src/components/tutorials/article-dialog.tsx` i la fitxa
      `src/app/(app)/tutorials/[slug]/page.tsx`. Cal migració.
- [ ] **Crear les cinc categories** i reordenar-les. Es pot fer des de la
      interfície mateixa amb el `CategoryManagerDialog` que ja hi ha.
- [ ] **`scripts/import-tutorials.ts`** — upsert per slug, idempotent.
      S'executa **un sol cop** amb tot el contingut dictat. No és un seed: el
      seed és per a dades d'exemple de desenvolupament.
- [ ] **Dictar i carregar els primers articles** (vegeu el punt 4).
- [ ] **Decidir la fusió Dubtes + Tutorials** amb cercador, reaprofitant el
      patró de `src/components/inventory/inventory-search.tsx`.

**A partir de la importació, la base de dades mana.** Les edicions es fan des de
l'app amb el diàleg que ja existeix: corregir una errata no ha de dependre de
ningú.

Avís que ja consta a `PENDENTS.md` (punt 4): esborrar una `TutorialCategory`
esborra els seus articles en cascada sense dir quants se'n perdran. Compte en
reorganitzar categories un cop hi hagi contingut.

---

## 4. Contingut: com omplir-ho

**Sis articles per començar, no trenta.** Els que es repeteixen cada setembre,
que ja se saben de memòria. La resta que els dicti la realitat: amb l'app en
producció, la llista d'incidències dirà tota sola quins falten.

**Mètode**: dictar els problemes tal com surtin, desordenats, en català o
castellà. Es transformen després a l'esquelet del punt 2, en català, i es
carreguen tots de cop amb el script.

---

## 5. Fase 2 — deflexió des de "Nova incidència"

Quan el professorat marca "Classroom" o "no s'encén" al formulari, mostrar-li el
tutorial d'aquella categoria **abans** d'enviar: *"Prova això primer."*

Cada incidència que es resol sola aquí és una que no arriba a la coordinació.
És el retorn real de tenir la biblioteca escrita, i la raó de muntar les
categories calcades dels enums des del primer dia.

---

## 6. Fonts oficials (Illes Balears)

El centre és del domini `iesjmthomas.eu`, així que la referència és Balears:

- [suportgestib.caib.es](https://suportgestib.caib.es/) — base de coneixement
  pública de GestIB: articles, tasques per funció, WikiGestib, canal de YouTube
  i força PDF. És d'aquí que sortiran la majoria d'enllaços.
- [ibsteam.caib.es](https://ibsteam.caib.es/) — gairebé res d'autoservei:
  formació, PDEB i orientacions. Per a suport donen telèfon (871 00 26 10) i
  correu (ibsteam@ibsteam.cat).
