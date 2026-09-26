# gesTIC

Plataforma de coordinació TIC del centre: incidències, inventari i préstecs, carros de Chromebooks i préstec d'equips a l'alumnat, cites amb la coordinació, dubtes freqüents, tutorials, contrasenyes del centre i control de claus de consergeria.

Què falta, què s'ha fet i per què és a [PENDENTS.md](PENDENTS.md).

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Prisma 7** + **PostgreSQL** a Supabase, amb migracions
- **Auth.js v5** amb **Google**, restringit als comptes del Google Workspace del centre
- **Tailwind CSS 4** + **shadcn/ui** (estil `base-nova`, sobre Base UI)
- **Vercel Blob** per a les fotos i **Nodemailer** amb el Gmail del centre per als avisos

## Configuració inicial

### 1. Base de dades de producció (Supabase)

1. Crea un projecte a [supabase.com](https://supabase.com).
2. A **Project Settings → Database → Connection string**:
   - Copia la connexió en mode **Transaction pooler** (port `6543`) → `DATABASE_URL`.
   - Copia la connexió en mode **Direct connection** (port `5432`) → `DIRECT_URL`.
3. Substitueix `[YOUR-PASSWORD]` per la contrasenya real de la base de dades del projecte.

Aquestes dues adreces només van a Vercel. En local es treballa amb una base de dades pròpia (vegeu *Desenvolupament local*).

### 2. Autenticació (Google Workspace)

1. Vés a [Google Cloud Console](https://console.cloud.google.com/) → crea un projecte (o reutilitza'n un).
2. **APIs & Services → OAuth consent screen** (ara *Google Auth Platform → Audience*): **Internal** si tots els superadministradors són del domini del centre. Si `ADMIN_EMAILS` porta un compte extern (un `@gmail.com`), ha de ser **External** i **In production**: amb *Internal*, Google el rebutja amb `Error 403: org_internal` i gesTIC no arriba a veure'l. No cal cap verificació de Google, perquè només es demana el nom, el correu i la foto. Fer-la *External* no obre gesTIC: qui no és del Workspace del centre ni d'`ADMIN_EMAILS` es queda a la pantalla d'entrada.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** (tipus "Web application"):
   - **Authorized redirect URI**: `https://<el-teu-domini>/api/auth/callback/google` (i `http://localhost:3000/api/auth/callback/google` per a desenvolupament local).
4. Copia el **Client ID** i **Client Secret** a `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. Defineix `GOOGLE_WORKSPACE_DOMAIN` amb el domini del centre (ex: `elteucentre.cat`). **És obligatòria**: sense aquesta variable no hi pot entrar ningú.
6. Defineix `ADMIN_EMAILS` amb els correus dels superadministradors (`SUPER_ADMIN`), els únics que poden repartir permisos. El rol es reconcilia a cada inici de sessió. A Vercel, un canvi de variable no s'aplica fins al desplegament següent (*Deployments → Redeploy*). Si algú no pot entrar, el motiu surt als logs amb `[auth] entrada rebutjada`.

### 3. Fitxers (Vercel Blob)

Crea un store amb accés **Public** i copia el token a `BLOB_READ_WRITE_TOKEN`. Ha de ser públic perquè el codi puja amb `access: "public"`, i l'accés d'un store no es pot canviar un cop creat.

### 4. Variables d'entorn

Copia `.env.example` a `.env` i omple els valors. Cada variable hi porta explicat per a què serveix.

`AUTH_SECRET` es pot generar amb:

```bash
npx auth secret
```

## Desenvolupament local

En local es treballa amb una base de dades pròpia, `gestic_dev`, al PostgreSQL de l'ordinador (per exemple, `brew install postgresql@16`). **Mai no s'hi posa la de Supabase**: les dades de producció són reals.

```bash
npm install
createdb gestic_dev
```

Al `.env`, `DATABASE_URL` i `DIRECT_URL` han d'apuntar a `postgresql://<usuari>@localhost:5432/gestic_dev`. Després:

```bash
npm run db:deploy   # aplica les migracions
npm run db:seed     # aules, equips i un carro d'exemple
npm run dev
```

Amb `ENABLE_DEV_LOGIN="true"` al `.env`, la pantalla d'inici de sessió ofereix botons per entrar amb cada rol sense passar per Google. En producció no s'activa mai, encara que la variable hi sigui.

## Migracions

Cada canvi d'esquema va amb una migració a `prisma/migrations/`, que es genera en local contra `gestic_dev` amb `npm run db:migrate`. En desplegar a producció, [scripts/vercel-build.sh](scripts/vercel-build.sh) les aplica abans del build. Als previews no: a Vercel apunten a la mateixa base de dades que producció.

## Còpies de seguretat

El pla gratuït de Supabase no fa còpies diàries, i les dades de producció són reals. La còpia es fa a mà des d'aquest ordinador:

```bash
BACKUP_DATABASE_URL="<DIRECT_URL del projecte de Supabase>" npm run db:backup
```

Ha de ser l'adreça del **port 5432** (*Direct connection* o *Session pooler*), no la del 6543: aquella és el pooler en mode transacció, que no manté la sessió i dona problemes amb les consultes preparades. A Vercel, la del 5432 és `DIRECT_URL` i la del 6543 és `DATABASE_URL`.

Deixa un JSON datat a `backups/` (fora del repositori) amb totes les taules menys les sessions i els testimonis, que caduquen i no serveixen per restaurar res. Sense `BACKUP_DATABASE_URL` copia la base de dades local, cosa que només serveix per comprovar que l'script va bé.

Amb `BACKUP_DIR` el fitxer va directament on es digui, que és el que convé: una còpia al mateix ordinador no és una còpia de seguretat.

```bash
BACKUP_DATABASE_URL="<DIRECT_URL>" BACKUP_DIR="$HOME/Library/CloudStorage/GoogleDrive-<usuari>/La meva unitat/gesTIC" npm run db:backup
```

**El fitxer porta dades personals, també de menors.** Ha d'anar a un lloc del centre —el NAS, el Drive del Workspace—, mai a un compte particular, i tractat com el que és.

### Cada setmana, sense pensar-hi

A l'ordinador de la coordinació hi ha una tasca que la fa cada dilluns a les 9. Si el Mac dorm, macOS l'executa en despertar-lo; si està apagat, a l'arrencada següent: arriba tard, però no es perd. Per instal·lar-la:

```bash
sed "s|__RUTA_DEL_PROJECTE__|$PWD|" scripts/com.gestic.backup.plist > ~/Library/LaunchAgents/com.gestic.backup.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.gestic.backup.plist
```

Abans cal tenir `BACKUP_DATABASE_URL` i `BACKUP_DIR` al `.env`: sense la primera, la tasca no fa res i ho diu al registre, en comptes de copiar la base de dades local i semblar que ha anat bé.

Per provar-la sense esperar al dilluns, `launchctl kickstart -k gui/$(id -u)/com.gestic.backup`. El registre és a `~/Library/Logs/gestic-backup.log`, i per treure-la, `launchctl bootout gui/$(id -u)/com.gestic.backup`.

Això depèn que el Mac estigui engegat. Si algun dia ha de ser independent del tot, el lloc natural és el NAS mateix (Task Scheduler del DSM), que no s'apaga.

## Proves

- **`npm test`**: proves unitàries (Vitest) de les regles que fan mal si fallen —dates i curs escolar, estat dels Chromebooks, préstecs, claus, permisos, xifrat de les contrasenyes i validacions—. Triguen menys d'un segon i no toquen cap base de dades.
- **`npm run test:e2e`**: proves end-to-end (Playwright) que recorren l'aplicació amb cada rol: permisos, incidències, QR, préstec a l'alumnat, reserves, claus, préstecs, cites, tutorials, contrasenyes i importació de Chromebooks. Compilen l'aplicació i l'executen contra un **PostgreSQL local** (`gestic_e2e`) que es buida i es torna a omplir a cada execució. No envien correus ni pugen fitxers, i no arrenquen si la base de dades no és local i de proves.

Per preparar-les el primer cop:

```bash
createdb gestic_e2e
npx playwright install chromium
```

## Scripts

| Script               | Descripció                                                      |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolupament                                     |
| `npm run build`      | Build de producció (no aplica migracions)                       |
| `npm run start`      | Servidor de producció (després de `build`)                      |
| `npm run lint`       | ESLint                                                          |
| `npm test`           | Proves unitàries                                                |
| `npm run test:watch` | Proves unitàries, tornant-les a passar a cada canvi             |
| `npm run test:e2e`   | Proves end-to-end (vegeu *Proves*)                              |
| `npm run db:deploy`  | Aplica les migracions pendents                                  |
| `npm run db:migrate` | Crea una migració nova (`prisma migrate dev`), només contra `gestic_dev` |
| `npm run db:seed`    | Carrega dades d'exemple a `gestic_dev`                          |
| `npm run db:backup`  | Còpia de seguretat de les dades en JSON (vegeu *Còpies de seguretat*) |
| `npm run db:studio`  | Obre Prisma Studio                                              |

## Desplegament (Vercel)

1. Importa el repositori a [Vercel](https://vercel.com/new).
2. Configura les variables de `.env.example` a **Project Settings → Environment Variables**, totes excepte `ENABLE_DEV_LOGIN`. `DATABASE_URL` i `DIRECT_URL` són les de Supabase.
3. Afegeix el domini definitiu a les URI de redirecció autoritzades de Google Cloud, i posa'l a `APP_URL` **abans d'imprimir cap etiqueta QR**.
4. `vercel.json` ja programa els dos crons (`/api/cron/loan-reminders`, cada dia lectiu, i `/api/cron/keep-alive`, cada dia); sense `CRON_SECRET` no s'executen.
5. Afegeix `VAULT_ENCRYPTION_KEY`, generada un sol cop, i guarda-la també fora del servidor: sense ella, les contrasenyes desades no es poden recuperar. En local se'n fa servir una altra.

## Rols

- **Superadministrador/a (`SUPER_ADMIN`)**: tot el que fa la coordinació, i a més reparteix permisos i treu l'accés a qui deixa el centre (*Usuaris i permisos*), manté els noms dels conserges i té la pàgina *Administració*: estat de la configuració amb un correu de prova, quines dades personals es guarden, esborrat de les dades de prova i registre d'activitat. És qui gestiona les categories de contrasenyes, les importa i veu les marcades com a només seves. Es defineix a `ADMIN_EMAILS`.
- **Coordinador/a TIC (`ADMIN`)**: incidències, inventari i préstecs, carros i pool de Chromebooks, cites, dubtes, tutorials, claus i contrasenyes (menys les reservades al superadministrador).
- **Consergeria (`CONSERGERIA`)**: compte compartit del taulell; només veu el control de claus.
- **Professorat (`PROFESSOR`)**: reporta incidències, reserva carros (també cada setmana, amb una reserva fixa que aprova la coordinació) o equips sols d'un carro, demana material i cites i fa consultes.

A banda del rol, qualsevol usuari que no sigui consergeria pot portar la marca de **tutor/a**, que li permet demanar Chromebooks en préstec per a l'alumnat del seu grup. La posa i la treu el superadministrador/a.

Els permisos es canvien a *Usuaris i permisos* (`/usuaris`), no a la base de dades.
