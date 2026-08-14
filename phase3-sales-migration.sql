-- ============================================================
-- Phase 3 migration — Sales tracking (private, admin-only)
-- Run this in Supabase SQL Editor
-- ============================================================
create table sales (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete set null,
  recipe_name_snapshot text not null,
  quantity numeric not null default 1,
  price_per_unit numeric not null,
  cost_per_unit_snapshot numeric not null,
  total_revenue numeric generated always as (quantity * price_per_unit) stored,
  total_cost numeric generated always as (quantity * cost_per_unit_snapshot) stored,
  sale_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table sales enable row level security;
create policy "logged in users only" on sales for all using (auth.uid() is not null) with check (auth.uid() is not null);
