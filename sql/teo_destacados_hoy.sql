-- ==========================================================================
-- teo_destacados_hoy() — Quién ha respondido más tutelas y peticiones HOY
-- Sistema Teodoro · Desarrollado por Jeison Maya · 2026
--
-- Para la tarjeta «Respondidas hoy» de la portada.
-- Devuelve SOLO totales por persona (nombre y cantidad): no expone casos,
-- radicados ni datos de ciudadanos. Por eso usa SECURITY DEFINER: así todos
-- ven el mismo ranking aunque las reglas RLS solo les dejen ver sus propios casos.
--
-- Qué cuenta como «respondida hoy» (hora de Colombia):
--   · Tutelas:    actuaciones_tutela con estado Respondido, Finalizado o Hecho
--                 superado y FECHA CIERRE = hoy (Tutelas la pone al cerrar).
--                 Se agrupa por RESPONSABLE.
--   · Peticiones: pet_peticiones RESPONDIDA, TRASLADADA o CERRADA con fecha de
--                 respuesta (o de cierre) = hoy. Se agrupa por el abogado
--                 asignado (pet_perfiles.nombre). Las trasladadas cuentan como
--                 contestadas, igual que en los informes de gestión.
--
-- CÓMO SE INSTALA: copiar todo y ejecutarlo una vez en Supabase → SQL Editor.
-- Se puede volver a ejecutar sin problema (CREATE OR REPLACE).
-- ==========================================================================

create or replace function public.teo_destacados_hoy()
returns table (modulo text, nombre text, total integer)
language sql
stable
security definer
set search_path = public
as $$
  with hoy as (
    select to_char((now() at time zone 'America/Bogota')::date, 'YYYY-MM-DD') as d
  )
  select 'tutelas'::text,
         trim(t.responsable)::text,
         count(*)::int
  from actuaciones_tutela t, hoy
  where t.estado in ('Respondido', 'Finalizado', 'Hecho superado')
    and left(t.fecha_cierre::text, 10) = hoy.d
    and coalesce(trim(t.responsable), '') <> ''
  group by trim(t.responsable)

  union all

  select 'peticiones'::text,
         p.nombre::text,
         count(*)::int
  from pet_peticiones x
  join pet_perfiles p on p.id = x.asignado_a, hoy
  where x.estado in ('RESPONDIDA', 'TRASLADADA', 'CERRADA')
    and left(coalesce(x.fecha_respuesta::text, x.fecha_cierre::text), 10) = hoy.d
  group by p.nombre

  order by 1, 3 desc, 2;
$$;

-- Solo usuarios con sesión iniciada pueden consultarla.
revoke all on function public.teo_destacados_hoy() from public;
revoke all on function public.teo_destacados_hoy() from anon;
grant execute on function public.teo_destacados_hoy() to authenticated;

-- Prueba rápida (debe devolver filas o vacío, sin error):
-- select * from public.teo_destacados_hoy();
