-- Run this in Supabase SQL Editor
-- It creates profile/site/domain tables and RLS for multi-tenant website builder.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subdomain text not null unique,
  title text not null,
  bio text not null,
  emoji text not null,
  template text not null default 'hero' check (template in ('hero', 'minimal')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  domain text not null unique,
  cname_target text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'failed')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

drop trigger if exists custom_domains_set_updated_at on public.custom_domains;
create trigger custom_domains_set_updated_at
before update on public.custom_domains
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.custom_domains enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id);

drop policy if exists sites_select_own on public.sites;
create policy sites_select_own on public.sites
for select using (auth.uid() = user_id);

drop policy if exists sites_insert_own on public.sites;
create policy sites_insert_own on public.sites
for insert with check (auth.uid() = user_id);

drop policy if exists sites_update_own on public.sites;
create policy sites_update_own on public.sites
for update using (auth.uid() = user_id);

drop policy if exists sites_delete_own on public.sites;
create policy sites_delete_own on public.sites
for delete using (auth.uid() = user_id);

drop policy if exists custom_domains_select_own on public.custom_domains;
create policy custom_domains_select_own on public.custom_domains
for select using (
  exists (
    select 1 from public.sites s
    where s.id = site_id and s.user_id = auth.uid()
  )
);

drop policy if exists custom_domains_insert_own on public.custom_domains;
create policy custom_domains_insert_own on public.custom_domains
for insert with check (
  exists (
    select 1 from public.sites s
    where s.id = site_id and s.user_id = auth.uid()
  )
);

drop policy if exists custom_domains_update_own on public.custom_domains;
create policy custom_domains_update_own on public.custom_domains
for update using (
  exists (
    select 1 from public.sites s
    where s.id = site_id and s.user_id = auth.uid()
  )
);

drop policy if exists custom_domains_delete_own on public.custom_domains;
create policy custom_domains_delete_own on public.custom_domains
for delete using (
  exists (
    select 1 from public.sites s
    where s.id = site_id and s.user_id = auth.uid()
  )
);
