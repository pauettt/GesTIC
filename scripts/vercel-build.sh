#!/bin/sh
# Build de Vercel: el crida `buildCommand` a vercel.json.
#
# Les migracions només s'apliquen als desplegaments de producció. Vercel fa
# servir aquesta mateixa ordre per als previews de cada branca, i mentre
# desenvolupament i producció comparteixin base de dades (PENDENTS.md §12), una
# branca amb una migració a mig fer l'aplicaria a la base de dades real abans de
# fusionar-la.
#
# Si la migració falla, el build falla i no es desplega res: val més quedar-se
# amb la versió anterior funcionant que publicar codi contra una base de dades
# que no li correspon.
set -e

if [ "$VERCEL_ENV" = "production" ]; then
  npm run db:deploy
else
  echo "[build] entorn '${VERCEL_ENV:-desconegut}': no s'apliquen migracions"
fi

npm run build
