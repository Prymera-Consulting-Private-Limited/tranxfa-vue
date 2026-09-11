import {describe, expect, it} from "vitest";
import router from "@/router/index.js";

// An unknown address rendered an empty RouterView with the tab titled
// "Default Title". Seen live on staging.
describe('an address nothing matches', () => {
    it('lands on the not-found page', () => {
        const resolved = router.resolve('/this-page-does-not-exist');

        expect(resolved.name).toBe('notFound');
        expect(resolved.meta.title).toBe('Page not found');
    });

    it('still lets the real routes through', () => {
        expect(router.resolve('/dashboard').name).toBe('dashboard');
        expect(router.resolve('/transaction/abc').name).toBe('viewTransaction');
    });
});

describe('scrolling between pages', () => {
    const behave = (to, from, saved) => router.options.scrollBehavior(to, from, saved);

    it('starts a new page at the top', () => {
        expect(behave({hash: ''}, {}, null)).toEqual({top: 0});
    });

    it('restores the position on back and forward', () => {
        expect(behave({hash: ''}, {}, {left: 0, top: 420})).toEqual({left: 0, top: 420});
    });

    it('goes to the anchor the link asked for', () => {
        expect(behave({hash: '#send-money'}, {}, null)).toMatchObject({el: '#send-money'});
    });
});
