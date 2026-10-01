-- Classement public et sauvegarde de campagne privée pour Cosmo Chat.
-- À exécuter dans Supabase > SQL Editor.
create table if not exists public.cosmo_player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Pilote' check (char_length(display_name) between 1 and 48),
  furthest_sector integer not null default 1 check (furthest_sector >= 1),
  furthest_wave integer not null default 1 check (furthest_wave >= 1),
  best_score bigint not null default 0 check (best_score >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.cosmo_player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.cosmo_player_stats enable row level security;
alter table public.cosmo_player_saves enable row level security;
drop policy if exists "Public can read leaderboard" on public.cosmo_player_stats;
create policy "Public can read leaderboard" on public.cosmo_player_stats for select to anon, authenticated using (true);
drop policy if exists "Players can create own stats" on public.cosmo_player_stats;
create policy "Players can create own stats" on public.cosmo_player_stats for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players can update own stats" on public.cosmo_player_stats;
create policy "Players can update own stats" on public.cosmo_player_stats for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Players can read own save" on public.cosmo_player_saves;
create policy "Players can read own save" on public.cosmo_player_saves for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Players can create own save" on public.cosmo_player_saves;
create policy "Players can create own save" on public.cosmo_player_saves for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Players can update own save" on public.cosmo_player_saves;
create policy "Players can update own save" on public.cosmo_player_saves for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Players can delete own save" on public.cosmo_player_saves;
create policy "Players can delete own save" on public.cosmo_player_saves for delete to authenticated using (auth.uid() = user_id);
grant select on public.cosmo_player_stats to anon, authenticated;
grant insert, update on public.cosmo_player_stats to authenticated;
grant select, insert, update, delete on public.cosmo_player_saves to authenticated;
create or replace function public.keep_cosmo_best_progress()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.best_score := greatest(old.best_score, new.best_score);
    if new.furthest_wave <= old.furthest_wave then
      new.furthest_wave := old.furthest_wave;
      new.furthest_sector := old.furthest_sector;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists keep_cosmo_best_progress on public.cosmo_player_stats;
create trigger keep_cosmo_best_progress before insert or update on public.cosmo_player_stats for each row execute function public.keep_cosmo_best_progress();
