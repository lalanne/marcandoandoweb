# 005 — Google Sign-in for the Admin

**Status:** approved (by the owner, 2026-10-29)

Sources: [spec 002](002-launch-0.md) (Admin: sign-in, criteria 3 to 5 and 10),
[spec 004](004-deployment.md), [ADR-0001](../docs/adr/0001-web-stack.md). Issue #52.
Interpretations and assumptions to verify are labelled **(interpretation)** or
**(verify)**.

## Why this exists

Today the only way into `/panel` is an email and a password at `/entrar`. The owner
wants the admin to be able to sign in with a Google account as well, so nobody has to
remember another password.

**Owner decision, 2026-10-29: the admin only.** Google sign-in is a second way into
`/panel`. There are no customer accounts, no sign-up and no customer-only pages. A
customer account feature would need its own spec and a reason (saved designs, order
history), and is out of scope here.

It uses Supabase Auth's Google provider, so no new service or provider is added
(ADR-0001): Supabase runs the OAuth flow, the app only starts it and handles the
callback.

## Scope

| In | Out |
|----|-----|
| A "Continuar con Google" button on `/entrar`, next to the email form | Other providers (Facebook, Apple, Instagram) |
| An OAuth callback route that finishes the sign-in | Customer accounts, profiles, order history |
| The same admin gate as today: only a user whose token has `app_metadata.role = 'admin'` reaches `/panel` | Removing email and password sign-in |
| Spanish error states for a cancelled or failed Google flow | Changing how the admin role is assigned |
| Documentation and script comments stop saying there is a single admin account | A screen to manage admins: they are created with the script and removed in the Supabase dashboard |

## How an account becomes the admin

The role is never set from the client. It is set only with the service role, by
`scripts/create-admin.mjs`, which stays the only way to create an admin.

- **There can be any number of admins** (owner, 2026-10-29). Spec 000 decided a single
  admin *role*, not a single account. Each admin is created with the script, once per
  person, using the Google email that person will sign in with (for example the
  owner's and Javiera's Gmail). Each user has a password and the admin role.
- When a person signs in with Google using the same verified email as their user,
  Supabase links the Google identity to that **existing user**, which keeps `app_metadata.role =
  'admin'` **(verify: automatic identity linking by verified email, and that it works
  while public sign-ups are switched off in the cloud project)**.
- Any other Google account has no such user. It is either refused by Supabase because
  sign-ups are off, or it becomes a user without the role. Either way it cannot reach
  `/panel` or read admin data. Row-level security does not change.

## Owner setup, outside the repo

Never put values in the repo or in chat.

1. Google Cloud: create an OAuth client (type: Web application). Add the Supabase
   callback `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized
   redirect URI.
2. Supabase dashboard (production): Authentication, Sign In / Providers, enable Google
   with the client ID and secret.
3. Supabase dashboard, URL configuration: set the site URL and allow the redirect URLs
   of the site: the production address, local development and Vercel previews, and
   `marcandoando.cl` when it is connected (#24).
4. Local development and CI use `supabase/config.toml` with the provider enabled and
   fake client values read from environment variables; the real secret never goes in
   the repo.

## Acceptance criteria

1. Given `/entrar`, when it loads, then it shows a "Continuar con Google" button next
   to the email form, in Spanish, at 360 px and at 1280 px.
2. Given the button, when it is activated, then the app starts the Supabase Google
   OAuth flow using a PKCE code, and the browser is redirected to the provider's
   authorization URL with the callback of this site as the return address.
3. Given Google returns to the callback with a valid code for the admin, when the
   callback finishes, then a session exists, the user lands on `/panel`, and the
   header link reads "Mi panel" **(depends on spec 002 criteria 27 to 31)**.
4. Given Google returns a valid code for an account that is not the admin, when the
   callback finishes, then the user is signed out and sent to
   `/entrar?error=sin-acceso`, and cannot read admin data.
5. Given a user, when they edit their own metadata from the client, then they still
   cannot become the admin; the role comes only from `app_metadata` set with the
   service role (spec 002 criterion 5 keeps passing).
6. Given the user cancels at Google, or Google or Supabase return an error, or the
   callback has no code, when the callback runs, then the user lands on `/entrar`
   with a clear Spanish error, never a blank page or a stack trace.
7. Given the provider is not enabled or misconfigured, when the button is activated,
   then `/entrar` shows a Spanish error instead of raw JSON.
8. Given the callback's `next` parameter, when it is anything other than a relative
   path on this site, then it is ignored and the user goes to `/panel`; this prevents
   open redirects.
9. Given a Google session, when the admin signs out through `/salir`, then the session
   ends and `/panel` redirects to `/entrar`.
10. Given email and password sign-in, when it is used, then it works exactly as before
    (spec 002 criteria 3, 4, 5 and 10 keep passing).
11. Given `/entrar` and the callback, when checked, then there are no axe violations
    of serious or critical impact, and the page has no horizontal scroll.
12. Given two admin users, each with a Google identity linked by their own verified
    email, when each signs in with Google, then each reaches `/panel`; and given an
    admin whose user is deleted or whose role is removed, when they try again, then
    they are refused.

## Verification plan

CI never talks to Google, so it proves everything around the real round trip, and
the owner proves the round trip once on the real project.

| # | Criterion | How |
|---|-----------|-----|
| 1, 11 | Button, layout, accessibility | End to end (Playwright) at 360 and 1280 px, with axe |
| 2, 7 | OAuth start | End to end: activating the button ends in a redirect to the Supabase authorize URL for the Google provider with the right return address (request intercepted, never followed to Google); with the provider disabled locally, a Spanish error appears |
| 12 | Several admins | Integration and end to end with two seeded admin users (the role gate is the same for both); the Google link itself is part of the manual round trip below |
| 4, 5, 9, 10 | Role gate, sign-out, password flow | The existing integration and end-to-end tests, as the seeded users; the callback's decision "admin or not" is a pure function with unit tests |
| 6, 8 | Failure paths and open redirect | Unit tests for the callback logic; end to end for a callback without code and with `error=access_denied` |
| 3 | Real round trip with Google | Manual, once, on the production project: sign in with the admin's Google account, land on `/panel`; then a second Google account is refused. Listed in `specs/traceability-exemptions.txt` with this reason |

## Constraints

- No new service or provider; the secret stays in the Supabase dashboard and, locally,
  in environment variables. No credentials in the repo, logs or chat.
- The service-role key is still used only by `scripts/create-admin.mjs`.
- Configuration lives in the Supabase dashboard, not in migrations, so deployment
  (spec 004) does not change it; the owner does the dashboard steps above once.
- Visible text is Chilean Spanish, informal.

## Open questions

1. **Google consent screen mode.** With the app in "Testing" only listed test users
   can sign in, which suits an admin-only site; in "In production" any Google account
   can reach the consent screen (and would still be refused by the role gate).
   Proposed: start in Testing with the admin's account as a test user
   **(interpretation)**.
2. **Which Google accounts are admins?** Any number is allowed. List them (the owner's
   and Javiera's, for example) before the admins are created in production.
3. **Sign-ups switched off in the cloud project.** If automatic linking does not work
   while sign-ups are off, the fallback is to leave sign-ups on for the OAuth step
   only; the role gate and row-level security still protect everything. To be
   verified on the real project before the build is called done.
