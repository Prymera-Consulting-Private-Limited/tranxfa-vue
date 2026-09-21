---
name: add-payment-provider
description: Add or modify a payment provider component (src/components/Payment/*.vue) and wire it into the payment view. Use when integrating a new PSP/gateway, adding a payment method screen, or fixing behaviour in an existing provider such as Fincode, Pay360, Monoova, Paga, Apaylo, CinetPay, PayCross, Volume or Wallet.
---

# Adding a payment provider

`views/Transfer/PaymentView.vue` opens a modal and picks a component from a
`v-if` chain on `transaction.payment.paymentProvider.code`. There is no
registry object — you edit the chain.

Currently wired: `MANUAL-PAYMENT`, `PAGA`, `MONOOVA`, `VOLUME-PAYMENTS`,
`APAYLO`, `PAY360`, `CINET_PAY`, `FINCODE`, `PAY-CROSS`, `WALLET`.

## First: which shape is it?

Pick the closest existing provider and copy **that** one, not an arbitrary one.

| Shape | Behaviour | Copy from |
| ----- | --------- | --------- |
| **Redirect** | Send the customer to `payment.paymentUrl`; they return via `/payment/cb/:transactionId` | `Fincode.vue` (most current), `Pay360.vue`, `CinetPay.vue` |
| **Manual / bank transfer** | Show `clientPaymentAccount` attributes with copy buttons + an "I've made payment" button | `ManualPayment.vue`, `Monoova.vue`, `PagaPayment.vue` |
| **Embedded SDK** | Mount a third-party widget into a container div | `Volume.vue` |
| **No customer action** | Just wait for settlement | `Wallet.vue` |

> These components are ~95% duplicated of each other. That is known debt
> (`docs/architecture.md`). Do not make it worse: if you are fixing a bug in
> the shared `status` computed or the Echo lifecycle, **fix it in every
> provider of that shape**, and mention in your summary which files you
> touched.

## The contract every provider must satisfy

### State projection

All providers project the backend payment state onto four UI states. Copy this
exactly — divergence here causes screens that never advance:

```js
CREATED | INITIALIZED | PENDING  → 'pending'
REDIRECTED                       → 'processing'
AUTHORIZED | CAPTURED            → 'completed'
FAILED                           → 'failed'
```

`AUTHORIZED` and `CAPTURED` are deliberately equivalent — the backend stops
polling at authorisation and nothing downstream waits for capture.

Use `PaymentState` from `@/enums/payment_state.js`. Never inline the string:
these are backend codes with dashes (`'TIMED-OUT'`, `'PART-REFUNDED'`), and a
mismatched literal fails silently because a `v-if` simply never matches.

### Realtime + polling, both

Subscribe in `onMounted`, and poll as a fallback. Websockets are an
optimisation, never the only path.

```js
onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
        props.transaction.payment.paymentUrl = e.payment_url;   // redirect providers
        // ... clear the interval on terminal states; route on completion
      });
  if (/* not yet actionable and not terminal */) {
    intervalId = setInterval(getTransaction, 10000);
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
  await clearPullInterval();
})
```

**Every `Echo.channel` needs its `leaveChannel`, and every `setInterval` needs
its `clearInterval`** — in `onUnmounted` *and* when a terminal state is
reached. This modal is mounted and unmounted repeatedly; leaks here manifest as
duplicate state updates and phantom redirects.

The Echo half is honoured everywhere: all ten providers pair `channel` with
`leaveChannel`. **The polling half is not.** Only five poll — `Fincode`,
`Pay360`, `PayCross`, `ManualPayment` and `Wallet`. `Apaylo`, `CinetPay`,
`Monoova`, `PagaPayment` and `Volume` rely on the websocket alone, so a
customer whose socket never connects sits on a screen that never advances.
Audit it yourself rather than assuming:

```sh
for f in src/components/Payment/*.vue; do
  printf '%-18s echo:%s interval:%s\n' "$(basename $f)" \
    "$(grep -c Echo.channel $f)" "$(grep -c setInterval $f)"
done
```

Write new providers with both. If you are touching one of the five that lacks
polling, adding it is a genuine fix — but it is a behaviour change to a payment
screen, so raise it rather than folding it into an unrelated commit.

One more shared quirk: these components **write through their `transaction`
prop** (`props.transaction.payment = transaction.payment`). The parent passes a
reactive model and the child mutates it in place. That is deliberate and
load-bearing here, and it is the one place the "never mutate a prop" rule in
the `vue-conventions` skill is knowingly broken. Match it; do not "fix" it in
passing.

### Redirect providers: wait for the URL, not just the state

`PENDING` alone does not mean payable. The hosted payment URL can arrive after
the state does. `Fincode.vue` gets this right:

```js
const isReadyToPay = () =>
  props.transaction.payment.state.code === PaymentState.PENDING
  && !! props.transaction.payment.paymentUrl;
```

Gate the Pay button on that, and keep polling until both have arrived.

### Completion

On `AUTHORIZED`/`CAPTURED`, route to the transaction after a short delay so the
success animation is seen:

```js
setTimeout(() => router.push({
  name: 'viewTransaction',
  params: {transactionId: props.transaction.id},
}), 1500);
```

Guard the timeout id and clear it on unmount if you set it outside the Echo
callback (see `Wallet.vue`). Note that where this `setTimeout` lives *inside*
the Echo callback — `Fincode.vue` and its copies — the id is not captured and
not cleared, so the push can fire ~1.5s after the modal closed. Harmless today
because the target is the transaction the customer just paid for, but do not
lengthen the delay or make the target conditional without capturing the id.

### Props and emits

```js
const props = defineProps({
  transaction: {type: Object(Transaction), required: true},
  showViewTransfer: {type: Boolean, required: false, default: true},
  retryFormErrors: {type: Object, required: false, default: null},  // only if retryable
});
const emits = defineEmits(['retryPayment']);
```

`retryPayment` bubbles to `PaymentView`, which calls
`POST /client/v1/transaction/payment/{id}` and caps attempts at 3. If the
provider collects payment data for the retry, emit the flattened
`{attribute: value}` map — see `Apaylo.vue`.

### Presentation

Use the shared lottie faces (`Payment/State/{AwaitingPending,Processing,PaymentCompleted,Failed}.vue`),
render amounts from `totalPaymentAmountCurrencyPrefixed` (never format money in
the SPA), and use `brand-*` colour utilities only.

## Wiring it up

In `views/Transfer/PaymentView.vue`, import the component and add a line to the
chain, matching the backend's provider `code` exactly:

```vue
<NewProvider
    v-if="transaction.payment.paymentProvider.code === 'NEW-PROVIDER'"
    v-bind:transaction="transaction"
    v-on:retryPayment="retryPayment" />
```

Confirm the code string against the backend rather than guessing: it is the
`PaymentInterface`'s `provider->code` in `console.remitso`. Note the existing
set mixes conventions (`CINET_PAY` with an underscore, `PAY-CROSS` with a
hyphen) — copy the real value.

If the provider redirects, also check `views/Transfer/PaymentCallbackView.vue`
handles its return.

## Tests

There is an established pattern — add to it:

- `tests/payment-redirect-providers.spec.js` for redirect providers,
- `tests/payment-view.spec.js` for the dispatch chain.

```js
import {installFakeEcho, makeTransaction, stateFaceStubs} from "./helpers.js";

const listeners = installFakeEcho();
const wrapper = mount(NewProvider, {
  props: {transaction: makeTransaction({stateCode: 'PENDING', paymentUrl: 'https://psp.test/x', providerCode: 'NEW-PROVIDER'})},
  global: {stubs: stateFaceStubs},
});

// drive a state change by hand:
listeners['client-payment.pay-1:PaymentTransactionStateUpdated']({state: {id: 'st-2', code: 'AUTHORIZED', color_scheme: 'green'}});
```

Cover at minimum: the pending→payable gate, the completed redirect, and the
failed/retry path. Run `npm test`.

## Checklist

- [ ] Shape chosen and copied from the closest current provider
- [ ] `PaymentState` enum used; no inline state strings
- [ ] Echo subscribe + `leaveChannel` on unmount
- [ ] Polling fallback + `clearInterval` on unmount and on terminal state
- [ ] Redirect providers gate on state **and** `paymentUrl`
- [ ] Wired into `PaymentView.vue` with the exact backend `code`
- [ ] Callback view handles the return, if applicable
- [ ] Amounts rendered from `*CurrencyPrefixed`; colours are `brand-*`
- [ ] Tests added; `npm test` green
- [ ] If you fixed shared duplicated logic, you fixed it in all siblings
