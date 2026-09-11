/**
 * Loads a third-party script once, when a screen needs it.
 *
 * The Volume sdk and the Tawk widget used to be loaded from index.html on
 * every page, sign-in and password reset included. Neither is needed until a
 * customer reaches a payment screen or opens the chat.
 */

const loads = new Map();

/**
 * @param {string} src
 * @param {{crossOrigin?: string}} options
 * @returns {Promise<void>}
 */
export function loadScript(src, options = {}) {
    if (loads.has(src)) {
        return loads.get(src);
    }

    const promise = new Promise((resolve, reject) => {
        const existing = [...document.querySelectorAll('script[src]')].find(tag => tag.getAttribute('src') === src);
        if (existing?.dataset.loaded === 'true') {
            resolve();
            return;
        }

        const script = existing ?? document.createElement('script');
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        });
        script.addEventListener('error', () => {
            loads.delete(src);
            script.remove();
            reject(new Error(`Could not load ${src}`));
        });

        if (! existing) {
            script.src = src;
            script.async = true;
            if (options.crossOrigin) {
                script.crossOrigin = options.crossOrigin;
            }
            document.head.appendChild(script);
        }
    });

    loads.set(src, promise);

    return promise;
}

export const VOLUME_SDK_URL = 'https://js.volumepay.io';

/**
 * @returns {Promise<void>} resolves once window.Volume exists
 */
export function loadVolumeSdk() {
    if (typeof window.Volume === 'function') {
        return Promise.resolve();
    }

    return loadScript(VOLUME_SDK_URL);
}
