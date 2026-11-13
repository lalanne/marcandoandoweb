# Specs — Spec-Driven Development

This project is built spec-first. Rules:

1. **No code without an approved spec.** Every feature has a spec file here, numbered in build order.
2. **Specs are the source of truth.** If requirements change, the spec is edited first, then the code.
3. **Acceptance criteria are the definition of done.** A feature ships only when every criterion in its spec passes.
4. **One spec at a time.** Implement, verify against the criteria, then move to the next.
5. **Discussion happens on the spec, not the code.** When we are deciding what something should do, we edit the spec and talk about that, not sketch it in chat and not jump to an implementation to "see how it feels."
6. **Only the owner approves a spec.** Agents draft specs and amend them; they never move a spec to `approved`.

The client's own words live in [`../docs/requirements.md`](../docs/requirements.md). Specs are derived from it and cite the section they cover.

## Spec index

| # | Spec | Status |
|---|------|--------|
| 000 | [Product overview & v1 scope](000-overview.md) | approved (the amendment for #107, a catalog for companies, was approved by the owner on 2026-11-04). The amendment for #120, home page collections, was approved by the owner on 2026-11-05; implementation in the next PR for #120 |
| 001 | [Content model](001-content-model.md) | approved (the amendment for #87, criteria 24 to 28, was approved by the owner on 2026-10-31 and is implemented in the PR for #88). The amendment for #107, `audience` (criteria 29 to 32), was approved by the owner on 2026-11-04; implementation in #108. The amendment for #120, `collections` (criteria 33 to 36), was approved by the owner on 2026-11-05 |
| 002 | [Launch 0: first public release](002-launch-0.md) | approved (the amendment for #107, "Catálogo empresa", criteria 68 to 81, was approved by the owner on 2026-11-04; implementation in #108. The amendment for #87, criteria 56 to 66, was approved by the owner on 2026-10-31 and is implemented in the PR for #88. The amendment for #120, collection tabs on the home page, criteria 82 to 89, was approved by the owner on 2026-11-05). The amendment for #126, illustrated collection tabs, criteria 93 to 96, was approved by the owner on 2026-11-06. The amendment for #136, the catalog served from a cache refreshed on admin save, criteria 97 to 102, was approved by the owner on 2026-11-06; implementation in follow-up issues. The amendment for #141, a corporate look for the company pages, criteria 103 to 111, was approved by the owner on 2026-11-12 and is implemented in the PR for #145 (criteria 103 to 111 all have passing tests). The amendment for #148, the company logo next to the people's logo, criteria 112 to 117, was approved by the owner on 2026-11-12 and is implemented in the PR for #148 (criteria 111 to 117 all have passing tests). The amendment for #153, the company logo as tall as the people's logo and stacked on phones, criteria 118 to 120, was approved by the owner on 2026-11-12 and is implemented in the PR for #153 (criteria 111, 112 and 118 to 120 have passing tests) |
| 003 | [CI and testing policy](003-ci-and-testing.md) | approved (the amendment for #112, "Test integrity", criteria 13 to 18, was approved by the owner on 2026-11-04; implementation in #112, PR open). The amendment for #146, docs-only changes skip the heavy jobs, criteria 19 to 25, was approved by the owner on 2026-11-13; implementation in the PR for #146 |
| 004 | [Deployment pipeline](004-deployment.md) | approved |
| 005 | [Google sign-in for the admin](005-google-sign-in.md) | approved |

Status values: `draft` → `approved` → `implemented` → `verified`.

Specs 001 and 002 stay `approved` as a whole, not `implemented`: older criteria in them are still without a test (deferred or manual), and `implemented` makes the traceability check require a test for every criterion. The criteria added by the #87 amendment all have passing tests.

## Naming and format

- File name: `NNN-short-kebab-title.md`, numbered in build order. Start with `000-overview.md`.
- Each spec has a `**Status:**` line under the title and these sections: vision or requirements (with the requirements section it covers), data model if relevant, Given/When/Then acceptance criteria numbered for traceability, and a Verification plan mapping each criterion to a test layer (unit, integration, acceptance or end-to-end).
- Changes to an approved spec are dated amendment notes under the affected section, with the criteria they add or change (see the `spec-first` skill).
- Specs and issues: an issue is the task, a spec holds long-lived behavior. An issue links the spec; it does not copy it.

## Workflow

1. Draft a spec: requirements, data model if relevant, acceptance criteria and a Verification plan.
2. Discuss and revise it in place until the owner marks it `approved`.
3. Before writing any implementation code, write the tests the Verification plan calls for and confirm they fail. Only then implement, moving the spec to `implemented` once every criterion's test passes.
4. Mark `verified` once it has been checked against the running site, not just tests.
5. Keep the index table above in step with every status change.
