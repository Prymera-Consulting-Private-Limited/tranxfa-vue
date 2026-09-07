# Deployment

The customer app deploys through **AWS Amplify Hosting**. There is no CI in
this repository and no deploy script: Amplify watches a branch, and a push to
that branch builds and releases it.

That is the whole mechanism, and it has one consequence worth stating plainly:

> **A push to a brand branch is a production deploy.** There is no staging gate
> between the two, no approval step, and no build that runs before the merge.
> Treat a push to `<brand>_production` the way the backend treats a release tag.

## The model

One brand = one branch = one Amplify app (or one branch of one app). The branch
model is in `docs/tenant-branches.md`; this document is only about what happens
after the push.

| Branch | Deploys to |
| ------ | ---------- |
| `main` | Nothing. Integration only - the mainline no brand serves directly. |
| `<brand>_staging` | That brand's staging Amplify app |
| `<brand>_production` | That brand's production Amplify app |
| `staging` | The Tranxfa brand. Named like an integration branch, is not one. |

So the deploy is the merge. Verify before pushing, not after.

## Build settings live in the Amplify console, not here

There is no `amplify.yml` on any branch, so each app is running Amplify's
auto-detected Vite build. That means:

- The build spec is **invisible to review** - it cannot be diffed, and a change
  to it leaves no trace in git.
- Two brands can silently be building differently.
- A build change cannot be rolled back with the code that needed it.

`amplify.yml` in the repo root fixes all three - Amplify prefers a committed
spec over the console setting. See "Proposed build spec" below; adopting it is
a deliberate change, because it overrides whatever each console currently has.

## Environment variables

Set per Amplify app, per branch. The app reads them at **build** time (Vite
inlines `import.meta.env.*`), so:

> Changing an environment variable does nothing until the branch is rebuilt.
> Set the variable, then trigger a redeploy.

A variable the code reads but the app does not define becomes `undefined` at
runtime, not a build failure. Nothing warns you.

The full list of what the code reads - including the ones missing from
`.env.example` - is in `docs/local-development.md`. The ones that must be set
per brand:

| Variable | Notes |
| -------- | ----- |
| `VITE_APP_BASE_URL` | That brand's API host. Wrong value = every call 404s. |
| `VITE_APP_URL` | The brand's marketing site |
| `VITE_APP_NAME` | Brand name in copy |
| `VITE_USER_AGREEMENT_URL`, `VITE_PRIVACY_POLICY_URL` | Signup links |
| `VITE_AUTH_CHANNEL` | `EMAIL` \| `MOBILE_NUMBER` \| `BOTH` - picks the onboarding flow. `BOTH` resolves per customer from whether they have an email |
| `VITE_ONBOARDING_COLLECT_ADDRESS` | Default true. Turning it off skips the onboarding address step; the transfer wizard still asks when the backend answers 412 |
| `VITE_ONBOARDING_VERIFY_MOBILE_NUMBER` | Default false. Email-first only - a mobile-first signup has already proven the number |
| `VITE_TRAVEL_ENABLED` | **Default true.** Set `false` on any deployment without the travel licence, or customers get Hotels and Bookings tabs leading to 404s |
| `VITE_VOLUME_PAYMENT_MERCHANT_ID` | Travel payments only. Unset means travel cannot take payment |
| `VITE_VOLUME_PAYMENT_ENVIRONMENT` | `SANDBOX` \| `PRODUCTION`, `SANDBOX` when unset - a deployment that forgets it takes no money rather than the wrong money |
| `VITE_PUSHER_APP_KEY` + host/cluster/scheme | Realtime. `VITE_APP_ENV` must **not** be `local`. |
| `VITE_THIRD_PARTY_SIGNUP_DECLARATION` | Only if that brand's backend requires it - see below |
| `VITE_THIRD_PARTY_TRANSACTION_DECLARATION` | Same, on transfer confirm |
| `VITE_VOLUME_PAYMENT_MERCHANT_ID` | Only brands using Volume Payments |

**The declaration variables are a live footgun.** If the backend requires
`third_party_declaration_accepted` and the Amplify app has no
`VITE_THIRD_PARTY_SIGNUP_DECLARATION`, the checkbox never renders, the app
posts `false`, the backend returns a 422, and `SignUpView` discards it - so
**signup silently does nothing** with no error and nothing in the console.
Confirmed against a live backend. If a brand reports "the Continue button is
dead", check this first.

## Deploying

1. Confirm what is about to ship: `git log --oneline <brand>_production..<brand>_staging`.
2. Confirm the environment variables the change needs already exist on the
   target app. Env first, code second - never the other way round.
3. Merge or push. Amplify builds automatically.
4. Watch the build in the Amplify console through to Deployed.
5. Verify on the deployed URL, not on cache:
   - hard-reload, then confirm the served bundle actually changed by reading
     `script[src]` for `/assets/index-*.js` - the hash must differ from before;
   - filter console errors by the **new** hash. Errors from a previous bundle
     linger in the tab's history and will lie to you.
6. Walk the brand's critical path: sign in, calculator quote, a recipient,
   confirm as far as payment. The brand's logo, colours and favicon are part of
   the check - a bad port shows the wrong brand and still builds.
7. Record it in the ledger (below).

## Rolling back

Amplify keeps previous builds; redeploying an earlier one in the console is the
fastest recovery and needs no git operation. Do that first, then fix forward in
git - a revert commit is a second deploy and takes another build cycle.

## The deployment ledger

`docs/deployments.csv` records what was deployed where, and by whom. Amplify
knows the commit; it does not know the *intent*, and nobody can reconstruct
fleet state from 45 branches by reading git.

One line per deploy, appended:

```
date,brand,environment,branch,commit,version,deployed_by,notes
```

The rule that makes it useful, taken from the backend's practice:

> **The ledger records only what was written down.** A brand or environment
> with no line gets a dash and "confirm in the Amplify console before
> scheduling". Never infer a fleet state you did not observe.

## Proposed build spec

Not yet adopted. Committing this makes every brand build identically and puts
build changes through review:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run test
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

Two notes before adopting it:

- `npm run test` in the build turns the 93-test suite into a deploy gate.
  Brand branches that forked before the suite existed have no `tests/`, so the
  script is missing there and the build fails - either add the suite when
  porting, or drop that line until the branch has it.
- `npm ci` needs `package-lock.json` to match `package.json`. It does today;
  a brand branch that edited one without the other will fail where the current
  auto-detected build (`npm install`) quietly succeeded.

Adopt it on one staging brand first and watch a full build before rolling it
out.

## Known gaps

Written down so they are not rediscovered:

- **No CI.** Nothing runs `npm test` or `npm run build` on a PR, so a branch
  can merge red. A GitHub Action doing both on PRs to `main` is the single
  highest-value addition here, and it is independent of Amplify.
- **No release versioning.** Nothing in the built app identifies which commit
  it is. The backend stamps a version and records it; this app cannot answer
  "what is production running?" without checking Amplify by hand.
- **No per-brand deploy record before this file.** Ledger history starts now.
