-- ============================================================
-- Phase 2 migration — run this in Supabase SQL Editor
-- (Project you already have — this ADDS to what's there, doesn't replace it)
-- ============================================================

-- New fields on recipes: a customer-friendly description, delivery time,
-- and a toggle to control whether it's visible on the public menu.
alter table recipes add column if not exists description text;
alter table recipes add column if not exists delivery_time text;
alter table recipes add column if not exists show_on_menu boolean not null default false;

-- A public "view" — this is the ONLY thing customers can see.
-- It deliberately excludes cost, packaging cost, delivery cost, and ingredients —
-- customers only ever see name, photo, description, price, and delivery time.
create or replace view public_menu as
select id, name, image_url, description, selling_price, delivery_time
from recipes
where show_on_menu = true
order by created_at desc;

grant usage on schema public to anon;
grant select on public_menu to anon;
