-- ============================================================
-- Bakery Cost Tool — Database Setup
-- Run this ONCE in Supabase: Project → SQL Editor → New Query
-- Paste all of this in, then click "Run".
-- ============================================================

-- 1. Ingredient categories (Flours, Dairy, Flavoring, Packaging, etc.)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- 2. Ingredients — current price lives here
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references categories(id) on delete set null,
  base_unit text not null,              -- 'g', 'ml', or 'piece'
  package_qty numeric not null,         -- e.g. 1000 (grams in the pack you bought)
  package_price numeric not null,       -- e.g. 70 (tk you paid for that pack)
  unit_price numeric not null,          -- computed: package_price / package_qty
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Price history — a new row is added every time an ingredient's price changes
create table ingredient_price_history (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid references ingredients(id) on delete cascade,
  unit_price numeric not null,
  changed_at timestamptz default now()
);

-- 4. Recipes (your cakes)
create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  notes text,
  selling_price numeric,
  packaging_cost numeric default 0,
  delivery_cost numeric default 0,
  yield_count integer default 1,        -- how many units this recipe makes (e.g. 12 jars, or 1 cake)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Ingredients used in a recipe — price is SNAPSHOTTED at the moment it's added,
--    so past recipes never change cost even if you update the ingredient's price later.
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid references recipes(id) on delete cascade,
  ingredient_id uuid references ingredients(id) on delete set null,
  ingredient_name_snapshot text not null,   -- keeps the name even if ingredient is later deleted
  quantity numeric not null,
  unit_price_snapshot numeric not null,     -- price per g/ml/piece AT THE TIME this was added
  line_cost numeric generated always as (quantity * unit_price_snapshot) stored,
  created_at timestamptz default now()
);

-- ============================================================
-- Security: only a logged-in user (you) can read/write anything.
-- Nobody else can see or touch this data.
-- ============================================================
alter table categories enable row level security;
alter table ingredients enable row level security;
alter table ingredient_price_history enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "logged in users only" on categories for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "logged in users only" on ingredients for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "logged in users only" on ingredient_price_history for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "logged in users only" on recipes for all using (auth.uid() is not null) with check (auth.uid() is not null);
create policy "logged in users only" on recipe_ingredients for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ============================================================
-- Image storage — one private-write / public-read bucket for photos
-- ============================================================
insert into storage.buckets (id, name, public) values ('bakery-images', 'bakery-images', true);

create policy "anyone can view images" on storage.objects for select using (bucket_id = 'bakery-images');
create policy "logged in users can upload images" on storage.objects for insert with check (bucket_id = 'bakery-images' and auth.uid() is not null);
create policy "logged in users can delete images" on storage.objects for delete using (bucket_id = 'bakery-images' and auth.uid() is not null);

-- ============================================================
-- Starter categories so the app isn't empty on first load
-- ============================================================
insert into categories (name) values
  ('Flour & Dry Goods'), ('Dairy'), ('Sugar & Sweeteners'), ('Flavoring & Emulsion'),
  ('Eggs'), ('Packaging'), ('Other');
