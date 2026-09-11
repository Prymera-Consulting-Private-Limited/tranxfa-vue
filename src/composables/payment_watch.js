import {onMounted, onUnmounted, ref} from "vue";
import {customerChannel, leaveCustomerChannel} from "@/realtime.js";
import Transaction from "@/models/transaction.js";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import {useTransactionUtils} from "@/composables/transaction_utils.js";

/**
 * Keeps one payment in step with the server.
 *
 * Ten provider components implemented this protocol by hand and five of them
 * came out wrong, which is how a Monoova transfer could sit on a spinner
 * forever. The bugs were not subtle once they were side by side:
 *
 *  - Five subscribed to the broadcast and did nothing else. Measured on
 *    staging, the channel is only subscribed 2.5s after the payment page
 *    starts loading, and the backend flips the payment to PENDING inside that
 *    window. The event lands in an empty room and nothing ever asks again.
 *
 *  - The five that did poll cancelled the interval but not the request already
 *    in flight, so a response captured *before* a broadcast could land after it
 *    and overwrite the newer state with an older snapshot - with polling now
 *    cancelled, permanently.
 *
 *  - Every one of them assigned `e.shared_reference` and `e.payment_url`
 *    unconditionally. A broadcast that omits a key erased it, and those two
 *    fields are the bank reference the customer has to quote and the URL the
 *    Pay button needs.
 *
 *  - FAILED was in none of the terminal lists, so a failed payment polled
 *    every ten seconds for as long as the customer looked at the error.
 *
 * The protocol here: subscribe, then immediately fetch once - that closes the
 * race deterministically rather than hoping the next broadcast arrives - then
 * poll until the payment is ready to act on. After that the socket carries it,
 * with a refresh whenever the tab is looked at again, so a dropped connection
 * costs a glance rather than a stuck page.
 */
export function usePaymentWatch(transaction, {isReady, isFinal, intervalMs = 5000, onState = null, slowAfterMs = 60_000} = {}) {
    const transactionUtils = useTransactionUtils();

    let intervalId = null;
    let unmounted = false;

    // A hosted payment can sit in PENDING with no payment_url when the provider
    // never hands one back. Nothing here can fix that, but the page can stop
    // pretending it is about to: after slowAfterMs unsettled, isSlow turns on
    // and the provider component shows a way out.
    const isSlow = ref(false);
    let slowTimerId = null;

    function stopSlowTimer() {
        if (slowTimerId) {
            clearTimeout(slowTimerId);
            slowTimerId = null;
        }
    }

    // Bumped by anything that applies state. A fetch records it before going out
    // and drops its own answer if the world moved on while it was away.
    let revision = 0;

    const payment = () => transaction?.payment ?? null;
    const ready = () => { try { return !! isReady?.(); } catch { return false; } };
    const final = () => { try { return !! isFinal?.(); } catch { return false; } };

    // Nothing left to ask about: either the payment can be acted on, or it is over.
    const settled = () => ready() || final();

    function stopPolling() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        stopSlowTimer();
        isSlow.value = false;
    }

    /**
     * Apply a broadcast. Only the fields it actually carries: a missing key means
     * the broadcast has nothing to say about that field, not that it is empty.
     */
    function applyEvent(event) {
        const current = payment();
        if (! current || ! event) {
            return;
        }

        if (event.state) {
            current.state = PaymentTransactionState.getInstance(event.state);
        }
        if ('shared_reference' in event) {
            current.sharedReference = event.shared_reference;
        }
        if ('payment_url' in event) {
            current.paymentUrl = event.payment_url;
        }
        if ('awaiting_confirmation' in event) {
            current.awaitingConfirmation = event.awaiting_confirmation === true;
        }

        revision++;
        if (settled()) {
            stopPolling();
        }
        onState?.(current.state?.code ?? null);
    }

    async function refresh() {
        if (unmounted || ! transaction?.id) {
            return;
        }

        const at = revision;
        try {
            const response = await transactionUtils.getTransaction(transaction.id);
            // A broadcast overtook this request while it was in flight. Its answer
            // is older than what is on screen, so it is dropped rather than applied.
            if (unmounted || at !== revision) {
                return;
            }
            const fresh = Transaction.getInstance(response.data);
            if (fresh.payment) {
                transaction.payment = fresh.payment;
                revision++;
            }
        } catch {
            // A failed poll is not fatal - the next tick tries again, and the
            // socket is still listening.
            return;
        }

        if (settled()) {
            stopPolling();
        }
        onState?.(payment()?.state?.code ?? null);
    }

    // The socket can drop without the page noticing. Coming back to the tab is
    // the cheapest signal that it is worth asking again.
    function onVisible() {
        if (document.visibilityState === 'visible' && ! final()) {
            refresh();
        }
    }

    onMounted(() => {
        const current = payment();
        if (! current?.id) {
            return;
        }

        customerChannel(`client-payment.${current.id}`)
            .listen('PaymentTransactionStateUpdated', applyEvent);

        document.addEventListener('visibilitychange', onVisible);

        // The interval is scheduled BEFORE the first fetch and the fetch is not
        // awaited. Awaiting it meant a request that never came back also meant an
        // interval that was never scheduled - no polling at all, which is the
        // failure this composable exists to prevent.
        if (! settled()) {
            intervalId = setInterval(refresh, intervalMs);
            slowTimerId = setTimeout(() => { isSlow.value = ! settled(); }, slowAfterMs);
        }

        // Closes the subscription race: anything broadcast before the listener
        // existed is picked up here rather than waiting for the next tick.
        refresh();
    });

    onUnmounted(() => {
        unmounted = true;
        const current = payment();
        if (current?.id) {
            leaveCustomerChannel(`client-payment.${current.id}`);
        }
        document.removeEventListener('visibilitychange', onVisible);
        stopPolling();
    });

    return {refresh, stopPolling, isSlow};
}

export default usePaymentWatch;
