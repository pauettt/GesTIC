#!/bin/sh
# Còpia de seguretat setmanal. La llança launchd, no una persona: vegeu
# `scripts/com.gestic.backup.plist` i l'apartat *Còpies de seguretat* del README.
#
# Tot queda al registre, perquè ningú no mira la pantalla quan això s'executa:
#   tail ~/Library/Logs/gestic-backup.log
LOG="$HOME/Library/Logs/gestic-backup.log"
exec >>"$LOG" 2>&1

echo "--- $(date '+%F %T')"

# launchd arrenca amb un entorn mínim: sense aquest PATH no troba ni node ni npm.
PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
export PATH

cd "$(dirname "$0")/.." || exit 1

# Sense l'adreça de producció copiaria la base de dades local i el registre diria
# que tot ha anat bé. Val més que falli i es vegi.
if ! grep -q "^BACKUP_DATABASE_URL=" .env 2>/dev/null; then
  echo "Falta BACKUP_DATABASE_URL al .env: no es fa cap còpia."
  exit 1
fi

npm run --silent db:backup
