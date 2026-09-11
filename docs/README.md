# Documentation

Start with [`../CLAUDE.md`](../CLAUDE.md) — the short version of the rules that
matter, for humans and for Claude Code.

## Orientation

| Document | Read it when |
| -------- | ------------ |
| [`architecture.md`](architecture.md) | You are new to the repo, or touching a layer you have not worked in. Covers the five layers, the transfer flow end to end, recipients, payments, KYC, wallet, and the known rough edges. |
| [`api-surface.md`](api-surface.md) | You need to know which endpoint backs a screen, or which composable owns a call. |
| [`workflow.md`](workflow.md) | Before starting any piece of work. Ticket first, `feature/sd-<n>` from `main`, PR to `main`, closing note on the ticket. |
| [`tenant-branches.md`](tenant-branches.md) | **Before any merge, cherry-pick, or "just fix it on staging".** Explains the white-label branch model and what each brand actually customises. |
| [`local-development.md`](local-development.md) | Getting the SPA talking to a local `console.remitso`. The host/port allowlists are the whole difficulty. |
| [`../DEPLOY.md`](../DEPLOY.md) | How brands reach production. Amplify builds on push, so the merge *is* the deploy. |
| [`deployments.csv`](deployments.csv) | The fleet ledger: which brand/environment is on what. A missing line means unobserved, never "nothing deployed". |

## Feature notes

Written alongside specific pieces of work; narrower and more perishable than
the documents above.

- [`wallet-frontend-proposal.md`](wallet-frontend-proposal.md),
  [`wallet-frontend-handoff.md`](wallet-frontend-handoff.md),
  [`wallet-local-licence-runbook.md`](wallet-local-licence-runbook.md)
- [`fincode-frontend-review.md`](fincode-frontend-review.md)

## Skills

`.claude/skills/` holds task playbooks for Claude Code:

| Skill | Covers |
| ----- | ------ |
| `vue-conventions` | House style: where a file goes, models, composables, emits, styling |
| `write-tests` | vitest patterns, fixtures, Echo/axios mocking, what is worth pinning |
| `port-to-tenant-branches` | Moving a fix from `main` onto brand branches |
| `rebrand-tenant` | Creating a new brand branch, or re-skinning one |
| `add-payment-provider` | New PSP screen + wiring into `PaymentView` |
| `add-kyc-provider` | New IDV vendor, and changing the XState flow machines |
| `hotel-search` | The travel hotels search, criteria, rates and supplier rules |

## Tooling

- `scripts/branch-audit.sh` — fleet divergence, and per-brand customisation
  surface. Run it before a porting session; the figures in `tenant-branches.md`
  go stale quickly.
- `scripts/capture-api-fixtures.sh` — re-record `tests/fixtures/api/` from a
  running local stack.
- `.github/workflows/ci.yml` — tests, build and the hardcoded-palette gate on
  every PR to `main`. Amplify only builds *after* a merge, so this is the only
  thing standing between a red branch and a brand's site.
