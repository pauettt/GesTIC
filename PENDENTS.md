# Pendents de gesTIC

**Aquesta és l'única llista de pendents.** El que va sortint i **no** es resol
sobre la marxa s'apunta aquí; quan una cosa es tanca, passa a "Fet" amb la data.
Els plans llargs poden tenir document propi, però el que queda per fer surt
també aquí.

Última revisió completa: **2026-09-12**, amb una auditoria de tot el codi —
esquema contra la base de dades, totes les accions, rutes i pàgines— després de
diversos dies de feina en sessions paral·leles. El 2026-09-13 es va tancar tot
el que en quedava obert i era codi.

---

## 🎯 Per on seguir

Queden sis coses:

1. **Importar els carros i els Chromebooks**: tot d'un cop amb *Carros →
   Importa*, o carro a carro des de la pàgina de cada carro (*Importa des d'un
   full*), amb el full exportat en CSV. Les aules es creen soles amb el número i
   el nom, i els equips sense carro van a *Préstec a l'alumnat*. Després, cada
   carro ha de portar la seva *Ubicació habitual* (*Edita*), i la seva aula,
   l'edifici i la planta: és el que el cercador ensenya al professorat per triar
   el que li queda a prop. El 2026-09-21 la majoria dels carros de producció
   encara sortien «Sense ubicació fixa».
2. **Omplir els Dubtes freqüents i els Tutorials**, que després del buidat del
   2026-09-15 són buits. Els tutorials són vídeos de YouTube per categories
   (§24): n'hi ha prou d'enganxar-ne l'enllaç.
3. **Posar les IP a l'inventari**, a partir del full de control: a la fitxa de
   cada equip (*Edita → Adreça IP* i *Nom a la xarxa*). La secció *Xarxa* en
   surt sola. Queda per aclarir què vol dir la columna «connexió» del full
   (cable o wifi? la presa?) i si cal a l'aplicació.
4. **Guardar `VAULT_ENCRYPTION_KEY` fora de l'ordinador i del servidor** (§27).
   Ara les úniques còpies són a Vercel i al `.env` local. Un cop guardada, al
   `.env` local se n'hi posa una de pròpia (`openssl rand -base64 32`): les dades
   de `gestic_dev` són inventades.
5. **Treure les dades d'exemple de producció** (§29), amb una còpia abans,
   quan s'acabi de provar i abans del cartell.
6. **Penjar el cartell a la sala de professors** un cop desplegat:
   *Administració → Obre el cartell*. Abans, afegir gesTIC a la pantalla d'inici
   en un Android i en un iPhone i entrar-hi des de la icona. A l'iPhone,
   l'aplicació instal·lada no comparteix la sessió amb Safari: s'hi entra un cop
   més.

En local es treballa amb la base de dades `gestic_dev` i el dev login (vegeu el
README). Producció només la fa servir Vercel.

La resta d'aquesta llista són **decisions preses**: riscos coneguts que s'han
decidit assumir o ajornar, amb el motiu i el moment de tornar-hi.

Abans de pujar qualsevol canvi: `npm test` i `npm run test:e2e` (vegeu el
README).

---

## 🚀 Llista de desplegament

| | Què | Local | Vercel |
|---|---|---|---|
| ✅ | `GOOGLE_WORKSPACE_DOMAIN` | ✅ | ✅ `iesjmthomas.eu` (Production i Preview) |
| ✅ | `APP_URL` | absent, a propòsit | ✅ `https://ges-tic.vercel.app` |
| ✅ | `CRON_SECRET` | ✅ | ✅ |
| ✅ | `ADMIN_EMAILS` | ✅ | ✅ |
| ✅ | `BLOB_READ_WRITE_TOKEN` | ✅ | ✅ |
| ✅ | `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | ✅ | ✅ |
| ✅ | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` | ✅ `gestic_dev` | ✅ Supabase |
| ☐ | `VAULT_ENCRYPTION_KEY`, guardada també fora del servidor (§27) | encara la real: vegeu «Per on seguir» | ✅ (Secret) |
| ✅ | Migracions en desplegar (`scripts/vercel-build.sh`, només a producció) | — | ✅ |
| ✅ | Login de Google (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) | en local, també el dev login | ✅ provat de principi a fi; la pantalla ja diu "gesTIC" |
| ☐ | **NO** posar `ENABLE_DEV_LOGIN` a Vercel | — | — |
| ☐ | Superadmin extern a `ADMIN_EMAILS` (§31): pantalla de consentiment d'OAuth **External** i **In production**, i *Redeploy* després de canviar la variable | ✅ `pauettt@gmail.com` | per comprovar |

Tot comprovat el 2026-09-13. Dos avisos per al primer desplegament d'aquests
canvis:
- El login ara exigeix que el compte sigui del Workspace del centre (el camp
  `hd` de Google). Els comptes `@iesjmthomas.eu` el porten, però val la pena
  tornar a entrar-hi un cop desplegat.
- S'aplicarà la migració `20260913120000_administracio`: una columna i una
  taula noves, res que esborri ni canviï dades. Després, *Administració →
  Configuració del servidor* ha de sortir tota en verd, i el botó de correu de
  prova confirma que els avisos surten.

---

## 🧹 Per fer

### 29. Dades d'exemple a producció, per treure
El 2026-09-17 s'hi van posar dades d'exemple perquè el claustre pugui provar
l'aplicació plena —préstecs, reserves, incidències, claus i cites— en comptes de
trobar-se-la buida. Les crea `scripts/demo-data.ts`.

**S'han de treure abans que l'aplicació sigui la de debò**, amb:

```
DEMO_DATABASE_URL="<DIRECT_URL>" npm run db:demo -- --treu
```

Es reconeixen perquè les persones inventades porten adreça `@local.test` (i tot
el que en penja cau amb elles) i la resta porta `DEMO-` al número de sèrie o de
clau. No toca les aules, els carros, els Chromebooks ni les categories, que són
de debò: les dades d'exemple només s'hi pengen.

**El que sí que quedarà** és el que el professorat hagi fet provant amb el seu
compte real: aquelles reserves, incidències i consultes no les treu l'script, i
s'han de repassar a mà. Val la pena fer una còpia (`npm run db:backup`) abans de
la neteja.

### 32. Vuit proves e2e en vermell
Comprovat el 2026-09-26: fallen igual al commit `47b12eb`, abans de l'auditoria
de Gemini, i per tant venen dels canvis del 23 al 25 de setembre als carros i
a les claus. Les proves no s'han posat al dia, i també pot ser que alguna
d'aquelles pantalles s'hagi trencat de debò. Algunes busquen el títol «Carro E2E»,
que ara porta l'aula al darrere (`259dcc5`). D'altres troben carros creats per
proves anteriors. La de claus espera «Totes les claus són al taulell.»
després de tornar-ne una. Fallen:
`inventari` (carros per edifici), `ordre-carros`, les tres d'`ordre-chromebooks`,
`reserves-i-claus` (entrega de la clau), `visibilitat-carros` i
`vista-llistat-carros`. Mentre el conjunt sigui vermell, un error nou no es
notaria: cal arreglar-ho abans del proper canvi gran.

---

## 📌 Decisions preses

No són feina pendent: el que s'ha decidit assumir o ajornar, i quan cal tornar-hi.

### 6. Sense CSP
Deixada fora conscientment: a Next.js necessita nonces via `proxy.ts` i una CSP
mal posada trenca els estils inline de Base UI. La resta de capçaleres
(X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) ja hi són.

### 8. Les fotos són públiques per a qui tingui l'enllaç
El blob store és **Public** perquè el codi puja amb `access: "public"` i les
URL desades es mostren directament amb `<Image>` i `<a href>` a inventari,
Chromebooks i incidències. Les adreces són llargues i aleatòries i no
s'indexen, però qui rebi l'enllaç l'obre sense passar per gesTIC. Assumit el
2026-09-11 per a fotos de material espatllat. **A revisar el dia que s'hi
pugin captures de Classroom amb noms d'alumnes**: llavors tocaria passar a
blobs privats i firmar les URL a cada pàgina, que no és un canvi petit.

### 12. Producció i local, cada una amb la seva base de dades
Fins al 2026-09-15, el `.env` local i Vercel apuntaven al mateix projecte de
Supabase i tot el que es provava en local anava a parar a les dades reals. **Ja
no**: en local es treballa amb `gestic_dev` i el projecte de Supabase només el fa
servir Vercel. Les dues regles que hi havia mentre la compartien —no executar
`npm run db:migrate` ni `npm run db:seed`— ja no calen: contra `gestic_dev` es
fan servir amb normalitat.

**El que continua obert són les còpies de seguretat.** El pla gratuït de Supabase
no en fa de diàries, i des del 2026-09-15 les dades de producció són reals:
incidències, préstecs i noms de menors. Mentre no es passi al Pro, la còpia es fa
a mà des de l'ordinador de la coordinació:

```
BACKUP_DATABASE_URL="<DIRECT_URL de Vercel>" npm run db:backup
```

Deixa un JSON datat sense sessions ni testimonis. A l'ordinador de la coordinació
va a parar al Synology Drive (`BACKUP_DIR` al `.env`), que el sincronitza amb el
NAS, i una tasca de `launchd` la fa cada dilluns a les 9 (vegeu el README). Si el
Mac està apagat, s'executa a l'arrencada següent: arriba tard, però no es perd.
Val la pena fer-la a mà, a més, abans de cada canvi gros.

**Depèn que el Mac s'engegui.** Si algun dia ha de ser independent, toca fer-ho
al NAS (Task Scheduler del DSM), que no s'apaga. L'altra opció, un cron a Vercel
cap a un Blob privat, es va descartar: ja hi ha 2 crons i el pla gratuït s'hi
queda, i la còpia viuria al mateix proveïdor que l'aplicació.

**A revisar**: si algun dia es passa al Pro (25 $/mes), que sigui per les còpies
diàries de les dades reals, no pas per tenir una base de dades de proves.

### 22. Els préstecs de Chromebooks a l'alumnat es guarden amb el nom, sense caducitat
Decidit el 2026-09-14: cada equip del pool ha de poder dir quins alumnes l'han
tingut curs rere curs, i per això les sol·licituds —amb el nom i el grup de
l'alumne— no es buiden automàticament. Des del 2026-09-23, la coordinació pot
eliminar-ne una explícitament, amb confirmació, per corregir errors o treure
dades de prova; queda al registre d'activitat sense dades de l'alumne.
Substitueix la decisió del 2026-09-12 de buidar-les
en acabar el curs: el botó «Buida-les», l'avís del panell i la línia
d'*Administració* s'han tret. Són dades de menors: només les veuen el tutor/a que
fa la sol·licitud i la coordinació TIC, i *Administració → Dades personals* diu
quantes n'hi ha i per què es guarden. **Convé que el centre ho tingui decidit
per escrit.**

### 24. Tutorials: només vídeos de YouTube
Decidit el 2026-09-15. Substitueix el pla d'articles curts amb enllaç oficial
del 2026-09-12 (l'antic PLA-TUTORIALS.md): els tutorials són vídeos de YouTube
agrupats per categories, i la coordinació n'enganxa l'enllaç. De cada vídeo només
es guarda l'identificador, i el títol s'agafa de YouTube en afegir-lo.
- Es miren dins de gesTIC, amb el reproductor sense cookies de YouTube, que no es
  carrega fins que algú prem play. Les miniatures passen pel nostre domini.
- Un vídeo privat o esborrat no es pot afegir. Si el propietari en desactiva la
  inserció, el reproductor ho diu i queda l'enllaç «Obre a YouTube».
- Continua descartat el bot d'IA que respongués a partir del material de la
  Conselleria: aquell material va de gestió acadèmica i no de les avaries i
  l'entorn Google que arriben per gesTIC, no es deixa indexar, i resumir un
  procediment oficial el deixa caducar.
- Els Dubtes freqüents continuen sent text, i ja no es fusionen amb els
  tutorials: són formats diferents.

### 27. Contrasenyes a gesTIC, xifrades al servidor
Decidit el 2026-09-15, en lloc del full de Google on eren. Un gestor de
contrasenyes dedicat (Bitwarden, 1Password) és més segur, perquè xifra al
dispositiu i ni el seu servidor les pot llegir. Aquí la clau és al servidor: qui
aconseguís alhora Vercel i la base de dades, o el compte de Google d'algú de la
coordinació, les podria veure. S'accepta perquè és molt millor que el full i
perquè cada consulta queda apuntada. Condicions:
- Els comptes de coordinació han de tenir la verificació en dos passos.
- `VAULT_ENCRYPTION_KEY` s'ha de guardar també fora del servidor. Si es perd, les
  contrasenyes no es poden recuperar; si es canvia, les desades deixen de
  poder-se llegir.
- Les còpies de la base de dades només porten text xifrat, i les proves e2e fan
  servir una clau pròpia, mai la real.

### 28. L'alumnat es tanca des de la consola de Google, no des de gesTIC
Detectat i decidit el 2026-09-15. L'alumnat i el professorat comparteixen el
domini `iesjmthomas.eu`, i gesTIC només comprova que el compte sigui d'aquest
domini i del Workspace (`src/lib/google-sign-in.ts`): el primer cop que algú hi
entra, Auth.js en crea l'usuari com a `PROFESSOR`. Google no diu a l'aplicació
de quina unitat organitzativa és el compte, així que posar gesTIC en un
subdomini del centre tampoc no ho arreglaria.

El tall es fa a la consola d'administració (*Seguretat → Control d'accés i de
dades → Controls de l'API → Gestiona l'accés d'aplicacions de tercers*): gesTIC
(ID de client `905922810748-beohq0ebf7mgahs1pf91qnnevsth96u7.apps.googleusercontent.com`)
hi és **Bloquejada** per a les unitats *Alumnat*, *Families*, *professorat
màster*, *Professors conservatori* i *paperera*. Provat el mateix dia: els
comptes d'aquestes unitats ja no hi entren.

Riscos assumits:
- Un alumne que no sigui dins d'*Alumnat* (una matrícula nova encara penjada de
  l'arrel, per exemple) hi entraria com a professor. Si mai es crea una unitat
  d'alumnat fora d'*Alumnat*, cal bloquejar-hi gesTIC.
- Depèn d'una configuració que no és al codi: si algú la treu de la consola,
  gesTIC torna a quedar oberta a l'alumnat sense que res ho avisi.

**A revisar** si passa qualsevol de les dues coses: la segona capa seria que
gesTIC no creï usuaris sols i només hi entri qui el superadministrador hagi
donat d'alta. Cal construir-ho (ara `/usuaris` no permet donar d'alta ningú) i
té un preu: cada substitut s'ha de donar d'alta abans que hi pugui entrar.

### 31. El superadministrador pot ser un compte de fora del domini
Decidit el 2026-09-25: `ADMIN_EMAILS` pot portar un compte extern
(`pauettt@gmail.com`), l'únic de fora de `iesjmthomas.eu` que hi entra
(`src/lib/google-sign-in.ts`). Des del 2026-09-26 només si Google en verifica el
correu i n'és el propietari (un `@gmail.com` o un compte de Workspace); i els
superadministradors del domini continuen havent de ser comptes del Workspace.

Perquè Google el deixi arribar a gesTIC, la pantalla de consentiment del client
OAuth (el de la §28) ha de ser **External** i **In production**. Amb
*Internal*, Google el rebutja abans amb `Error 403: org_internal`. En canviar-la,
cal tornar a provar el que diu la §28: un compte de professor encara hi entra
i un d'*Alumnat* continua bloquejat. Si a la consola de Workspace les
aplicacions de tercers no configurades estan prohibides, gesTIC ha de constar
com a *De confiança* per al professorat.

Riscos assumits:
- El compte amb més permisos (contrasenyes, dades de menors) queda fora del
  control del centre: si es perd o el roben, el Workspace no el pot bloquejar.
  Cal que tingui la verificació en dos passos activada.
- Si el superadministrador extern deixa el centre, algú amb accés a Vercel ha de
  treure'l d'`ADMIN_EMAILS` i fer *Redeploy*. Convé que hi hagi sempre també un
  compte del centre, perquè el centre no es quedi sense ningú que reparteixi
  permisos.

---

## ✅ Fet

### 2026-09-26

- **Revisió de l'auditoria de Gemini** (commit `450850b`, ja desplegat):
  - Es queden els avisos per correu en segon pla (`src/lib/background.ts`, amb
    `after()` de Next): les accions ja no esperen el servidor de correu.
    S'hi han afegit les cites, que s'havien quedat fora. Continuen esperant el
    correu les accions que diuen a l'usuari si ha sortit o no (incidència
    resolta, avís de clau no tornada, correu de prova).
  - Es queden l'índex `KeyLoan.deliveredAt` (migració
    `20260925193713_keyloan_delivered_at_idx`) i les exportacions amb `select`.
    Cap de les dues coses no era urgent a l'escala del centre.
  - Es queda el límit de 2 connexions per instància a producció
    (`src/lib/db.ts`). El problema que deia resoldre no hi era: l'app ja va pel
    *Transaction pooler* de Supabase. Es pot pujar amb `PG_MAX_CONNECTIONS` a
    Vercel si la pàgina d'inici es nota lenta.
  - **Es treu l'anonimització de les sol·licituds d'alumnat**: contradeia la
    §22 (els noms es guarden sense caducitat), cap pantalla no la cridava, i
    triava per data de creació i no de retorn. Si el centre fixa per escrit un
    termini de conservació, s'ha de fer de nou: per data de retorn i des
    d'*Administració → Dades personals*.
- **Entrada del superadministrador extern, més estricta** (§31): cal el correu
  verificat per Google i que Google en sigui el propietari. Un superadmin del
  domini del centre ja no se salta la comprovació de Workspace, com passava des
  del 2026-09-25.
- **Les entrades rebutjades deixen rastre** als logs de Vercel
  (`[auth] entrada rebutjada (motiu): correu`). Abans, «no puc entrar» no es
  podia diagnosticar sense provar-ho.

### 2026-09-23

- **Esborrar sol·licituds d'alumnat**: la coordinació té una paperera a les
  pendents, als equips assignats i a l'historial. Es confirma cada esborrat;
  si hi ha equip apartat o entregat, s'avisa que es traurà l'assignació.
  L'esborrat, el recàlcul de l'estat de l'equip i el registre d'activitat es
  desen junts. Les incidències, les baixes i altres assignacions es respecten.
  Si la sol·licitud canvia mentre es confirma, cal revisar-la de nou.
- **Etapes, cursos i grups** a *Aules i espais*: la coordinació els crea,
  reanomena i ordena, amb cursos per etapa i grups per curs. No es poden
  eliminar elements que tinguin cursos, grups o sol·licituds associats.
  El formulari de préstec a l'alumnat passa del text lliure a tres
  desplegables dependents. El grup continua sent opcional; si es tria, el
  servidor exigeix que existeixi al catàleg i desa el nom complet per
  conservar l'historial encara que es reanomeni. La migració
  `20260923100000_etapes_cursos_grups` conserva els noms de les sol·licituds
  anteriors. En desplegar, cal omplir el catàleg amb les dades del centre.

### 2026-09-22

- **L'inventari diu quins carros hi ha a l'aula**: filtrant l'*Inventari TIC*
  per edifici, planta o aula, a sota de la taula surten els carros que hi tenen
  la *Ubicació habitual*, amb què porten i l'enllaç a la seva pàgina. Abans, un
  carro posat a A.005 no sortia mirant què hi havia a A.005. La cerca també els
  troba (pel nom, el número de sèrie o l'aula). No surten sense filtre, que ja
  ho diu l'avís de dalt, ni amb una categoria o *Només prestable*.
- **Historial de reserves fixes i anul·lar-les quan es vulgui**: a *Carros →
  Reserves fixes*, la coordinació té l'historial de totes les decidides, de
  qualsevol curs: qui la va demanar, qui la va aprovar o rebutjar (amb la nota),
  qui la va retirar o anul·lar i quan, i quantes setmanes s'han fet, en queden i
  s'han alliberat. Filtra per curs i per estat, i busca per carro, professor/a o
  motiu. Les aprovades amb setmanes per venir s'anul·len d'aquí mateix. Qui té
  una reserva fixa l'anul·la des de *Reserves fixes* o des de la pàgina del
  carro, on la coordinació també pot anul·lar la de qualsevol; si ho fa la
  coordinació, a qui la tenia li arriba un correu i ho veu a la seva llista.
  Migració `20260922180000_qui_anulla_reserves_fixes`: dues columnes noves i
  buides (qui l'anul·la i quan).
- **Prova del cercador de carros, estable**: escrivia el dia abans que la pàgina
  estigués llesta i, de tant en tant, la cerca i la reserva anaven a avui. Ara
  tria primer la sessió i comprova la data a l'adreça.
- **Reserves fixes de carros**: a la pàgina d'un carro, *Demana una reserva
  fixa*: el mateix dia de la setmana i la mateixa sessió cada setmana, amb el
  motiu (obligatori). La coordinació TIC l'aprova o la rebutja (amb una nota que
  arriba per correu) des de *Carros → Reserves fixes*; la té al panell i a la
  feina pendent de l'inici, i li arriba un correu quan algú en demana una.
  Mentre no s'aprova, la sessió continua lliure per a tothom. En aprovar-la es
  crea una reserva normal per a cada setmana que queda del curs, fins al 30 de
  juny, i **les setmanes que algú ja tenia reservades es respecten**: la
  coordinació veu quines són abans d'aprovar, i qui l'ha demanada les rep al
  correu. A la graella surten com a *Reserva fixa*, i cada setmana es pot
  alliberar sola; la reserva fixa sencera s'anul·la des de *Reserves fixes*
  (qui la tenia rep un correu si ho fa la coordinació). No n'hi pot haver dues
  d'aprovades per al mateix carro, dia i sessió en un curs.
  **El curs surt de la data**: de setembre a juny, les peticions són per al curs
  en marxa, i al juliol i a l'agost, per al següent (de l'1 de setembre al 30 de
  juny). Cada curs es tornen a demanar. Els festius no hi són: l'aplicació no
  té calendari escolar, i un carro reservat un dia de festa no molesta ningú.
  La graella del carro ara té les columnes d'amplada fixa, perquè un motiu llarg
  no eixamplés el dia. Migració `20260922140000_reserves_fixes`: una taula nova
  i una columna nova (`Reservation.recurringId`), buides. Proves
  `e2e/reserves-fixes.spec.ts` i `src/lib/recurring-reservations.test.ts`.
- **Reservar un equip sol d'un carro**: a la pàgina del carro, clicant un
  dispositiu, *Reserva aquest equip*: un dia, de quina sessió a quina, i el
  motiu si cal. Des que comença la primera sessió i fins que es torna, l'equip
  surt com a **no disponible amb «Reserva · nom»**, i deixa de comptar als
  disponibles del carro, al cercador de carros lliures i al QR. Qui l'ha
  reservat la pot cancel·lar mentre no ha començat; un cop començada, la tanca
  amb «L'he tornat» (o la coordinació, «Marca com a tornat»), també des de
  l'inici, on surten *Els equips que tens reservats*. Regles:
  - no es pot reservar un equip que no funciona, que algú altre té en aquelles
    hores o que encara no ha tornat;
  - tampoc un equip d'un carro que una altra persona té reservat sencer aquelles
    hores (els equips són a la seva classe). Al revés sí: la graella del carro
    diu «Falta 1 equip» a cada sessió on n'hi faltarà algun;
  - si passa l'hora i no s'ha tornat, continua ocupat fins que es torna, a totes
    les sessions: no se sap quan tornarà al carro.
  Si s'acaba el dia sense tornar-lo, **cada dia lectiu al matí** arriba un correu
  a qui el té i un altre a la coordinació amb tots els que falten. Per això el
  cron `/api/cron/loan-reminders` passa de cada dilluns a cada dia lectiu
  (`0 7 * * 1-5`); els recordatoris de préstecs d'inventari continuen sortint
  només els dilluns. La coordinació també els té al panell (*Equips de carro
  sense tornar*) i a la feina pendent de l'inici. Migració
  `20260922100000_reserves_d_equips`: una taula nova i buida
  (`DeviceReservation`), que no toca cap reserva de carro ni l'estat de cap
  equip. Proves `e2e/reserves-d-equips.spec.ts` i
  `src/lib/device-reservations.test.ts`.

### 2026-09-21

- **On és cada carro**: el cercador de carros lliures, les targetes de
  *Carros* i la pàgina de cada carro diuen l'edifici, la planta i l'aula
  («Edifici principal, Planta 1, A.004 · Rosalia»), per triar el que queda més
  a prop i no haver-lo d'arrossegar per tot el centre. Surt de la *Ubicació
  habitual* del carro i de l'edifici i la planta de la seva aula.
- **La feina pendent, a l'inici de la coordinació**: una franja amb els
  números (sense responsable, aturades, devolucions fora de termini, préstecs,
  consultes, Chromebooks d'alumnat), cadascun cap a la seva llista, i «Obre el
  panell». No es va ajuntar l'inici amb el panell: la coordinació també
  reserva, demana material i té claus, i això és a l'inici. Fa els mateixos
  recomptes que el panell (`pendingWhere`), no les llistes.
- **Accessos directes a la icona**: mantenint premuda la icona de gesTIC a la
  pantalla d'inici d'un Android surten «Nova incidència» i «Reserva un carro».
  L'iPhone no en fa cas.
- **Xarxa** (tanca el §25): l'equip d'inventari porta la seva *Adreça IP*
  (única, validada i desada sense zeros davant) i el seu *Nom a la xarxa*. La
  secció *Xarxa*, per a la coordinació, en surt sola: totes les IP ordenades,
  amb l'equip, l'aula i la planta; cerca per IP, nom, equip o aula; filtre per
  edifici, planta i aula; i per a cada xarxa /24 en ús, les IP lliures i la
  primera. Una IP sencera es busca exacta i diu si és lliure. Dues vegades la
  mateixa IP no es desa, i l'avís diu quin equip la té. També surten a la
  fitxa de l'equip (només per a la coordinació) i a l'exportació CSV. Migració
  `20260921200000_inventari_ip`: dues columnes noves i buides.
- **Nova incidència, en dos passos**: primer es tria on és el problema (aula,
  carro o dispositiu, entorn Google) i després només surt aquell formulari; els
  tres seguits feien pensar que calia omplir-los tots. Des del QR d'un carro o
  d'un equip, «Reporta'l amb més detall» obre el formulari amb el carro i
  l'equip ja triats (`?tipus=carro&carro=…&equip=…`).
- **Reservar des del mòbil**: la graella de la setmana no hi cabia (calia
  moure-la de costat). Al mòbil ara es mira un dia a la vegada, i les sessions
  lliures es toquen per triar-ne una o unes quantes seguides i reservar-les
  totes alhora, amb el motiu. A l'ordinador, la graella de sempre.
- **Buscar un carro lliure** a *Carros*: dia, sessió i, si cal, quants equips
  disponibles com a mínim. Surten els carros lliures en aquella sessió (dins
  del filtre d'edifici, planta i aula), els que en tenen més primer, i es
  reserven d'allà mateix. Abans calia entrar a cada carro a mirar-ne l'horari.
  Proposa la sessió que encara no ha acabat, avui, o la primera del proper dia
  lectiu. Va a la URL (`?dia=…&sessio=…&equips=…`).
- **Les reserves de carros a l'inici**: qui té reservat un carro el veu a la
  pantalla d'inici (les 4 properes, també la que està en curs), i en clicar-la
  va a la setmana del carro.
- **El panell diu quanta feina hi ha de debò**: cada cua en mostra 8, però el
  comptador marcava 8 encara que n'hi hagués més. Ara diu el total, i si n'hi
  ha més de les que caben porta a la llista sencera («Veure-les totes»).
- **Incidències aturades** (tanca el §23): una cua nova al panell amb les que
  tenen responsable però fa 7 dies o més que ningú no hi canvia res ni hi
  comenta, amb els dies que fa. El problema de debò era aquest, que se
  n'oblidessin; el tauler per estats i la data prevista no calen. La llista
  sencera és a `/incidencies?vista=aturades` (i `?vista=sense-responsable`),
  de tots els cursos. La migració `20260921180000_incidencies_updated_at`
  afegeix quan es va tocar cada incidència; les que ja hi són prenen la data de
  creació.
- **El `DIRECT_URL` del `.env` local ja és `gestic_dev`** (era el §30): apuntava
  a Supabase, i és el que fa servir `prisma.config.ts`, de manera que
  `npm run db:migrate` en local anava contra producció.
- **Els filtres d'estat dins l'historial d'un equip** ja no el perden: triar
  «Obertes» a l'historial d'un Chromebook portava a les de tot el centre sense
  avisar. El títol diu de quin equip és encara que el filtre no en deixi cap.
- **Historial de sol·licituds de Chromebooks per a l'alumnat**, a *Préstec a
  l'alumnat*: les ja respostes, amb el tutor/a que les va fer i qui les va
  decidir, filtres (acceptades, rebutjades, cancel·lades) i cercador.
- **Filtre per aula** després de l'edifici i la planta, a l'*Inventari TIC* i a
  *Carros* (`?aula=…`). Només ofereix les aules de l'edifici i la planta triats.
- **Duplicar un espai o un equip d'inventari**: obre el formulari d'alta amb
  les dades de l'original. D'un espai en copia l'edifici, la planta i el número
  (repetit no es desa), no el nom; d'un equip, tot menys el número de sèrie.
- **Plantes per edifici**: hi havia una sola llista de plantes per a tots els
  edificis, i l'exterior no en té cap. Ara cada edifici té les seves (*Aules i
  espais → Plantes*, triant l'edifici), i en un espai només es poden triar les
  del seu edifici; la base de dades no en deixa desar una d'un altre ni una
  planta sense edifici. La migració `20260921100000_plantes_per_edifici`
  reparteix les que ja hi havia sense perdre cap enllaç: cada planta es copia a
  cada edifici que té espais seus, i les que no fa servir cap espai van a
  l'edifici amb més espais. **Després de desplegar, repassar-les**: potser n'hi
  ha alguna a l'edifici principal que sobra.
- **Filtre per edifici i planta** a *Aules i espais* (que ara surt agrupat per
  edifici i, a dins, de baix a dalt), a l'*Inventari TIC* de la coordinació i a
  *Carros*, on també el té el professorat per trobar el carro que li queda a
  prop. Va a la URL (`?edifici=…&planta=…`).
- **Importar els dispositius d'un carro** des del full on els teniu
  documentats, a la pàgina del carro. En crear un carro nou, s'obre la seva
  pàgina, que convida a fer-ho. Cada fila porta l'etiqueta (el «nom» de
  l'equip) i, si n'hi ha, el tipus, el número de sèrie, la marca i el model.
  No es repeteix mai cap dispositiu, ni per etiqueta ni per número de sèrie, ni
  si ja és a un altre carro o al préstec a l'alumnat. Llegeix el CSV d'Excel
  tant en UTF-8 com en el format antic de Windows (els accents sortien
  trencats).
- **Les importacions ja no suposen que tot són Chromebooks**: si el full no diu
  el tipus d'algun equip, cal triar-lo abans d'importar.
- **Categoria nova des del formulari d'un equip** d'inventari: el desplegable
  porta «Nova categoria…» i la deixa triada. El formulari ara fa scroll: en
  pantalles petites el botó «Desa» quedava fora.

### 2026-09-17

- **Préstec a l'alumnat, secció pròpia**: les sol·licituds dels tutors/es, les
  entregues i el pool d'equips eren a sota dels carros, i no hi tenen res a
  veure. Ara viuen a `/alumnat` (la fitxa de cada equip, a `/alumnat/[id]`, i
  les etiquetes, a `/alumnat/etiquetes`), amb entrada pròpia al menú que només
  veuen els tutors/es i la coordinació TIC, que és qui decideix. A la resta del
  professorat no li surt, i si hi entra per l'adreça torna a l'inici. A l'inici
  del tutor/a hi ha una targeta més per anar-hi. Els correus, el panell,
  *Administració* i l'avís de l'inventari hi porten. Els correus enviats abans
  porten a *Carros*, on ja no surt. La importació de Chromebooks continua a
  *Carros*, però els equips sense carro surten al préstec.
- **«Préstec de material» per al professorat**: a `/inventari` el professorat
  només hi veu el material que pot demanar i les seves sol·licituds, i el nom
  d'«Inventari TIC» no ho deia. Ara el menú, el títol i la targeta de l'inici hi
  diuen «Préstec de material»; la coordinació continua veient «Inventari TIC».
  L'adreça no canvia. La pestanya del navegador diu «Préstec de material» per a
  tothom: fer-la dependre del rol feia que Next enviés el títol després de la
  pàgina, i el servidor s'omplia d'errors "The destination stream closed early".
- **«Peticions i consultes»**: el professorat també hi demana coses a la
  coordinació, no només pregunta dubtes. El menú, el títol, la targeta de
  l'inici, el panell i el cartell en diuen així, i el botó és «Nova petició o
  consulta». El formulari pregunta «Què necessites?», i els correus ja no diuen
  «la teva consulta»: porten l'assumpte. L'adreça continua sent `/consultes`.
  Des de *Dubtes freqüents* el botó continua dient «Fes una pregunta».

### 2026-09-16

- **Categories dels dubtes freqüents, d'una llista**: s'escrivien a mà a cada
  pregunta, i una errada d'escriptura creava una secció nova sense que ningú se
  n'adonés. Ara es trien d'un desplegable i es gestionen des del botó
  *Categories*, amb el mateix diàleg compartit que Tutorials, Inventari,
  Contrasenyes, Edificis i Plantes: ordenar, reanomenar i eliminar (aquí
  eliminar arrossega les preguntes, i el diàleg avisa de quantes). Migració
  `20260916210000_categories_de_dubtes`, que converteix el que hi havia escrit
  en elements de la llista, un per nom sense distingir majúscules, i hi enllaça
  les preguntes. A producció no n'hi havia cap. Prova `e2e/dubtes.spec.ts`, que
  abans no existia.
- **Fora dels cercadors**: `src/app/robots.ts` demana que no s'hi entri i la
  capçalera `X-Robots-Tag: noindex, nofollow` de `next.config.ts` ho rebla, per si
  un cercador hi arriba des d'un enllaç de fora. L'única pàgina que en podia
  sortir era la d'inici de sessió, perquè la resta hi redirigeix. Prova
  `e2e/buscadors.spec.ts`, sense sessió, com hi aniria un cercador.
- **RLS a totes les taules**: Supabase publica l'esquema `public` amb la seva
  Data API, i sense RLS qui tingués la clau `anon` del projecte podia llegir i
  esborrar qualsevol taula —també `Session`, `Account` i els noms de menors de
  `StudentDeviceRequest`—. Un avís de seguretat de Supabase (2026-09-13) ho va
  destapar: 32 taules marcades. La Data API s'ha desactivat des del panell, i la
  migració `20260916100000_rls_a_totes_les_taules` hi posa el pany de dins, sense
  cap política: així els rols de l'API no hi veuen res, mentre que gesTIC hi
  entra amb el rol propietari (`postgres`), que se salta RLS. Com que cada taula
  nova neix sense RLS, `prisma/rls.sql` ho torna a aplicar a cada desplegament de
  producció. La clau `anon` no s'ha publicat mai enlloc, i no cal canviar-la.
  Després d'això, l'advisor de Supabase mostra 32 avisos INFO «RLS enabled, no
  policy»: **és l'estat correcte i no s'hi han d'afegir polítiques**, perquè cap
  política vol dir que ningú no hi entra per l'API.
- **Còpia de seguretat de les dades** (`npm run db:backup`): treu totes les
  taules en un JSON datat a `backups/` (fora del repositori), sense sessions ni
  testimonis, i avisa que porta dades de menors. Es fa amb Prisma i no amb
  `pg_dump`, que es nega a funcionar si la versió de PostgreSQL del servidor no
  coincideix amb la de l'ordinador. Les taules surten de l'esquema: una de nova
  hi entra sola. Vegeu el §12.

### 2026-09-15

- **Alumnat fora de gesTIC** (§28): l'aplicació queda bloquejada a la consola de
  Google per a les unitats d'alumnat, famílies, professorat del màster,
  conservatori i paperera. Provat amb un compte d'alumne.
- **Entrar amb Google a la primera**: la pantalla d'inici deia que s'havia passat
  massa estona a Google, però els logs deien `invalid_grant: Invalid code
  verifier`, dues entrades solapades al mateix navegador (probablement un doble
  toc mentre el servidor es despertava). El botó queda aturat amb «Obrint
  Google…» des del primer toc (prova `e2e/login.spec.ts`), i el missatge d'error
  ja no n'endevina la causa.
- **Dades de prova buidades** (antic §10), per ensenyar l'aplicació al claustre:
  totes les taules de dades a zero, les 6 fotos del blob store esborrades i un
  sol compte, `coordtic@iesjmthomas.eu`. Es conserven les 10 categories
  d'inventari. Queda apuntat al registre d'activitat. Abans se'n va fer una
  còpia en JSON, sense sessions ni tokens, fora del repositori.
- **Tutorials en vídeo** (§24): la secció passa d'articles a una quadrícula de
  vídeos de YouTube per categories, amb cerca que no distingeix accents, filtre
  per categoria i reproductor dins de gesTIC. L'enllaç `/tutorials?v=…` obre un
  vídeo directament i el botó Enrere el tanca. La migració
  `20260915100000_tutorials_en_video` treu `TutorialArticle`, que era buida, i
  crea `TutorialVideo`. Fora `react-markdown`, que només feien servir els articles.
- **Contrasenyes** (§27): secció nova per a superadministració i coordinació,
  per categories, amb cerca i targetes que copien l'usuari i la contrasenya. Es
  desen xifrades (AES-256-GCM) i no viatgen mai amb la pàgina: es demanen en
  mostrar-les, copiar-les o editar-les, i cada consulta queda al registre
  d'activitat, amb un límit de 100 per hora. Les marcades «Només
  superadministrador» no existeixen per a la coordinació. El superadministrador
  gestiona les categories i importa el full exportat en CSV, amb vista prèvia i
  sense duplicar el que ja hi és. Migració `20260915110000_contrasenyes`.
- **Aules amb número i nom**: el número (A.004) és l'identificador oficial,
  únic, i el nom (Rosalia) és com l'anomena el centre. Es mostren junts a tot
  arreu, «A.004 · Rosalia», i les llistes queden ordenades per número. Migració
  `20260915120000_aules_amb_numero`.
- **Importació de carros i Chromebooks** (antic §26): a *Chromebooks → Importa*,
  des d'un CSV amb una fila per equip. Les columnes es reconeixen pel títol i es
  poden reassignar; la vista prèvia diu quantes aules, carros i equips es
  crearan, i quines files no s'importen i per què. Els carros es diuen «Carro 1
  (A.002)», amb l'aula on tenen més equips, i les etiquetes surten del número dins
  del carro (C1-01). Els equips sense carro poden anar al préstec a l'alumnat
  (ALU-nn, amb número de sèrie obligatori) o quedar fora. El servidor ho torna a
  calcular i ho desa tot o res.
- **Chromebooks no disponibles**: a la fitxa de cada equip, la coordinació el pot
  marcar com a no disponible amb el motiu (falta el carregador, la bateria...),
  sense passar per una incidència. Surt en vermell, resta del recompte del carro i
  només torna a estar disponible quan ho canvia la coordinació; cada canvi queda a
  les notes. La pàgina del carro diu a tothom quants n'hi ha de disponibles abans
  de reservar. Migració `20260915130000_chromebooks_no_disponibles`.
- **Inventari i Chromebooks, separats**: l'inventari avisa que els Chromebooks
  tenen la seva secció, amb el recompte i l'enllaç.
- **Importació**: una coma o un punt de més al final del nom del carro ja no en
  crea un altre.
- **Confirmació en crear una incidència o una consulta**: la fitxa diu que s'ha
  enviat, un sol cop (recarregar ja no ho torna a dir). Si des del QR es torna a
  reportar la mateixa avaria, no se'n crea cap altra: a qui ja la tenia se'l porta
  a la seva, i a qui ve després se li diu que ja està reportada, sense tornar a
  avisar la coordinació.
- **El professorat veu els Chromebooks del carro**: en verd o vermell, amb el
  motiu si no estan disponibles o l'avís que tenen una incidència oberta, i un
  enllaç per reportar-ne un problema. No veu qui ha obert la incidència ni què hi
  diu.
- **Botons del QR amb spinner**: mentre s'envia l'avaria, el botó tocat gira i
  diu «Enviant…», i la resta queden aturats.
- **Carros de qualsevol dispositiu**: la secció es diu *Carros*, i cada equip té
  el seu tipus (Chromebook, portàtil, iPad, tauleta o un altre). El carro diu què
  porta («28 Chromebooks · 2 iPads»), la graella i el QR mostren el tipus, i la
  importació el llegeix d'una columna «Tipus» o el pren per a tot el full. El
  préstec a l'alumnat continua sent de Chromebooks. Migració
  `20260915140000_tipus_de_dispositiu`.
- **Un QR per carro**: porta a una pàgina per al mòbil (`/q/carro/[id]`) amb
  tots els dispositius i el seu estat; es toca el que no funciona i es tria el
  problema. La pàgina d'etiquetes imprimeix per defecte aquest QR, i les
  etiquetes per dispositiu continuen disponibles i funcionant. Cada dispositiu
  només ha de portar visible el seu número.
- **Edificis i plantes d'una llista**: l'edifici i la planta d'un espai ja no
  s'escriuen a mà, es trien d'un desplegable (amb «Sense edifici» i «Sense
  planta»). Les llistes es gestionen des dels botons *Edificis* i *Plantes*
  d'/espais, amb el mateix diàleg que les categories: ordenar, reanomenar i
  eliminar, però només si no hi ha cap espai a dins. Les plantes són una sola
  llista per a tots els edificis. Les migracions `20260915150000_edificis` i
  `20260915160000_plantes` converteixen el que hi havia escrit en elements de la
  llista, un per nom sense distingir majúscules, i hi enllacen els espais. Les
  plantes queden en ordre alfabètic: cal posar-les en l'ordre de l'edifici.
- **gesTIC es pot afegir a la pantalla d'inici**: manifest (`src/app/manifest.ts`)
  i icones pròpies amb el requadre «TIC» de la pantalla d'inici de sessió, que
  també substitueixen el triangle de Vercel de la pestanya. Totes surten de
  `scripts/generate-icons.mjs`, que dibuixa les lletres amb traços. El manifest i
  les icones es poden demanar sense sessió (prova `e2e/instal-lable.spec.ts`).
- **Cartell per a la sala de professors**: *Administració → Obre el cartell*,
  només per a superadministració. Un QR a l'adreça d'`APP_URL`, generat al
  servidor com els dels carros (no caduca ni passa per cap web externa), amb com
  afegir gesTIC a la pantalla d'inici a Android i a iPhone. Si `APP_URL` no hi és,
  avisa que no s'imprimeixi.

### 2026-09-14

- **Entrega dels Chromebooks d'alumnat**: aprovar aparta l'equip, i entregar-lo
  és un pas a part que desa el dia i l'hora del moment i qui l'entrega; la
  devolució també desa qui el rep. Les dates no s'editen, i entregar, anul·lar i
  tornar demanen confirmació. La coordinació pot anul·lar una aprovada que ningú
  no ha vingut a buscar, i l'equip torna a quedar lliure. A /chromebooks hi ha
  «Equips per entregar» i «Equips a casa de l'alumnat»; el panell avisa dels
  equips per entregar, i l'inici del tutor distingeix els que ha de recollir dels
  que ja són a casa. Les aprovades d'abans queden com a pendents d'entrega.
- **Historial de cada Chromebook del pool** a `/chromebooks/alumnat/[id]`, només
  per a la coordinació: alumne, grup, tutor/a i quan i qui l'ha aprovat, entregat
  i rebut, curs per curs. S'hi arriba des de la taula del pool i des de les
  llistes de préstecs. Migració `20260914100000_entrega_chromebooks_alumnat`.
- **Fora el buidat de les sol·licituds tancades** (§22).
- **La casella de tutor/a i el desplegable de permís** a *Usuaris i permisos*
  canvien al moment del clic, sense esperar que el servidor torni a pintar la
  pàgina.
- **Navegació més àgil**, en tres canvis:
  - Les funcions de Vercel passen a Dublín (`regions: ["dub1"]` a `vercel.json`),
    al costat de Supabase (`eu-west-1`). Abans corrien a Washington (`iad1`) i
    cada consulta creuava l'Atlàntic: una petició amb una sola consulta trigava
    300–370 ms.
  - La sessió es llegeix un sol cop per petició (`cache` de React a
    `permissions.ts`): el layout i la pàgina en feien dues consultes.
  - El navegador reaprofita una secció ja visitada durant 30 s
    (`staleTimes.dynamic`). Els canvis propis es veuen al moment, perquè totes
    les accions criden `revalidatePath`; els d'altres persones poden trigar fins
    a 30 s sense recarregar.
- **Fora l'apartat de Formació**: no el feia servir ningú (dues sessions de
  prova i cap inscripció), una sessió presencial s'anuncia on el professorat ja
  mira —correu, claustre, Calendar— i el menú ja tenia massa entrades. Se n'han
  tret la pàgina, les accions, el menú, la targeta de l'inici, el recompte de
  *Administració* i el seed. La migració `20260914130000_treure_formacio`
  esborra les taules `TrainingSession` i `TrainingEnrollment`.

### 2026-09-13

- **Administració**: pàgina nova del superadministrador amb l'estat de la
  configuració del servidor (sense ensenyar cap secret) i un botó de correu de
  prova, les dades personals pendents de buidar, l'esborrat de les dades de
  prova (antic §10, que passa a ser un botó) i el registre d'activitat.
- **Treure l'accés a qui deixa el centre**, a *Usuaris i permisos*: ja no pot
  entrar, la sessió que tingui oberta es tanca a l'instant i deixa de rebre
  avisos, però el que va fer continua dient qui ho va fer. La pantalla de login
  li diu que parli amb la coordinació. La taula d'usuaris té cercador i filtres
  (coordinació, tutors, consergeria, sense accés).
- **Registre d'activitat**: canvis de permisos i de tutoria, accessos retirats i
  retornats, incidències esborrades i neteges de dades, amb qui i quan. Sense
  cap dada de l'alumnat. Migració `20260913120000_administracio`.
- **Dos coordinadors alhora** (antic §5): canviar l'estat d'una incidència o
  d'una consulta, o respondre un préstec, ja no trepitja en silenci el que
  acaba de fer una altra persona: ho diu i refresca la pantalla.
- **Esborrats que perdien l'historial** (antic §4): un equip d'inventari amb
  préstecs o incidències ja no es pot esborrar, es dona de baixa; esborrar una
  sessió de formació diu quantes inscripcions es perdran. Les categories de
  tutorials ja deien quants articles s'esborraven.
- **Chromebooks del pool al formulari d'incidències** (antic §20): surten com a
  «Préstec a l'alumnat» a la secció de Chromebooks, només amb l'identificador.
- **Recordatori de les dades de l'alumnat** (antic §21): de juliol a setembre, el
  panell avisa si queden sol·licituds tancades per buidar; *Administració* ho
  diu sempre.
- **Enllaços que es feien passar per botons** (antic §15): els filtres i els
  botons que porten a una altra pàgina ara són enllaços de debò (`ButtonLink`),
  i el filtre actiu es marca amb `aria-current`.
- **Préstecs antics sense data de retorn** (antic §18): diuen «Retornat, sense
  data» en comptes d'un guió.
- **Avís a cada pujada de fotos** (antic §19): fora l'`onUploadCompleted` buit.
- **Vulnerabilitats de npm**: les quatre venien del CLI de Prisma
  (`deepmerge-ts`, `mysql2`) i es forcen les versions corregides amb `overrides`.
  `npm audit` en dona zero.
- Verificat amb TypeScript, lint, 72 proves unitàries i 20 end-to-end.
- **Un compte de Google entrava com un altre usuari**: entrant com a coordtic
  amb la sessió d'un professor oberta al mateix navegador, Auth.js no va crear
  cap usuari, sinó que va vincular el compte de coordtic al del professor; des
  de llavors coordtic hi entrava com a professor i `ADMIN_EMAILS` no el
  reconeixia. Arreglat a la base de dades (esborrades la vinculació i aquella
  sessió) i al codi: entrar amb Google tanca la sessió oberta d'un altre
  usuari, i un compte de Google només pot entrar com l'usuari del seu mateix
  correu.
- **Tests** (antic §11): `npm test` amb 61 proves unitàries (Vitest) de dates i
  curs escolar, estat dels Chromebooks, préstecs, claus, permisos, CSV, adreces
  de blob i validacions; i `npm run test:e2e` amb 16 proves end-to-end
  (Playwright) que recorren l'aplicació amb cada rol —permisos, incidències, QR,
  préstec a l'alumnat, reserves, claus, préstecs i cites— contra un PostgreSQL
  local. Les unitàries corren en una zona horària llunyana per enxampar qualsevol
  càlcul que depengui de la del servidor, i els e2e no arrenquen si la base de
  dades no és local i de proves. Comprovat que fallen quan toca: amb l'error de
  la doble assignació del pool reintroduït a propòsit, la prova corresponent cau.
- **Claus en hora de pati**: escrivint les proves va sortir que la clau d'un
  carro reservat a 3a i 4a hora sortia com a "Per tornar" en ple pati, tot i que
  el comentari del codi deia just el contrari. Ara el bloc de reserves seguides
  salta el pati.
- **Login de Google** (antics §1 i §6b): provat de principi a fi a producció, i
  la pantalla de Google ja diu "gesTIC".
- **Variables de Vercel**: totes comprovades, entre elles
  `GOOGLE_WORKSPACE_DOMAIN` (`iesjmthomas.eu`), `APP_URL` i `CRON_SECRET`.
  `CRON_SECRET` no cal que coincideixi amb el del `.env` local: Vercel Cron
  envia el valor que té Vercel.
- **Domini dels QR** (antic §2): `APP_URL` és `https://ges-tic.vercel.app`, així
  que les etiquetes i els correus ja surten amb el domini estable, s'imprimeixin
  des d'on s'imprimeixin. Si algun dia el centre hi posa un domini propi, aquest
  s'ha de mantenir actiu: les etiquetes ja enganxades hi apunten.
- **Noms dels rols** (antic §7): Superadministrador/a, Coordinador/a TIC,
  Consergeria i Professorat. Canviats a les etiquetes i als textos que en
  parlen; cap permís no s'ha tocat.
- **Converses per correu a les incidències i consultes** (antics §23 i §24):
  quan hi escriu la coordinació, rep correu qui l'ha oberta; quan hi escriu qui
  l'ha oberta, en rep tota la coordinació. Abans, a les incidències no avisava
  cap de les dues bandes, i a les consultes només la coordinació cap al
  professorat.
- **Base de dades de proves** (§12): decidit no pagar el Pro de Supabase i
  continuar provant sobre producció fins que el claustre hi entri.

### 2026-09-12 (auditoria)

Repàs de tot el codi després de diversos dies amb sessions en paral·lel. Tot
verificat amb TypeScript, lint, el build de producció, comprovacions de la
lògica nova i una prova de 34 pàgines amb els cinc rols; cap canvi d'esquema ni
de base de dades.

- **Login tancat si falta el domini**: sense `GOOGLE_WORKSPACE_DOMAIN` el filtre
  se saltava i entrava qualsevol compte de Google. Ara no entra ningú, i a més
  s'exigeix el camp `hd` de Google, que només porten els comptes gestionats pel
  Workspace.
- **Préstecs que es cancel·laven amb l'equip a casa**: el professorat podia
  cancel·lar un préstec aprovat que ja tenia, i desapareixia dels actius, dels
  vençuts i dels recordatoris. Ara només es pot retirar mentre no ha començat,
  i sense trepitjar una decisió de la coordinació feta al mateix moment.
- **Estat dels Chromebooks**: cada acció hi escrivia el seu, i tancar una
  incidència el deixava DISPONIBLE encara que en tingués una altra d'oberta o
  fos a casa d'un alumne (i llavors es podia assignar a un segon alumne). Ara el
  calcula `syncChromebookStatus` a partir dels fets, i BAIXA només es posa a mà.
- **Donar de baixa i moure Chromebooks**: no hi havia manera de fer cap de les
  dues coses, tot i que l'error d'esborrar un carro ho demanava. Botó "Dona de
  baixa / Torna a activar" als carros i al pool, i selector de carro en editar.
  Els donats de baixa no surten al formulari d'incidències ni a les etiquetes.
- **Etiquetes QR del pool d'alumnat**, que no es podien imprimir enlloc.
- **QR sense duplicats ni allaus**: un doble toc porta a la incidència que ja hi
  ha, i el QR respecta el mateix límit per hora que el formulari.
- **Cites**: la graella ensenyava a tothom el nom i el motiu de les cites dels
  altres; ara només els veuen la coordinació i qui té la cita. I ara s'avisa per
  correu quan algú demana cita i quan se'n cancel·la una, a l'altra banda.
- **Inici i panell al dia**: la portada ensenya les claus que tens (tanca l'antic
  §9), les teves cites i, als tutors, els seus Chromebooks d'alumnat; la targeta
  de Cites hi faltava. El panell té dues cues noves, sol·licituds de Chromebook
  pendents i properes cites, i les mètriques van en hora del centre i amb els
  mesos en ordre.
- **Consergeria**: l'entrega sense reserva només oferia el rol professorat i
  deixava fora la coordinació. L'entrega comprova que la reserva sigui d'aquell
  carro i d'aquella persona, i que la clau no s'hagi entregat ja.
- **Dates validades a totes les accions**: una data mal formada donava un error
  genèric en comptes d'un missatge, i no es poden obrir hores ni reservar en cap
  de setmana. La pàgina del carro ja no peta amb un `?week=` inventat i obre la
  setmana que toca, com /cites.
- **Consultes**: passar de Resolta a Tancada ja no canvia la data de resolució.
- **Base de dades compartida**: els previews de Vercel ja no hi apliquen
  migracions, els correus a les adreces `@….test` dels usuaris de prova ja no
  s'intenten enviar, i el seed ja no duplica la formació ni els dubtes.
- **Documentació**: README al dia (rols, migracions, avís de la base de dades
  compartida) i `.env.example` sense "CoordTIC". El `.env.example` no s'havia
  pujat mai al repositori perquè `.env*` del `.gitignore` també l'ignorava.

### 2026-09-12

- **Tutors de grup**: marca `isTutor` que se suma al rol en comptes de
  substituir-lo, perquè un coordinador també pot ser tutor. La dona i la treu el
  superadministrador a /usuaris.
- **Préstec de Chromebooks a l'alumnat**: pool d'equips separat dels carros,
  sol·licituds dels tutors amb motiu tancat, decisió i assignació d'equip per la
  coordinació, devolució manual i estat ASSIGNAT. El nom de l'alumne només el
  veuen el tutor i la coordinació.
- **Buidar les sol·licituds tancades**: botó a /chromebooks per esborrar les
  retornades, rebutjades i retirades a fi de curs.
- **Agenda de cites de la coordinació** a /cites: la coordinació obre les hores
  que té lliures i qualsevol del claustre n'agafa una. Substitueix les taules
  del sociograma creades el mateix matí.
- **Migracions en desplegar**: el build de Vercel aplica `prisma migrate deploy`
  abans de compilar.

### 2026-09-11 (nit)

- **Consergeria**: rol nou i secció de control de les claus del centre —aules,
  magatzems i carros—, amb entrega, retorn, avís manual a qui no torna, CRUD de
  claus i historial. Les claus lligades a un carro hereten les seves reserves,
  i d'aquí surt l'hora en què s'havien de tornar; un professor amb el carro
  reservat hores seguides no baixa la clau entre mig, així que el compte enrere
  surt del final del bloc, amb 10 minuts de marge. Els conserges no són
  usuaris: comparteixen un compte i trien el seu nom a cada entrega.
- **Historial de claus**: una reserva diu qui tenia dret al carro; que se
  n'entregués la clau confirma que se'l va endur. Enllaçat des de la fitxa del
  carro ("Qui s'ha endut aquest carro"), que és on es preguntarà de debò quan
  aparegui un Chromebook trencat.
- **Pantalla en blanc de consergeria**: `permissions.ts` importava
  `isConcierge` i alhora el re-exportava amb `export … from`; amb totes dues
  formes la variable local quedava sense definir en execució i el layout no
  renderitzava mai. Ni TypeScript ni el build no ho veuen.
- **Endpoint sense permisos**: `todayReservations` havia quedat exportada d'un
  fitxer `"use server"` sense comprovar res —a Next això és una ruta cridable
  des del navegador— i a sobre no la feia servir ningú. I la pantalla de
  consergeria carregava totes les reserves de la història per ensenyar les
  d'avui; ara està acotada a la setmana.
- **Segon professor al dev login**: amb un de sol no es pot comprovar que el
  professorat no es veu la feina entre si.

### 2026-09-11

- **Incidències de l'entorn Google**: tercera via a "Nova incidència", per a
  Classroom, correu, Drive, Meet, YouTube, contrasenyes… No demana ni aula ni
  equip, perquè no n'hi ha. El servei afectat es desa en un enum propi
  (`GoogleService`) i no dins `IncidentCategory`, que descriu avaries de
  maquinari i s'ofereix al formulari ràpid del QR dels Chromebooks. El servei
  surt també al correu que rep la coordinació i a l'exportació CSV.
- **Captures en comptes de fotos**: `IncidentPhotosField` té un mode
  "screenshot" que no força la càmera del mòbil. Per a un problema de Classroom
  la imatge útil és una captura que ja tens desada, no una foto nova.
- **Error fals en crear incidències i consultes**: les accions que acaben en
  `redirect()` ho fan llançant una excepció interna de Next, i el `try/catch`
  de `useServerAction` se la menjava i mostrava "No s'ha pogut completar
  l'acció" **mentre et portava, correctament, a la pàgina nova**. Resolt amb
  `unstable_rethrow`. Afectava les tres modalitats d'incidència i les consultes.
- **Vercel Blob operatiu**: store `gestic-fitxers-public` (regió CDG1) creat amb
  accés **Public** i `BLOB_READ_WRITE_TOKEN` real al `.env`. Un primer store
  creat com a Private es va haver de descartar: el codi puja amb
  `access: "public"` i Vercel el rebutja. L'accés d'un store no es pot canviar
  després de crear-lo. Verificat pujant, llegint per URL i esborrant.
- **Supabase no es pausarà l'estiu**: ruta `/api/cron/keep-alive` protegida amb
  `CRON_SECRET` i programada cada dia a `vercel.json`. El pla Free atura la
  base de dades als 7 dies sense activitat, i un institut passa el juliol i
  l'agost sencers sense que ningú reporti res. El cron de préstecs ja hi
  arribava, però setmanal contra una pausa de 7 dies era massa just.

### 2026-09-10

- **Identitat i aparença**: blau institucional com a color primari (clar i
  fosc), tipografia Inter servida des del nostre domini, i **selector de tema
  clar/fosc/sistema** al menú d'usuari — `next-themes` ja no és una dependència
  pagada i sense fer servir.
- **Pàgina d'inici**: accions ràpides (nova incidència, reservar carro, demanar
  material), les teves incidències obertes i el material que tens en préstec, i
  el mòdul Consultes que hi faltava.
- **Accessibilitat a Dubtes**: els botons ja no viuen dins del `<summary>`, així
  que el desplegable funciona amb teclat sense trucs. Eliminat el component
  `PreventToggle`, que existia només per frenar aquell clic.
- **Recordatoris automàtics**: ruta `/api/cron/loan-reminders` protegida amb
  `CRON_SECRET` i programada a `vercel.json` per a cada dilluns. Si el secret no
  hi és, la ruta es tanca (503) en comptes de quedar oberta.

- **Feina del professorat**: cercador de text a l'inventari (marca, model, núm.
  de sèrie, aula o categoria, amb espera de 300 ms); fotos del problema **en el
  moment de crear la incidència**, amb la càmera del mòbil directament; i llista
  d'inscrits a formació per al coordinador, amb correus i "escriure a tothom".
- **Avisos**: el professorat rep correu quan la coordinació respon la seva
  consulta (abans era l'únic buit de notificacions).
- **Qualitat**: esquelets de càrrega (`loading.tsx`), `watch()` migrat a
  `useWatch()` — **`npm run lint` ja no dona cap avís** — i `APP_URL` com a
  domini canònic de QR i correus, amb avís a la pàgina d'etiquetes.

- **Robustesa**: `useServerAction` ja captura errors de xarxa (abans un tall de
  wifi deixava el botó bloquejat per sempre); no es poden reservar sessions ni
  demanar préstecs en dates passades; la doble reserva de carros és impossible
  gràcies a un índex únic **parcial** (`WHERE status = 'CONFIRMADA'`, per no
  bloquejar les cancel·lades); les inscripcions a formació van dins d'una
  transacció amb bloqueig de fila; i no es pot esborrar un carro amb
  Chromebooks a dins.
- **Refactor**: les tres pàgines que barrejaven responsabilitats (1.052 línies)
  separades per audiència i tema. Verificat comparant el text renderitzat abans
  i després: idèntic caràcter per caràcter.
- **Preparació per a producció**: migracions de Prisma (baseline `0_init` sobre
  la BD existent), límit de peticions per usuari i hora comptat a la BD, doble
  pany al dev login (`NODE_ENV` + `ENABLE_DEV_LOGIN`), pàgines pròpies d'error i
  404, i títol propi a cada pàgina.
- **Notificacions**: correus automàtics a la coordinació (incidència nova,
  sol·licitud de préstec, consulta nova) i al professorat (préstec
  aprovat/rebutjat, incidència resolta, recordatori de devolució).
  `src/lib/notifications.ts` no llança MAI: si el correu falla, l'acció ja s'ha
  desat i només queda al log.
- **Préstecs vençuts**: es marquen en vermell amb els dies de retard i tenen
  botó "Recorda-ho".
- **Panell del coordinador**: de comptadors a cues de feina (incidències sense
  assignar, préstecs per aprovar, devolucions vençudes, consultes obertes) i
  mètriques del curs.
- **Permisos**: tres nivells i gestor d'usuaris a `/usuaris`. Les 53
  comprovacions `role === "ADMIN"` passades a l'helper `isAdmin()`.
- **Avís en resoldre una incidència**: diàleg amb comentari opcional que es desa
  al fil de Seguiment i s'inclou al correu. `resolvedAt` ja no es perd en passar
  de Resolta a Tancada.

### 2026-09-09

- **Incidències**: assignació acabada (desplegable a la fitxa, columna a la
  llista i filtre "Les meves"); estat i prioritat editables des de la llista amb
  l'etiqueta de color com a desplegable.
- **Inventari**: préstecs al professorat (sol·licitud, aprovació, retorn amb
  data real, historial per equip) i fitxa completa d'equip amb imatge. Foto
  també als carros de Chromebooks.
- **Seguretat**: IDOR als adjunts d'incidències, fuita d'incidències d'altres
  professors via paràmetres de la URL, injecció de fórmules als CSV, capçaleres
  HTTP i promoció a ADMIN per a usuaris ja existents.
