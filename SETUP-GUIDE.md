# Bakery Cost Book — Setup Guide

A private, admin-only tool for you: ingredient costs, recipe costing, and sales tracking. No customer-facing page — this is entirely for your own use.

Follow these steps in order. Takes about 15-20 minutes the first time.

---

## Step 1 — Create your Supabase project

1. Go to supabase.com and log in.
2. Click **New Project**.
3. Give it a name, e.g. `bakery-cost-book`.
4. Set a database password — save it somewhere safe.
5. Choose the region closest to you and click **Create new project**. Wait ~2 minutes.

## Step 2 — Run the database setup files, in order

In Supabase, go to **SQL Editor** → **New query** for each of these — paste the full contents and click **Run**:

1. `schema.sql` — creates your core tables (ingredients, recipes, price history) and privacy rules
2. `phase2b-migration.sql` — adds item codes (for telling similar ingredients apart) and cake size labels
3. `phase3-sales-migration.sql` — creates your Sales tracking table

## Step 3 — Get your API keys

1. In Supabase: **Project home page** → copy the **Project URL** shown under your project name
2. Then: **Settings → API Keys → "Legacy anon, service_role API keys" tab** → copy the **anon public** key (starts with `eyJhbGci...`)
3. Open `config.js` and paste both in:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGci...(the full key)";
```

*(The `BUSINESS_PHONE` / `BUSINESS_NAME` lines in `config.js` aren't used anymore since there's no customer page — safe to ignore or delete.)*

## Step 4 — Put the project on GitHub

1. Go to github.com, click **+** → **New repository**.
2. Name it, keep it **Private** if you'd like (recommended, since your data connection details live in the code), click **Create repository**.
3. **Add file → Upload files**, drag in: `index.html`, `style.css`, `app.js`, `config.js`.
4. **Commit changes**.

## Step 5 — Deploy on Netlify

1. app.netlify.com → **Add new site → Import an existing project → GitHub** → select your repo.
2. Leave build settings empty/default, click **Deploy**.
3. You'll get a live link like `https://random-name-123.netlify.app`.

## Step 6 — Create your admin account

1. Open your Netlify link.
2. Click **Create your account**, set your own email + password.
3. Confirm via email if asked, then log in.

---

## Whenever I give you updated files later

Just re-upload the changed files to GitHub (same drag-and-drop as Step 4 — GitHub overwrites files with matching names automatically). Netlify redeploys itself within a minute or two. You won't need to repeat the account/deploy steps again.

---

## What the tool does

**Ingredients tab** — add ingredients with a photo, category, optional item code (handy for telling different brands of the same thing apart, e.g. two flour brands), and price entered the way you buy it (e.g. "1000g for 70tk") — it works out the per-unit price for you. Use the search bar to find one quickly.

**Cakes & Costing tab** — build a recipe by searching for and picking ingredients + quantities. Cost, cost-per-unit, and (if you enter a selling price) profit and margin are calculated automatically.

**Price history is automatic** — every time you change an ingredient's price, it's logged with a timestamp. When you edit an existing recipe, any ingredient line you *don't* touch keeps its original price — only a line you actively re-search-and-re-pick updates to today's price. So it's always safe to open an old recipe to tweak something small.

**Sales tab** — log each sale: pick the cake, quantity, price, and date. It automatically pulls that cake's *current* cost to calculate cost and profit for that sale, and keeps running totals (revenue, cost, profit, number of sales logged) at the top.

## What could come later, if you want it
- Filter/breakdown by week, month, or year
- Which cake is your best-seller / most profitable / least profitable
- Which ingredient is costing you the most overall

Just let me know if you want any of these added.
