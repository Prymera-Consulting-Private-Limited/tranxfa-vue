/**
 * The app's last line of defence.
 *
 * Until this existed there was no app.config.errorHandler, no listener for
 * unhandled rejections and no router.onError, so a render-time TypeError
 * blanked the view silently and a stale chunk after a deploy ("Failed to
 * fetch dynamically imported module") left a blank page with no way out.
 */

const STALE_CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (CSS )?chunk|Unable to preload CSS/i;

const RELOAD_STAMP = 'remitso:stale-chunk-reload';

/**
 * Every Amplify deploy replaces the hashed bundles. A tab still holding the
 * previous index.html asks for chunks that no longer exist on its next
 * navigation.
 *
 * @param {*} error
 * @returns {boolean}
 */
export function isStaleChunkError(error) {
    const message = typeof error === 'string' ? error : (error?.message ?? '');

    return STALE_CHUNK.test(message);
}

/**
 * Reloads the page once for a given destination, so a chunk that is really
 * missing cannot reload forever.
 *
 * @param {string} target the path being navigated to
 * @param {{storage?: Storage, reload?: Function}} deps
 * @returns {boolean} whether a reload was issued
 */
export function recoverFromStaleChunk(target, {storage = window.sessionStorage, reload = () => window.location.reload()} = {}) {
    let stamped = null;
    try {
        stamped = storage.getItem(RELOAD_STAMP);
    } catch (e) {
        // Storage can throw in private windows; a reload is still worth trying.
    }
    if (stamped === target) {
        return false;
    }
    try {
        storage.setItem(RELOAD_STAMP, target);
    } catch (e) {
        // Same as above.
    }
    reload();

    return true;
}

/**
 * @param {Storage} storage
 */
export function clearStaleChunkStamp(storage = window.sessionStorage) {
    try {
        storage.removeItem(RELOAD_STAMP);
    } catch (e) {
        // Nothing to clear.
    }
}

/**
 * Where errors go. console.error so they reach DevTools and any session
 * recorder, and window.__reportError when a tracker has been wired in.
 *
 * @param {*} error
 * @param {string} context
 */
export function reportError(error, context) {
    console.error(`[${context}]`, error);

    if (typeof window.__reportError === 'function') {
        try {
            window.__reportError(error, context);
        } catch (e) {
            // A broken reporter must not become a second error.
        }
    }
}

/**
 * @param {import('vue').App} app
 * @param {import('vue-router').Router} router
 * @param {{report?: Function, storage?: Storage, reload?: Function}} deps
 */
export function installErrorHandling(app, router, {report = reportError, storage, reload} = {}) {
    app.config.errorHandler = (error, instance, info) => {
        report(error, `vue:${info}`);
    };

    window.addEventListener('unhandledrejection', (event) => {
        report(event.reason, 'unhandledrejection');
    });

    window.addEventListener('error', (event) => {
        report(event.error ?? event.message, 'window');
    });

    router.onError((error, to) => {
        if (isStaleChunkError(error) && recoverFromStaleChunk(to?.fullPath ?? '', {storage, reload})) {
            return;
        }
        report(error, 'router');
    });

    // A navigation that completes means the bundles in this tab are current,
    // so the next stale chunk, whenever it comes, may reload again.
    router.afterEach(() => clearStaleChunkStamp(storage));
}
