/**
 * Cookie consent on app.xenvia.eu (SD-2059).
 *
 * It mirrors xenvia.eu so both sites behave alike:
 * - the same storage key and record ({level, timestamp});
 * - the same 90 days;
 * - Google's Consent Mode v2 in advanced mode.
 *
 * index.html loads the Google tag with all four signals denied. Before a choice,
 * Google gets only its anonymous, cookieless pings, as Xenvia asked.
 *
 * Accepting grants the four signals and starts the Meta Pixel and Clarity.
 * Without that, those two never load: both identify a visitor, so they wait
 * for "all". Choosing essentials stores the choice and loads nothing.
 *
 * Either choice holds for 90 days, then the banner asks again.
 *
 * The record lives in each site's own storage, so a choice made on xenvia.eu
 * does not carry over here.
 */

export const CONSENT_KEY = 'xenvia_cookie_consent';
export const CONSENT_DAYS = 90;
const CONSENT_MS = CONSENT_DAYS * 24 * 60 * 60 * 1000;

export const ConsentLevel = Object.freeze({
    ALL: 'all',
    ESSENTIAL: 'essential',
});

const META_PIXEL_ID = '766471166259284';
const CLARITY_ID = 'vvrtw05a16';

const GRANTED = Object.freeze({
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
});

/**
 * The visitor's choice, or null when there is none to honour: never asked,
 * older than 90 days, or a record this code cannot read.
 *
 * @param {number} now epoch milliseconds
 * @returns {'all'|'essential'|null}
 */
export function storedConsent(now = Date.now()) {
    let raw;
    try {
        raw = localStorage.getItem(CONSENT_KEY);
    } catch {
        return null;
    }
    if (!raw) {
        return null;
    }

    let record;
    try {
        record = JSON.parse(raw);
    } catch {
        record = null;
    }

    const takenAt = Date.parse(record?.timestamp);
    const known = Object.values(ConsentLevel).includes(record?.level);
    if (!known || !Number.isFinite(takenAt) || now - takenAt > CONSENT_MS) {
        forget();
        return null;
    }

    return record.level;
}

/**
 * Records the visitor's choice and, for "all", starts the tags it allows.
 *
 * @param {'all'|'essential'} level
 * @param {Date} now
 */
export function chooseConsent(level, now = new Date()) {
    try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({level, timestamp: now.toISOString()}));
    } catch {
        // Private browsing can refuse storage. The choice still applies to this
        // visit; the banner simply asks again next time.
    }

    if (level === ConsentLevel.ALL) {
        grantConsent();
    }
}

/**
 * Applies a choice made on an earlier visit. A visitor who accepted within 90
 * days gets the Pixel and Clarity again without being asked.
 *
 * @returns {'all'|'essential'|null} the stored choice, null when the banner should ask
 */
export function restoreConsent() {
    const level = storedConsent();
    if (level === ConsentLevel.ALL) {
        grantConsent();
    }

    return level;
}

let granted = false;

function grantConsent() {
    if (granted) {
        return;
    }
    granted = true;

    if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {...GRANTED});
    }
    loadMetaPixel();
    loadClarity();
}

function loadScript(src) {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
}

// Meta's own base code, unminified. The queue holds calls made before
// fbevents.js arrives, and the library replays them when it does.
function loadMetaPixel() {
    if (window.fbq) {
        return;
    }
    const fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    if (!window._fbq) {
        window._fbq = fbq;
    }
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    loadScript('https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
}

// Clarity's own loader: calls made before the tag arrives wait in clarity.q.
function loadClarity() {
    if (window.clarity) {
        return;
    }
    const clarity = function () {
        (clarity.q = clarity.q || []).push(arguments);
    };
    window.clarity = clarity;
    loadScript(`https://www.clarity.ms/tag/${CLARITY_ID}`);
}

function forget() {
    try {
        localStorage.removeItem(CONSENT_KEY);
    } catch {
        // Nothing to forget if storage is refused.
    }
}
