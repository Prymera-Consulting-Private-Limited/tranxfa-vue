---
name: add-kyc-provider
description: Add or modify an identity-verification provider (src/components/AccountVerification/Provider/*.vue), or add a step to one of the XState flow machines. Use when integrating a KYC/IDV vendor such as Sumsub, Persona, Didit, Shufti or UpPass, changing document upload, or altering the onboarding / transfer / add-recipient wizard steps.
---

# Account verification providers and flow steps

Two related jobs. Read the half you need.

---

## Part 1 — Adding a KYC provider

`components/AccountVerification/DocumentTypeItem.vue` picks a provider
component from a `v-if` chain on `documentType.api`.

Currently wired: `SUMSUB`, `SUMSUB-VIA-FINCODE`, `UPPASS`, `CYBRID` (→
`Persona.vue` — the name genuinely does not match the file), `SHUFTI`,
`DIDIT`, `SYSTEM`.

If the new code is an existing vendor reached through a different integrator —
as `SUMSUB-VIA-FINCODE` is Sumsub through Fincode — it needs **no new
component**. Add the code to the existing branch's list (`SUMSUB_APIS`) and
cover it in `tests/kyc-provider-dispatch.spec.js`. Check first that the SDK,
the token endpoint and the event payloads really are identical; if any differ,
write a separate component instead.

### The event contract

Every provider declares **five** emits. The parent (`DocumentTypeItem`) owns
the modal and the spinner; the provider owns nothing but the vendor
integration.

| Emit | When | What the parent actually does today |
| ---- | ---- | ---------------------------------- |
| `sdkInitialized` | vendor UI is up | hides the spinner |
| `sdkApplicantStatusChanged` | **terminal success** | refreshes the customer, closes the modal, routes onward |
| `sdkCancelled` | user backed out | closes the modal - **bound only for `Persona` and `Didit`** |
| `sdkError` | vendor error, **or a failed token request** | replaces the spinner with a message and a Try again / Close pair |
| `sdkStepCompleted` | intermediate step | **nothing. No listener exists anywhere in `src/`.** |

That table is the real wiring, not the intended one - `sdkStepCompleted` is
declared by all six providers and bound by none. Verify rather than assume:

```sh
grep -rn "v-on:sdkStepCompleted" src/     # returns nothing
```

**`sdkError` is the one that has to work, and it has two sources.** The vendor
failing after mount is the obvious one. The commoner one is the token request:
`getNewAccessToken()` rethrows, so an `onMounted` that awaits it without a
catch lets the rejection escape unhandled and emits *nothing at all* - which
left the spinner turning with nothing in the console. Wrap it:

```js
onMounted(async () => {
  try {
    const accessToken = await getNewAccessToken();
    await launchVendorSdk(accessToken);
  } catch (e) {
    emit('sdkError', e);
  }
})
```

Keep `getNewAccessToken()` throwing. Sumsub also passes it to the SDK as the
token-refresh callback, where throwing is the contract; returning `null`
instead would hand the SDK a null token on refresh.

For a hosted-redirect provider, `return` after emitting so it does not go on to
emit `sdkInitialized` and subscribe to Echo - announcing itself ready on a
failed token trades a hang for an empty modal with a dead Continue link.

`tests/kyc-token-failure.spec.js` pins the emit for all five token-fetching
providers; `tests/kyc-provider-dispatch.spec.js` pins the parent's handling.

Two related traps in the existing set:

- **Sumsub only emits on GREEN.** Its `idCheck.onApplicantStatusChanged`
  handler filters to `reviewStatus === 'completed' && reviewAnswer === 'GREEN'`,
  so a RED review emits nothing at all and the modal simply sits there. The
  unused `src/enums/review_answer.js` (which has no `export` statement, so it
  cannot even be imported) is the vestige of the intent to handle RED.
- **`Persona.vue` and `Sumsub.vue` have no `onUnmounted` at all**, so their SDK
  instances outlive the modal. `Didit`, `Shufti` and `UpPass` do clean up. Do
  not copy the first two for lifecycle.

Emit `sdkApplicantStatusChanged` **only on a genuine terminal success**. It
triggers a profile refresh and navigation; firing it on an intermediate step
sends the customer onward with the document still pending.

Props are always:

```js
const props = defineProps({
  documentCategory: {type: DocumentCategory, required: true},
  documentType: {type: DocumentType, required: true},
});
```

### Getting a session token

Always the same call, whatever the vendor:

```js
const {data} = await customerUtils.getAccountVerificationToken(
  props.documentCategory,
  props.documentType,
  null,        // a File — only for SYSTEM uploads, yields a presigned S3 PUT URL
  returnUrl,   // only for hosted-redirect vendors
);
// data.token
```

For hosted-redirect vendors pass the current absolute URL so the vendor can
send the customer back:

```js
const route = router.currentRoute.value;
const returnUrl = window.location.origin + route.fullPath;
```

### Pick the right completion mechanism

This is the decision that matters.

**In-page SDK** (`SUMSUB`, `SUMSUB-VIA-FINCODE`, `CYBRID`/Persona, `DIDIT`) —
the SDK's own callback
is authoritative. Copy `Didit.vue`, which is the most carefully written:

- it registers callbacks on a **singleton** (`DiditSdk.shared`), so
  `onUnmounted` must null them out and call `destroy()`, otherwise a stale
  closure from a previous mount fires later;
- it sets `closeModalOnComplete: true`, because otherwise the overlay stays
  above the app and dismissing it reports the session as *cancelled*.

Sumsub filters on the payload rather than trusting the event:

```js
.on("idCheck.onApplicantStatusChanged", (payload) => {
  if (payload.reviewStatus === 'completed' && payload?.reviewResult?.reviewAnswer === 'GREEN') {
    emit('sdkApplicantStatusChanged', payload);
  }
})
```

**Hosted redirect** (`UPPASS`, `SHUFTI`) — the SPA cannot observe the vendor's
page, so completion arrives over websockets instead. Copy `UpPass.vue`:

```js
onMounted(async () => {
  accessToken.value = await getNewAccessToken();
  emit('sdkInitialized');
  Echo.channel(`client-customer.${customer.data?.id}`)
      .listen('CustomerDocumentUploaded', () => emit('sdkApplicantStatusChanged'));
})
onUnmounted(() => {
  Echo.leaveChannel(`client-customer.${customer.data?.id}`);
});
```

The component renders a "Continue" link to `accessToken` (which is a URL, not a
token, for these vendors) plus a Cancel button.

**In-house upload** (`SYSTEM`) — no vendor. `System.vue` chooses between
`PoiFileUpload` (photo + back page) and `MultiFileUpload` (arbitrary set, 5 MB
per file) on `documentCategory.code === 'POI'`. Files are PUT **directly to
S3** using the presigned URL returned as the "token"; only the resulting object
key is POSTed to `/client/v1/document/upload`. Document bytes never transit the
API — keep it that way.

### Wiring it up

Add to the chain in `DocumentTypeItem.vue`:

```vue
<NewVendor
    v-if="documentType.api === 'NEW_VENDOR'"
    v-on:sdkInitialized="isSdkInitialized = true"
    v-on:sdkApplicantStatusChanged="sdkFinalStateReached"
    v-on:sdkCancelled="closeSdk"
    v-bind:documentType="documentType"
    v-bind:documentCategory="documentCategory" />
```

The `api` string comes from the backend's document type record — confirm it,
don't guess.

Note the two call sites behave differently, and both must work:

- `views/AccountVerification/CategoryView.vue` — standalone KYC; on completion
  refreshes and routes to the dashboard or the verification index.
- `views/Transfer/IndexView.vue` — mid-transfer KYC; on completion re-fetches
  the quote and, if no documents remain pending, re-attempts `confirmQuote()`.

### Checklist

- [ ] Four emits implemented; `sdkApplicantStatusChanged` only on terminal success
- [ ] Vendor singletons/listeners torn down in `onUnmounted`
- [ ] `Echo.leaveChannel` if the component subscribed
- [ ] `return_url` passed for hosted-redirect vendors
- [ ] Wired into `DocumentTypeItem.vue` with the exact backend `api` code
- [ ] Verified from **both** call sites above

---

## Part 2 — Changing a flow machine

`machines/` holds four XState machines: `onboarding_navigation_machine`,
`mobile_number_onboarding_navigation_machine` (selected by
`VITE_AUTH_CHANNEL`), `transaction_navigation_machine`, and
`add_recipient_navigation_machine`.

### Two invariants

**1. Guards read the Pinia store, not machine context.** The machines call
`useCustomerStore()` at module scope and close over it. They are **plain
module-level functions referenced directly** - there is no `guards: {}` option
map and no string names, so a typo is a `ReferenceError` at import rather than
a guard that silently never passes:

```js
const customerStore = useCustomerStore();

function getCustomer() {
    return customerStore.customer?.data;
}

function isEmailVerified() {
    return customerStore.isLoaded && !! getCustomer()?.account?.isEmailVerified;
}

// ...used as a reference, not a string:
PROCEED: [{target: 'sourceCountrySelection', guard: isEmailVerified}]
```

Use optional calls on the model's own predicates - `customer?.addressInformationRequired?.()`.
The transfer machine used to call `customer.data.addressInformationRequired()`
bare in three places, so a machine started before the profile loaded threw
*inside the guard* and errored the actor instead of navigating.

So guards see profile updates with no explicit event — but Pinia **must be
active before the module is imported**. Any test mounting a view that imports a
machine needs `setActivePinia()` before the dynamic `import()`; see
`tests/transfer-confirm-refusals.spec.js`.

The transfer machine additionally keeps `quote` in context, updated with
`send({type: 'SET_CONTEXT', quote})`. Always `SET_CONTEXT` before `PROCEED`
after the quote changes, or a guard will read a stale quote.

**2. Targets are ordered furthest-first.** A `PROCEED` transition lists targets
in descending order of progress, each with a guard:

This is the real list from `onboarding_navigation_machine`'s opening state:

```js
PROCEED: [
  {target: 'onboardingComplete',        guard: mobileNumberSettled},
  {target: 'mobileNumberVerification',  guard: requiresMobileNumberVerification},
  {target: 'mobileNumberInput',         guard: addressInformationCompleted},
  {target: 'addressInformation',        guard: requiresAddressInformation},
  {target: 'employmentInformation',     guard: requiresEmploymentInformation},
  {target: 'identityInformation',       guard: hasCountry},
  {target: 'sourceCountrySelection',    guard: isEmailVerified},
]
```

XState takes the first guard that passes, so a single `PROCEED` lands the
customer at the furthest step they qualify for. The initial state is therefore
a **resume dispatcher**, not a first step. **Inserting a step means adding its
target to every earlier state's list, in the right position** — miss one and
that state skips your step.

Guards are a **cumulative prefix chain**: each one calls the one before it, so
`hasMobileNumber()` re-asserts address, employment, identity, country and
email. Follow that when adding one, or ordering stops being total. The
mobile-first machine has a comment explaining why `emailVerificationRequired()`
is written out longhand rather than as `!emailVerified()` — negating a
prefix-carrying guard inverts the prefix too, and sends the customer to the
wrong step.

**Optional steps need both halves gated.** `requiresX()` decides whether to ask;
`xCompleted()` is the prefix every later guard chains through, and must read
"nothing further is owed" — so on a deployment that skips the step it is
complete *by definition*:

```js
function addressInformationCompleted() {
    if (! collectsAddress()) {
        return employmentInformationCompleted();   // not false
    }
    return employmentInformationCompleted() && ! getCustomer()?.addressInformationRequired?.();
}
```

Gating only `requiresX()` makes every subsequent step unreachable. The two
flags in play are `collectsAddress()` and `verifiesMobileNumber()`, both from
`src/onboarding_config.js`.

### Adding a step

1. Add the state, with its own `PROCEED` target list (furthest-first).
2. Add its target to **every** preceding state's `PROCEED` list.
3. Add a guard that also asserts everything before it.
4. Render it in the view's `v-if` chain on `snapshot.value`.
5. Handle any back-navigation events (`EDIT_PERSONAL_INFORMATION`,
   `CHANGE_COUNTRY`, `SELECT_RECIPIENT`).
6. For the transfer wizard, add the step to `components/Transaction/Progress.vue`
   so the progress rail matches.

### The server can override the machine

In the transfer wizard the machine is a fast path; `POST /quote/confirm/{id}`
is the authority. A `412` sends the customer back:

| `type` | Machine event, or UI reaction |
| ------ | ----------------------------- |
| `incomplete_customer_address` | `ADDRESS_REQUIRED` |
| `account_verification_required` | `ACCOUNT_VERIFICATION_REQUIRED`, reading `pending_documents` |
| `poi_info_check_failed` | `POI_INFO_CHECK_FAILED` |
| `wallet_subscription_required` | opens the terms modal in `enrol` mode |
| `wallet_terms_reacceptance_required` | opens the terms modal in `reaccept` mode |
| `insufficient_wallet_balance` | inline shortfall message, re-fetches the wallet |
| `wallet_authorization_required` | requests a spend OTP, opens the OTP modal |
| `wallet_authorization_invalid` | re-opens the OTP modal with the error |
| `duplicate_transaction`, `active_transfer_disable_rule` | inline warning |
| anything else | inline message from the body, or a generic fallback |

Only the first three drive the machine; the wallet types are handled in the
view. The wallet strings live in `src/enums/wallet_refusal_type.js` — use the
enum, not literals.

If you add a step that the backend can demand, add the `type` → event mapping
in `views/Transfer/IndexView.vue` and a case to
`tests/transfer-confirm-refusals.spec.js`.

**Every branch must clear `isStepProcessing`, including the fallback and the
non-412 path.** `wallet_authorization_required` is the one branch that does not
set it directly — it delegates to `requestWalletSpendCode()`, which clears the
flag on both its success and failure paths. If you add a delegating branch,
check the callee the same way. The pre-`main` version of this code left the
spinner running forever on an unknown error; `tests/transfer-confirm-refusals.spec.js`
exists to stop that returning.
