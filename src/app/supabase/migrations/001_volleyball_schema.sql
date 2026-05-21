-- Volleyball Analytics System - Complete Schema Migration
-- UUIDs, Timestamps, RLS, and Professional Structure

-- 1) Extensions and helpers
create extension if not exists pgcrypto;        -- gen_random_uuid()
create extension if not exists pg_trgm;         -- fast LIKE searches

-- 2) Base schema with UUID + timestamps + RLS

-- ORGANIZATIONS, USERS AND TEAMS
create table if not exists orgs (
  org_id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Maps auth.users to an org
create table if not exists org_members (
  org_id uuid references orgs(org_id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  rol text check (rol in ('admin','coach','analista','scouter')) not null default 'coach',
  activo boolean not null default true,
  primary key (org_id, user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists equipos (
  equipo_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  nombre text not null,
  temporada text not null,
  categoria text,
  division text,
  entrenador_principal text,
  color_primario text default '#2563EB',
  color_secundario text default '#ffffff',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jugadores (
  jugador_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  nombre text not null,
  apellidos text,
  apodo text,
  fecha_nac date,
  altura_cm smallint,
  peso_kg numeric(5,2),
  alcance_mano_alzada_cm smallint,
  alcance_salto_cm smallint,
  envergadura_cm smallint,
  alcance_bloqueo_cm smallint,
  alcance_ataque_cm smallint,
  mano_habil text check (mano_habil in ('IZQ','DER','AMB')) default 'DER',
  pais text,
  estado text,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jugador_equipo (
  jugador_equipo_id uuid primary key default gen_random_uuid(),
  jugador_id uuid not null references jugadores(jugador_id) on delete cascade,
  equipo_id uuid not null references equipos(equipo_id) on delete cascade,
  dorsal smallint,
  posicion_principal text check (posicion_principal in ('Punta','Opuesto','Colocador','Central','Líbero')),
  es_libero boolean not null default false,
  es_capitan boolean not null default false,
  activo boolean not null default true,
  fecha_ingreso date default current_date,
  fecha_salida date,
  unique (jugador_id, equipo_id),
  unique (equipo_id, dorsal),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- COMPETITIONS AND MATCHES
create table if not exists competencias (
  competencia_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  nombre text not null,
  tipo text check (tipo in ('Liga','Copa','Torneo','Amistoso','Ranking')) default 'Liga',
  nivel text,
  temporada text not null,
  fecha_inicio date,
  fecha_fin date,
  formato text, -- 'Mejor de 3', 'Mejor de 5', etc.
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists partidos (
  partido_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  competencia_id uuid references competencias(competencia_id),
  fecha timestamptz not null,
  sede text,
  equipo_local_id uuid references equipos(equipo_id),
  equipo_visitante_id uuid references equipos(equipo_id),
  mejor_de smallint not null default 5,
  sets_ganados_local smallint default 0,
  sets_ganados_visitante smallint default 0,
  equipo_ganador_id uuid references equipos(equipo_id),
  arbitro_principal text,
  arbitro_auxiliar text,
  anotador text,
  estado text check (estado in ('programado','en_curso','finalizado','suspendido','cancelado')) default 'programado',
  resultado_texto text,
  mvp_local_id uuid references jugadores(jugador_id),
  mvp_visitante_id uuid references jugadores(jugador_id),
  side_out_local numeric(5,2),
  side_out_visitante numeric(5,2),
  transition_local numeric(5,2),
  transition_visitante numeric(5,2),
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_partidos_fecha on partidos(fecha);
create index if not exists idx_partidos_estado on partidos(estado);

create table if not exists sets (
  set_id uuid primary key default gen_random_uuid(),
  partido_id uuid not null references partidos(partido_id) on delete cascade,
  numero smallint not null check (numero between 1 and 5),
  puntos_local smallint not null default 0,
  puntos_visitante smallint not null default 0,
  ganador_equipo_id uuid references equipos(equipo_id),
  duracion_minutos smallint,
  timeouts_local smallint default 0,
  timeouts_visitante smallint default 0,
  sustituciones_local smallint default 0,
  sustituciones_visitante smallint default 0,
  unique (partido_id, numero),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finalizado_at timestamptz
);

-- ROTATIONS
create table if not exists rotacion_inicial (
  rotacion_inicial_id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sets(set_id) on delete cascade,
  equipo_id uuid not null references equipos(equipo_id) on delete cascade,
  p1_jugador_id uuid references jugadores(jugador_id),
  p2_jugador_id uuid references jugadores(jugador_id),
  p3_jugador_id uuid references jugadores(jugador_id),
  p4_jugador_id uuid references jugadores(jugador_id),
  p5_jugador_id uuid references jugadores(jugador_id),
  p6_jugador_id uuid references jugadores(jugador_id),
  libero_jugador_id uuid references jugadores(jugador_id),
  equipo_que_saca boolean not null default false,
  unique (set_id, equipo_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rallies (
  rally_id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sets(set_id) on delete cascade,
  numero smallint not null,
  equipo_saca_id uuid references equipos(equipo_id),
  jugador_saca_id uuid references jugadores(jugador_id),
  equipo_anota_id uuid references equipos(equipo_id),
  causa_punto text, -- 'kill', 'ace', 'error_rival', 'bloqueo', etc.
  punto_local smallint,
  punto_visitante smallint,
  duracion_seg smallint,
  rotacion_local smallint check (rotacion_local between 1 and 6),
  rotacion_visitante smallint check (rotacion_visitante between 1 and 6),
  nota text,
  unique (set_id, numero),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists snapshot_rotacion_rally (
  snapshot_id uuid primary key default gen_random_uuid(),
  rally_id uuid not null references rallies(rally_id) on delete cascade,
  equipo_id uuid not null references equipos(equipo_id) on delete cascade,
  rotacion smallint check (rotacion between 1 and 6),
  p1_jugador_id uuid references jugadores(jugador_id),
  p2_jugador_id uuid references jugadores(jugador_id),
  p3_jugador_id uuid references jugadores(jugador_id),
  p4_jugador_id uuid references jugadores(jugador_id),
  p5_jugador_id uuid references jugadores(jugador_id),
  p6_jugador_id uuid references jugadores(jugador_id),
  libero_jugador_id uuid references jugadores(jugador_id),
  created_at timestamptz not null default now()
);

create table if not exists sustituciones (
  sustitucion_id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sets(set_id) on delete cascade,
  equipo_id uuid not null references equipos(equipo_id),
  rally_numero smallint,
  entra_jugador_id uuid references jugadores(jugador_id),
  sale_jugador_id uuid references jugadores(jugador_id),
  posicion smallint check (posicion between 1 and 6),
  es_libero boolean not null default false,
  motivo text check (motivo in ('tactical','injury','performance','rotation','disciplinary')),
  created_at timestamptz not null default now()
);

create table if not exists tiempos_fuera (
  tiempo_fuera_id uuid primary key default gen_random_uuid(),
  set_id uuid not null references sets(set_id) on delete cascade,
  equipo_id uuid not null references equipos(equipo_id),
  rally_numero smallint,
  tipo text check (tipo in ('tecnico','medico')) default 'tecnico',
  duracion_seg smallint default 30,
  motivo text,
  created_at timestamptz not null default now()
);

-- CATALOGS
create table if not exists cat_tipo_evento (tipo_evento text primary key);
create table if not exists cat_resultado   (resultado   text primary key);
create table if not exists cat_tipo_saque  (tipo_saque  text primary key);
create table if not exists cat_zona        (zona        text primary key);

insert into cat_tipo_evento values
('saque'),('recepcion'),('colocacion'),('ataque'),('bloqueo'),('defensa'),('error'),('falta')
on conflict do nothing;

insert into cat_resultado values
('punto'),('continuacion'),('error_propio'),('error_rival'),('bloqueo_tocado'),('bloqueo_punto'),('ace'),('kill')
on conflict do nothing;

insert into cat_tipo_saque values
('flotado'),('salto_flotado'),('potente'),('mano_baja'),('jump_serve')
on conflict do nothing;

insert into cat_zona values ('1'),('2'),('3'),('4'),('5'),('6'),('A'),('B'),('C'),('D')
on conflict do nothing;

-- GRANULAR EVENTS
create table if not exists eventos (
  evento_id uuid primary key default gen_random_uuid(),
  rally_id uuid not null references rallies(rally_id) on delete cascade,
  secuencia smallint not null,
  tipo_evento text references cat_tipo_evento(tipo_evento),
  equipo_id uuid references equipos(equipo_id),
  jugador_id uuid references jugadores(jugador_id),
  zona_origen text references cat_zona(zona),
  zona_objetivo text references cat_zona(zona),
  resultado text references cat_resultado(resultado),
  velocidad_kmh numeric(5,2),
  recepcion_calidad smallint check (recepcion_calidad between 0 and 3),
  altura_red_cm smallint, -- para ataques y bloqueos
  tiempo_contacto_ms smallint, -- para saques y ataques
  tags jsonb,
  coordenada_x numeric(5,2), -- posición en cancha 0-100
  coordenada_y numeric(5,2), -- posición en cancha 0-100
  created_at timestamptz not null default now()
);
create index if not exists idx_eventos_rally on eventos(rally_id, secuencia);
create index if not exists idx_eventos_jugador on eventos(jugador_id);
create index if not exists idx_eventos_tipo on eventos(tipo_evento);

-- SERVE FACTS (for quick dashboards)
create table if not exists hechos_saque (
  id uuid primary key default gen_random_uuid(),
  partido_id uuid references partidos(partido_id) on delete cascade,
  set_num smallint,
  rally_id uuid references rallies(rally_id) on delete set null,
  equipo_id uuid references equipos(equipo_id),
  jugador_id uuid references jugadores(jugador_id),
  tipo_saque text references cat_tipo_saque(tipo_saque),
  zona_origen text references cat_zona(zona),
  zona_objetivo text references cat_zona(zona),
  velocidad_kmh numeric(5,2),
  recepcion_calidad smallint,
  resultado text references cat_resultado(resultado),
  p_ganar_rally_post_saque numeric(5,2),
  punto_para_nosotros boolean,
  rotacion_propia smallint,
  rotacion_rival smallint,
  marcador_local smallint,
  marcador_visitante smallint,
  created_at timestamptz not null default now()
);
create index if not exists idx_hechos_saque_dim 
  on hechos_saque(equipo_id, jugador_id, tipo_saque, zona_origen, zona_objetivo);

-- PHYSICAL TESTS
create table if not exists tests_fisicos (
  test_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  jugador_id uuid not null references jugadores(jugador_id) on delete cascade,
  tipo_test text not null, -- 'salto_vertical', 'velocidad_20m', 'agilidad_t', etc.
  valor numeric(8,3) not null,
  unidad text not null, -- 'cm', 'seg', 'kg', etc.
  fecha_test date not null default current_date,
  condiciones text, -- 'pre_temporada', 'post_partido', etc.
  evaluador text,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tests_jugador_fecha on tests_fisicos(jugador_id, fecha_test);

-- LOAD MANAGEMENT
create table if not exists cargas_entrenamiento (
  carga_id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(org_id) on delete cascade,
  jugador_id uuid not null references jugadores(jugador_id) on delete cascade,
  fecha date not null,
  tipo_sesion text check (tipo_sesion in ('entrenamiento','partido','recuperacion','descanso')),
  duracion_minutos smallint,
  intensidad_subjetiva smallint check (intensidad_subjetiva between 1 and 10), -- RPE
  carga_externa jsonb, -- GPS data, jumps, accelerations, etc.
  carga_interna jsonb, -- HR zones, HRV, etc.
  wellness_pre jsonb, -- sleep, stress, fatigue, soreness
  wellness_post jsonb,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cargas_jugador_fecha on cargas_entrenamiento(jugador_id, fecha);

-- MATERIALIZED VIEWS for fast queries
create materialized view if not exists mv_rallies as
select
  r.rally_id, s.set_id, s.numero as set_num, p.partido_id, p.fecha,
  p.equipo_local_id, p.equipo_visitante_id,
  r.equipo_saca_id, r.jugador_saca_id,
  r.equipo_anota_id, r.causa_punto,
  r.punto_local, r.punto_visitante, r.duracion_seg,
  r.rotacion_local, r.rotacion_visitante
from rallies r
join sets s on s.set_id = r.set_id
join partidos p on p.partido_id = s.partido_id;

create materialized view if not exists mv_eventos as
select
  e.evento_id, e.rally_id, e.secuencia, e.tipo_evento, e.resultado,
  e.equipo_id, e.jugador_id, e.zona_origen, e.zona_objetivo,
  e.velocidad_kmh, e.recepcion_calidad, e.tags,
  e.coordenada_x, e.coordenada_y,
  p.partido_id, s.set_id, s.numero as set_num, p.fecha
from eventos e
join rallies r on r.rally_id = e.rally_id
join sets s on s.set_id = r.set_id
join partidos p on p.partido_id = s.partido_id;

-- Trigger for updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Apply updated_at trigger to relevant tables
create trigger set_updated_at_orgs
before update on orgs
for each row execute procedure set_updated_at();

create trigger set_updated_at_org_members
before update on org_members
for each row execute procedure set_updated_at();

create trigger set_updated_at_equipos
before update on equipos
for each row execute procedure set_updated_at();

create trigger set_updated_at_jugadores
before update on jugadores
for each row execute procedure set_updated_at();

create trigger set_updated_at_jugador_equipo
before update on jugador_equipo
for each row execute procedure set_updated_at();

create trigger set_updated_at_competencias
before update on competencias
for each row execute procedure set_updated_at();

create trigger set_updated_at_partidos
before update on partidos
for each row execute procedure set_updated_at();

create trigger set_updated_at_sets
before update on sets
for each row execute procedure set_updated_at();

create trigger set_updated_at_rotacion_inicial
before update on rotacion_inicial
for each row execute procedure set_updated_at();

create trigger set_updated_at_rallies
before update on rallies
for each row execute procedure set_updated_at();

create trigger set_updated_at_tests_fisicos
before update on tests_fisicos
for each row execute procedure set_updated_at();

create trigger set_updated_at_cargas_entrenamiento
before update on cargas_entrenamiento
for each row execute procedure set_updated_at();

-- 3) Row Level Security (RLS) and policies

-- Enable RLS
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table equipos enable row level security;
alter table jugadores enable row level security;
alter table jugador_equipo enable row level security;
alter table competencias enable row level security;
alter table partidos enable row level security;
alter table sets enable row level security;
alter table rallies enable row level security;
alter table eventos enable row level security;
alter table hechos_saque enable row level security;
alter table tests_fisicos enable row level security;
alter table cargas_entrenamiento enable row level security;
alter table rotacion_inicial enable row level security;
alter table sustituciones enable row level security;
alter table tiempos_fuera enable row level security;
alter table snapshot_rotacion_rally enable row level security;

-- Helper: is user member of org?
create or replace function is_member_of_org(check_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from org_members
    where org_id = check_org and user_id = auth.uid() and activo = true
  );
$$;

-- Helper: get user's org_id
create or replace function get_user_org_id()
returns uuid language sql stable as $$
  select org_id from org_members 
  where user_id = auth.uid() and activo = true 
  limit 1;
$$;

-- Policies for direct org_id tables
create policy "read orgs" on orgs
for select using ( is_member_of_org(org_id) );

create policy "update orgs" on orgs
for update using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "read/write org_members self" on org_members
for all using ( auth.uid() = user_id or is_member_of_org(org_id) )
with check ( auth.uid() = user_id or is_member_of_org(org_id) );

create policy "teams by org" on equipos
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "players by org" on jugadores
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "player_team by org" on jugador_equipo
for all using ( 
  exists (
    select 1 from equipos e 
    where e.equipo_id = jugador_equipo.equipo_id 
    and is_member_of_org(e.org_id)
  )
)
with check ( 
  exists (
    select 1 from equipos e 
    where e.equipo_id = jugador_equipo.equipo_id 
    and is_member_of_org(e.org_id)
  )
);

create policy "competencias by org" on competencias
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "partidos by org" on partidos
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "tests by org" on tests_fisicos
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

create policy "cargas by org" on cargas_entrenamiento
for all using ( is_member_of_org(org_id) )
with check ( is_member_of_org(org_id) );

-- Policies for tables that need JOIN validation
create or replace function row_belongs_to_user_org_from_set(set_row sets)
returns boolean language sql stable as $$
  select is_member_of_org(p.org_id)
  from partidos p
  where p.partido_id = set_row.partido_id
$$;

create or replace function row_belongs_to_user_org_from_rally(r rallies)
returns boolean language sql stable as $$
  select is_member_of_org(p.org_id)
  from sets s
  join partidos p on p.partido_id = s.partido_id
  where s.set_id = r.set_id
$$;

create or replace function row_belongs_to_user_org_from_event(e eventos)
returns boolean language sql stable as $$
  select is_member_of_org(p.org_id)
  from rallies r
  join sets s on s.set_id = r.set_id
  join partidos p on p.partido_id = s.partido_id
  where r.rally_id = e.rally_id
$$;

create policy "sets by org" on sets
for all using ( row_belongs_to_user_org_from_set(sets) )
with check ( row_belongs_to_user_org_from_set(sets) );

create policy "rallies by org" on rallies
for all using ( row_belongs_to_user_org_from_rally(rallies) )
with check ( row_belongs_to_user_org_from_rally(rallies) );

create policy "eventos by org" on eventos
for all using ( row_belongs_to_user_org_from_event(eventos) )
with check ( row_belongs_to_user_org_from_event(eventos) );

create policy "rotacion_inicial by org" on rotacion_inicial
for all using ( row_belongs_to_user_org_from_set((select sets from sets where set_id = rotacion_inicial.set_id)) )
with check ( row_belongs_to_user_org_from_set((select sets from sets where set_id = rotacion_inicial.set_id)) );

create policy "sustituciones by org" on sustituciones
for all using ( row_belongs_to_user_org_from_set((select sets from sets where set_id = sustituciones.set_id)) )
with check ( row_belongs_to_user_org_from_set((select sets from sets where set_id = sustituciones.set_id)) );

create policy "tiempos_fuera by org" on tiempos_fuera
for all using ( row_belongs_to_user_org_from_set((select sets from sets where set_id = tiempos_fuera.set_id)) )
with check ( row_belongs_to_user_org_from_set((select sets from sets where set_id = tiempos_fuera.set_id)) );

create policy "snapshot_rotacion by org" on snapshot_rotacion_rally
for all using ( row_belongs_to_user_org_from_rally((select rallies from rallies where rally_id = snapshot_rotacion_rally.rally_id)) )
with check ( row_belongs_to_user_org_from_rally((select rallies from rallies where rally_id = snapshot_rotacion_rally.rally_id)) );

-- Hechos de saque: validate by partido -> org
create or replace function row_belongs_to_user_org_from_hechos(h hechos_saque)
returns boolean language sql stable as $$
  select is_member_of_org(p.org_id)
  from partidos p
  where p.partido_id = h.partido_id
$$;

create policy "hechos by org" on hechos_saque
for all using ( row_belongs_to_user_org_from_hechos(hechos_saque) )
with check ( row_belongs_to_user_org_from_hechos(hechos_saque) );

-- 4) Sample data for testing (optional)
-- Create a demo organization
insert into orgs (org_id, nombre, descripcion) 
values ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'Club Voleibol Búfalos', 'Club profesional de voleibol femenino')
on conflict (org_id) do nothing;

-- Map current user to demo org (if authenticated)
-- Note: This will be handled by the application logic

-- Create indexes for performance
create index if not exists idx_jugadores_org_activo on jugadores(org_id, activo);
create index if not exists idx_equipos_org_activo on equipos(org_id, activo);
create index if not exists idx_partidos_org_fecha on partidos(org_id, fecha);
create index if not exists idx_eventos_rally_sec on eventos(rally_id, secuencia);
create index if not exists idx_eventos_jugador_tipo on eventos(jugador_id, tipo_evento);

-- Function to refresh materialized views
create or replace function refresh_analytics_views()
returns void language plpgsql as $$
begin
  refresh materialized view concurrently mv_rallies;
  refresh materialized view concurrently mv_eventos;
end $$;

-- Grant permissions for anon and authenticated users
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Allow anon to read catalogs only
grant select on cat_tipo_evento, cat_resultado, cat_tipo_saque, cat_zona to anon;