-- Row Level Security a totes les taules (2026-09-16).
--
-- Supabase publica l'esquema `public` amb la seva API REST: sense RLS, qui
-- tingui la clau `anon` del projecte pot llegir, canviar i esborrar qualsevol
-- taula, i les sessions (`Session`), els testimonis de Google (`Account`) i els
-- noms de menors (`StudentDeviceRequest`) hi són. La Data API s'ha desactivat
-- des del panell; això és el pany de dins, per si mai es torna a activar.
--
-- No s'hi posa cap política a propòsit: sense polítiques, els rols de l'API
-- (`anon` i `authenticated`) no veuen res de res. gesTIC no hi entra per aquí,
-- sinó amb una connexió directa a PostgreSQL i amb el rol propietari de les
-- taules, i el propietari se salta RLS mentre no s'hi forci (FORCE ROW LEVEL
-- SECURITY): l'aplicació continua funcionant igual.
--
-- El bucle les agafa totes, també `_prisma_migrations`, i es pot tornar a
-- executar sense fer res: només toca les que encara no la tenen.

DO $$
DECLARE
  taula record;
BEGIN
  FOR taula IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', taula.relname);
  END LOOP;
END $$;
