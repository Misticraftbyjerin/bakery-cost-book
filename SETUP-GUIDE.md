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
- Recurring expense templates (so you don't retype "cake boards" every time)
- Exporting sales/expenses to a spreadsheet

Just let me know if you want any of these added.

---

# Phase 4 — Expenses tab & Dashboard

Two more tabs, rounding out the core system:

**Expenses** — log anything you buy that isn't a recipe ingredient: boards, molds, packaging, equipment, or a general restock. Date, item, category (Packaging / Equipment / Ingredients / Other), amount, and optional notes.

**Dashboard** — your business at a glance, with a 7 days / 30 days / this year / all time filter:
- Revenue, total cost, profit, and cakes sold for the period
- Which cakes sold the most and which were the most profitable (separately badged — they're not always the same cake!)
- Which ingredients are costing you the most, based on what actually sold in that period
- Spending by category — ingredients (calculated from sales) vs packaging vs equipment vs other (from Expenses)

**One thing worth knowing:** the Sales tab's profit only accounts for ingredient cost. The Dashboard's profit is more complete — it also subtracts your Expenses (packaging, equipment, restocks) for the period, so it's a truer picture of what you actually kept.

### To install
1. Run `phase4-expenses-migration.sql` in Supabase SQL Editor
2. Re-upload `index.html`, `app.js`, `style.css` to GitHub (all 3 changed again)
3. Netlify redeploys automatically

Once it's live: log your 14 jar cakes + the 1.5-pound vanilla cake in Sales, log the boards and new mold in Expenses, and check the Dashboard — it should immediately reflect all of it.

---

# Phase 5 — Search, filters, sales targets & day-end cash check

## What's new
- **Search bars** on Ingredients, Cakes & Costing, Sales, and Expenses
- **Date filters** on Sales and Expenses: This Month / Last Month / All Time / Custom range
- **Category filter** on Expenses
- **Daily sales target** — set a target quantity per cake (e.g. "40 jar cakes/day") in the recipe form. A "Today's Progress" bar appears at the top of the Sales tab automatically whenever any cake has a target set.
- **Day-End Cash Check** — new section at the bottom of the Sales tab. Pick a date, it shows what the app calculated was sold that day, you enter what you actually counted in hand, and it shows the gap. Add notes for why (discount given, extra travel cost, etc.)

## Database change
Already applied directly to your Supabase project — nothing for you to run this time.

## To install
Re-upload these 3 files to GitHub: `index.html`, `app.js`, `style.css`
(config.js is unchanged, don't need to touch it)

## How to use the new features
- **Target**: open any recipe → Edit → fill in "Daily sales target" → save. Do this for your jar cake recipe with `40`.
- **Cash check**: Sales tab → "+ Check a day" → pick the date → it shows expected revenue from what's logged that day → type in what you actually counted → add a note if there's a gap → save. One entry per day (saving again for the same date updates it rather than duplicating).

---

# Phase 6 — Export Backup (Google Sheets / Excel compatible)

## What's new
A new **"⬇ Export Backup"** button in the top header (visible from any tab). Clicking it downloads a single spreadsheet file with everything in it, as separate tabs: Ingredients, Recipes, Recipe Ingredients, Sales, Expenses, Day-End Cash Check, and Ingredient Price History.

## How to open it in Google Sheets
1. Click the button — a file like `bakery-backup-2026-08-16.xlsx` downloads to your phone/computer
2. Go to Google Drive → **New → File upload** → select that file
3. Once uploaded, right-click it → **Open with → Google Sheets** (or it may open automatically)
4. That's it — it's now a normal Google Sheet you can view anytime, even without the app

## Important — how this actually works
This is a **manual, on-demand export** — clicking the button any time gives you a fresh snapshot of everything as of that moment. It does **not** auto-sync or update on its own. A good habit: export it every month or so (or whenever you feel like it), and keep the files in a Google Drive folder as a running archive. This protects your data independently of the app itself, in case anything ever goes wrong with the database.

## To install
Re-upload `index.html`, `app.js`, `style.css` to GitHub (all 3 changed). No database changes this time.

---

# Phase 7 — Log expenses from your Ingredients list

## What's new
The "Log expense" form now has a toggle at the top: **New Item** / **From Ingredients**.
- **New Item** — works exactly like before, type anything freely (e.g. "New round mold")
- **From Ingredients** — search and pick an existing ingredient (same search-by-name-or-code picker as the recipe builder). This fills in the item name, sets the category to "Ingredients," and suggests a quantity based on that ingredient's package size — but the **Amount is always typed in by hand**. This is intentional: your expense log stays a true record of what you actually paid that day, and never silently changes if you update that ingredient's price later in the Ingredients tab.

## Database change
Already applied directly — nothing for you to run.

## To install
Re-upload `index.html` and `app.js` to GitHub (style.css also changed, upload that too — all 3 files this time).
