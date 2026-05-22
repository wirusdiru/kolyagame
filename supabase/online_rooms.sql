-- Добавь в Supabase SQL Editor (после schema.sql)
-- Включи Realtime: Database → Replication → supabase_realtime → online_rooms

create table if not exists online_rooms (
  code text primary key,
  host text not null,
  members jsonb not null default '[]'::jsonb,
  game_seed bigint,
  started boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table online_rooms enable row level security;

drop policy if exists "online_rooms_public" on online_rooms;
create policy "online_rooms_public" on online_rooms
  for all using (true) with check (true);

grant select, insert, update, delete on online_rooms to anon, authenticated;

-- Точка спавна для коопа (если таблица уже есть — выполни отдельно):
alter table online_rooms add column if not exists spawn_x double precision;
alter table online_rooms add column if not exists spawn_y double precision;
alter table online_rooms add column if not exists peers jsonb not null default '{}'::jsonb;

-- Удалить старые комнаты (старше 3 часов). Можно запускать вручную или по cron:
-- delete from online_rooms where updated_at < now() - interval '3 hours';
