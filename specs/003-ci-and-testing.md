# 003 — CI and Testing Policy

**Status:** approved (by the owner, 2026-10-25)

Sources: [spec 000](000-overview.md) (testing constraint), [spec 002](002-launch-0.md),
[ADR-0001](../docs/adr/0001-web-stack.md), the `core-practices` skills `tdd-change`,
`spec-first`, `open-pr` and `land-pr`. Issue #28. Interpretations are labelled
**(interpretation)**.

## Why this exists

The owner wants thorough tests from the first line of code, written first, and run
on every change before it can merge. The shared skills cover only part of that:

- `tdd-change` requires a failing test before the code, for every kind of change,
  but asks for one test at the layer that can see the change, not for every layer.
- `spec-first` requires an approved spec, but not a test for each acceptance
  criterion.
- `open-pr` runs the checks locally; `land-pr` merges only if the required checks
  pass. With no checks configured, nothing is required, and `main` has no branch
  protection.

This spec fills those gaps with project rules (which `CLAUDE.md` lets override the
plugin's defaults) and a CI. **CI cannot prove that a test was written first**: it
sees the final PR, and squashing hides the commit order. Test-first stays a
discipline of the skills, the PR checklist and the owner's review. CI proves that
changes come with tests, that every criterion has a test, and that everything is
green.

## Test layers

| Layer | Tool | Proves |
|-------|------|--------|
| **Unit** | Vitest | Pure logic: helpers, message builders, formatting |
| **Integration** | Vitest against local Supabase (Docker) | Database constraints and row-level security, as anonymous, non-admin and admin. Never a mock of the database |
| **Acceptance** | Whichever layer above or below sees the behavior | One test per Given/When/Then criterion of an approved spec, named with the criterion's ID |
| **End to end** | Playwright, at 360 and 1280 px | A real browser journey through the running app, with an automated accessibility check |

Acceptance is not a separate tool: it is the rule that every criterion has a test.

## Policy per kind of change

Always: a failing test first, seen failing for the right reason (`tdd-change`), and
the existing tests untouched or strengthened, never weakened.

| Change | Required tests |
|--------|----------------|
| **Feature** | Every acceptance criterion has a test with its ID; every user-visible flow has an end-to-end test; pure logic has unit tests |
| **Bug fix** | A failing test at the lowest layer that reproduces it, plus an end-to-end test if a user can see the bug. The revert check from `tdd-change` is done and reported |
| **Improvement or refactor** | Existing tests stay green. New behavior follows the feature row |
| **Cosmetic change** | A test only where the change is observable (a rendered element, text or attribute). Not required to add all three layers **(interpretation: a filler test for a color change makes the suite worse, not more thorough)** |
| **Docs and specs only** | No code tests; the checks still run |

## Traceability

- A test that proves a criterion carries its ID in its name: `[002-AC7]`, meaning
  criterion 7 of the spec numbered 002. Criteria are numbered in each spec
  already.
- A script in CI reads every spec with status `approved` or `implemented` and
  fails if a criterion has no test carrying its ID, or if a test names an ID that
  does not exist.
- A criterion that cannot be an automated test (DNS, a real phone check) is listed
  with its reason in `specs/traceability-exemptions.txt`, reviewed by the owner.

## CI checks

GitHub Actions, on every pull request to `main` and on every push to `main`.

| Check | What it runs |
|-------|--------------|
| `static` | Lint, TypeScript typecheck, production build |
| `unit` | Vitest unit tests, with coverage reported |
| `integration` | Start local Supabase, reset from migrations and seed, run the database and row-level-security tests |
| `e2e` | Build and start the app against local Supabase, run Playwright at 360 and 1280 px with accessibility checks; failure traces are kept as artifacts |
| `traceability` | The criterion-to-test script above |
| `tests-with-changes` | Fails if `app/`, `src/` or `supabase/migrations/` changed and no test file did. The owner can waive it with a label on that PR |
| `migrations` | A clean database reset works from the migrations alone |

Later, not blocking at first: Lighthouse on the Vercel preview, dependency audit,
Dependabot.

Checks that need a database or a browser are added in the issue that introduces the
first test of that kind, so the CI is never red for lack of tests or green for an
empty suite. `static`, `unit`, `traceability` and `tests-with-changes` come first.

## Branch rules (GitHub settings for `main`)

1. Changes reach `main` only through a pull request: no direct pushes.
2. All checks above that exist at the time are **required** to pass, and the branch
   must be up to date with `main` before merging.
3. Squash merge only; the head branch is deleted on merge.
4. No force pushes and no deletion of `main`.
5. No required approvals: the owner is the only reviewer. The owner merges by
   telling the agent to (`land-pr`).
6. The rules apply to repository admins too, so the owner cannot bypass a red check
   by accident (decided by the owner, 2026-10-25).

The existing local hook that blocks commits and pushes to `main` stays.

## PR template

`.github/pull_request_template.md` with a checklist the author fills in honestly:
spec amended or none needed; failing test seen first and for which reason; layers
covered; revert check done (bugs); issue linked with `Closes #n`.

## Acceptance criteria

1. Given a PR whose unit test fails, when CI runs, then `unit` fails and the PR
   cannot be merged.
2. Given a PR that changes `app/` and touches no test file, when CI runs, then
   `tests-with-changes` fails; given the owner's waiver label, then it passes.
3. Given an approved spec with a criterion that has no test carrying its ID, when CI
   runs, then `traceability` fails and names the criterion.
4. Given a test that names a criterion ID absent from every spec, when CI runs, then
   `traceability` fails.
5. Given a criterion listed in the exemptions file with a reason, when CI runs, then
   `traceability` passes for it.
6. Given a PR that breaks a row-level-security rule, when CI runs, then
   `integration` fails.
7. Given a PR that breaks a user flow, when CI runs, then `e2e` fails and the
   Playwright trace is attached.
8. Given `main`, when anyone, including an admin, tries to push to it directly, then
   GitHub refuses.
9. Given a PR with a failing required check, when merged through `gh pr merge`, then
   GitHub refuses; and `land-pr` reports the failing check.
10. Given a PR with passing checks that is behind `main`, when merging, then GitHub
    requires it to be updated first.
11. Given a merge, when it completes, then it is a squash commit and the branch is
    deleted.
12. Given a PR opened from the template, when read, then it shows the checklist.

## Verification plan

The CI is verified by trying to break it, on a throwaway branch, once per check:

| # | Criterion | How |
|---|-----------|-----|
| 1, 2, 3, 4, 6, 7 | Each check fails when it should | A deliberate failing PR for each, closed without merging |
| 5 | Exemption | A PR adding an exemption for a criterion with no test |
| 8, 9, 10, 11 | Branch rules | Attempt each action and read the refusal; settings read back with `gh api repos/lalanne/marcandoandoweb/branches/main/protection` |
| 12 | Template | Open a PR and read it |

## Rollout

1. CI v1: `static`, `unit`, `traceability`, `tests-with-changes`, PR template, branch
   rules, `CLAUDE.md` Testing section. Right after the scaffold (#17).
2. `integration` and `migrations`, with the database issue (#18).
3. `e2e`, with the first end-to-end journey beyond the scaffold example, in the
   admin sign-in issue (#19). The scaffold's Playwright config runs `npm run dev`
   and the Pixel 7 profile only; CI must run the production build at 360 and
   1280 px.
4. Lighthouse and dependency checks after launch 0.

## Decisions and open questions

1. Coverage: report only, with no threshold, until there is enough code to pick a
   meaningful one **(interpretation)**.
2. Test data: only fake data in the seed; no real child photo or school crest in
   any fixture (spec 000, privacy).
3. Secrets: the CI uses only local Supabase and its published demo keys, so it
   needs no repository secrets at first.
