-- Activa Row Level Security a totes les taules de `public` que encara no en
-- tinguin. S'executa a cada desplegament de producció (scripts/vercel-build.sh),
-- just després de les migracions.
--
-- Per què a cada desplegament i no només un cop: cada taula nova neix sense RLS,
-- i a Supabase l'esquema `public` és el que publica la Data API. Deixar-ho en
-- mans de recordar-se'n a cada migració nova seria qüestió de temps.
--
-- El primer cop el va fer la migració `20260916100000_rls_a_totes_les_taules`,
-- amb el mateix bloc i el perquè explicat. No fa res a les taules que ja la
-- tenen, i no hi posa cap política: sense polítiques, els rols de l'API (`anon`
-- i `authenticated`) no veuen res, mentre que gesTIC hi entra amb el rol
-- propietari de les taules, que se salta RLS.

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
    RAISE NOTICE 'RLS activat a %', taula.relname;
  END LOOP;
END $$;
