-- Migración: separar nombre completo y acrónimo de empresas.
-- Ejecutar una sola vez en Supabase: SQL Editor > New query > Run.
--
-- Regla de uso:
--   * catalogos_empresas.nombre    = nombre completo (Personal / Empleados)
--   * catalogos_empresas.acronimo  = 3 letras (Equipos)
--
-- Las empresas existentes, excepto ITZ OIL & GAS, permanecen sin acrónimo
-- para que se complete manualmente desde Catálogos sin inventar abreviaturas.

BEGIN;

ALTER TABLE public.catalogos_empresas
  ADD COLUMN IF NOT EXISTS acronimo VARCHAR(3);

-- Normalizar valores capturados previamente, por si hubiera alguno.
UPDATE public.catalogos_empresas
SET acronimo = UPPER(BTRIM(acronimo))
WHERE acronimo IS NOT NULL;

-- Empresa conocida del sistema.
UPDATE public.catalogos_empresas
SET acronimo = 'ITZ'
WHERE UPPER(BTRIM(nombre)) = 'ITZ OIL & GAS'
  AND acronimo IS NULL;

-- Cada acrónimo debe ser exactamente de tres letras mayúsculas.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'catalogos_empresas_acronimo_format_check'
      AND conrelid = 'public.catalogos_empresas'::regclass
  ) THEN
    ALTER TABLE public.catalogos_empresas
      ADD CONSTRAINT catalogos_empresas_acronimo_format_check
      CHECK (acronimo IS NULL OR acronimo ~ '^[A-Z]{3}$');
  END IF;
END $$;

-- Permite varios registros sin acrónimo durante la transición, pero no acrónimos repetidos.
CREATE UNIQUE INDEX IF NOT EXISTS catalogos_empresas_acronimo_unique
  ON public.catalogos_empresas (acronimo)
  WHERE acronimo IS NOT NULL;

COMMIT;

-- Verificación posterior: deben aparecer el nombre completo y el acrónimo.
SELECT id, nombre, acronimo
FROM public.catalogos_empresas
ORDER BY nombre;
