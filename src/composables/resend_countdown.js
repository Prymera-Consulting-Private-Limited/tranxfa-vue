import {onUnmounted, ref} from "vue";

/**
 * The "Resend in Ns" timer, in one place.
 *
 * It used to be copied into five components, each subtracting one per tick and
 * racing a separate timeout of the same length. The two were exactly equal, so
 * any drift decided it: on Safari the ticks lost, the timeout rejected into a
 * swallowed catch, the Resend link never appeared, and nothing cleared the
 * interval, so the number carried on below zero.
 *
 * This counts against the clock instead. The end is stamped once, every tick
 * recomputes what is left, the display never goes below zero, and the exit is
 * "at or past the end" rather than an exact match, so a late or missed tick
 * still finishes the countdown. A background tab that throttles timers comes
 * back to the right number rather than to a stale one.
 *
 * @param {number} seconds how long to wait before the link comes back
 * @param {number} tickMs how often to look at the clock
 * @returns {{countdown: object, showResendButton: object, start: function, stop: function}}
 */
export function useResendCountdown(seconds = 30, tickMs = 250) {
    const countdown = ref(seconds);
    const showResendButton = ref(false);
    let intervalId = null;

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function start() {
        stop();
        showResendButton.value = false;
        countdown.value = seconds;

        const end = Date.now() + seconds * 1000;

        intervalId = setInterval(() => {
            const remaining = Math.ceil((end - Date.now()) / 1000);

            countdown.value = Math.max(0, remaining);

            if (remaining <= 0) {
                stop();
                showResendButton.value = true;
            }
        }, tickMs);
    }

    // A screen left before the countdown finishes must not keep a timer alive.
    onUnmounted(stop);

    return {countdown, showResendButton, start, stop};
}
