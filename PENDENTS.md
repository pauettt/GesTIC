# Pendents de gesTIC

Registre del que va sortint i **no** es resol sobre la marxa. Quan una cosa es
tanqui, moure-la a "Fet" amb la data. Última revisió completa: **2026-09-12**
(estat de cada variable verificat contra el `.env`, i el codi repassat buscant
feina a mitges: no hi ha cap TODO ni cap pàgina esbossada).

---

## 🎯 Per on seguir

Ordre acordat el 2026-09-12. La idea és tancar-ho de dalt a baix, no tot alhora.

1. **La configuració de Vercel** (secció següent). Fins que no estigui, ningú
   del centre no pot fer servir l'aplicació de debò, així que tota la resta és
   secundària.
2. **Que el professorat vegi les seves claus** (punt 9). És l'únic forat obert
   de la feina d'ahir: se'ls reclama una clau que no poden consultar.
3. **Els noms dels rols** (punt 7). Mitja hora i treu una confusió diària.
4. **Netejar les dades de prova** just abans d'ensenyar-ho (punt 10).
5. **Tests del que fa mal si falla** (punt 11), quan el contingut hi sigui i la
   forma de l'aplicació ja no es mogui. Escriure'ls ara sobre una cosa que
   encara canvia és feina per llençar.

Els Dubtes freqüents i els Tutorials no són codi: són contingut per omplir.
El pla per fer-ho —les cinc categories, el format d'article, el camp
`sourceUrl` i el script d'importació— és a [PLA-TUTORIALS.md](PLA-TUTORIALS.md),
acordat el 2026-09-12. Hi consta també per què s'ha descartat el bot.

---

## 🚀 Llista de desplegament

El codi ja no bloqueja res: el que queda és configuració.

| | Què | Local | Vercel |
|---|---|---|---|
| ☐ | Login de Google operatiu (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`) | ❌ buides | ✅ hi són |
| ☐ | `APP_URL` amb el domini definitiu (abans d'imprimir QR!) | ❌ absent | ❌ |
| ☐ | `CRON_SECRET` | ✅ | ❌ **cal copiar-hi el mateix valor** |
| ☐ | `BLOB_READ_WRITE_TOKEN` | ✅ | ⚠️ sense verificar |
| ☐ | `ADMIN_EMAILS` | ✅ | ⚠️ sense verificar |
| ☐ | `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | ✅ | ⚠️ sense verificar |
| ☐ | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` | ✅ | ⚠️ sense verificar |
| ☐ | Que el build executi `npm run db:deploy` (migracions) | — | ❌ |
| ☐ | **NO** posar `ENABLE_DEV_LOGIN` a Vercel | — | — |

Les marcades ⚠️ funcionen en local i el desplegament de producció respon, però
no s'ha entrat a *Settings → Environment Variables* a comprovar-les una per una.

Comprovat el 2026-09-11: el build de producció arrenca i respon sense errors.

---

## 🔴 Bloquejadors per a producció

### 1. Falten variables d'entorn
- **`AUTH_GOOGLE_ID` i `AUTH_GOOGLE_SECRET`**: a Vercel **sí que hi són** (el
  2026-09-11 la pantalla de Google s'obre des del desplegament). Al `.env`
  local són buides, així que en local només s'entra pel dev login. Queda
  confirmar que el login s'acaba de debò i no només que s'obre el diàleg.
- **`APP_URL`** (verificat 2026-09-11: ni tan sols hi és). Mentre no hi sigui,
  els QR i els enllaços dels correus surten amb el domini des d'on es generin.
- **`CRON_SECRET` a Vercel**: generat i posat en local, però fins que no hi
  sigui a Vercel les dues rutes de cron responen 503 i no fan res — ni els
  recordatoris de préstec ni el ping que evita que Supabase es pausi.

`ADMIN_EMAILS`, `BLOB_READ_WRITE_TOKEN` i l'SMTP ja hi són en local i s'han
comprovat funcionant; només queda confirmar que hi són també a Vercel.

### 2. Les etiquetes QR fixen el domini des d'on s'imprimeixen
`src/lib/url.ts` construeix la URL amb la capçalera `host` del moment. Si
s'imprimeixen des de `localhost:3000` o d'una URL de preview, els QR queden
inservibles un cop enganxats als Chromebooks. Afecta també els enllaços dels
correus automàtics.
**Ja implementat a mitges**: `APP_URL` mana sobre la detecció automàtica, i la
pàgina d'etiquetes avisa en vermell ("No imprimeixis encara") quan no hi ha
domini fixat. Falta només posar la variable amb l'adreça definitiva.

---

## 🟠 Robustesa

### 4. Els esborrats són físics i sense traça
Equips i categories s'esborren de debò; un clic equivocat no es pot desfer.
Queda també `TutorialCategory`, que esborra els seus articles en cascada sense
dir quants se'n perdran. (Els carros amb Chromebooks a dins ja estan protegits.)

### 5. Dos coordinadors poden trepitjar-se
Som 3 gestionant. Res no avisa si dos canvien l'estat de la mateixa incidència o
responen la mateixa sol·licitud alhora: guanya l'últim, en silenci. Les reserves
i les inscripcions ja estan protegides; això és per a la resta d'edicions.

### 6. Sense CSP
Deixada fora conscientment: a Next.js necessita nonces via `proxy.ts` i una CSP
mal posada trenca els estils inline de Base UI. La resta de capçaleres
(X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) ja hi són.

---

## 🟡 Funcionalitat i UX

### 6b. El login de Google diu "reservaChromebooks"
Les credencials OAuth són d'un projecte de Google Cloud anterior, i la pantalla
de consentiment encara en porta el nom: qui entri a gesTIC veu "Iniciar sesión
con Google · Ir a reservaChromebooks". Es canvia a *Google Cloud Console → APIs
i serveis → Pantalla de consentiment d'OAuth → Nom de l'aplicació*. **Compte**:
el nom és del projecte sencer, així que si l'app antiga de reserves encara
s'usa, canviar-lo també l'afecta; en aquest cas val més crear credencials
pròpies per a gesTIC.

També cal revisar-hi les **URI de redirecció autoritzades**: han d'incloure el
domini estable (`ges-tic.vercel.app`), no les adreces de desplegament
(`ges-xxxxx-pauettt.vercel.app`), que canvien a cada desplegament.

### 7. Els noms dels rols no diuen el que són
`SUPER_ADMIN` es mostra com a "Administrador/a" i `ADMIN` com a "Coordinador/a
TIC", però qui coordina de debò és el super admin: llegint la pantalla de login
no s'entén qui mana. Els tres rols ja encaixen amb la realitat del centre
(coordinació · comissió TIC · professorat); és només qüestió de reanomenar les
etiquetes de `roleLabels` a `src/lib/labels.ts`, sense tocar cap permís.

### 8. Les fotos són públiques per a qui tingui l'enllaç
El blob store és **Public** perquè el codi puja amb `access: "public"` i les
URL desades es mostren directament amb `<Image>` i `<a href>` a inventari,
Chromebooks, formació i incidències. Les adreces són llargues i aleatòries i no
s'indexen, però qui rebi l'enllaç l'obre sense passar per gesTIC. Assumit el
2026-09-11 per a fotos de material espatllat. **A revisar el dia que s'hi
pugin captures de Classroom amb noms d'alumnes**: llavors tocaria passar a
blobs privats i firmar les URL a cada pàgina, que no és un canvi petit.

### 9. El professorat no pot veure quines claus té
Consergeria li envia un correu reclamant-li una clau, però si entra a gesTIC no
troba enlloc quina és ni des de quan. A la portada hi surten les seves
incidències obertes i el material en préstec; les claus, no. És una asimetria
que va entrar amb la secció de consergeria el 2026-09-11: `keyLoan` només es
consulta des de `/consergeria`.

### 10. Netejar les dades de prova abans d'ensenyar-ho
No és només esborrar incidències. Hi ha els **sis usuaris de prova**
(`...prova@local.test`), que sortiran al gestor d'usuaris com si fossin
professorat de debò; les seves sessions; reserves, préstecs de claus i
consultes de prova; els tres conserges d'exemple (Sergio, Marta, Joan) i les
claus C-01 i A-203; i les **fotos pujades provant**, que no marxen soles del
blob store si no es fa servir el botó d'esborrar incidència.

Compte: producció i desenvolupament comparteixen la mateixa base de dades, així
que val més un script que digui què esborrarà abans de fer-ho que no anar taula
per taula.

### 11. No hi ha ni un test
Ni un, ni script de `test` al `package.json`. El 2026-09-11 van sortir tres
errors seguits —l'error fals en crear incidències, la pantalla en blanc de
consergeria i un endpoint sense permisos— i **cap el va enxampar TypeScript, ni
el lint, ni el build**: van aparèixer obrint el navegador o remenant.

No cal cobrir-ho tot. Amb les regles que fan mal si fallen n'hi hauria prou:
qui pot veure què, el càlcul del curs escolar, i el bloc d'hores seguides de
les claus. Quasi totes són funcions pures i es proven sense muntar res.

### 12. Producció i desenvolupament comparteixen base de dades
Mentre siguis tu provant, tant se val. El dia que el professorat hi entri de
debò, voldràs una base de dades a part per a desenvolupament o acabaràs amb
"dfghjmjkljh" barrejat amb incidències reals.

---

## ⚪ Menor

### 15. Els xips de filtre són enllaços que s'anuncien com a botons
`Button` amb `render={<Link/>}` genera un `<a href>` amb `role="button"`.
L'enllaç funciona (clic central, teclat), però un lector de pantalla l'anuncia
com a botó. Afecta tots els filtres de l'aplicació.

### 18. Préstecs antics sense data de retorn
Els marcats com a retornats abans d'afegir `returnedAt` surten amb "—" a la
fitxa de l'equip. Només afecta dades anteriors al canvi.

### 19. Avís de `onUploadCompleted` a cada pujada
`handleUpload` a `/api/blob/upload` declara un `onUploadCompleted` buit, i en
local Vercel no pot determinar-ne la `callbackUrl`: cada pujada deixa un avís
al log. No trenca res —el fitxer puja igual— però embruta la sortida.

### 20. Els equips de préstec a l'alumnat no surten al formulari d'incidències
El formulari d'Incidències → Nova ofereix Chromebooks per carro
(`db.cart.findMany({ include: { chromebooks } })`), i els del pool de préstec no
són de cap carro: no hi ha manera de triar-los. Pel QR sí que es pot
(`/q/chromebook/[id]` va per identificador), així que un equip amb etiqueta
queda cobert; la resta, no. Va aparèixer el 2026-09-12 amb el pool de préstec i
no es va tocar llavors perquè primer cal decidir des d'on es reporta: si des de
la fitxa de l'equip, si afegint una tercera secció al formulari, o si és el
tutor qui ho fa des de la seva pantalla.

### 21. Dades de l'alumnat: quan s'esborren i qui ho fa
Amb el préstec de Chromebooks a l'alumnat, gesTIC passarà a desar **nom i
cognoms de menors** i el motiu pel qual se'ls deixa un equip. Fins ara només hi
havia dades del professorat. Queda per decidir —i no és una decisió tècnica—
**quan s'esborren aquestes fitxes a fi de curs i qui les esborra**. Lliga amb el
§8: el dia que s'hi pugin fotos o documents amb noms d'alumnes, els blobs
públics deixen de ser assumibles.

### 22. La coordinació no té on veure els préstecs tancats
Quan es registra una devolució, la fitxa passa a RETORNADA i desapareix de la
pantalla de la coordinació: qui la conserva és el tutor, a la seva targeta. Amb
això no es pot respondre "qui tenia aquest equip el curs passat". No s'ha fet
cap pantalla d'històric a propòsit, perquè xoca de ple amb el §21: abans de
guardar historial de préstecs de menors cal haver decidit quan s'esborra.

---

## ✅ Fet

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
