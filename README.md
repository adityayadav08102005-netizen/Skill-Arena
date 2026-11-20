# SkillArena

**Learn. Code. Compete. Get Hired.**

SkillArena is an integrated coding, skill development and career opportunity platform for college students.
It combines **AlgoArena** (coding practice, daily challenges, contests, leaderboards) and **SkillBridge**
(internships, jobs, applications) with a skill assessment center, a recruiter portal and an admin module,
all sharing one account and profile.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, JavaScript, Cache Components) |
| UI | React 19, Tailwind CSS 4, Motion, Lucide icons, Recharts |
| Database | MongoDB Atlas with Mongoose |
| Auth | Better Auth: Google sign-in and email/password, sessions stored in MongoDB |
| Files | MongoDB GridFS (resumes, avatars) |
| Integrations | GitHub, Codeforces, LeetCode and CodeChef calendars, Remotive, Arbeitnow, Himalayas, Jobicy, Adzuna, Paiza.io, Judge0 |

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no `.env.local` the site runs in **demo mode**: pages read the bundled sample
data in `data/` and show a "Demo data" badge, and sign-in is disabled because there is no database to hold accounts.

### Connect MongoDB (database mode)

1. Create a free **M0** cluster at https://www.mongodb.com/cloud/atlas, add a database user, and allow your IP
   under *Network Access*.
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI`: the cluster's connection string (Connect → Drivers)
   - `BETTER_AUTH_SECRET`: a random value, for example from
     `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - `DEMO_USER_PASSWORD`: the password the demo accounts will use (at least 8 characters)
3. Load the sample content and demo accounts:

   ```bash
   npm run seed
   ```

4. Restart `npm run dev`.

### Enable Google sign-in

In Google Cloud Console → *APIs and services* → *Credentials*, create an **OAuth client ID** (web application) with
the authorised redirect URI `http://localhost:3000/api/auth/callback/google`, then set `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` in `.env.local`. Without them, email/password sign-in still works.

### Demo accounts (after `npm run seed`)

All use the `DEMO_USER_PASSWORD` you set. Emails use the reserved `.test` domain, so they can never reach a real inbox.

| Role | Email |
| --- | --- |
| Students | `aarav@students.skillarena.test`, `riya@…`, `kabir@…`, `sana@…`, `dev@…`, `meera@…` |
| Recruiters | `priya@recruiters.skillarena.test` (Nimbus Labs), `arjun@recruiters.skillarena.test` (Quillpay) |
| Admin | `admin@skillarena.test` |

To make another account an admin: `npm run make-admin -- someone@example.com`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run seed` | Upserts sample content and demo accounts into MongoDB (safe to re-run) |
| `npm run test:seed` | Runs the seed twice against a throwaway in-memory MongoDB and checks the result |
| `npm test` | Every offline test suite (see Phase 11) |
| `npm run test:smoke` | End-to-end checks against a running server |
| `npm run test:external` | Unit tests for the external API mappers (no network) |
| `npm run make-admin -- <email>` | Grants the admin role (and marks the account's setup as done) |
| `npm run dev:memory-db` | Starts a temporary local MongoDB, seeds it (if `DEMO_USER_PASSWORD` is set) and prints its URI; data is discarded on exit |
| `node scripts/smoke-api.mjs` | End-to-end checks of sign-in, onboarding, profiles, uploads and access rules against a running server (`BASE_URL`, `DEMO_USER_PASSWORD`) |

### Try database mode without Atlas

```powershell
$env:DEMO_USER_PASSWORD="choose-a-test-password"; npm run dev:memory-db
```

In a second terminal, start the app against the printed URI:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:27099/skillarena?replicaSet=testset"; $env:BETTER_AUTH_SECRET="any-long-local-secret-value-1234567890"; npm run dev
```

## Accounts and profiles (Phase 2)

| Route | What it does |
| --- | --- |
| `/login`, `/register` | Combined sign-in / sign-up screen: student or recruiter cards, Google button (when configured) and an email form |
| `/onboarding` | One-time setup after sign-up: choose student or recruiter, add college and graduation year or company and job title |
| `/continue` | Sends a signed-in user to the setup step or to their home |
| `/profile` | Edit your profile: basics, skills, education, experience, projects, photo and resume |
| `/u/:userId` | Public profile, filtered by the owner's privacy settings |
| `/settings` | Privacy toggles, change password, sign out |

API: `POST /api/onboarding`, `PATCH /api/profile/:section` (`basics`, `skills`, `education`, `experience`,
`projects`, `privacy`), `POST`/`DELETE /api/profile/resume` and `/api/profile/avatar`,
`GET /api/files/avatar/:userId` (public) and `GET /api/files/resume/:userId` (owner, admin, or a recruiter when shared).

## Project structure

```
app/                 Routes (App Router) and API route handlers (app/api)
components/common/   Shared animated building blocks: FloatingNav, FloatingDock, SlideButton,
                     Reveal, NumberTicker, SlidingTabs, HoverCard, Marquee, DemoBadge
components/landing/  Landing page sections
data/                Sample content: problems, assessments + question bank, opportunities,
                     companies, contests, achievements, demo users and generated activity
lib/auth/            Better Auth configuration, server instance and browser client
lib/db/              Mongoose connection and models (one file per module)
lib/utils/           Data-mode switch, XP/level rules, helpers
services/            Server-side data access used by pages (demo or database)
scripts/             Seed, admin and seed-test scripts
```

## Student dashboard (Phase 3)

`/dashboard` is the student home after sign-in. Everything on it is computed from stored data
(`services/dashboard.js`): XP and level with a 30-day XP chart, problems solved by difficulty, accuracy, an
18-week activity heatmap, topic progress, best assessment score per category, applications by status, saved
opportunities, upcoming contests with countdowns, recent submissions, badges and a merged recent-activity feed.

- **Recommendations** come from `services/recommendations.js`, a rule-based recommender (skill overlap weighted
  by self-rated proficiency, graduation-year eligibility, preferred-role keywords, experience level, open
  deadlines). It sits behind a `recommend()` interface so an AI recommender can replace it later.
- **Days** (heatmap, streaks) are counted in `NEXT_PUBLIC_APP_TIMEZONE`, default `Asia/Kolkata`.
- **Notifications:** bell in the top bar, `GET /api/notifications` and `POST /api/notifications` (mark read).

## AlgoArena (Phase 4)

| Route | What it does |
| --- | --- |
| `/algoarena` | Problem library: search, difficulty, topic, status and interview filters; acceptance rates; your progress; today's challenge |
| `/algoarena/:slug` | Coding workspace: problem, hints, your submissions; Monaco editor (Python, Java, C++, JavaScript); sample tests, custom input, Run and Submit |
| `/algoarena/daily` | Last 14 daily challenges and which ones you completed |
| `/algoarena/codeforces` | The Codeforces problem set, filtered by rating, tag and name; problems open on Codeforces |

API: `POST /api/algoarena/run`, `POST /api/algoarena/submit` (students), `GET /api/algoarena/submissions?problemId=`.

**Code execution** (`lib/execution/engine.js`) uses, in order:
1. **Judge0**, when `JUDGE0_URL` is set (for RapidAPI's free tier also `JUDGE0_API_KEY` +
   `JUDGE0_API_HOST=judge0-ce.p.rapidapi.com`).
2. **Paiza.io**, when `CODE_RUNNER=paiza`: a free public runner that needs no account. Tests run three at a
   time; compile errors, timeouts and runtime errors are mapped to the usual verdicts.
3. Otherwise a labelled **demo mode**: Run shows the expected sample outputs and says nothing was executed; Submit saves the code as
"not executed", which earns no XP and doesn't count for streaks.

**Rewards** are applied on the server after judging: first-solve XP (easy 10 / medium 30 / hard 50, once per
problem), the daily-challenge bonus (+15, once per day), and the coding streak (a day with at least one judged
submission; 7/30/100-day milestones add bonus XP). Hidden tests never leave the server: a hidden failure only
reports which test number failed.

The catalogue has 39 problems: the originals plus 25 more written in LeetCode and Codeforces style
(`scripts/problem-sources/extra-problems.mjs`). `npm run build:problems` regenerates `data/problems/extra.js`,
computing every expected output by running the JavaScript reference solution.
Checks: `node scripts/verify-problems.mjs` runs reference solutions against all 207 sample and hidden tests.
`scripts/mock-judge0.mjs` is a **dev-only** stand-in for Judge0 that runs JavaScript/Python locally without a
sandbox; never expose it or use it in production.

## Contests, leaderboards and gamification (Phase 5)

| Route | What it does |
| --- | --- |
| `/contests` | Live, upcoming and past contests with countdowns, registration and your results |
| `/contests/:slug` | Floating timer bar, rules, problems (hidden until the start), live rankings that refresh every 15 s, final standings |
| `/contests/:slug/:problem` | The coding workspace in contest mode (submissions count only while live, for registered students) |
| `/leaderboard` | All-time XP, problems solved, contest points, this week and this month, with a podium; private profiles are ranked but anonymised |
| `/achievements` | Level, global rank, streak, editable weekly/monthly goals, monthly comparison, next milestones, every badge with progress |

API: `POST`/`DELETE /api/contests/:slug/registration`, `GET /api/contests/:slug/standings`,
`POST /api/contests/:slug/run`, `POST /api/contests/:slug/submit`, `PATCH /api/profile/goals`.

**Scoring** (`lib/contests/scoring.js`, unit-tested by `node scripts/test-scoring.mjs`): a problem scores its points
on the first accept; penalty = minutes to that accept + `penaltyMinutesPerWrong` per earlier wrong attempt
(compile errors don't count); ties share a rank. Standings are recomputed from `contest_submissions` after every
submission, and finalized once after the contest ends (final ranks, badges, result notifications).

**Badges** are evaluated on the server (`services/achievements.js`) after submissions, contest results and
profile changes; each grants its XP bonus once through the XP ledger. Contest participation adds 20 XP once.

## SkillBridge (Phase 6)

| Route | What it does |
| --- | --- |
| `/skillbridge` | Opportunity board: search (title, company, skill), type / work-mode chips, experience, location, source, sort by best match / latest / closing soon; tabs For you, Saved, Applied for students. Filters live in the URL. |
| `/skillbridge/:id` | Full listing, company, eligibility, your match (skills you have and lack), and the apply panel |
| `/applications` | Your applications with status filters, status history and withdraw |

API: `POST`/`DELETE /api/opportunities/:id/save`, `POST /api/opportunities/:id/apply` (multipart: `resumeChoice`
= `profile` or `upload`, `file`, `coverLetter`), `POST /api/applications/:id/withdraw`,
`GET /api/applications/:id/resume` (student, admin, or the listing's recruiter).

- **Applying** checks: student account, listing published and on-platform, deadline, graduation-year eligibility,
  one application per listing. External listings (Remotive, Arbeitnow) keep their source and original link and are
  applied to on that site.
- **Resume snapshots:** the resume attached to an application is a copy, so replacing your profile resume later
  doesn't change what the recruiter received.
- **Notifications:** students get a confirmation; the listing's recruiter is told about new applications and withdrawals.
- **Withdraw** is allowed until a final decision (selected or rejected); a withdrawn application can't be re-sent.
- **Match scores** use `scoreOpportunity()` in `services/recommendations.js`, the same rules as the dashboard.

## Assessment center (Phase 7)

| Route | What it does |
| --- | --- |
| `/assessments` | Twelve categories with a difficulty picker (question count and time per difficulty), start or resume, best score and proficiency; for students, performance analysis: score trend, proficiency per category, strongest topics, topics to practise, history |
| `/assessments/attempt/:id` | The timed quiz while open (server-synced timer, autosave, flag for review, question grid, keyboard shortcuts, auto-submit at zero); results and full review once submitted |

API: `POST /api/assessments/:slug/start` (`difficulty`: mixed, easy, medium or hard), `PATCH /api/assessments/attempts/:id`
(autosave `answers` and `flagged`), `POST /api/assessments/attempts/:id/submit`.

- **Questions** are drawn at random from the shared bank (`questions` collection) for the category and difficulty.
  A single-difficulty test needs at least 3 questions; mixed always works. Answers and explanations are never sent
  to the browser before the attempt is submitted.
- **Timing** is enforced on the server: saves after the deadline (plus 5 seconds of slack) are refused, and an
  attempt whose time ran out is scored with its saved answers (status `expired`).
- **Scoring** (`lib/assessments/scoring.js`, unit-tested by `node scripts/test-assessments.mjs`): unanswered counts
  as wrong; topic-wise scores; proficiency bands Beginner (<50), Intermediate (50+), Advanced (75+), Expert (90+).
- **Rewards:** passing earns the assessment's XP once, 90%+ earns a 25 XP milestone once; both through the XP
  ledger. Scoring 80%+ marks the matching profile skills as verified (shown with a badge on the public profile).

## Recruiter portal (Phase 8)

Recruiter accounts get their own dock: Overview, Listings, Find students, Company, SkillBridge, Leaderboard,
Profile, Settings. Every recruiter page and `/api/recruiter/*` route checks the role on the server, and a
recruiter can only see or change their own company's listings and applications (anything else is "not found").

| Route | What it does |
| --- | --- |
| `/recruiter` | Overview: live listings, applicants (and last 7 days), shortlisted, upcoming interviews, pipeline funnel, recent applicants |
| `/recruiter/company` | Company profile and logo (PNG, JPG or WebP up to 2 MB, checked by bytes) |
| `/recruiter/listings` | Your listings with status, applicant counts and actions (publish, close, reopen, back to draft, delete) |
| `/recruiter/listings/new`, `/recruiter/listings/:id/edit` | Listing form: type, work mode, skills, eligible batches, pay, deadline; save as draft or publish |
| `/recruiter/listings/:id` | Applicant pipeline: columns per status with match scores; a side panel with the candidate's coding stats, assessment scores, verified skills, projects, resume, status actions with a note, and messages |
| `/recruiter/students` | Search public student profiles by name, skills (optionally verified only), level, problems solved, batch and assessment score |
| `/recruiter/students/:userId` | A student's recruiter view |

API: `PATCH /api/recruiter/company`, `POST|DELETE /api/recruiter/company/logo`, `POST /api/recruiter/listings`,
`PATCH|DELETE /api/recruiter/listings/:id`, `POST /api/recruiter/listings/:id/state` (`publish`, `close`,
`reopen`, `draft`), `GET /api/recruiter/applications/:id`, `POST /api/recruiter/applications/:id/status`,
`POST /api/recruiter/applications/:id/message`.

- **Moderation:** listings from a verified company go live when published; an unverified company's listings wait
  as `pending_review` and aren't shown on SkillBridge until an admin approves them (Phase 9). Recruiters can't
  set verification themselves.
- **New-listing alerts:** when a listing first goes live, up to 50 eligible students with a 60%+ match and at least
  one skill or role in common get a notification, once per listing.
- **Pipeline:** statuses go Applied → Under review → Shortlisted → Interview scheduled → Selected or Rejected.
  Scheduling an interview needs a future date and time. Each change is added to the application's history (with
  the optional note) and the student is notified; students see the history, notes and messages on
  `/applications`. Withdrawn applications can't be changed.
- **Contact and privacy:** a candidate's email and the message box are available only once they're shortlisted,
  interviewing or selected. Applicants' full profiles are visible to the listing's recruiter; in student search,
  only public profiles appear and sections a student marks private stay hidden.
- **Deleting:** a listing that has applications can't be deleted (close it instead), so students never lose
  their application history.

## Admin module (Phase 9)

Admin accounts get their own dock: Overview, Users, Companies, Problems, Question bank, Contests, Listings,
Reports. Every `/admin` page and `/api/admin/*` route checks the admin role on the server, and every admin
action is written to the activity log (`admin.*`), shown under "Recent admin actions" on the overview.

| Route | What it does |
| --- | --- |
| `/admin` | Students, recruiters, problems and open roles; sign-ups per week (8 weeks); activity in the last 30 days; a review queue (pending listings, companies awaiting a check, open reports) with inline decisions |
| `/admin/users` | Search accounts by name or email, filter by role and status; switch between student and recruiter; suspend or restore |
| `/admin/companies` | Verify, decline or remove verification, with an optional note to the owner |
| `/admin/opportunities` | Read listings in full; approve, send back with a note, or take down |
| `/admin/problems`, `/new`, `/:id` | Create and edit problems, including sample and hidden tests; publish or unpublish; delete unused ones |
| `/admin/questions` | Question bank with coverage per category and difficulty; add, edit, activate or deactivate, delete unanswered ones |
| `/admin/contests`, `/new`, `/:id` | Schedule contests from the problem library (drafts allowed, drag to order), points and penalty |
| `/admin/reports` | Reports from users, with dismiss or take down |

API: `POST /api/admin/users/:id/role`, `POST /api/admin/users/:id/suspend`, `POST /api/admin/companies/:id`,
`POST /api/admin/listings/:id`, `POST /api/admin/reports/:id`, `POST /api/admin/problems`,
`GET|PATCH|POST|DELETE /api/admin/problems/:id`, `POST /api/admin/questions`, `PATCH|DELETE /api/admin/questions/:id`,
`POST /api/admin/contests`, `PATCH|DELETE /api/admin/contests/:id`, and for everyone signed in `POST /api/reports`.

- **Roles:** the console switches accounts between student and recruiter. A new recruiter needs a company: the
  one they already own is kept, otherwise the admin names one and an unverified company is created. Admin
  accounts (including your own) can't be changed from the console; `npm run make-admin` stays the only way to
  grant admin, and it now also marks the account's setup as done.
- **Suspension** needs a reason. It deletes the user's sessions, refuses new sign-ins (a Better Auth session
  hook), hides their profile from search and leaderboards, and closes listings they posted. Restoring lifts the
  block; closed listings stay closed until the recruiter reopens them.
- **Moderation:** approving a listing publishes it and sends the new-match notifications; sending back or
  taking down needs a note, which the recruiter sees on their listings page. Resubmitted listings return to the
  queue.
- **Reports:** signed-in users can report a live listing, a public profile, a problem, or a question they've
  answered (from the review screen), once per item. Taking an item down fits the item (listing sent back,
  profile made private, problem unpublished, question deactivated) and closes every open report on it; reporters
  are told the outcome. Reports are limited to 20 an hour per person.
- **Content safety:** a problem with submissions or used by a contest, and a question that appears in any
  attempt, can't be deleted (unpublish or deactivate instead), so history and reviews stay intact. Once a
  contest starts, its schedule, problems and scoring are locked; a live contest can only be extended.

## External APIs (Phase 10)

Every integration is optional and has a fallback, so an outage or a missing key never breaks a page.
Third-party data is fetched on the server only, cached in MongoDB, and shown with its source.

| Service | What it powers | Key | Fallback |
| --- | --- | --- | --- |
| GitHub REST | Repositories, stars, followers, top languages and featured repos on student profiles, the dashboard and the recruiter view | `GITHUB_TOKEN` (optional: 5,000 instead of 60 requests/hour) | Last good copy, labelled with its age; otherwise "GitHub isn't responding" |
| Codeforces | Rating, rank, max rating, best contest rank and a rating chart | none | Same as GitHub |
| Remotive | Remote software jobs on SkillBridge | none | Listings already imported stay up |
| Arbeitnow | Tech jobs (mostly Germany) on SkillBridge | none | Same as Remotive |
| Himalayas | Remote software jobs and internships | none | Same as Remotive |
| Jobicy | Remote developer jobs | none | Same as Remotive |
| Adzuna | Jobs and internships in India | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` (free) | Skipped until the keys are set |
| Codeforces, LeetCode, CodeChef | Upcoming contests on the Contests page | none | Last saved calendar, per platform |
| Codeforces problem set | `/algoarena/codeforces` | none | Last saved list |
| Paiza.io | Running and judging code when `CODE_RUNNER=paiza` | none | Demo mode |
| Judge0 | Running and judging code (Phase 4) | `JUDGE0_URL`, `JUDGE0_API_KEY`, `JUDGE0_API_HOST` | Demo mode: submissions saved as "not executed", no XP |

- **Profile stats** live in `external_profiles`, one row per student and service. GitHub copies are refreshed
  after 12 hours and Codeforces after 6, in the background after the page is sent (`after()`), so pages
  never wait on a stale refresh. The first load waits up to 6 seconds. A failed call isn't retried for 15
  minutes. An unknown username is shown as such, and changing a handle drops the old account's stats.
  Owners can press "Refresh stats" (at most every 5 minutes; `POST /api/profile/external`). Visibility
  follows the profile settings: GitHub follows "GitHub", Codeforces follows "coding stats".
- **Job imports** (`services/jobSync.js`) map each board's listings to SkillArena opportunities:
  - Descriptions are converted to plain text (no HTML is ever rendered).
  - Skills are matched against the skill catalogue and its aliases.
  - Type, work mode, level and pay are mapped where the board gives them.
  - Arbeitnow listings without recognisable tech skills are skipped.

  Imported listings are labelled "via Remotive" or "via Arbeitnow", link back to the original, and are applied
  to on the source site. They're matched to students like any other listing, but never send "new match"
  notifications.
- **Sync rules:**
  - Remotive asks for a few requests a day, so it syncs at most every 6 hours, whoever asks. Arbeitnow syncs at
    most every 30 minutes and automatically every 3 hours.
  - Listings that disappear from a board are closed, but only after a successful fetch, so an outage never
    empties SkillBridge. Listings older than 60 days are closed too.
  - A listing an admin took down stays down, and one that comes back to the board reopens.
  - A lock stops two syncs running at once.
- **When syncs run:** automatically after someone opens SkillBridge once a board is due; from
  `/admin/integrations` ("Sync now"); or from a scheduler calling `GET /api/cron/sync-jobs` with
  `Authorization: Bearer <CRON_SECRET>` (the endpoint is off when `CRON_SECRET` isn't set).
- **`/admin/integrations`** shows each service's status: last import and its counts, last error, next allowed
  sync, profile fetch counts, whether a GitHub token is set, and a live Judge0 reachability check.
- `npm run test:external` unit-tests the mappers (HTML to text, skill extraction, pay parsing, both job boards,
  GitHub and Codeforces) without network access. The smoke test's Phase 10 checks use the live services when
  they answer and check the fallback when they don't, and say which happened.

## Contests from SkillArena and elsewhere

- **Recurring SkillArena contests** (`lib/contests/schedule.js`, `services/contestScheduler.js`) are created
  automatically two weeks ahead: **SkillArena Weekly** every Sunday 10:30 IST (90 minutes, four problems from
  easy to hard, 5-minute penalty) and **SkillArena Round (Div. 2)** every other Saturday 20:00 IST (two hours,
  problems A–E worth 500–2500, 10-minute penalty). Problems rotate, least recently used first. Contest slugs
  come from their number, so scheduling twice never makes duplicates. Scheduling runs when someone opens
  /contests and from the cron.
- **Other platforms' calendars**: Codeforces' public API, LeetCode's contest list and CodeChef's contest list,
  cached per platform in `external_cache` and refreshed in the background every 3 hours. A platform that's
  down keeps its last list. LeetCode's endpoint is unofficial, so it may change without notice.
- **Codeforces practice**: names, ratings, tags and solve counts for about 11,500 problems, stored in
  `cf_problems` and refreshed daily. No statements are copied; every problem links to Codeforces.

## Security, testing and deployment (Phase 11)

Deploying: see **[DEPLOYMENT.md](DEPLOYMENT.md)** (Vercel + MongoDB Atlas free tiers, environment variables,
Google OAuth, Judge0, first admin, post-deploy checklist).

**Hardening**
- **Security headers** on every response (`lib/security/headers.js`):
  - a Content Security Policy with no framing and no plugins, scripts only from the site and the code-editor CDN
  - HSTS in production
  - `X-Frame-Options: DENY` and `nosniff`
  - a strict referrer policy and a locked-down permissions policy
  - no `X-Powered-By` header
- **Cross-site request check** (`proxy.js`): `POST`/`PUT`/`PATCH`/`DELETE` to `/api/*` from another origin
  get a 403 before reaching the route. Better Auth checks its own routes.
- **Shared rate limits:** app limits live in MongoDB (`rate_limits`, fixed windows, TTL-cleaned) and Better
  Auth's sign-in limits in its `rateLimit` collection, so they hold across serverless instances. If the
  database can't be reached, the app falls back to per-instance memory rather than blocking everyone.
- **Start-up configuration check** (`instrumentation.js` + `lib/env.js`): in production, missing or unsafe
  settings stop the server with a clear message. This covers short or placeholder secrets, a non-https
  `BETTER_AUTH_URL`, half-configured Google OAuth and a localhost Judge0. In development they're only logged.
- **Signed-in pages always render per request:** the session helper reads the request before anything else,
  so a page can't be prerendered as "signed out" and served to everyone. This bug was found while testing a
  production build made without database settings, and is now fixed.
- **Error handling:** error pages (`app/error.js`, `app/global-error.js`) show a reference code and never
  the details. Server errors are logged as one JSON line each.
- **Health check:** `GET /api/health` returns 200 with the mode and database ping, or 503. It never returns
  URLs or keys.
- **Uploads:** resumes are capped at 4 MB (Vercel's request limit is 4.5 MB); photos and logos at 2 MB.

**Testing**

| Command | What it runs |
| --- | --- |
| `npm test` | All offline suites: contest scoring, assessment scoring, external API mappers, config/headers/origin checks, and every problem's reference solution against its tests |
| `npm run test:seed` | The seed script, twice, against an in-memory MongoDB |
| `npm run test:smoke` | End-to-end checks against a running server (set `BASE_URL`, `DEMO_USER_PASSWORD`, `MONGODB_URI`, `MONGODB_DB`, `CRON_SECRET`; `SMOKE_OFFLINE=1` skips live third-party calls) |

`.github/workflows/ci.yml` runs lint, `npm test`, a demo-mode build and `npm audit` (high severity fails)
on every push and pull request. A second job seeds an in-memory database, builds and starts the production
server, and runs the smoke test against it.

## Data model

MongoDB collections (spec table → collection):

- `profiles`: also holds the spec's `student_skills`, `education`, `projects` and `coding_streaks` as embedded data
- `skills`, `problems`, `problem_submissions`, `daily_challenges`, `daily_challenge_completions`
- `contests` (problems embedded), `contest_participants`, `contest_submissions`
- `assessments`, `questions`, `assessment_attempts`
- `achievements`, `user_achievements`, `xp_events` (append-only XP ledger)
- `recruiter_companies`, `opportunities`, `saved_opportunities`, `applications`
- `activity_logs`, `notifications`, `content_reports`
- `external_profiles` (GitHub/Codeforces snapshots), `integrations` (job board sync state)
- Managed by Better Auth: `user`, `session`, `account`, `verification`

## Security notes

- Secrets live only in `.env.local` and server code; nothing but the site's own origin is exposed to the browser.
- `role` can't be set from any sign-up or profile request. Accounts start as students, the one-time setup
  step can switch to recruiter, and admin is granted only by `npm run make-admin`.
- Problem hidden tests and question answers are excluded from queries by default (`select: false`).
- XP, levels, streaks, scores and application statuses are changed only by server code, and every XP award is
  recorded in `xp_events` with a unique key so it can't be granted twice.
- Sign-in and sign-up are rate limited; profile edits, onboarding and uploads have their own per-user limits.
- `proxy.js` sends signed-out visitors away from private pages; every page and API route still checks the
  session and role on the server.
- Profile updates use strict schemas: unknown fields (like `xp` or `role`) are rejected, links must be http(s).
- Uploads are checked by their actual bytes, not the file name or browser-reported type: resumes must be PDF, DOC
  or DOCX up to 4 MB (below Vercel's 4.5 MB request limit), photos PNG, JPG or WebP up to 2 MB.
- The setup step can run only once, so it can't be replayed to switch roles later.
- Suspended accounts can't sign in, and any session they still had is treated as signed out.
- Admin routes check the admin role on the server and log every action.
- Recruiter routes check ownership of every listing and application; another company's records answer "not found".

## Build phases

1. Project setup, configuration and database ✔
2. Authentication, roles and profile management ✔
3. Student dashboard and analytics ✔
4. AlgoArena coding platform ✔
5. Contests, leaderboards and gamification ✔
6. SkillBridge opportunities and applications ✔
7. Assessment center ✔
8. Recruiter portal ✔
9. Admin module ✔
10. External API integrations ✔
11. Security, testing and deployment preparation ← **current**
