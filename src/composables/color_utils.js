/**
 * Status colours for transaction, payment and payout states.
 *
 * The backend sends a raw Tailwind palette name in `color_scheme` - "emerald",
 * "amber", "rose". Emitting `var(--color-emerald-600)` straight from that had
 * three problems:
 *
 *  - It let the backend pick colours the design system never sanctioned. An
 *    emerald success badge sits 12 degrees from a teal brand and reads as brand
 *    chrome rather than as "this one succeeded".
 *  - A scheme we do not have a palette for - a typo, or a new one the API adds -
 *    produced `var(--color-shrubbery-600)`, which resolves to nothing. The
 *    declaration is dropped and the badge renders unstyled rather than wrong,
 *    which is harder to notice and harder to report.
 *  - It routed around the CI colour gate, which reads class names.
 *
 * So the scheme is mapped onto our own semantic ramps, every palette name the
 * API can plausibly send is accounted for, and anything unrecognised degrades to
 * a legible neutral badge.
 */

const SEMANTIC_BY_SCHEME = {
    green: 'success', emerald: 'success', lime: 'success', teal: 'success',
    amber: 'warning', yellow: 'warning', orange: 'warning',
    red: 'danger', rose: 'danger', pink: 'danger', fuchsia: 'danger',
    blue: 'info', sky: 'info', cyan: 'info', indigo: 'info', violet: 'info', purple: 'info',
    gray: 'neutral', grey: 'neutral', slate: 'neutral', zinc: 'neutral',
    neutral: 'neutral', stone: 'neutral',

    // Names the API uses for the semantics themselves pass straight through.
    success: 'success', warning: 'warning', danger: 'danger',
    error: 'danger', info: 'info', primary: 'info', secondary: 'neutral',
};

const FALLBACK = 'neutral';

/**
 * @param {String|null} scheme the backend's color_scheme
 * @returns {String} one of success, warning, danger, info, neutral
 */
export function semanticScheme(scheme) {
    return SEMANTIC_BY_SCHEME[String(scheme ?? '').trim().toLowerCase()] ?? FALLBACK;
}

export function useColorUtils() {

    /**
     * @param {String|null} scheme the backend's color_scheme
     * @param {Number|String} step a step on the semantic ramp
     */
    const getStyleValue = (scheme, step) => `var(--color-${semanticScheme(scheme)}-${step})`;

    return {
        getStyleValue,
    };
}

export default useColorUtils;
