# Coop's Dangle Lab — detailed instructions

Live site: **https://coopsdanglelab.netlify.app**

This file is for you (Cooper / the site owner). Keep it in this folder. You do **not** need Netlify Pro.

---

## 1. What this site is

Coop's Fishing (Coop's Dangle Lab) is a nationwide fishing desk:

- Live water temperatures
- Featured waters (spots) by region and state
- Depth charts and “how deep to fish”
- Bait by species
- Lunar / solar (solunar) charts
- Login with an email link
- Saved favorite waters
- Public **catch photos** (anglers post pictures of fish they caught)

It is **not** a complete list of every lake in the U.S. Featured waters are curated.

---

## 2. The three places you will use

| Place | What it is | Open this |
|-------|------------|-----------|
| **This folder** | The website files on your computer | `C:\Users\dexte\Coops fishing` |
| **GitHub** | Backup + what Netlify publishes from | https://github.com/dextermelling-design/coopsdanglelab |
| **Netlify** | The live website | https://app.netlify.com → site **coopsdanglelab** |
| **Supabase** | Login, saved waters, catch photos | https://supabase.com/dashboard |

When files in this folder are **pushed to GitHub**, Netlify usually publishes a new version by itself. Wait until **Deploys** says **Published**, then refresh the live site with **Ctrl+F5**.

---

## 3. How visitors use the site

### Pages (top menu)

| Menu | Page | What it does |
|------|------|----------------|
| Home | `index.html` | Starting desk |
| Temps | `temps.html` | Live water temps — click **More info** for the full report |
| Spots | `spots.html` | Featured waters — click **More info** |
| Catch photos | `catches.html` | Public photo board — log in to post |
| Depths | `depths.html` | Charts and fishing areas — **Full report** / **More info** |
| Bait | `bait.html` | What to throw |
| Charts | `charts.html` | Moon, sun, solunar |
| About | `about.html` | How to use the desk |

Under the menu, **Latest catches** shows thumbnail photos after people start posting. **See all** opens the full board.

Clicking a water opens a **full report** (temp, depths, bait, solunar) plus **Save this water** and **Log a catch**.

### Login

1. Click **Log in** (top right).
2. Enter an email.
3. Open the email and click the link.
4. You land back on the site, signed in.

No password. The link expires and can only be used once.

### Favorites

While logged in, click **Save** / **Save this water**. Open **My waters** (top right) to see the list.

### Catch photos (public board)

Anyone can **look**. Only logged-in people can **post**.

1. Log in.
2. Open **Catch photos**, or open a water and click **Log a catch**.
3. Add a photo, species, water, and optional notes.
4. **Post to the board**.

The poster can click **Remove** on their own photo. After you finish **step 5B** below, you can **Remove** anyone’s photo.

Keep posts family-friendly. Photos are public.

---

## 4. What is already done

You can skip these unless something breaks:

- GitHub repo connected to Netlify
- Live site at https://coopsdanglelab.netlify.app
- Supabase project created
- Favorites table (SQL) — you ran this and it said **Success**
- Site URL and redirect URLs in Supabase
- Publishable key wired into the site (login works)
- Login email templates can be customized (see step 6)

**Still needed for catch photos:** step 5 (SQL) and step 5B (make yourself admin).

---

## 5. Catch photos — run this in Supabase (do this next)

Until this runs, **Catch photos** will not accept uploads.

### 5A. Create the catch board

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and click **your project**.
2. Left sidebar: **SQL Editor**.
3. Click **New query**.
4. On your computer, open this file in Notepad:

   `C:\Users\dexte\Coops fishing\supabase\catches.sql`

5. Select **all** (Ctrl+A), copy (Ctrl+C), paste into the Supabase box (Ctrl+V).
6. Click **Run**.

If you see:

> This query includes destructive operations…

that is **normal**. Click the button to run it anyway. You want **Success. No rows returned**.

7. **New query** again. Open and paste:

   `C:\Users\dexte\Coops fishing\supabase\catches-storage.sql`

8. Run that too (same warning is OK).

**If the storage script errors:**

1. Left sidebar: **Storage**
2. **New bucket**
3. Name it exactly: `catches`
4. Turn **Public** on
5. Create the bucket
6. Run `catches-storage.sql` again

### 5B. Make yourself the person who can delete any post

You must have **logged in on the live site at least once** with this email.

1. SQL Editor → **New query** (a fresh box).
2. Paste this, but put **your real login email** inside the quotes:

```sql
insert into public.admins (user_id)
select id from auth.users
where lower(email) = lower('you@email.com')
on conflict (user_id) do nothing;
```

3. Click **Run**.

After that, log out and log in again (or Ctrl+F5). You should see **Remove** on every catch card, not only your own.

---

## 6. Put the website name on login emails

Default emails say “Confirm your email address” and do not mention Coop's Dangle Lab.

1. Supabase → **Authentication** → **Email Templates**
2. Edit **Confirm signup**

**Subject:**

```
Confirm your email for Coop's Dangle Lab
```

**Body** (replace everything in the box):

```html
<h2>Coop's Dangle Lab</h2>
<p>Thanks for signing up. Confirm this email to finish creating your account and save favorite waters.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email and open Coop's Dangle Lab</a></p>
<p>If you did not request this, you can ignore this email.</p>
```

3. Save.
4. Edit **Magic Link**

**Subject:**

```
Your Coop's Dangle Lab sign-in link
```

**Body:**

```html
<h2>Coop's Dangle Lab</h2>
<p>Use this link to sign in and see your saved waters. It expires soon and can only be used once.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Coop's Dangle Lab</a></p>
<p>If you did not request this, you can ignore this email.</p>
```

5. Save.

Leave `{{ .ConfirmationURL }}` exactly like that. The “from” name may still say **Supabase Auth** on the free mailer. That is normal.

---

## 7. Supabase settings you already set (keep them)

**Authentication → URL Configuration**

- Site URL: `https://coopsdanglelab.netlify.app`
- Redirect URLs (both):
  - `https://coopsdanglelab.netlify.app/**`
  - `http://localhost:8765/**`

**Keys (already in the website files)**

- Project URL looks like `https://something.supabase.co`
- Use **publishable** (`sb_publishable_…`) or **anon** (`eyJ…`)
- **Never** use **secret** or **service_role** on the website

You do **not** need Netlify environment variables or Netlify Pro for login. The public key is already in the site.

---

## 8. Netlify (live site)

1. Open [https://app.netlify.com](https://app.netlify.com)
2. Click the **coopsdanglelab** site
3. **Deploys** — newest row should say **Published**

After a GitHub push, a deploy usually starts by itself. If it does not:

**Deploys → Trigger deploy → Deploy site**  
(or **Clear cache and deploy site**)

Then wait for **Published** and press **Ctrl+F5** on the live site.

### Feedback from visitors

The floating **Feedback** button goes to:

- Netlify → **Forms** → form named `feedback`
- You can turn on email notifications there (multiple emails are allowed)

You do **not** need Pro for this.

### Custom domain (optional, later)

You can buy a domain (Namecheap, Google Domains, etc.) and in Netlify: **Domain management → Add custom domain**. Then the site does not have to say `.netlify.app`.

---

## 9. GitHub

Repo: https://github.com/dextermelling-design/coopsdanglelab

You usually do **not** edit GitHub by hand. Updates are pushed from this folder. After a push, Netlify publishes.

---

## 10. Try the site on your computer (optional)

Great Lakes buoy temps need a local server:

1. Open PowerShell
2. Run:

```powershell
cd "C:\Users\dexte\Coops fishing"
python serve.py
```

3. Open **http://localhost:8765**

The live Netlify site already has a buoy proxy. You do not need this for https://coopsdanglelab.netlify.app.

---

## 11. Owner checklist

Do these in order if you are not sure where you left off:

- [x] Supabase project created
- [x] Favorites SQL ran (Success)
- [x] Site URL + redirect URLs saved
- [x] Login works on the live site
- [ ] Catch SQL: `supabase\catches.sql` ran in SQL Editor
- [ ] Admin SQL ran with **your** login email
- [ ] Login emails mention **Coop's Dangle Lab** (step 6)
- [ ] Posted a test catch photo
- [ ] Confirmed **Remove** works on that photo
- [ ] Confirmed **Latest catches** thumbnails appear under the top menu

---

## 12. If something goes wrong

**Log in says accounts are not wired up**  
The publishable key is missing from the site. It should already be in `assets\js\data.js`. Wait for a Published deploy and Ctrl+F5.

**Invalid API key**  
Wrong key was used (secret key, or a cut-off key). Use **publishable** or **anon** only.

**Login email never arrives**  
Check spam. Confirm Authentication → URL configuration (step 7). Try a different inbox.

**Catch upload fails / “not set up in Supabase”**  
`catches.sql` has not been run, or the storage bucket `catches` is missing (step 5A).

**I cannot delete other people’s photos**  
Step 5B was not run, or you used a different email than the one you log in with. Log in once, then run the admin insert with that exact email, then Ctrl+F5.

**Temps stay on Loading until I refresh**  
Hard-refresh with Ctrl+F5 after a new deploy. If it still happens, say which page.

**Depths map says it needs a network connection**  
Need internet for map tiles. Charts and area lists still work without the map.

**I feel like I have to pay Netlify Pro**  
You do not. Skip **All scopes**, skip **secret**, skip **different value for each deploy context**. Login does not need Netlify environment variables.

**Destructive operations warning in SQL**  
Normal for these scripts. Continue and run. It is not deleting your website.

---

## 13. Important files in this folder

| File | What it is |
|------|------------|
| `INSTRUCTIONS.md` | This guide |
| `index.html`, `temps.html`, `spots.html`, … | Website pages |
| `assets\js\data.js` | Waters, bait, and the public Supabase key |
| `supabase\schema.sql` | Favorites table (already ran) |
| `supabase\catches.sql` | Catch photos + admin (run this) |
| `netlify\functions\` | Live buoy temps, feedback, usage counts |
| `serve.py` | Local test server |

---

## 14. What we did **not** build yet

- Private-only catch log (you chose a **public** board)
- Extra admins besides the email you add in step 5B
- Automatic “report this photo” button (you delete from the board; Feedback still works)

If you want any of that later, say so.
