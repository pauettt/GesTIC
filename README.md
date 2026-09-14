# gesTIC

Plataforma de coordinació TIC del centre: incidències, inventari i préstecs, carros de Chromebooks i préstec d'equips a l'alumnat, cites amb la coordinació, dubtes freqüents, tutorials i control de claus de consergeria.

Què falta, què s'ha fet i per què és a [PENDENTS.md](PENDENTS.md).

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Prisma 7** + **PostgreSQL** a Supabase, amb migracions
- **Auth.js v5** amb **Google**, restringit als comptes del Google Workspace del centre
- **Tailwind CSS 4** + **shadcn/ui** (estil `base-nova`, sobre Base UI)
- **Vercel Blob** per a les fotos i **Nodemailer** amb el Gmail del centre per als avisos

## Configuració inicial

### 1. Base de dades (Supabase)

1. Crea un projecte a [supabase.com](https://supabase.com).
2. A **Project Settings → Database → Connection string**:
   - Copia la connexió en mode **Transaction pooler** (port `6543`) → `DATABASE_URL`.
   - Copia la connexió en mode **Direct connection** (port `5432`) → `DIRECT_URL`.
3. Substitueix `[YOUR-PASSWORD]` per la contrasenya real de la base de dades del projecte.

### 2. Autenticació (Google Workspace)

1. Vés a [Google Cloud Console](https://console.cloud.google.com/) → crea un projecte (o reutilitza'n un).
2. **APIs & Services → OAuth consent screen**: configura'l com a intern/extern segons el domini del centre.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** (tipus "Web application"):
   - **Authorized redirect URI**: `https://<el-teu-domini>/api/auth/callback/google` (i `http://localhost:3000/api/auth/callback/google` per a desenvolupament local).
4. Copia el **Client ID** i **Client Secret** a `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
5. Defineix `GOOGLE_WORKSPACE_DOMAIN` amb el domini del centre (ex: `elteucentre.cat`). **És obligatòria**: sense aquesta variable no hi pot entrar ningú.
6. Defineix `ADMIN_EMAILS` amb els correus dels superadministradors (`SUPER_ADMIN`), els únics que poden repartir permisos. El rol es reconcilia a cada inici de sessió.

### 3. Fitxers (Vercel Blob)

Crea un store amb accés **Public** i copia el token a `BLOB_READ_WRITE_TOKEN`. Ha de ser públic perquè el codi puja amb `access: "public"`, i l'accés d'un store no es pot canviar un cop creat.

### 4. Variables d'entorn

Copia `.env.example` a `.env` i omple els valors. Cada variable hi porta explicat per a què serveix.

`AUTH_SECRET` es pot generar amb:

```bash
npx auth secret
```

## Desenvolupament local

```bash
npm install
npm run dev
```

Amb `ENABLE_DEV_LOGIN="true"` al `.env`, la pantalla d'inici de sessió ofereix botons per entrar amb cada rol sense passar per Google. En producció no s'activa mai, encara que la variable hi sigui.

> **Compte:** ara mateix desenvolupament i producció comparteixen la mateixa base de dades (PENDENTS.md §12). Tot el que facis en local ho fas sobre les dades reals. No executis `npm run db:migrate` ni `npm run db:seed` fins que desenvolupament en tingui una de pròpia.

## Migracions

Cada canvi d'esquema va amb una migració a `prisma/migrations/`. En desplegar a producció, [scripts/vercel-build.sh](scripts/vercel-build.sh) les aplica abans del build. Als previews no, perquè apuntarien a la mateixa base de dades.

## Proves

- **`npm test`**: proves unitàries (Vitest) de les regles que fan mal si fallen —dates i curs escolar, estat dels Chromebooks, préstecs, claus, permisos i validacions—. Triguen menys d'un segon i no toquen cap base de dades.
- **`npm run test:e2e`**: proves end-to-end (Playwright) que recorren l'aplicació amb cada rol: permisos, incidències, QR, préstec a l'alumnat, reserves, claus, préstecs i cites. Compilen l'aplicació i l'executen contra un **PostgreSQL local** (`gestic_e2e`) que es buida i es torna a omplir a cada execució. No envien correus ni pugen fitxers, i no arrenquen si la base de dades no és local i de proves.

Per preparar-les el primer cop cal PostgreSQL a l'ordinador (per exemple, `brew install postgresql@16`):

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
| `npm run db:migrate` | Crea una migració nova (`prisma migrate dev`); vegeu l'avís de dalt |
| `npm run db:seed`    | Carrega dades d'exemple; vegeu l'avís de dalt                   |
| `npm run db:studio`  | Obre Prisma Studio                                              |

## Desplegament (Vercel)

1. Importa el repositori a [Vercel](https://vercel.com/new).
2. Configura les variables de `.env.example` a **Project Settings → Environment Variables**, totes excepte `ENABLE_DEV_LOGIN`.
3. Afegeix el domini definitiu a les URI de redirecció autoritzades de Google Cloud, i posa'l a `APP_URL` **abans d'imprimir cap etiqueta QR**.
4. `vercel.json` ja programa els dos crons (`/api/cron/loan-reminders` i `/api/cron/keep-alive`); sense `CRON_SECRET` no s'executen.

## Rols

- **Superadministrador/a (`SUPER_ADMIN`)**: tot el que fa la coordinació, i a més reparteix permisos i treu l'accés a qui deixa el centre (*Usuaris i permisos*), manté els noms dels conserges i té la pàgina *Administració*: estat de la configuració amb un correu de prova, quines dades personals es guarden, esborrat de les dades de prova i registre d'activitat. Es defineix a `ADMIN_EMAILS`.
- **Coordinador/a TIC (`ADMIN`)**: incidències, inventari i préstecs, carros i pool de Chromebooks, cites, dubtes, tutorials i claus.
- **Consergeria (`CONSERGERIA`)**: compte compartit del taulell; només veu el control de claus.
- **Professorat (`PROFESSOR`)**: reporta incidències, reserva carros, demana material i cites i fa consultes.

A banda del rol, qualsevol usuari que no sigui consergeria pot portar la marca de **tutor/a**, que li permet demanar Chromebooks en préstec per a l'alumnat del seu grup. La posa i la treu el superadministrador/a.

Els permisos es canvien a *Usuaris i permisos* (`/usuaris`), no a la base de dades.
