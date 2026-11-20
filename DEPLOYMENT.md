# Deploying SkillArena

This guide puts SkillArena on free tiers: **Vercel** (hosting), **MongoDB Atlas M0** (database), and
optionally **Google OAuth**, **Judge0 on RapidAPI** (code execution) and a **GitHub token**. Every
optional service has a fallback, so you can start with just Vercel and Atlas.

Without a database at all the site still deploys in **demo mode**: sample data, labelled as such, and no
sign-in.

---

## 1. MongoDB Atlas

1. Create a free **M0** cluster at <https://cloud.mongodb.com>. Pick the region closest to your Vercel region
   (for India: `ap-south-1` Mumbai with Vercel `bom1`).
2. **Database Access** → add a database user with a long random password and the *Read and write to any
   database* role (or scope it to the `skillarena` database).
3. **Network Access** → add `0.0.0.0/0`. Vercel functions don't have fixed IP addresses on the free plan;
   the database user's password is what protects the cluster.
4. **Connect → Drivers** → copy the `mongodb+srv://…` connection string. That is `MONGODB_URI`; set
   `MONGODB_DB=skillarena`.

Collections and indexes are created automatically on first use. Sessions, sign-in rate limits and app rate
limits are stored in the database, so they work across Vercel's many function instances.

## 2. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and Preview if you use
preview deployments). They must exist **before the build runs**, which Vercel does by default.

| Variable | Required | Value |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string |
| `MONGODB_DB` | yes | `skillarena` |
| `BETTER_AUTH_SECRET` | yes | 32+ random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL` | yes | Your public URL, e.g. `https://skillarena.vercel.app` (https, no trailing slash) |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | Calendar time zone for streaks and daily challenges (default `Asia/Kolkata`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | Google sign-in (both or neither) |
| `CODE_RUNNER` | no | `paiza` runs code on Paiza.io's free public runner (no key). Leave unset for demo mode |
| `JUDGE0_URL` / `JUDGE0_API_KEY` / `JUDGE0_API_HOST` | no | Judge0 instead of Paiza.io; takes priority when set |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | no | Free keys from developer.adzuna.com; adds jobs and internships in India |
| `GITHUB_TOKEN` | no | Fine-grained token with **no permissions** (public data only); raises GitHub's limit to 5,000 requests/hour |
| `CRON_SECRET` | no | 16+ random characters; turns on the scheduled job import |
| `DEMO_USER_PASSWORD` | only for seeding | Remove it after seeding |

The server checks these at start-up (`instrumentation.js`). In production a missing or unsafe value, such as
a short or placeholder secret, a non-https `BETTER_AUTH_URL` or a localhost `JUDGE0_URL`, stops the
deployment with a clear message in the function logs instead of failing later.

## 3. Deploy to Vercel

1. Push the repository to GitHub and **Import** it in Vercel. The framework (Next.js) is detected; keep the
   default build command (`next build`) and output settings.
2. Add the environment variables above, then **Deploy**.
3. Open `https://<your-domain>/api/health`. It should return `{"status":"ok","mode":"database",…}`. A `503`
   means the database couldn't be reached: check `MONGODB_URI` and Atlas network access.

`vercel.json` registers a daily cron (03:00 UTC) for `/api/cron/sync-jobs`. Vercel sends
`Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set. The Hobby plan allows one run
a day; job boards also sync when someone opens SkillBridge once they're due, and admins can sync from
**Admin → Integrations**.

## 4. Google sign-in (optional)

In Google Cloud Console → **APIs and services → Credentials → Create OAuth client ID** (Web application):

- Authorised JavaScript origin: `https://<your-domain>`
- Authorised redirect URI: `https://<your-domain>/api/auth/callback/google`

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy. The **Continue with Google** button only
appears when both are set.

## 5. Code runner

The simplest choice is `CODE_RUNNER=paiza`: Paiza.io runs Python, Java, C++ and JavaScript for free without an
account. It's a shared public service, so heavy use can be slow; **Admin → Integrations** shows whether it
answers.

For a dedicated runner, subscribe to the free tier of **Judge0 CE** on RapidAPI and set:

```
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=<your RapidAPI key>
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

**Admin → Integrations** shows whether Judge0 answers. Never point `JUDGE0_URL` at `scripts/mock-judge0.mjs`
outside your own machine: it runs submitted code without a sandbox, and the start-up check refuses a
localhost `JUDGE0_URL` in production.

## 6. First data and the first admin

From your machine, with the production values in a git-ignored file such as `.env.live` (kept out of
`.env.local` so `npm run dev` never touches the live database):

```bash
node --env-file=.env.live scripts/seed.mjs                          # problems, assessments, contests, listings, demo accounts
node --env-file=.env.live scripts/make-admin.mjs you@example.com    # after signing up on the live site with that email
```

If those fail with `querySrv ECONNREFUSED`, your DNS doesn't answer the SRV lookups `mongodb+srv://` needs.
Add `--import ./scripts/public-dns.mjs` after `node` to use public DNS for that one command.

The seed loads the problem catalogue and question bank, which the site needs to be useful. Its demo accounts
and listings are flagged as sample data. Seeding is idempotent, so running it again updates rather than
duplicates. Remove `DEMO_USER_PASSWORD` afterwards, and change or delete the demo accounts if the site is
public.

Admin can't be chosen at sign-up or granted from the console; `make-admin` is the only way.

## 7. Limits of the free tiers

- **Request size:** Vercel functions accept bodies up to 4.5 MB, so resumes are capped at 4 MB and photos and
  logos at 2 MB.
- **Function time:** job imports and code runs are well under the 60 seconds allowed (`maxDuration` is set
  on the slow routes).
- **Atlas M0:** 512 MB of storage, which comfortably fits thousands of students. Uploaded files live in GridFS
  in the same cluster, so watch storage if many people upload resumes.
- **Cron:** once a day on Hobby; the on-visit and admin syncs cover the rest.

## 8. After each deploy

- [ ] `/api/health` returns `ok` with `"mode":"database"`
- [ ] Sign up, finish setup, edit your profile, upload a resume
- [ ] Open a problem: the editor loads; Run and Submit work (or say "demo mode" if no runner is set)
- [ ] /contests shows SkillArena Weekly and Round, and "On other platforms"; /algoarena/codeforces lists problems
- [ ] SkillBridge shows listings; Admin → Integrations shows each service's status
- [ ] The function logs have no `[config]` errors

## Security summary

- Secrets stay on the server; the only `NEXT_PUBLIC_` variable is the time zone.
- **Security headers on every response:**
  - a Content Security Policy (no framing, no plugins; scripts only from the site and the editor CDN)
  - HSTS
  - `X-Frame-Options: DENY`
  - `nosniff`
  - a strict referrer policy
  - a locked-down permissions policy
- **Cross-site requests:** state-changing API requests from another site are refused (`proxy.js`), on top of
  `SameSite=Lax` session cookies.
- **Sessions and accounts:**
  - Sessions are stored in MongoDB.
  - Suspended accounts are signed out everywhere and refused at sign-in.
  - Roles are server-managed.
- **Validation:** every write is checked with a strict schema; uploads are checked by their bytes; all
  third-party text is shown as plain text.
- **Rate limits** are stored in MongoDB, so they hold across instances.
- **Server errors** are logged as one JSON line each (`instrumentation.js`). Users see a reference code,
  never the details.

Known issue: `npm audit` reports two **low** severity DOMPurify advisories inside the Monaco editor
package, which pins that version. The editor only renders a student's own code, and the CSP limits what
could run. Update `@monaco-editor/react` and `monaco-editor` when a fixed Monaco release is out.
