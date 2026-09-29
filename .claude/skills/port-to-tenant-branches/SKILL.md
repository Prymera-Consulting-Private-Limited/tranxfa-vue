---
name: port-to-tenant-branches
description: Port a fix or feature from main onto one or more white-label brand branches (<brand>_staging / <brand>_production). Use when asked to "apply this to all clients", "port this fix", "roll out to tenants", "cherry-pick to the brand branches", or when a change on main needs to reach live deployments.
---

# Porting a change across brand branches

This repo white-labels **by branch**: one brand = one long-lived fork = one
deployment. A change is not shipped until it reaches each brand branch. See
`docs/tenant-branches.md` for the model.

## Before you start

Establish three things, asking the user if any is unclear:

1. **The source commit(s).** They must already be on `main`. If the change was
   authored on a brand branch, stop and land it on `main` first — otherwise the
   next brand to be updated will silently revert it.
2. **The target brands.** Never assume "all". Ask which brands, and whether
   `_production` is in scope or only `_staging`.
3. **Whether a target already has the change.** Brand forks sometimes carry an
   independent implementation of the same feature (quiqsend's wallet,
   payrieo/velox's monthly budget). Porting on top produces two copies.

```sh
scripts/branch-audit.sh                    # fleet divergence
scripts/branch-audit.sh <brand>_staging    # that brand's real customisations
git log --oneline origin/main -5           # confirm the source commits
```

## Procedure, per branch

Work in a worktree so the user's checkout is never disturbed:

```sh
git fetch --all --prune
git worktree add /tmp/port-<brand> -b port/<topic>-<brand> origin/<brand>_staging
cd /tmp/port-<brand>
git cherry-pick <sha>...
```

**Cherry-pick. Do not merge `main`.** Merging drags in every unrelated feature
that has landed since the brand forked and reliably destroys the brand's
theming. Only merge `main` when the explicit task is to bring a brand up to
date, and say so.

### Resolving conflicts

Conflicts cluster in a predictable set of files, because these hardcode brand
assets and copy rather than reading them from the theme:

`src/assets/main.css`, `public/images/*`, `index.html`,
`src/components/Header.vue`, `src/views/SignInView.vue`,
`src/views/SignUpView.vue`, `src/views/ForgotPasswordView.vue`,
`src/views/ResetPasswordView.vue`,
`src/components/Customer/EmailVerification.vue`.

The rule in all of them: **keep the brand's assets, colours and copy; take
`main`'s logic.** If a conflict is purely a logo path, a background image or a
brand string, the brand side wins. If it is control flow, error handling or an
API call, `main` wins. Or, put the way that decides the awkward cases: **take
`main` wherever the brand still renders identically; keep the brand's markup
wherever `main` would change how it looks.**

### The logo conflicts are mostly gone - the background ones are not

`main` now renders every logo through `src/components/BrandLogo.vue`, so the
old logo-path conflict in `Header.vue` and the five auth views has no source
left on `main`'s side. When a brand branch conflicts there now, it is usually
because the **brand grew its own sizing inline** - selamsend's header logo is
`lg:h-20 h-8 w-auto` against the component's `h-8`. Taking `main` wholesale
there silently shrinks that brand's logo (80px to 32px on large screens, and
the auth logos roughly halve). Keep the brand's sizing, or add a variant to
`BrandLogo.vue`; do not accept the shrink by default.

Backgrounds were **not** centralised and remain five hardcoded `<img src>`
paths across four auth views, with mixed extensions (`login.webp`,
`signup.webp`, `resetpassword.png`). Most brand branches ship `.png`. After any
port that touches those views, check the two agree:

```sh
grep -rn "images/backgrounds" src/
ls public/images/backgrounds/
```

A mismatch is silent - the build is green and the customer sees the previous
brand's background.

### Verify before moving on

```sh
npm install
npm test                     # if the branch has tests/ at all
npm run build
```

Then the theming check — a port that compiles but un-brands the app is worse
than no port:

```sh
grep -nE "color-brand-[0-9]+" src/assets/main.css        # still the brand palette?
git grep -nE '\b(purple|indigo|violet|teal)-[0-9]{2,3}\b' -- src   # should be empty
git diff --stat origin/<brand>_staging                   # only the intended files
```

Confirm the brand's `public/images/logo.png` is unchanged unless the port was
meant to change it.

**Branches that forked before the test suite existed have no `tests/`.** A
payment or confirm-flow port to one of those is unverified by definition — say
that explicitly in the PR description rather than implying it was tested.

## Order of rollout

1. One brand's `_staging` first. Get it reviewed and smoke-tested.
2. The remaining `_staging` branches.
3. `_production` branches only after the matching `_staging` is confirmed good.

Never open production PRs in the same batch as staging ones.

## Reporting back

Give the user a table: brand, branch, cherry-pick clean or conflicted, tests
present and passing, build result, PR link. Call out explicitly:

- brands you skipped and why,
- brands where the change was already present,
- brands with no test coverage for the ported code.

Do not push or open PRs without asking first.
