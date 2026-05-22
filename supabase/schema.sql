-- Вставь в Supabase: SQL Editor → New query → Run

create table if not exists profiles (
  username text primary key,
  password_hash text not null,
  total_coins int not null default 0,
  upgrades jsonb not null default '{"maxHp":0,"waterCap":0,"speed":0,"stinkPower":0,"alienCdReduce":0,"sabDmg":0}',
  games_played int not null default 0,
  best_score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists leaderboard (
  id bigserial primary key,
  username text not null,
  score int not null,
  wave int not null,
  created_at timestamptz not null default now()
);

create index if not exists leaderboard_score_idx on leaderboard (score desc);

alter table profiles enable row level security;
alter table leaderboard enable row level security;

-- Прямой доступ закрыт, только через RPC
create policy "no direct profiles" on profiles for all using (false);
create policy "no direct leaderboard" on leaderboard for all using (false);

create or replace function register_user(p_username text, p_password_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
begin
  if length(u) < 2 then return jsonb_build_object('ok', false, 'error', 'Имя минимум 2 символа'); end if;
  if length(p_password_hash) < 4 then return jsonb_build_object('ok', false, 'error', 'Пароль слишком короткий'); end if;
  if exists (select 1 from profiles where username = u) then
    return jsonb_build_object('ok', false, 'error', 'Игрок уже есть');
  end if;
  insert into profiles (username, password_hash) values (u, p_password_hash);
  return jsonb_build_object('ok', true, 'profile', to_jsonb((select p from profiles p where username = u)));
end;
$$;

create or replace function login_user(p_username text, p_password_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
declare row profiles%rowtype;
begin
  select * into row from profiles where username = u and password_hash = p_password_hash;
  if not found then return jsonb_build_object('ok', false, 'error', 'Неверный логин или пароль'); end if;
  return jsonb_build_object('ok', true, 'profile', to_jsonb(row));
end;
$$;

create or replace function get_profile(p_username text, p_password_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare row profiles%rowtype;
begin
  select * into row from profiles where username = lower(trim(p_username)) and password_hash = p_password_hash;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'profile', to_jsonb(row));
end;
$$;

create or replace function update_profile(
  p_username text, p_password_hash text,
  p_total_coins int, p_upgrades jsonb, p_games_played int, p_best_score int
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
begin
  update profiles set
    total_coins = p_total_coins,
    upgrades = p_upgrades,
    games_played = p_games_played,
    best_score = p_best_score
  where username = u and password_hash = p_password_hash;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function add_score(p_username text, p_score int, p_wave int)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into leaderboard (username, score, wave) values (trim(p_username), p_score, p_wave);
end;
$$;

create or replace function get_leaderboard()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return (
    select coalesce(jsonb_agg(t order by t.score desc), '[]'::jsonb)
    from (
      select username, score, wave, created_at
      from leaderboard
      order by score desc
      limit 50
    ) t
  );
end;
$$;

grant execute on function register_user(text, text) to anon, authenticated;
grant execute on function login_user(text, text) to anon, authenticated;
grant execute on function get_profile(text, text) to anon, authenticated;
grant execute on function update_profile(text, text, int, jsonb, int, int) to anon, authenticated;
grant execute on function add_score(text, int, int) to anon, authenticated;
grant execute on function get_leaderboard() to anon, authenticated;
