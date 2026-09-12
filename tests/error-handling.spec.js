import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {defineComponent, h, nextTick} from "vue";
import {mount} from "@vue/test-utils";
import {clearStaleChunkStamp, installErrorHandling, isStaleChunkError, recoverFromStaleChunk} from "@/error_handling.js";

function memoryStorage() {
    const map = new Map();
    return {getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k)};
}

describe('a chunk that no longer exists after a deploy', () => {
    it.each([
        'Failed to fetch dynamically imported module: https://x/assets/DashboardView-abc.js',
        'Importing a module script failed.',
        'error loading dynamically imported module',
        'Unable to preload CSS for /assets/x.css',
    ])('is recognised: %s', (message) => {
        expect(isStaleChunkError(new Error(message))).toBe(true);
    });

    it('is not confused with an ordinary error', () => {
        expect(isStaleChunkError(new TypeError("Cannot read properties of null (reading 'code')"))).toBe(false);
        expect(isStaleChunkError(null)).toBe(false);
    });

    it('reloads once per destination, never in a loop', () => {
        const storage = memoryStorage();
        const reload = vi.fn();

        expect(recoverFromStaleChunk('/dashboard', {storage, reload})).toBe(true);
        expect(recoverFromStaleChunk('/dashboard', {storage, reload})).toBe(false);
        expect(reload).toHaveBeenCalledTimes(1);

        clearStaleChunkStamp(storage);
        expect(recoverFromStaleChunk('/dashboard', {storage, reload})).toBe(true);
    });
});

describe('installErrorHandling', () => {
    let app, router, report, handlers;

    beforeEach(() => {
        app = {config: {}};
        handlers = {};
        router = {onError: vi.fn(cb => { handlers.error = cb; }), afterEach: vi.fn(cb => { handlers.after = cb; })};
        report = vi.fn();
    });

    it('routes component errors, rejections and router errors to the reporter', () => {
        installErrorHandling(app, router, {report, storage: memoryStorage(), reload: vi.fn()});

        const boom = new Error('boom');
        app.config.errorHandler(boom, null, 'render function');
        expect(report).toHaveBeenCalledWith(boom, 'vue:render function');

        window.dispatchEvent(Object.assign(new Event('unhandledrejection'), {reason: boom}));
        expect(report).toHaveBeenCalledWith(boom, 'unhandledrejection');

        handlers.error(boom, {fullPath: '/x'});
        expect(report).toHaveBeenCalledWith(boom, 'router');
    });

    it('reloads instead of reporting when the router hits a stale chunk', () => {
        const reload = vi.fn();
        installErrorHandling(app, router, {report, storage: memoryStorage(), reload});

        handlers.error(new Error('Failed to fetch dynamically imported module'), {fullPath: '/transactions'});

        expect(reload).toHaveBeenCalledTimes(1);
        expect(report).not.toHaveBeenCalled();
    });
});

// The customer used to get whatever had painted before the throw, or nothing.
describe('the app-level fallback', () => {
    afterEach(() => vi.restoreAllMocks());

    it('replaces a view that throws with a way out', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const Broken = defineComponent({setup() { return () => { throw new TypeError("Cannot read properties of null (reading 'code')"); }; }});
        const {default: App} = await import('@/App.vue');

        // The fallback's words come from the catalogue now, so the plugin
        // has to be there: this asserts the wiring as well as the copy.
        const {default: i18n} = await import('@/i18n.js');
        const wrapper = mount(App, {global: {plugins: [i18n], stubs: {FirstLoadAnimation: true, RouterView: Broken}}});
        await nextTick();

        expect(wrapper.text()).toContain('This page stopped working');
        expect(wrapper.find('button').text()).toBe('Reload page');
    });
});
