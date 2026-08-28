-- ============================================================
-- Truck Repair Tracker — Supabase schema
-- Run this once in Supabase: Project → SQL Editor → New query → Run
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE throughout.
-- ============================================================

-- 1. TRUCKS ---------------------------------------------------
create table if not exists trucks (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null,
  owner_name text,
  owner_phone text,
  driver_name text,
  driver_phone text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- 2. REPAIR JOBS ------------------------------------------------
create table if not exists repairs (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid references trucks(id) on delete cascade not null,
  description text,
  repair_date date default current_date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

-- 3. MATERIALS (with photo) -----------------------------------
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid references repairs(id) on delete cascade not null,
  name text not null,
  cost numeric(12,2) not null default 0,
  photo_path text,           -- path inside Supabase Storage bucket
  created_at timestamptz default now()
);

-- 4. LABOUR CHARGES ---------------------------------------------
create table if not exists labour (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid references repairs(id) on delete cascade not null,
  description text,
  charge numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

-- 5. VIEW: auto-computed totals per repair job -------------------
create or replace view repair_totals as
select
  r.id as repair_id,
  r.truck_id,
  coalesce(m.materials_total, 0) as materials_total,
  coalesce(l.labour_total, 0) as labour_total,
  coalesce(m.materials_total, 0) + coalesce(l.labour_total, 0) as grand_total
from repairs r
left join (
  select repair_id, sum(cost) as materials_total
  from materials group by repair_id
) m on m.repair_id = r.id
left join (
  select repair_id, sum(charge) as labour_total
  from labour group by repair_id
) l on l.repair_id = r.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- Only logged-in users of YOUR Supabase project can read/write.
-- Nobody unauthenticated can touch your data, ever.
-- ============================================================
alter table trucks enable row level security;
alter table repairs enable row level security;
alter table materials enable row level security;
alter table labour enable row level security;

drop policy if exists "authenticated full access" on trucks;
create policy "authenticated full access" on trucks
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on repairs;
create policy "authenticated full access" on repairs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on materials;
create policy "authenticated full access" on materials
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on labour;
create policy "authenticated full access" on labour
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE: bucket for material photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('material-photos', 'material-photos', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read photos" on storage.objects;
create policy "authenticated read photos" on storage.objects
  for select using (bucket_id = 'material-photos' and auth.role() = 'authenticated');

drop policy if exists "authenticated upload photos" on storage.objects;
create policy "authenticated upload photos" on storage.objects
  for insert with check (bucket_id = 'material-photos' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete photos" on storage.objects;
create policy "authenticated delete photos" on storage.objects
  for delete using (bucket_id = 'material-photos' and auth.role() = 'authenticated');

-- ============================================================
-- Done. Your data is now safe from unauthenticated access.
-- This schema never needs to change when you update your app code —
-- that is exactly what keeps your data safe from code updates.
-- ============================================================