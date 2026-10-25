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
| 000 | [Product overview & v1 scope](000-overview.md) | approved |
| 001 | [Content model](001-content-model.md) | approved |
| 002 | [Launch 0: first public release](002-launch-0.md) | approved |
| 003 | [CI and testing policy](003-ci-and-testing.md) | approved |

Status values: `draft` → `approved` → `implemented` → `verified`.

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
