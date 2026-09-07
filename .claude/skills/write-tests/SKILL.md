---
name: write-tests
description: Write or fix a vitest spec for this repo - fixtures, Echo and axios mocking, the Pinia-before-import rule for machines, and what is worth pinning. Use when adding tests for a model, composable, machine, component or view, when a spec fails and you need to know whether the test or the code is wrong, or when re-capturing tests/fixtures/api.
---

# Writing tests here

vitest 5 + jsdom + `@vue/test-utils`. `npm test` runs everything; the suite is
**34 files / 516 tests** and is green on `main`. CI runs it on every PR to
`main`, so a red suite blocks the merge - and Amplify only builds *after* the
merge, which makes this the last gate before a brand's site.

## Layout

Specs are **flat** in `tests/`, `kebab-name.spec.js`. No directory tree, even
for a deep feature: `tests/travel-order-models.spec.js`, not
`tests/unit/travel/orders/`. Name the file after what it covers and prefix the
feature area where the bare name would be ambiguous.

Everything shared lives in two files - read them before hand-rolling anything:

| Helper | From | Gives you |
| ------ | ---- | --------- |
| `makeTransaction({stateCode, paymentUrl, providerCode, …})` | `./helpers.js` | a `Transaction` shaped the way payment components read it |
| `makeTransactionPayload({…})` | `./helpers.js` | the same thing API-shaped, for `Transaction.getInstance` |
| `installFakeEcho()` | `./helpers.js` | replaces global `Echo`, returns a listener map you fire by hand |
| `modalStubs`, `stateFaceStubs` | `./helpers.js` | HeadlessUI / layout / lottie passthroughs |
| `fixture(name)` | `./fixtures.js` | a captured API response, fresh deep copy each call |
| `fixtureResponse(name, status)` | `./fixtures.js` | that, wrapped as an axios success |
| `fixtureError(name, status)` | `./fixtures.js` | that, wrapped as an axios rejection |
| `mockApi(axios, {pattern: name})` | `./fixtures.js` | routes `get`/`post`/`delete` by URL substring |

## The four rules that actually bite

### 1. Pinia must be active *before* you import a view that imports a machine

`machines/*.js` call `useCustomerStore()` at **module scope**. A static import
of a view that pulls in a machine therefore runs before any `beforeEach`. Use a
dynamic import after `setActivePinia`:

```js
const pinia = createPinia();
setActivePinia(pinia);
const {default: IndexView} = await import("@/views/Transfer/IndexView.vue");
```

`tests/transfer-confirm-refusals.spec.js` is the worked example. Getting this
wrong produces "getActivePinia was called with no active Pinia" from a line
that looks unrelated.

### 2. Mock axios as a default-export object

The app imports the global singleton, so mock that shape - not `vi.mock('axios')`
bare:

```js
vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn()}}));
```

Add `delete`/`put` only if the code under test uses them. Then either
`mockResolvedValue` per call, or hand the whole surface to `mockApi`:

```js
mockApi(axios, {
    '/client/v1/profile': 'profile-05-onboarded',
    '/client/v1/quote/confirm': {name: 'error-422-confirm-missing', status: 422},
});
```

Patterns match as substrings, longest first, so a specific path beats a prefix.

Note there is **no captured 412 fixture** - the confirm refusals that drive the
transfer wizard all need state the capture script cannot reach. Build those
bodies inline (`{type: 'incomplete_customer_address', message: '…'}`) and keep
using fixtures for the shapes that were captured.

### 3. Error shapes: set both `e.status` and `e.response.status`

The SPA branches on `e.status` in newer code (`AttributeCollection`, the
`main.js` interceptor) and `e.response.status` in older code (`Transfer/IndexView`).
`fixtureError()` sets both, which is why it exists. A hand-rolled `{response:
{status: 422}}` will pass the old branches and silently skip the new ones.

`tests/axios-contract.spec.js` is the **one spec that does not mock axios** -
it drives the real library against a `node:http` server under
`// @vitest-environment node` to pin that `e.status` is really assigned. Every
other spec mocks axios, which means an axios upgrade is invisible to them; that
file is the only thing standing between a major bump and a broken 401 redirect.
Do not mock axios in it.

### 4. Fire websocket events by hand

```js
const listeners = installFakeEcho();
mount(Component, {props: {...}, global: {stubs: stateFaceStubs}});

listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({
    state: {id: 'st-2', code: 'AUTHORIZED', color_scheme: 'green'},
});
await flushPromises();
```

The key is `` `${channel}:${event}` ``. Assert `Echo.leaveChannel` was called on
unmount - the leak it guards against is real and repeats across ten payment
components.

## Fixtures are a contract test, not convenience data

`tests/fixtures/api/*.json` are **real responses** captured from a seeded local
console, sanitised by `scripts/sanitise-fixtures.py`. `tests/fixtures-contract.spec.js`
runs the real model mappers over them.

That is the point: `getInstance` is silent on unknown keys, so a backend field
rename produces `undefined` rather than an error, and no unit test with a
hand-written payload will ever notice. Only a fixture-backed assertion catches
it.

Re-capture with `scripts/capture-api-fixtures.sh` (needs the local stack -
`docs/local-development.md`). **Review the diff for shape, not identifiers** - a
renamed or vanished field is the signal; changed UUIDs and timestamps are
noise. Five fixtures are not regenerated by the script because they need a POI
approved in the console first; `tests/fixtures/README.md` lists them.

Never paste a raw captured response in by hand: the sanitiser strips AWS
presigned credentials, Laravel stack traces and local paths, and
`fixtures-contract.spec.js` asserts none of those came back.

## What is worth pinning

Test the things that fail *silently*, because this codebase has a lot of them:

- **Enum string values**, not just their keys. `PaymentState.TIMED_OUT` was
  `'TIMED_OUT'` for months while the backend sent `'TIMED-OUT'`; nothing threw,
  the `v-if` just never matched. `tests/enums.spec.js` asserts each value
  mirrors its key *except* the hyphenated wire spellings, listed explicitly.
- **Dispatch chains with no fallback.** Both provider chains render nothing for
  an unknown code and leave the customer on a spinner. `tests/kyc-provider-dispatch.spec.js`
  pins the whole chain including that no-fallback behaviour - mock every
  provider component, since each boots a third-party SDK on mount.
- **Every branch of an error handler**, especially that it clears its spinner.
  `tests/transfer-confirm-refusals.spec.js` covers the confirm contract.
- **Flag parsing.** `tests/feature-flags.spec.js` pins `0`, `no`, `off`,
  `false`, `FALSE` all reading as off - the naive `!== 'false'` check got every
  one of those wrong.
- **Guard prefix chains** in the machines: assert a customer missing an early
  step cannot reach a later one. That regression - a verified email jumping
  straight to `onboardingComplete` with identity incomplete - is exactly what
  the cumulative guards prevent.

## Prove the test fails

A test written against code that already works proves nothing about whether it
would catch a regression. Break the thing deliberately, watch the test go red,
put it back. Do this especially for the silent failures above - a `v-if` that
never matches produces an empty render, which a loose assertion happily passes.

Verify by **exit code**, not by reading output:

```sh
npm test; echo "exit=$?"
npm test -- tests/your-spec.spec.js; echo "exit=$?"
```

Note `--reporter=basic` was removed in vitest 5 - passing it fails with an
`ERR_LOAD_URL` that looks like a test failure. Use the default reporter.

## Checklist

- [ ] Spec is flat in `tests/`, kebab-case, named after what it covers
- [ ] `setActivePinia` before any dynamic import of a view that reaches a machine
- [ ] axios mocked as `{default: {...}}`; error shapes via `fixtureError`
- [ ] Reused `helpers.js` / `fixtures.js` rather than hand-rolling
- [ ] `Echo.leaveChannel` / `clearInterval` asserted on unmount, if relevant
- [ ] Deliberately broke the code and saw the test go red
- [ ] `npm test` exit 0
