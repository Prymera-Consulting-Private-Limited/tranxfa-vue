# Tenant branches

This repository is white-labelled **by branch**. There is no runtime tenant
switch, no per-tenant config directory, and no build matrix. One brand = one
long-lived branch = one deployment, paired with its own `console.remitso`
instance (the backend has no `clients`/`tenants` table either — each backend
deployment serves exactly one brand).

Understand this before you merge anything.

## The layout

| Branch pattern            | Meaning                                          |
| ------------------------- | ------------------------------------------------ |
| `main`                    | Product mainline. All shared feature work lands here. |
| `release`                 | Legacy pointer, level with an old `staging`. Unused. |
| `<brand>_staging`         | A brand's pre-production branch.                 |
| `<brand>_production`      | That brand's live branch.                        |
| `feature/<name>`          | Shared feature work, off `main`.                 |
| `staging`                 | **Not a shared integration branch.** See below.  |

There are roughly 45 branches and about 20 distinct brands: adpay, adpaygo,
bizliimt, choice_remit, compliant_msb, danca, famremit, nuvendrasl, payrieo,
payvel, pekepay, quiqsend, remit_centre, remitpay, s-expressmoney, salvtech,
selamsend, tuhfapay, velox, waya, ypay.

### `staging` is a tenant branch

`staging` is the repo's default HEAD, which makes it look like an integration
branch. It is not. It is effectively the **Tranxfa brand branch**: `main` as of
late 2025, plus branding commits ("Logo Updated", "Backgrounds Updated", "CSS
Updated", "Tawk.to Added"). It carries no feature work that `main` lacks.

Consequence: a fix committed to `staging` reaches exactly one brand. Shared
work belongs on `main`.

## What tenants actually change

Measured across 14 brand branches, diffed against each one's own merge-base
with `main` — i.e. what each brand deliberately customised:

| File                                    | Brands changing it |
| --------------------------------------- | ------------------ |
| `src/assets/main.css`                   | 14 / 14            |
| `public/images/logo.png`                | 14 / 14            |
| `public/images/backgrounds/{login,signup}.png` | 13 / 14     |
| `src/components/Header.vue`             | 13 / 14            |
| `src/views/ForgotPasswordView.vue`      | 13 / 14            |
| `src/views/ResetPasswordView.vue`       | 13 / 14            |
| `index.html`                            | 8 / 14             |
| `src/views/SignInView.vue`              | 7 / 14             |
| `src/views/SignUpView.vue`              | 6 / 14             |
| `src/components/Customer/EmailVerification.vue` | 6 / 14     |

Two clear groups:

**Legitimate theming surface** — `main.css` brand variables, `public/images/*`,
and the third-party tags in `index.html` (Google Analytics ID, MS Clarity tag,
Tawk.to widget). These *should* differ per brand.

**Accidental surface** — the auth and onboarding views appear only because they
hardcode `src="/images/logo.png"`, wrap copy in brand-specific wording, or were
re-laid-out per brand. Every one of these is a permanent merge conflict on
every port. Reducing this surface (a `<BrandLogo>` component, copy behind env
vars) is the highest-value structural cleanup available.

Anything hardcoding a palette colour (`bg-purple-700` rather than
`bg-brand-700`) also breaks re-skinning and will show the wrong brand.

## Divergence, as of the last audit

Every brand branch is a fork that has drifted. Commits ahead of / behind
`origin/main`, sampled 2026-09-07:

| Branch                  | Ahead | Behind | Last commit | Character                     |
| ----------------------- | ----- | ------ | ----------- | ----------------------------- |
| `feature/travel_hotels` |  84   |   40   | 2026-08-19  | Feature fork (travel/hotels)  |
| `salvtech_production`   |  52   |   44   | 2026-08-14  | Feature fork                  |
| `velox_staging`         |  33   |   33   | 2026-08-26  | Feature fork (budget, OTP)    |
| `selamsend_staging`     |  25   |   16   | 2026-09-04  | Active                        |
| `payrieo_staging`       |  24   |   43   | 2026-06-28  | Feature fork (statements)     |
| `pekepay_staging`       |  20   |   78   | 2026-04-07  | Pure re-skin (16 files)       |
| `quiqsend-staging`      |  17   |   16   | 2026-09-03  | Feature fork (wallet)         |
| `staging`               |  17   |   78   | 2025-10-24  | Pure re-skin (Tranxfa)        |
| `waya_staging`          |   4   |   73   | 2025-11-05  | Re-skin, long stale           |

Regenerate with `scripts/branch-audit.sh` (see below).

Some brand branches carry genuine features that never returned to `main` —
quiqsend's wallet, payrieo/velox's monthly budget and statement request. Some
of these have since been reimplemented on `main` independently. **Check for a
`main` implementation before porting one of these forward**; you may be
merging a second copy.

## Porting a change

Use the `port-to-tenant-branches` skill. The rules it enforces:

1. **Land it on `main` first.** Never author a shared fix on a brand branch.
2. **Cherry-pick, do not merge `main` into a brand branch** unless the brand is
   deliberately being brought up to date. Merging drags in every unrelated
   feature and usually breaks the brand's theming.
3. **Expect conflicts in the accidental surface** above. Resolve by keeping the
   brand's assets/colours/copy and taking `main`'s logic.
4. **Verify the theme survived**: `grep -rnE '\b(purple|indigo|blue|green)-[0-9]{2,3}\b' src/` should
   not match anything a re-skin depends on, and `--color-brand-*` in
   `assets/main.css` must still point at the brand palette.
5. **Run `npm test`** on each branch you touch. Note that brand branches
   forked before the test suite existed have no `tests/` — porting a payment or
   confirm-flow fix to one is unverified by definition; say so in the PR.
6. **Staging before production.** `<brand>_staging` gets the pick and a smoke
   test before `<brand>_production`.

## Starting a new brand

Use the `rebrand-tenant` skill. In outline:

```
git switch -c <brand>_staging origin/main
```

then: brand variables in `src/assets/main.css`; replace `public/images/logo.png`
(+ `logo-white.png`, `favicon`), `backgrounds/{login,signup,resetpassword}`;
swap the analytics/chat tags in `index.html`; set the brand env vars
(`VITE_APP_NAME`, `VITE_APP_URL`, `VITE_USER_AGREEMENT_URL`,
`VITE_PRIVACY_POLICY_URL`, and the declarations if the brand needs them).

`pekepay_staging` is the cleanest worked example — a 16-file diff that touches
assets, `main.css`, `index.html` and six logo references, and nothing else.
Inspect it with `scripts/branch-audit.sh pekepay_staging` and aim for that
shape.

## Branch audit script

`scripts/branch-audit.sh` prints the divergence table and each brand's
customisation surface. Run it before any porting session — the numbers above go
stale quickly.
