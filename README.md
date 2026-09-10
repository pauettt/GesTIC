# CoordTIC

Plataforma de coordinació TIC del centre: incidències, inventari TIC, carros de Chromebooks, formació del professorat, dubtes freqüents i tutorials.

## Stack

- **Next.js 16** (App Router, TypeScript, Server Actions)
- **Prisma 7** + **PostgreSQL** (pensat per a Supabase)
- **Auth.js v5** amb **Google** (restringit al domini Google Workspace del centre)
- **Tailwind CSS 4** + **shadcn/ui** (estil `base-nova`, sobre Base UI)
- **Vercel Blob** per als fitxers adjunts

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
5. Defineix `GOOGLE_WORKSPACE_DOMAIN` amb el domini del centre (ex: `elteucentre.cat`) perquè només aquest domini pugui iniciar sessió.
6. Defineix `ADMIN_EMAILS` amb els correus que han de rebre el rol de coordinador/a TIC (`ADMIN`) automàticament en el primer inici de sessió.

### 3. Fitxers adjunts (Vercel Blob)

Un cop desplegat a Vercel, activa **Vercel Blob** des del dashboard del projecte i copia el token a `BLOB_READ_WRITE_TOKEN`.

### 4. Variables d'entorn

Copia `.env.example` a `.env.local` (desenvolupament) i omple els valors:

```bash
cp .env.example .env.local
```

`AUTH_SECRET` es pot generar amb:

```bash
npx auth secret
```

## Desenvolupament local

```bash
npm install
npx prisma db push   # crea les taules a la base de dades
npm run db:seed      # (opcional) dades d'exemple
npm run dev
```

## Scripts

| Script            | Descripció                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`      | Servidor de desenvolupament                  |
| `npm run build`    | Build de producció                           |
| `npm run start`    | Servidor de producció (després de `build`)   |
| `npm run lint`     | ESLint                                       |
| `npm run db:push`  | Sincronitza l'esquema Prisma amb la BD       |
| `npm run db:migrate` | Crea/aplica migracions Prisma              |
| `npm run db:seed`  | Carrega dades d'exemple                      |
| `npm run db:studio`| Obre Prisma Studio                           |

## Desplegament (Vercel)

1. Puja el projecte a un repositori Git i importa'l a [Vercel](https://vercel.com/new).
2. Configura totes les variables de `.env.example` a **Project Settings → Environment Variables**.
3. Un cop desplegat, actualitza la **Authorized redirect URI** a Google Cloud amb el domini definitiu.

## Rols

- **ADMIN** (coordinador/a TIC): gestiona inventari, carros de Chromebooks, formacions, dubtes freqüents, tutorials i veu totes les incidències.
- **PROFESSOR**: reporta incidències, reserva carros de Chromebooks, s'inscriu a formacions i consulta dubtes/tutorials.

El primer usuari amb un correu inclòs a `ADMIN_EMAILS` rep el rol `ADMIN` automàticament en iniciar sessió per primer cop. Per afegir més coordinadors/es TIC més endavant, actualitza `ADMIN_EMAILS` (per a nous usuaris) o canvia el camp `role` directament a la base de dades (per a usuaris existents).
