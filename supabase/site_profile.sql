-- Настройки визитки: имя, описание, аватарка, ссылки, оформление.
-- Выполнить в Supabase → SQL Editor (один раз).
--
-- Визитку видят все посетители, поэтому читать таблицу и скачивать аватарку может любой.
-- Менять их может только вошедший пользователь (регистрация у вас выключена, так что это только вы).

create table if not exists public.site_profile (
  id           int primary key default 1 check (id = 1),        -- всегда одна строка
  display_name text not null default '',
  description  text not null default '',
  avatar_path  text,                                              -- путь файла в бакете site_public
  links        jsonb not null default '[]'::jsonb,                -- [{ "title": "...", "url": "..." }]
  theme        jsonb not null default '{}'::jsonb,                -- цвета, шрифт; сюда же позже шаблоны и анимации
  updated_at   timestamptz not null default now()
);

insert into public.site_profile (id, display_name, description)
values (1, 'Имя', 'Здесь будет описание')
on conflict (id) do nothing;

alter table public.site_profile enable row level security;

drop policy if exists "site_profile: public read" on public.site_profile;
create policy "site_profile: public read"
on public.site_profile for select to anon, authenticated
using (true);

drop policy if exists "site_profile: authenticated insert" on public.site_profile;
create policy "site_profile: authenticated insert"
on public.site_profile for insert to authenticated
with check (id = 1);

drop policy if exists "site_profile: authenticated update" on public.site_profile;
create policy "site_profile: authenticated update"
on public.site_profile for update to authenticated
using (id = 1) with check (id = 1);

-- Публичный бакет для аватарки (приватный бакет diary_photos с фото заметок не затрагивается).
-- Скачивать файлы из публичного бакета можно без политик; загружать и удалять — только вошедшим.
insert into storage.buckets (id, name, public)
values ('site_public', 'site_public', true)
on conflict (id) do update set public = true;

drop policy if exists "site_public: authenticated manage" on storage.objects;
create policy "site_public: authenticated manage"
on storage.objects for all to authenticated
using (bucket_id = 'site_public')
with check (bucket_id = 'site_public');
