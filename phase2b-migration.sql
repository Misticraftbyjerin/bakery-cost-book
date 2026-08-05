-- ============================================================
-- Phase 2b migration — adds optional "item code" to ingredients
-- Run this in Supabase SQL Editor (same place as before)
-- ============================================================
alter table ingredients add column if not exists item_code text;
