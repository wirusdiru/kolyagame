-- Друзья: заявки, статус «в игре», последний визит
-- Supabase → SQL Editor → вставь ВЕСЬ файл → Run
-- Потом: Project Settings → API → Reload schema (или подожди 1–2 мин)

-- Пересоздание RPC (если уже пробовал — не страшно)
drop function if exists public.get_users_status(text[]);
drop function if exists public.get_friend_requests(text, text);
drop function if exists public.cancel_friend_request(text, text, text);
drop function if exists public.respond_friend_request(text, text, text, boolean);
drop function if exists public.send_friend_request(text, text, text);
drop function if exists public.set_presence(text, text, boolean);

alter table profiles add column if not exists last_seen_at timestamptz not null default now();
alter table profiles add column if not exists is_playing boolean not null default false;

create table if not exists friend_requests (
  id bigserial primary key,
  from_username text not null,
  to_username text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_username, to_username)
);

create index if not exists friend_requests_to_idx on friend_requests (to_username, status);

alter table friend_requests enable row level security;
create policy "no direct friend_requests" on friend_requests for all using (false);

create or replace function public.set_presence(
  p_username text, p_password_hash text, p_is_playing boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
begin
  update profiles set
    is_playing = p_is_playing,
    last_seen_at = now()
  where username = u and password_hash = p_password_hash;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.send_friend_request(
  p_username text, p_password_hash text, p_target text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
declare t text := lower(trim(p_target));
begin
  if length(t) < 2 then return jsonb_build_object('ok', false, 'error', 'Ник слишком короткий'); end if;
  if u = t then return jsonb_build_object('ok', false, 'error', 'Это ты'); end if;
  if not exists (select 1 from profiles where username = t) then
    return jsonb_build_object('ok', false, 'error', 'Нет такого игрока');
  end if;
  if exists (
    select 1 from profiles p
    where p.username = u
      and (p.upgrades->'__meta'->'friends') @> jsonb_build_array(jsonb_build_object('username', t))
  ) then
    return jsonb_build_object('ok', false, 'error', 'Уже в друзьях');
  end if;
  if exists (select 1 from friend_requests where from_username = u and to_username = t and status = 'pending') then
    return jsonb_build_object('ok', false, 'error', 'Заявка уже отправлена');
  end if;
  insert into friend_requests (from_username, to_username, status) values (u, t, 'pending');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.respond_friend_request(
  p_username text, p_password_hash text, p_from text, p_accept boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
declare f text := lower(trim(p_from));
declare req friend_requests%rowtype;
declare my_up jsonb;
declare their_up jsonb;
declare my_meta jsonb;
declare their_meta jsonb;
begin
  select * into req from friend_requests
  where from_username = f and to_username = u and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'Нет заявки'); end if;

  if not p_accept then
    update friend_requests set status = 'declined' where id = req.id;
    return jsonb_build_object('ok', true);
  end if;

  select upgrades into my_up from profiles where username = u;
  select upgrades into their_up from profiles where username = f;
  my_meta := coalesce(my_up->'__meta', '{}'::jsonb);
  their_meta := coalesce(their_up->'__meta', '{}'::jsonb);

  if not coalesce(my_meta->'friends', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('username', f)) then
    my_meta := jsonb_set(my_meta, '{friends}',
      coalesce(my_meta->'friends', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('username', f, 'addedAt', now()::text))
    );
  end if;
  if not coalesce(their_meta->'friends', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('username', u)) then
    their_meta := jsonb_set(their_meta, '{friends}',
      coalesce(their_meta->'friends', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('username', u, 'addedAt', now()::text))
    );
  end if;

  update profiles set upgrades = jsonb_set(my_up, '{__meta}', my_meta) where username = u;
  update profiles set upgrades = jsonb_set(their_up, '{__meta}', their_meta) where username = f;
  update friend_requests set status = 'accepted' where id = req.id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.cancel_friend_request(
  p_username text, p_password_hash text, p_target text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
declare t text := lower(trim(p_target));
begin
  delete from friend_requests where from_username = u and to_username = t and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_friend_requests(
  p_username text, p_password_hash text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
begin
  if not exists (select 1 from profiles where username = u and password_hash = p_password_hash) then
    return jsonb_build_object('ok', false);
  end if;
  return jsonb_build_object(
    'ok', true,
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object('username', from_username, 'at', created_at::text) order by created_at desc)
      from friend_requests where to_username = u and status = 'pending'
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object('username', to_username, 'at', created_at::text) order by created_at desc)
      from friend_requests where from_username = u and status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_users_status(p_usernames text[])
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'username', username,
      'bestScore', best_score,
      'lastSeenAt', last_seen_at::text,
      'isPlaying', is_playing
    ))
    from profiles
    where username = any (
      select lower(trim(x)) from unnest(p_usernames) as x where length(trim(x)) >= 2
    )
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.set_presence(text, text, boolean) to anon, authenticated;
grant execute on function public.send_friend_request(text, text, text) to anon, authenticated;
grant execute on function public.respond_friend_request(text, text, text, boolean) to anon, authenticated;
grant execute on function public.cancel_friend_request(text, text, text) to anon, authenticated;
grant execute on function public.get_friend_requests(text, text) to anon, authenticated;
grant execute on function public.get_users_status(text[]) to anon, authenticated;

notify pgrst, 'reload schema';
