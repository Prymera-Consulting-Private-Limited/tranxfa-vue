import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import fs from "node:fs";
import path from "node:path";

// SD-2059: on app.xenvia.eu the Meta Pixel and Clarity loaded and sent on every
// page with no consent, and the banner the June script looked for was never on
// the page. These pin the rules Xenvia asked for:
// - Consent Mode v2 in advanced mode, as on xenvia.eu;
// - the Pixel and Clarity only after "Aceptar todas";
// - the choice remembered for 90 days.

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-20T12:00:00Z');
const GRANTED = {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
};

// The module remembers that it has granted, as the page does, so each test
// gets a fresh copy.
async function consent() {
    vi.resetModules();
    return import('@/consent.js');
}

function store(level, takenAt) {
    localStorage.setItem('xenvia_cookie_consent', JSON.stringify({level, timestamp: new Date(takenAt).toISOString()}));
}

function loadedScripts() {
    return [...document.head.querySelectorAll('script[src]')].map(script => script.getAttribute('src'));
}

beforeEach(() => {
    localStorage.clear();
    window.gtag = vi.fn();
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
    vi.restoreAllMocks();
    delete window.gtag;
    delete window.fbq;
    delete window._fbq;
    delete window.clarity;
    document.head.querySelectorAll('script[src]').forEach(script => script.remove());
});

describe('the stored choice', () => {
    it('is none until the visitor chooses', async () => {
        const {storedConsent} = await consent();

        expect(storedConsent()).toBeNull();
    });

    it('holds for 90 days, under xenvia.eu\'s own key', async () => {
        const {storedConsent} = await consent();

        store('all', NOW - 89 * DAY);
        expect(storedConsent()).toBe('all');

        store('essential', NOW - 89 * DAY);
        expect(storedConsent()).toBe('essential');
    });

    it('lapses after 90 days, so the banner asks again', async () => {
        const {storedConsent} = await consent();
        store('all', NOW - 91 * DAY);

        expect(storedConsent()).toBeNull();
        expect(localStorage.getItem('xenvia_cookie_consent')).toBeNull();
    });

    it('is none when the record cannot be read', async () => {
        const {storedConsent} = await consent();

        localStorage.setItem('xenvia_cookie_consent', '{not json');
        expect(storedConsent()).toBeNull();

        store('everything', NOW - DAY);
        expect(storedConsent()).toBeNull();
    });
});

describe('"Aceptar todas"', () => {
    it('records the choice with its time', async () => {
        const {chooseConsent} = await consent();

        chooseConsent('all', new Date(NOW));

        expect(JSON.parse(localStorage.getItem('xenvia_cookie_consent'))).toEqual({level: 'all', timestamp: new Date(NOW).toISOString()});
    });

    it('grants all four Consent Mode signals', async () => {
        const {chooseConsent} = await consent();

        chooseConsent('all');

        expect(window.gtag).toHaveBeenCalledWith('consent', 'update', GRANTED);
    });

    it('starts the Meta Pixel and Clarity', async () => {
        const {chooseConsent} = await consent();

        chooseConsent('all');

        expect(loadedScripts()).toEqual(expect.arrayContaining([
            'https://connect.facebook.net/en_US/fbevents.js',
            'https://www.clarity.ms/tag/vvrtw05a16',
        ]));
        expect([...window.fbq.queue].map(args => [...args])).toEqual([
            ['init', '766471166259284'],
            ['track', 'PageView'],
        ]);
        expect(typeof window.clarity).toBe('function');
    });

    it('starts each tag once, however often it is applied', async () => {
        const {chooseConsent, restoreConsent} = await consent();

        chooseConsent('all');
        chooseConsent('all');
        restoreConsent();

        expect(window.gtag).toHaveBeenCalledTimes(1);
        expect(loadedScripts()).toHaveLength(2);
    });
});

describe('"Solo esenciales"', () => {
    it('records the choice and loads nothing', async () => {
        const {chooseConsent} = await consent();

        chooseConsent('essential');

        expect(JSON.parse(localStorage.getItem('xenvia_cookie_consent')).level).toBe('essential');
        expect(window.gtag).not.toHaveBeenCalled();
        expect(loadedScripts()).toEqual([]);
        expect(window.fbq).toBeUndefined();
        expect(window.clarity).toBeUndefined();
    });
});

describe('a returning visitor', () => {
    it('who accepted gets the tags back without being asked', async () => {
        const {restoreConsent} = await consent();
        store('all', NOW - 10 * DAY);

        expect(restoreConsent()).toBe('all');
        expect(window.gtag).toHaveBeenCalledWith('consent', 'update', GRANTED);
        expect(loadedScripts()).toHaveLength(2);
    });

    it('who chose essentials still gets nothing', async () => {
        const {restoreConsent} = await consent();
        store('essential', NOW - 10 * DAY);

        expect(restoreConsent()).toBe('essential');
        expect(window.gtag).not.toHaveBeenCalled();
        expect(loadedScripts()).toEqual([]);
    });

    it('whose choice lapsed is asked again, with nothing loaded', async () => {
        const {restoreConsent} = await consent();
        store('all', NOW - 91 * DAY);

        expect(restoreConsent()).toBeNull();
        expect(window.gtag).not.toHaveBeenCalled();
        expect(loadedScripts()).toEqual([]);
    });
});

// The page itself: the Pixel and Clarity used to be tags in index.html, which is
// why they ran before anyone was asked. Only src/consent.js may start them now.
describe('index.html', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

    it('denies all four Consent Mode signals before the Google tag is configured', () => {
        const start = html.indexOf("gtag('consent', 'default'");
        const config = html.indexOf("gtag('config'");
        expect(start).toBeGreaterThan(-1);
        expect(start).toBeLessThan(config);

        const defaults = html.slice(start, html.indexOf('});', start));
        for (const signal of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
            expect(defaults, signal).toMatch(new RegExp(`'${signal}':\\s*'denied'`));
        }
    });

    it('carries no Meta Pixel or Clarity tag of its own', () => {
        expect(html).not.toMatch(/connect\.facebook\.net|fbq\(|clarity\.ms/);
    });
});
