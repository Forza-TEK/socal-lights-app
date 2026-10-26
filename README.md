# SoCal Lights Finder

**Live:** https://socallights.app · **Admin:** https://socallights.app/admin/ (Cloudflare Access, rey@forza-tek.com)

Setup below is already done for this project; it's kept for reference.

Christmas light displays, boat parades and holiday events across Southern California on a street-level map, plus a "Showcase a House" gallery where homeowners and installers post their lights.

Runs entirely on Cloudflare's free tier:

| Piece | Service | What it holds |
|---|---|---|
| Website + server code | Cloudflare Pages (with Functions) | `public/` and `functions/` |
| Database | Cloudflare D1 | events, showcased houses, review queue |
| Photos | Cloudflare R2 | uploaded house photos |
| Admin login | Cloudflare Access (Zero Trust free plan) | protects `/admin` |
| Spam check | Cloudflare Turnstile | the public upload form |
| Map | MapLibre + OpenFreeMap tiles | no key or account needed |

---

## One-time setup (about 20 minutes)

### 1. Create a Cloudflare account
Sign up free at https://dash.cloudflare.com/sign-up and verify your email.

### 2. Create the database
1. In the dashboard sidebar, open **Storage & Databases → D1 SQL Database** and click **Create database**.
2. Name it `socal-lights` and click **Create**.
3. Copy the **Database ID** shown on the database's page.
4. Open the **Console** tab. Paste the whole contents of `migrations/0001_init.sql` and run it. Then do the same with `migrations/0002_seed_events.sql` (this loads the 50 events).

### 3. Create the photo bucket
1. Open **Storage & Databases → R2 Object Storage**. Cloudflare may ask you to add a payment method to turn on R2; the free allowance (10 GB, no download fees) is far more than this site needs.
2. Click **Create bucket**, name it `socal-lights-photos`, and click **Create bucket**.

### 4. Put the database ID in the code
On GitHub, open `wrangler.toml`, click the pencil icon, replace `REPLACE_WITH_D1_DATABASE_ID` with the ID from step 2, and commit.

### 5. Connect the site to GitHub
1. Open **Workers & Pages → Create application**, choose the **Pages** tab, then **Connect to Git**.
2. Authorize GitHub and pick the `socal-lights` repository.
3. Settings: **Framework preset: None**, **Build command: (leave empty)**, **Build output directory: `public`**.
4. Click **Save and Deploy**. When it finishes, your site is live at `https://socal-lights.pages.dev` (Cloudflare adds a suffix if that name is taken).

The database and bucket are connected automatically through `wrangler.toml`. Every time the repository changes, Cloudflare redeploys.

### 6. Lock the admin page to your email
1. Open **Zero Trust** in the sidebar. Pick a team name (for example `socallights`) and choose the **Free** plan.
2. Go to **Access → Applications → Add an application → Self-hosted**.
3. Name it `SoCal Lights Admin`. Add two destinations, both on your `*.pages.dev` domain: path `admin` and path `api/admin`.
4. Add a policy: **Action: Allow**, **Include → Emails →** your email address. Save.
5. On the application's **Overview**, copy the **Application Audience (AUD) Tag**.
6. In `wrangler.toml`, set `ACCESS_TEAM_DOMAIN = "yourteam.cloudflareaccess.com"` and `ACCESS_AUD = "the AUD tag"`, then commit.

Now `https://your-site.pages.dev/admin/` asks for your email, sends you a one-time code, and opens the admin page. The admin API also verifies Access's signed login token itself, so it stays locked even if Access were misconfigured.

### 7. Turn on the spam check (recommended)
1. Open **Turnstile → Add widget**. Name it `SoCal Lights`, add your `pages.dev` hostname, choose **Managed**, and create it.
2. Put the **Site Key** in `wrangler.toml` as `TURNSTILE_SITE_KEY` and commit.
3. In **Workers & Pages → socal-lights → Settings → Variables and Secrets**, add a **Secret** named `TURNSTILE_SECRET` with the widget's **Secret Key**, then redeploy.

Until Turnstile is set up, the form still works and is limited to 5 submissions per hour per connection.

---

## Everyday use

- **Approve houses:** open `/admin/`. The **Waiting for review** tab shows each submission with its photos and the submitter's private email. **Approve and publish** puts it on the map; **Decline** deletes it and its photos.
- **Edit events:** the **Events** tab lists every event. Click **Edit** to change dates, mark them confirmed, or drag the pin on the little map. **Add an event** creates a new one.
- **Share the upload form directly:** `https://your-site.pages.dev/#showcase` opens the map with the Showcase a House form already open.

## Adding a custom domain later
In **Workers & Pages → socal-lights → Custom domains**, add your domain (Cloudflare Registrar sells domains at cost). Then:
- add the new hostname to the Access application (step 6) and the Turnstile widget (step 7);
- optionally give the R2 bucket the same custom domain so photos are served straight from R2 without using Functions requests.

## Free-tier headroom
- Pages Functions share Workers' 100,000 requests per day. Static files and map tiles do not count. Photos count once per visitor, then browsers cache them for a year.
- D1: 5 GB and 5 million row reads per day. R2: 10 GB.
- If the site ever outgrows that, the Workers Paid plan starts at about $5/month.

## Local development
```bash
npm install
echo "ADMIN_DEV_BYPASS=1" > .dev.vars   # lets /admin work on localhost only
npm run db:migrate:local
npm run dev                             # http://localhost:8788
```

## Project layout
```
public/                 static site (served as-is)
  index.html app.js styles.css cities.js
  admin/                admin page (behind Cloudflare Access)
functions/api/          server routes
  events.js posts.js config.js submit.js photo/[[path]].js
  admin/                approve/decline, events editor, private photo previews
migrations/             database schema and the 2026–27 event list
wrangler.toml           Cloudflare bindings and public settings
```

Event dates were researched on October 24, 2026. Events marked "Expected" follow last year's schedule; update them in the admin page as organizers announce 2026 dates.
