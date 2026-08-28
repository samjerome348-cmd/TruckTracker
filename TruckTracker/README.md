# Truck Repair Tracker — Setup Guide

Plain HTML/CSS/JS app, no build step. Data lives in Supabase (free), hosting is GitHub Pages (free). Your code and your data are on completely separate systems, so redeploying code never touches data.

## Step 1 — Create your Supabase project
1. Go to supabase.com → sign up (free) → "New project."
2. Pick any name/region, set a strong database password (save it somewhere safe — you likely won't need it day-to-day, but it's your master recovery key).
3. Wait ~2 minutes for the project to spin up.

## Step 2 — Run the database schema
1. In your Supabase project, go to **SQL Editor → New query**.
2. Open `supabase-schema.sql` from this folder, paste its entire contents in, click **Run**.
3. This creates all your tables, the auto-total view, security rules, and the photo storage bucket in one go.

## Step 3 — Turn on email auth + password reset emails
1. In Supabase: **Authentication → Providers** → make sure **Email** is enabled (it is by default).
2. **Authentication → URL Configuration** → set **Site URL** to your future GitHub Pages URL, e.g.
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`
   (You can update this after Step 5 once you know the exact URL.)
3. Optional but recommended: **Authentication → Email Templates** — you can customize the "Reset password" email text here. The default works fine to start.
4. By default, Supabase sends auth emails from its own shared server (fine for getting started, low volume). If you outgrow it later, you can connect your own SMTP under **Project Settings → Auth**.

## Step 4 — Connect the app to your project
1. In Supabase: **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. Open `js/config.js` in this folder and paste them in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGciOi...";
   ```
   This is the **only file you ever need to edit** with secrets — and it's not really a secret, since the anon key only ever does what your Row Level Security rules (already set up in Step 2) allow.

## Step 5 — Put it on GitHub Pages (free hosting)
1. Create a new GitHub repository (public or private both work).
2. Upload every file in this folder to that repo (keep the folder structure — `css/`, `js/`, and the `.html` files at the root).
3. In the repo: **Settings → Pages** → under "Build and deployment," set Source to **Deploy from a branch**, branch `main`, folder `/root`. Save.
4. GitHub gives you a URL like `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`. Wait a minute for the first deploy.
5. Go back to Supabase → **Authentication → URL Configuration** and make sure **Site URL** (and "Redirect URLs") matches this exact address, so password-reset links land back on your site correctly.

## Step 6 — Try it
1. Visit your GitHub Pages URL → "Create an account" → sign up with your real email.
2. Check your inbox, confirm the account, log in.
3. Add a truck, a repair job, a material with a photo, a labour charge — confirm the total adds up.
4. Test "Forgot password?" end-to-end once, so you know the flow works before you rely on it.

## Keeping your data safe long-term
- **Code updates never touch your data.** Editing files in VS Code and re-pushing to GitHub only changes what GitHub Pages serves — it never runs against your Supabase database.
- **Back up periodically anyway.** In Supabase: **Database → Backups** for automatic backups on your plan, and every so often, **Table Editor → (select table) → Export → CSV** for your own copy saved to Google Drive or similar, independent of any platform.
- **Never run destructive SQL directly on this project** without testing it first — if you ever need to change the schema, consider duplicating the project or testing the query on a throwaway table first.
- **Don't share your database password or the `service_role` key** (found in the same API settings page) with anyone or paste it into any code — only the `anon` key belongs in `config.js`.

## What's included
- Email/password login, signup, and "forgot password" via email — all handled by Supabase Auth
- Trucks: plate number, owner name/phone, driver name/phone
- Repair jobs per truck, each with materials (name, cost, optional photo) and labour charges
- Totals calculated automatically — materials + labour per job
- Search trucks by plate number
- Mobile-friendly layout for use in the garage

## Natural next additions (not built yet, just ideas)
- Export a repair job as a PDF receipt for the owner
- Maintenance due-date reminders
- Multi-user roles if you bring on staff later