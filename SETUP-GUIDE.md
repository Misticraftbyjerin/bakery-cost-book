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

---

# Phase 7 — Smarter ingredient packaging & expense-driven restocking

## What's new
- **Packaging label** on ingredients — an optional free-text field for however you actually buy it: `Case/30EA`, `Pack/4EA`, `1 DZ`, `28ML bottle`, etc. This is just a readable label; the actual cost math still uses Quantity + Unit + Price, same as before.
- **The Expense form is now smart about ingredients.** When you set Category to "Ingredients," it shows two options:
  - **Existing Ingredient** — search and pick one you already have. Saving updates that ingredient's packaging/price (and logs price history if the price changed) *and* logs the expense — one entry, two things updated.
  - **New Ingredient** — fill in Item Code (optional), name, category, packaging label, quantity, unit, and price. Saving creates the ingredient in your Ingredients tab automatically *and* logs the expense. You never have to enter it twice.

## Database change
Already applied directly — nothing for you to run.

## To install
Re-upload `index.html`, `app.js`, `style.css` to GitHub.

## Example — buying a case of 30 eggs
1. Expenses → "+ Log expense" → Category: **Ingredients**
2. Mode: **New Ingredient** (or **Existing Ingredient** if you already have "Eggs" set up — just update the price if it changed)
3. Ingredient name: `Eggs`
4. Packaging: `Case/30EA`
5. Quantity in this package: `30`, Unit: `piece / each`
6. Amount: whatever you paid for the whole case
7. Save — the Eggs ingredient now exists (or is updated) with the correct per-egg cost, and the purchase is logged in Expenses.

---

# Phase 8 — Inventory tab

## What's new
A new **Inventory** tab that tracks how much of each ingredient you actually have on hand — automatically.

- **Stock goes up** when you log a purchase (Expenses → Category: Ingredients)
- **Stock goes down** when you log a sale (based on how much of that ingredient the recipe uses per unit)
- Editing/deleting a sale correctly adjusts stock back — the numbers stay accurate even if you fix a mistake later
- **Buy Soon alerts** — set a "reorder threshold" per ingredient (in the Ingredients tab form) and it'll flag automatically when stock falls to or below that level
- **Usual reorder amount** — an optional field where you note how much you normally buy at once. This is your own call — the app shows you **Avg Weekly Use** per ingredient (from the last 30 days of sales) so you have real data to help decide: fast-moving ingredients are good candidates for buying more at once, slow movers for buying less
- **Purchases Summary** — for any date range (This Month / Last Month / All Time / Custom), see how many times you bought each ingredient, total units, and total money spent

## Database changes
Already applied directly — nothing for you to run.

## To install
Re-upload `index.html`, `app.js`, `style.css` to GitHub.

## Setting it up
Your existing ingredients start at 0 stock (since the app has no way to know what you had on hand before today). Two ways to fix this:
1. Go to Inventory tab → click the ✎ next to each ingredient → enter what you actually have right now, **or**
2. Just let it correct itself naturally as you log new purchases and sales going forward — it'll drift back toward accurate over time

For the low-stock alerts to work, open each ingredient (Ingredients tab → Edit) and fill in "Buy more when stock falls to" — this is optional per ingredient, so you can set it only for the ones you care about tracking closely.

---

# Phase 9 — Dashboard: product type breakdown & revenue goal

## What's new

**Sales by product type.** The Dashboard now shows a card per product type (Jar Cake / Slice Cake / Whole Cake (Facebook) / Other) with quantity and revenue for the selected period, instead of one lumped "Cakes Sold" number.

To use this, open each recipe (Cakes & Costing → Edit) and set its new **Product type** field. Sales from recipes you haven't tagged yet show up under "Untagged" so nothing is silently hidden — you'll always know if something needs tagging.

*(Note: breaking this down further by flavour — e.g. 50 vanilla jar cakes vs 10 chocolate — is a good next step, but you mentioned that's for later. When you're ready, this slots in naturally as a "Flavour" field alongside Product Type.)*

**Revenue Goal.** Set a target amount, how many days to hit it in, and how many days a week you sell — it works out your daily number and tracks progress with two bars: revenue achieved vs. calendar time elapsed. If the revenue bar is ahead of the time bar, you're pacing ahead of target.

One honest note on the goal tracker: the "time elapsed" comparison uses calendar days, not specifically your selling days — so if you're 10 days into a 30-day goal but only had 5 actual selling days in that window, the bar will look more "behind" than you really are. Treat it as a rough guide, not a precise pace calculator.

## Database changes
Already applied directly — nothing for you to run.

## To install
Re-upload `index.html`, `app.js`, `style.css` to GitHub.

## Try it
1. Tag your recipes with Product Type (Jar Cake, Slice Cake, Whole Cake (Facebook))
2. Dashboard → check the new cards at the top
3. Dashboard → "Set / change goal" → try 15000 tk, 30 days, 4 selling days/week, start today — it should show ≈ 875 tk/day

---

# Phase 10 — Fix: buying multiple packages now adds up correctly

## What was wrong
Logging an ingredient purchase only recorded the size of *one* package — so buying 2 tubs of cream still only added 1000g to stock, not 2000g.

## What's fixed
The Expense form's Ingredients mode now has 3 separate things instead of 2:
- **Size of one package** (e.g. 1000g) — unchanged
- **Price per package** (e.g. 230 tk) — this feeds your recipe costing, same as before
- **How many packages did you buy?** (new — e.g. 2) — this is what actually multiplies into your stock

So buying 2 tubs of cream at 230tk each: size=1000g, price=230tk, count=2 → adds **2000g** to stock, and the Amount field auto-fills to **460tk** total (still editable if you got a bulk discount).

The Inventory tab now also shows an approximate package count under the gram amount, e.g. `2000.00 g` with `≈2.0 pkg` underneath — so you can see it in whichever way makes more sense to you.

## Database changes
None needed for this fix — just the app files.

## To install
Re-upload `index.html`, `app.js`, `style.css` to GitHub.

## Note on your existing 0-stock ingredients
This fix doesn't retroactively add stock for ingredients that already existed before Phase 8 (Inventory) — those still start at 0, as explained before. Two ways forward:
1. Log a fresh restock for each one now (even if it's "catching up" — e.g. "I have 2 tubs on hand right now")
2. Or just correct the number directly: Inventory tab → click ✎ next to the ingredient → type in what you actually have
