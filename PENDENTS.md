# Pendents de gesTIC

**Aquesta és l'única llista de pendents.** El que va sortint i **no** es resol
sobre la marxa s'apunta aquí; quan una cosa es tanca, passa a "Fet" amb la data.
Els plans llargs poden tenir document propi (com [PLA-TUTORIALS.md](PLA-TUTORIALS.md)),
però el que queda per fer surt també aquí.

Última revisió completa: **2026-09-12**, amb una auditoria de tot el codi —
esquema contra la base de dades, totes les accions, rutes i pàgines— després de
diversos dies de feina en sessions paral·leles. El 2026-09-13 es va tancar tot
el que en quedava obert i era codi.

---

## 🎯 Per on seguir

Només queden dues coses, i cap de les dues no és programar:

1. **Netejar les dades de prova** just abans d'obrir-la al claustre (punt 10).
   És un botó a *Administració*, que diu què s'esborrarà abans de fer-ho.
2. **Omplir els Dubtes freqüents i els Tutorials**. És contingut: el pla —les
   cinc categories, el format d'article, el camp `sourceUrl` i el script
   d'importació— és a [PLA-TUTORIALS.md](PLA-TUTORIALS.md), acordat el
   2026-09-12, i encara no se n'ha començat cap tasca.

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
| ✅ | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` | ✅ | ✅ |
| ✅ | Migracions en desplegar (`scripts/vercel-build.sh`, només a producció) | — | ✅ |
| ✅ | Login de Google (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) | buides: en local s'entra pel dev login | ✅ provat de principi a fi; la pantalla ja diu "gesTIC" |
| ☐ | **NO** posar `ENABLE_DEV_LOGIN` a Vercel | — | — |

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

### 10. Netejar les dades de prova abans d'obrir-la al claustre
A *Administració → Dades de prova* hi ha el recompte i el botó. S'enduu els
comptes del dev login (adreces `@local.test`, que cap compte real no pot tenir)
i tot el que en penja: incidències amb les seves fotos, comentaris, préstecs,
reserves, préstecs de claus, cites, consultes, inscripcions i notes. Abans de
fer res ensenya què esborrarà, i queda al registre d'activitat. S'ha de fer amb
el compte del centre: amb un de prova no deixa.

El que no penja de cap compte s'ha de mirar a mà:
- els tres conserges d'exemple (Sergio, Marta, Joan): *Usuaris i permisos →
  Conserges*, donar-los de baixa;
- les claus C-01 i A-203: *Claus → Gestiona les claus*;
- equips, aules o carros creats provant, si n'hi ha.

Com que es prova sobre producció (§12), s'ha de fer **just abans d'obrir-la al
claustre**, i a partir d'aquí ja no s'hi han de fer proves amb dades inventades.

### 23. Vista de les incidències: per decidir
El 2026-09-14 va sortir la idea d'un diagrama de Gantt o un cronograma per
gestionar-les. Un Gantt no hi encaixa: les incidències no tenen data prevista ni
dependències, i la majoria duren hores o pocs dies. Segons quin sigui el problema
de debò, hi ha tres millores possibles: un tauler per estats amb els dies que fa
que cada una és oberta, marcar les que fa dies que ningú no toca, o una data
prevista per a les reparacions que tenen dia. Un cronograma sí que tindria sentit
per als projectes de la coordinació al llarg del curs, com a apartat nou.
**Abans de fer res cal decidir quin problema es vol resoldre.**

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
Chromebooks, formació i incidències. Les adreces són llargues i aleatòries i no
s'indexen, però qui rebi l'enllaç l'obre sense passar per gesTIC. Assumit el
2026-09-11 per a fotos de material espatllat. **A revisar el dia que s'hi
pugin captures de Classroom amb noms d'alumnes**: llavors tocaria passar a
blobs privats i firmar les URL a cada pàgina, que no és un canvi petit.

### 12. Producció i desenvolupament comparteixen base de dades
El `.env` local i Vercel apunten al mateix projecte de Supabase, així que tot el
que es prova en local va a parar a la base de dades real.

**Decidit el 2026-09-13: de moment es prova sobre producció.** El compte de
Supabase és al pla gratuït, que no deixa tenir més de dos projectes actius, i
pagar el Pro (25 $/mes) només per tenir-ne un de proves no s'ho val mentre
l'aplicació no la faci servir ningú més.

Mentre sigui així, dues regles:
- **No executar `npm run db:migrate`** (`prisma migrate dev`): si detecta
  diferències ofereix **resetejar** la base de dades, i esborraria les dades
  reals. Les migracions noves s'escriuen a mà (es poden generar amb
  `prisma migrate diff` contra la base de dades local de les proves) i les
  aplica el desplegament.
- **No executar `npm run db:seed`**: hi posaria aules, equips i un carro de
  Chromebooks d'exemple.

Les proves automàtiques no hi tenen res a veure: `npm run test:e2e` fa servir
un PostgreSQL local propi que es buida a cada execució. Això només afecta les
proves a mà.

**A revisar quan el professorat hi entri de debò**: llavors les proves amb dades
inventades barrejades amb incidències reals, i els correus de prova a la
coordinació, ja no són assumibles. Opcions sense pagar: pausar l'altre projecte
de Supabase si ja no es fa servir (els pausats no compten per al límit), o una
base de dades PostgreSQL al mateix ordinador. Si mai es passa al Pro, que sigui
per les còpies de seguretat diàries de les dades reals, que el pla gratuït no
té, i no pas per les proves.

### 22. Els préstecs de Chromebooks a l'alumnat es guarden amb el nom, sense caducitat
Decidit el 2026-09-14: cada equip del pool ha de poder dir quins alumnes l'han
tingut curs rere curs, i per això les sol·licituds —amb el nom i el grup de
l'alumne— ja no s'esborren. Substitueix la decisió del 2026-09-12 de buidar-les
en acabar el curs: el botó «Buida-les», l'avís del panell i la línia
d'*Administració* s'han tret. Són dades de menors: només les veuen el tutor/a que
fa la sol·licitud i la coordinació TIC, i *Administració → Dades personals* diu
quantes n'hi ha i per què es guarden. **Convé que el centre ho tingui decidit
per escrit.**

---

## ✅ Fet

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
