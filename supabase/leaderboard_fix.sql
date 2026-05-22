-- Один игрок = одна строка в топе (лучший результат)
alter table leaderboard drop constraint if exists leaderboard_username_key;
alter table leaderboard add constraint leaderboard_username_key unique (username);

create or replace function add_score(p_username text, p_score int, p_wave int)
returns void language plpgsql security definer set search_path = public as $$
declare u text := lower(trim(p_username));
begin
  insert into leaderboard (username, score, wave)
  values (u, p_score, p_wave)
  on conflict (username) do update set
    score = greatest(leaderboard.score, excluded.score),
    wave = case when excluded.score > leaderboard.score then excluded.wave else leaderboard.wave end,
    created_at = case when excluded.score > leaderboard.score then now() else leaderboard.created_at end;
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
