# Pendents de gesTIC

Registre del que va sortint i **no** es resol sobre la marxa. Quan una cosa es
tanqui, moure-la a "Fet" amb la data. Última revisió completa: **2026-09-10**
(cada punt obert verificat contra el codi aquell dia).

---

## 🚀 Llista de desplegament

El codi ja no bloqueja res: el que queda és configuració. Per ordre:

| | Què | On |
|---|---|---|
| ☐ | Login de Google operatiu | Google Cloud Console + `AUTH_GOOGLE_*` |
| ☐ | `ADMIN_EMAILS` amb els correus dels administradors | `.env` **i** Vercel |
| ☐ | `BLOB_READ_WRITE_TOKEN` real | `.env` **i** Vercel |
| ☐ | `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Vercel (en local ja hi són) |
| ☐ | `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` | Vercel |
| ☐ | **NO** posar `ENABLE_DEV_LOGIN` a Vercel | — |
| ☐ | Que el build executi `npm run db:deploy` (migracions) | Vercel |
| ☐ | `APP_URL` amb el domini definitiu (abans d'imprimir QR!) | `.env` **i** Vercel |
| ☐ | `CRON_SECRET` per als recordatoris automàtics | Vercel |

Comprovat el 2026-09-10: el build de producció arrenca i respon sense errors.

---

## 🔴 Bloquejadors per a producció

### 1. Falten variables d'entorn
- **`ADMIN_EMAILS`** (verificat: absent del `.env`). És la llista
  d'**administradors**; sense ella ningú no pot repartir permisos i el gestor
  d'usuaris queda inaccessible per a tothom.
- **`BLOB_READ_WRITE_TOKEN`** (verificat: encara és un placeholder). Bloqueja
  pujar fotos d'inventari i de carros, i els adjunts d'incidències.
- **SMTP a Vercel**: en local ja funciona i s'ha comprovat que el correu surt;
  falta portar-ho a les variables de Vercel.

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


---

## ⚪ Menor

### 15. Els xips de filtre són enllaços que s'anuncien com a botons
`Button` amb `render={<Link/>}` genera un `<a href>` amb `role="button"`.
L'enllaç funciona (clic central, teclat), però un lector de pantalla l'anuncia
com a botó. Afecta tots els filtres de l'aplicació.

### 18. Préstecs antics sense data de retorn
Els marcats com a retornats abans d'afegir `returnedAt` surten amb "—" a la
fitxa de l'equip. Només afecta dades anteriors al canvi.

---

## ✅ Fet

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
