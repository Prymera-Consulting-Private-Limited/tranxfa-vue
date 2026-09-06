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

Currently wired: `SUMSUB`, `UPPASS`, `CYBRID` (→ `Persona.vue` — the name
genuinely does not match the file), `SHUFTI`, `DIDIT`, `SYSTEM`.

### The event contract

Every provider component normalises its vendor SDK onto four emits. The parent
(`DocumentTypeItem`) owns the modal and the spinner; the provider owns nothing
but the vendor integration.

| Emit | When | Parent's reaction |
| ---- | ---- | ----------------- |
| `sdkInitialized` | vendor UI is up | hides the spinner |
| `sdkApplicantStatusChanged` | **terminal success** | refreshes the customer, closes the modal, routes onward |
| `sdkCancelled` | user backed out | closes the modal, no refresh |
| `sdkError` | vendor error | surfaces an error |

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

**In-page SDK** (`SUMSUB`, `CYBRID`/Persona, `DIDIT`) — the SDK's own callback
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
`useCustomerStore()` at module scope and close over it:

```js
const customerStore = useCustomerStore();
const customer = customerStore.customer;
guards: { emailVerified: () => customer.data?.account?.isEmailVerified === true }
```

So guards see profile updates with no explicit event — but Pinia **must be
active before the module is imported**. Any test mounting a view that imports a
machine needs `setActivePinia()` before the dynamic `import()`; see
`tests/transfer-confirm-refusals.spec.js`.

The transfer machine additionally keeps `quote` in context, updated with
`send({type: 'SET_CONTEXT', quote})`. Always `SET_CONTEXT` before `PROCEED`
after the quote changes, or a guard will read a stale quote.

**2. Targets are ordered furthest-first.** A `PROCEED` transition lists targets
in descending order of progress, each with a guard:

```js
PROCEED: [
  {target: 'onboardingComplete',  guard: 'mobileNumberProvided'},
  {target: 'mobileNumberInput',   guard: 'employmentInformationProvided'},
  {target: 'employmentInformation', guard: 'employmentInformationRequired'},
  {target: 'identityInformation', guard: 'countryProvided'},
  {target: 'sourceCountrySelection', guard: 'emailVerified'},
]
```

XState takes the first guard that passes, so a single `PROCEED` lands the
customer at the furthest step they qualify for. This is what makes the flows
resumable. **Inserting a step means adding its target to every earlier state's
list, in the right position** — miss one and that state skips your step.

Guards are cumulative by convention: `employmentInformationProvided` re-asserts
email, country and identity as well. Follow that when adding one, so ordering
stays total.

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

| `type` | Event |
| ------ | ----- |
| `incomplete_customer_address` | `ADDRESS_REQUIRED` |
| `account_verification_required` | `ACCOUNT_VERIFICATION_REQUIRED` |
| `poi_info_check_failed` | `POI_INFO_CHECK_FAILED` |

If you add a step that the backend can demand, add the `type` → event mapping
in `views/Transfer/IndexView.vue` and a case to
`tests/transfer-confirm-refusals.spec.js`. **Unrecognised types must still
clear `isStepProcessing` and show a message** — never leave the spinner running.
