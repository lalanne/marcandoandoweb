# 004 — Deployment Pipeline

**Status:** approved (by the owner, 2026-10-31, with the amendment of that date, issue #63; first approved by the owner on 2026-10-25). The amendment for #130, Vercel Web Analytics (criteria 19 to 21, criterion 13 amended), was approved by the owner on 2026-11-22

Sources: [spec 002](002-launch-0.md) (criteria 20 and 24),
[spec 003](003-ci-and-testing.md), [ADR-0001](../docs/adr/0001-web-stack.md). Issue
#39. Interpretations are labelled **(interpretation)**.

## Why this exists

The owner wants nothing to reach production until they accept it. "Production"
means two things that must change together: the deployed site on Vercel and the
database schema on the cloud Supabase project. Before this spec, the plan (#23,
`CLAUDE.md`, spec 002 criterion 24) was to deploy automatically on every merge to
`main`. This spec replaces that with a deployment that waits for the owner.

For the demo, both Vercel and Supabase run on their free plans (owner, 2026-10-25).
The pipeline does not change when the plans do.

## Decision (proposed: option A of issue #39)

GitHub Actions plus a GitHub **Environment** named `production` with the owner as
its required reviewer. Vercel's own Git integration keeps building **preview**
deployments for pull requests, but its automatic production deploy is turned off.

Rejected: promoting by hand in Vercel (migrations stay a separate manual step and
GitHub keeps no record of the acceptance), and deploying on every merge (does not
meet the requirement).

## Flow

1. A PR merges to `main` (all required checks from spec 003 passed).
2. The deploy workflow runs on that commit and waits for CI's four checks on it.
3. If the commit changes `app/`, `supabase/`, `package.json` or other runtime files,
   the `deploy` job reaches the `production` environment and **pauses**: GitHub
   shows "waiting for review" and notifies the owner. Docs-only and spec-only merges
   do not need a deploy **(interpretation)**.
4. The owner reviews the commit and **accepts or rejects** in GitHub (web or mobile
   app). Rejecting ends the run and changes nothing.
5. On acceptance, the job: applies pending migrations to the production Supabase
   project with the Supabase CLI; builds and deploys the same commit to Vercel
   production with the Vercel CLI; reports the production URL.
6. If the migration step fails, the deploy does not start. If the deploy fails after
   the migration, production keeps running the previous code, so every migration
   must work with both the previous and the new code (add first, remove in a later
   release) **(interpretation: forward-only, "expand then contract")**.

7. After the Vercel step succeeds, a read-only smoke test checks the live site
   (see the 2026-10-29 amendment below). A failing smoke test fails the run.

Only one production deployment is pending or running at a time; a newer merge
supersedes an older pending one.

## Constraints

- **Secrets** live only as GitHub Environment secrets on `production`: Vercel token,
  organization and project IDs, Supabase access token and database password. The
  owner creates them. They never appear in the repo, logs or chat, and they are only
  available to the job after acceptance.
- **Self-approval stays allowed**: the owner is the only person on the project, so
  the environment must not forbid the author from approving.
- **Same commit:** what is deployed is the commit that passed CI, never a branch tip.
- **Migrations come from the repo** (`supabase/migrations/`), never from the dashboard.
- **No seed data** reaches production (spec 002 criterion 2).
- **Credentials rotate** without code changes (secrets are read by name).

## Acceptance criteria

1. Given a merge to `main` that changes the app, when CI is green, then a production
   deployment appears as waiting for the owner's review and nothing in production
   has changed.
2. Given a waiting deployment, when the owner rejects it, then the run ends and
   neither the site nor the database changes.
3. Given a waiting deployment, when the owner accepts it, then pending migrations are
   applied first and the same commit is deployed to Vercel production afterwards.
4. Given a migration that fails, when the owner has accepted, then the Vercel deploy
   does not run and the run fails with the migration's error.
5. Given a deploy that fails after the migrations, when the run ends, then production
   still serves the previous version and the failure links to the logs.
6. Given a merge that changes only docs or specs, when it lands on `main`, then no
   production deployment is requested.
7. Given two merges in a row, when the first is still waiting, then only the newer
   one is left pending.
8. Given a pull request, when it is opened, then it gets a Vercel preview deployment,
   and Vercel's own Git integration does not deploy production.
9. Given the accepted deployment, when it finishes, then the production URL and the
   commit are reported in the run summary, and `land-pr` can confirm it.
10. Given any run, when its logs are read, then no secret value appears.
11. Given the repository, when read, then `CLAUDE.md` (Deploy) says what merging does,
    how to accept a deployment, and how to roll back.
12. Given an accepted deployment whose Vercel step succeeded, when the deploy job
    continues, then a smoke test runs against the production URL taken from the
    `PRODUCTION_URL` variable of the `production` environment, retrying for up to
    60 seconds while the new deployment becomes live.
13. Given the production home page, when the smoke test loads it in a real browser,
    then the response is 200, the hero and the "Cotizar por WhatsApp" button are
    visible, none of the known error texts ("Reload to try again", "A server error
    occurred") appear, the console has no errors, and no request fails.
14. Given a visitor who is not signed in, when the smoke test requests `/panel`, then
    it is redirected to `/entrar`.
15. Given `GET /api/health` with a working database connection and correct Supabase
    settings, when it is called, then it reads the published products with the
    public client and answers 200 with `{"status":"ok"}` (also when there are no
    products yet); given a missing or wrong URL or key or a failed read, then it
    answers 503 with `{"status":"error"}` and no detail, secret or error message;
    in both cases `Cache-Control: no-store`.

    **2026-10-31 amendment (issue #63).** The health route read the categories,
    which are removed (spec 001, amendment of the same date). It now reads the
    products table, which exists before and after the change, so the route keeps
    working through both migration steps.
16. Given the smoke test, when it runs, then it only sends GET requests and uses no
    credentials: it never writes to the database or signs in.
17. Given a failing smoke test, when the run ends, then the run is marked failed, the
    summary names each failed check and says that production is serving the new
    version and how to roll back (the Rollback section); nothing is rolled back
    automatically.
18. Given a passing smoke test, when the run ends, then the summary says so, next to
    the production URL and the commit.

## Verification plan

Run on the demo project (free plans), not on a customer's production.

| # | Criterion | How |
|---|-----------|-----|
| 1, 2, 3, 9 | Waiting, reject, accept, report | A real merge of a trivial app change; reject it once, accept it once; read the run and the live URL |
| 4 | Migration failure | A throwaway PR with a deliberately failing migration against a disposable Supabase project, never against the demo data |
| 5 | Deploy failure | A throwaway commit that fails the Vercel build after the migration step, on the disposable project |
| 6, 7 | Skip and supersede | Merge a docs-only change; merge two app changes quickly |
| 8 | Previews | Open a PR and read the Vercel preview check |
| 10 | No secrets in logs | Read the logs of the runs above |
| 11 | Docs | Read `CLAUDE.md` |
| 15 | Health route | Integration tests against local Supabase: 200 with correct settings; 503 and no detail with a wrong URL and with a wrong key; headers |
| 12, 13, 14, 16 | Smoke test behavior | A Playwright smoke spec with a configurable base URL, run in CI against the local production build, including a failing case (misconfigured Supabase URL) that must fail with the page-crash text; the spec sends only GET requests (asserted in the spec) |
| 17, 18 | Run result | The first real accepted deploy after the build, plus one deliberately failing run against a throwaway deployment where the smoke test is pointed at a broken URL |

The workflow's shell logic that can be tested without GitHub (the path filter that
decides whether a deploy is needed) gets unit tests first, per spec 003.

## Rollback

Redeploy the previous successful Vercel deployment from the Vercel dashboard or CLI.
Migrations are forward-only: a bad migration is fixed by a new migration, shipped
through this same pipeline.

## Amendment to spec 002

**2026-10-25 amendment - criterion 24.** Production is updated after the owner's
acceptance, not on merge. See criteria 1 to 3 here. The criterion in spec 002 is
changed in this PR.

## Amendment: post-deploy smoke test

**2026-10-29 amendment - smoke test and health route (issue #55).** The pipeline
checked that the deployment finished, not that the site worked. A wrong Supabase
URL in Vercel crashed the public page in production while every CI check was
green, because CI cannot see the real Vercel and Supabase settings. Criteria 12 to
18 add a read-only check after each accepted deploy: a smoke test in a real
browser and a small health route.

- The test targets the **production URL** (the `PRODUCTION_URL` variable, set by the
  owner on the `production` environment), not the deployment-specific Vercel URL,
  which Vercel's deployment protection may block **(interpretation)**.
- It is **read-only on purpose**: creating a product in production would write to
  the real database and show a test product to visitors for a few seconds.
  Writing flows stay covered by the CI end-to-end tests against local Supabase.
  A write-based production check would need a staging environment, deferred in the
  open questions.
- A failure **cannot undo** the deploy: Vercel has already switched traffic. It
  fails the run so the owner sees it, and rollback stays manual.
- `/api/health` is public and returns only `ok` or `error`, so it reveals nothing
  an attacker could use.

## Amendment: Vercel Web Analytics

**2026-11-22 amendment - visit counts (issue #130). Approved by the owner on
2026-11-22.** The owner wants to see how many people visit the site and which pages
they view. Vercel Web Analytics counts page views without cookies, so no consent
banner is needed. It is part of Vercel, already in the stack (ADR-0001), so it adds no
provider. Turning it on in the Vercel dashboard is not enough: the page must load
Vercel's script, which the `<Analytics />` component of `@vercel/analytics` adds.

Criteria 19 to 21 are added and criterion 13 is amended:

19. Given any page of the site (the public pages, `/entrar` and `/panel`), when a
    production build renders it, then it loads the Vercel Web Analytics script
    (`/_vercel/insights/script.js`) exactly once. It comes from `<Analytics />` of
    `@vercel/analytics/next`, rendered once in the root layout, with the package
    pinned to an exact version. Page views are counted for the admin's visits too
    **(interpretation)**: the issue asks for every page, and the panel's are few.
20. Given the script outside Vercel (local development, the CI production build) or
    on Vercel before the owner enables Analytics, when it is requested, then it
    answers 404. That 404 does not break the site and does not fail the end-to-end
    tests or the smoke test (criterion 13 below).
21. Given the repository, when read, then `CLAUDE.md` (Deploy) says the owner enables
    Web Analytics in the Vercel project (Analytics tab, "Enable"), that visits are
    counted from the next accepted deploy, and where to read them.

**Criterion 13, amended.** Requests under `/_vercel/insights/` are left out of the
smoke test's "no request fails" check, and so is the console error the browser
prints for them ("Failed to load resource" naming that URL). Nothing else is left
out: any other failed request, HTTP status of 400 or more or console error still
fails the check. Reason: the script is Vercel's, it is 404 until the owner enables
Analytics, and a missing visit counter must not mark a working deploy as failed.
The smoke test therefore does not check that Analytics works; the owner sees that in
the Analytics tab.

Out of scope: Speed Insights, custom events (for example clicks on the WhatsApp
button), any other analytics provider, and cookie banners or privacy text.

Verification:

| # | Criterion | How |
|---|-----------|-----|
| 19 | Script on every page | End to end against the production build at 360 and 1280 px: `/`, a product page, `/empresas`, `/entrar` and `/panel` (signed in as the seeded admin) each have exactly one script whose `src` ends in `/_vercel/insights/script.js` |
| 20 | 404 is harmless | End to end: the smoke spec run against the local production build (where the script is 404) still passes, and a unit test of the smoke test's filter shows only `/_vercel/insights/` URLs are ignored (a 404 or console error for any other URL still counts) |
| 21 | Docs | Read `CLAUDE.md` |

## Open questions

The owner approved the spec on 2026-10-25 with the proposals below as the working answers.

1. A second, staging environment (own Supabase project) before production: not now
   **(interpretation)**; the demo is the only cloud environment.
2. Which files count as "runtime" for the docs-only skip? Proposed: anything outside
   `docs/`, `specs/`, `assets/`, `*.md` and `.github/ISSUE_TEMPLATE/`.
3. The first deploy needs the production Supabase project and the Vercel project to
   exist and be linked; creating them is part of the implementation issue, using the
   owner's accounts.
4. `PRODUCTION_URL` is `https://marcandoandoweb.vercel.app` today and becomes
   `https://marcandoando.cl` when the domain is connected (#24). The owner updates
   the variable then.
5. Automatic rollback when the smoke test fails: not now **(interpretation)**; with
   one deployment pending at a time and a person accepting each one, a manual
   rollback is acceptable.
