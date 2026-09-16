#!/bin/sh
# Build de Vercel: el crida `buildCommand` a vercel.json.
#
# Les migracions només s'apliquen als desplegaments de producció. Vercel fa
# servir aquesta mateixa ordre per als previews de cada branca, que a Vercel
# apunten a la mateixa base de dades que producció: una branca amb una migració a
# mig fer l'aplicaria a la base de dades real abans de fusionar-la.
#
# Si la migració falla, el build falla i no es desplega res: val més quedar-se
# amb la versió anterior funcionant que publicar codi contra una base de dades
# que no li correspon.
set -e

if [ "$VERCEL_ENV" = "production" ]; then
  npm run db:deploy
  # Cada taula nova neix sense RLS, i a Supabase l'esquema `public` és el que
  # publica la Data API. Això la torna a activar a totes; vegeu prisma/rls.sql.
  npx prisma db execute --file prisma/rls.sql
else
  echo "[build] entorn '${VERCEL_ENV:-desconegut}': no s'apliquen migracions"
fi

npm run build
