# Runbook — issuing a local wallet (VAS) licence for testing

Why this exists: every wallet route on the Client API sits behind the
`EnsureVasLicensed` middleware. A deployment with no licence answers **404** on
them, and the web frontend treats that as "feature does not exist here" and hides
the wallet entirely. To test the wallet against a local backend you issue
yourself a local licence for the **`WALLETS`** catalog entry. All paths below are
in the console repo (`console.remitso`).

## How licensing works (30 seconds)

- The licence is a **signed JSON file** (Ed25519). The repo carries only the
  public verification key (`config/vas-license.php`); the private signing key
  lives on issuing machines at `storage/app/keys/vas-license-signing.key`
  (gitignored) — no key, no licence, by design.
- At runtime the app reads **one file**: `VAS_LICENSE_RUNTIME_PATH`, defaulting
  to `<repo root>/vas-license.json`. Missing file = the normal unlicensed
  deployment (silent). Tampered / wrong-key / mis-bound file = rejected loudly in
  the log and treated as absent. Money transfer is never affected either way.
- A licence file is bound to a client + environment. **Local machines bypass the
  binding check** (`APP_ENV=local`), so a locally compiled file just works.

## Steps

1. **Signing key** (skip if `storage/app/keys/vas-license-signing.key` exists):

   ```bash
   php artisan app:vas:license-keygen
   ```

2. **Compile the licence** — interactive; refuses to run outside
   `APP_ENV=local`/`testing`:

   ```bash
   php artisan app:vas:license-compile
   ```

   Prompt answers for a local wallet-test licence:
   - *Which client?* — the client folder your local data belongs to (e.g. `remitso`)
   - *Which environment?* — `staging`
   - *Which catalog entries?* — `WALLETS`
   - *Is [WALLETS] a trial?* — `no`
   - *Licensed from* — today (default)
   - *Expires* — `never`
   - *Issued by* — your email

   The file lands at
   `storage/app/environments/<client>/vas-license.staging.json`.

3. **Stage it at the runtime path** (either copy it to the default location…):

   ```bash
   cp storage/app/environments/<client>/vas-license.staging.json vas-license.json
   ```

   …or point the override at it in `.env`:
   `VAS_LICENSE_RUNTIME_PATH=/…/storage/app/environments/<client>/vas-license.staging.json`

4. **Verify** (also prints the terms; exits non-zero within 14 days of expiry):

   ```bash
   php artisan app:vas:license-inspect vas-license.json
   ```

No restart needed — the licence is resolved once per request process.

## After the licence: the country side

Licensed ≠ offered. `GET /client/v1/wallet/subscription` (the frontend's probe)
will now reach the controller, and for an un-enrolled customer answers 404 with
`wallet_offered: true|false` — **false when no wallet terms are published for the
customer's country**. If the wallet still doesn't appear for your test customer,
publish a wallet terms version for their country in the console, then reload.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Wallet endpoints still 404, frontend hides feature | No file at the runtime path, or it names no `WALLETS` entry |
| `VAS license … rejected` critical log line | File edited after signing, or signed with a different key — recompile |
| `bound to [x/y] but this deployment is [a/b]` log line | Only possible on stamped (deployed) builds; locals bypass this |
| 403 "license is not active" on money actions | Entry expired — history stays readable by design; reissue with a later expiry |
| Wallet appears but intro face never offers enrolment | `wallet_offered: false` — publish terms for the customer's country |

Expiry semantics worth knowing while testing: an expired entry drops the feature
to **read-only** (`licensed`-level routes keep answering; `active`-level refuse
with 403; customer-facing gates marked `absent` turn that into 404) — no sweep,
no state change, just the dates.
