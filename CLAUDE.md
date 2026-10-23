# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Shared engineering practices

This repo follows the shared practices from the private `eng-standards`
marketplace's `core-practices` plugin, installed at user scope and following
the marketplace's `main`. Use them on every change:

- GitHub flow: `start-work` (branch off an up-to-date `main` before editing),
  `open-pr` (ship as a pull request), `land-pr` (review, squash-merge only when
  the owner says so, deploy check).
- `spec-first` and `tdd-change` once there is code and a `specs/` directory.
- Once a spec is approved, delegate the implementation and PR to the
  `core-practices:coder` agent instead of implementing it in the main session.
- The branch-guard hook blocks commits and pushes to `main`.

Project-specific rules below override the plugin's defaults.

## Deploy

No deploy is configured yet. When one is, state here what merging to `main`
deploys and how `land-pr` should confirm it (for example: "Merging to `main`
deploys production on Vercel; `land-pr` must confirm the deploy is Ready").
