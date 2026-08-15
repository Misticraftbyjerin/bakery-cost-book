-- ============================================================
-- Phase 4 migration — Expenses tracking (boards, molds, restocks, etc.)
-- Run this in Supabase SQL Editor
-- ============================================================
create table expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  item_name text not null,
  category text not null default 'Other',   -- Ingredients, Packaging, Equipment, Other
  amount numeric not null,
  quantity text,
  notes text,
  created_at timestamptz default now()
);

alter table expenses enable row level security;
create policy "logged in users only" on expenses for all using (auth.uid() is not null) with check (auth.uid() is not null);
