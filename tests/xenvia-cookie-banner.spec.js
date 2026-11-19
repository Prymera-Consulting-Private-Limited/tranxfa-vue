import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {mount} from "@vue/test-utils";

// SD-2059: the banner app.xenvia.eu never showed. xenvia.eu's wording and
// choices, with "Solo esenciales" as visible as "Aceptar todas".

async function mountBanner() {
    vi.resetModules();
    const {default: CookieBanner} = await import('@/components/CookieBanner.vue');

    return mount(CookieBanner);
}

function store(level) {
    localStorage.setItem('xenvia_cookie_consent', JSON.stringify({level, timestamp: new Date().toISOString()}));
}

const button = (wrapper, text) => wrapper.findAll('button').find(b => b.text() === text);

beforeEach(() => {
    localStorage.clear();
    window.gtag = vi.fn();
});

afterEach(() => {
    delete window.gtag;
    delete window.fbq;
    delete window._fbq;
    delete window.clarity;
    document.head.querySelectorAll('script[src]').forEach(script => script.remove());
});

describe('the cookie banner', () => {
    it('asks a visitor who has not chosen', async () => {
        const wrapper = await mountBanner();

        expect(wrapper.text()).toContain('We use cookies to improve your experience.');
        expect(button(wrapper, 'Essential only').exists()).toBe(true);
        expect(button(wrapper, 'Accept all').exists()).toBe(true);
    });

    it('links to Xenvia\'s cookie policy', async () => {
        const link = (await mountBanner()).get('a');

        expect(link.attributes('href')).toBe('https://xenvia.eu/legal/cookies');
        expect(link.attributes('target')).toBe('_blank');
        expect(link.text()).toBe('Read policy');
    });

    it('gives refusing the same weight as accepting', async () => {
        const wrapper = await mountBanner();
        const sizing = (b) => b.classes().filter(c => /^(min-h|px|py|rounded|flex-1|sm:flex-none)/.test(c)).sort();

        expect(sizing(button(wrapper, 'Essential only'))).toEqual(sizing(button(wrapper, 'Accept all')));
    });

    it('does not ask again within 90 days, whichever was chosen', async () => {
        store('all');
        expect((await mountBanner()).find('section').exists()).toBe(false);

        store('essential');
        expect((await mountBanner()).find('section').exists()).toBe(false);
    });

    it('closes on "Accept all" and turns measurement on', async () => {
        const wrapper = await mountBanner();

        await button(wrapper, 'Accept all').trigger('click');

        expect(wrapper.find('section').exists()).toBe(false);
        expect(JSON.parse(localStorage.getItem('xenvia_cookie_consent')).level).toBe('all');
        expect(window.gtag).toHaveBeenCalledWith('consent', 'update', expect.objectContaining({ad_storage: 'granted'}));
        expect(typeof window.fbq).toBe('function');
    });

    it('closes on "Essential only" and leaves everything off', async () => {
        const wrapper = await mountBanner();

        await button(wrapper, 'Essential only').trigger('click');

        expect(wrapper.find('section').exists()).toBe(false);
        expect(JSON.parse(localStorage.getItem('xenvia_cookie_consent')).level).toBe('essential');
        expect(window.gtag).not.toHaveBeenCalled();
        expect(window.fbq).toBeUndefined();
        expect(window.clarity).toBeUndefined();
    });
});
