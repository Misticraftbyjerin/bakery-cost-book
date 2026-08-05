# Bakery Cost Book — Setup Guide (Phase 1)

Follow these steps in order. Takes about 15-20 minutes the first time.

---

## Step 1 — Create your Supabase project

1. Go to supabase.com and log in (you already made an account).
2. Click **New Project**.
3. Give it a name, e.g. `bakery-cost-book`.
4. Set a database password — save it somewhere safe (a note on your phone is fine). You won't need to type this often.
5. Choose the region closest to you (e.g. Singapore) and click **Create new project**. Wait ~2 minutes while it sets up.

## Step 2 — Run the database setup file

1. In your Supabase project, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open the file `schema.sql` (included in this folder), copy **all** of it, and paste it into the SQL editor.
4. Click **Run** (bottom right). You should see "Success. No rows returned."

This creates all your tables (ingredients, recipes, price history) and sets up privacy so only you can access your data, plus a storage space for your photos.

## Step 3 — Get your API keys

1. In Supabase, click the **gear icon (Project Settings)** → **API**.
2. You'll see two things you need:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (a long string of letters/numbers)
3. Open the file `config.js` (included in this folder) and paste these in:

```js
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_ANON_KEY = "your-long-anon-key-here";
```

4. Save the file.

## Step 4 — Put the project on GitHub

1. Go to github.com and log in.
2. Click the **+** icon top right → **New repository**.
3. Name it `bakery-cost-book`, keep it **Private**, click **Create repository**.
4. On the next page, click **uploading an existing file**.
5. Drag in all the files from this folder: `index.html`, `style.css`, `app.js`, `config.js` (with your keys already pasted in).
   - You don't need to upload `schema.sql` or this guide — those were just for setup — but it's fine if you do.
6. Click **Commit changes**.

## Step 5 — Deploy on Netlify

1. Go to app.netlify.com and log in.
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub**, then select your `bakery-cost-book` repository.
4. Leave all the build settings empty/default (this site doesn't need a build step) and click **Deploy**.
5. In about a minute, Netlify gives you a live link like `https://random-name-123.netlify.app` — that's your website.

*(Optional: In Netlify → Site settings → Change site name, you can pick a nicer web address.)*

## Step 6 — Create your admin account

1. Open your new Netlify link.
2. Click **Create your account**, enter your email and choose your own password, and submit.
3. Supabase may send a confirmation link to your email — click it if asked.
4. Log in — you're in.

---

## After this, whenever you want to update the site

Any time I give you updated code, you just re-upload the changed files to GitHub (drag and drop, same as Step 4) — Netlify automatically redeploys within a minute or two. You won't need to repeat Steps 1-3 or 6 again.

---

## What you can do in Phase 1

- **Ingredients tab** — add ingredients with a photo, category, and price (enter it the way you buy it, e.g. "1000g for 70tk" — the app works out the per-gram price for you).
- **Cake Menu & Recipes tab** — build a recipe by picking ingredients and quantities. The app calculates total cost, cost per unit, and — if you enter a selling price — your profit and margin, automatically.
- **Price history is automatic** — every time you change an ingredient's price, the app quietly logs it. Existing recipes keep the cost they were built with; only new or freshly-edited recipes use the new price.

## What's coming in later phases
- Customer-facing menu page
- Order form + Telegram notifications
- Dashboard analytics (best-sellers, most costly ingredient, profit trends over time)

If anything doesn't work or a step is confusing, tell me exactly where you got stuck and I'll help you fix it.
