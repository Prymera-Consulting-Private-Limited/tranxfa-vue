import {describe, expect, it} from "vitest";
import {mount} from "@vue/test-utils";
import BrandLogo from "@/components/BrandLogo.vue";

// This component replaced 20 hand-written <img> tags. The point of these tests
// is that the rendered markup still matches what those call sites produced -
// a refactor that quietly changes the markup is worse than the duplication.

describe('BrandLogo', () => {
    it('renders the auth-screen logo by default, as the 18 auth call sites did', () => {
        const img = mount(BrandLogo).get('img');

        expect(img.attributes('src')).toBe('/images/logo.png');
        expect(img.classes()).toEqual(expect.arrayContaining(['max-w-64', 'max-h-10']));
    });

    it('merges the caller spacing with its own size classes', () => {
        // `<BrandLogo class="mb-5 -ml-2" />` has to come out the same as the
        // original `class="max-w-64 max-h-10 mb-5 -ml-2"`.
        const img = mount(BrandLogo, {attrs: {class: 'mb-5 -ml-2'}}).get('img');

        expect(img.classes()).toEqual(
            expect.arrayContaining(['max-w-64', 'max-h-10', 'mb-5', '-ml-2']),
        );
    });

    it('uses the reversed logo for the brand-coloured header bar', () => {
        const img = mount(BrandLogo, {props: {variant: 'light', size: 'header'}}).get('img');

        expect(img.attributes('src')).toBe('/images/logo-white.png');
        expect(img.classes()).toEqual(expect.arrayContaining(['h-8', 'w-auto']));
        expect(img.classes()).not.toContain('max-w-64');
    });

    it('takes its alt text from the brand name rather than a literal', () => {
        // The whole reason this component exists: a brand branch changes
        // VITE_APP_NAME, never markup.
        const img = mount(BrandLogo).get('img');
        const expected = import.meta.env.VITE_APP_NAME || 'RemitSo';

        expect(img.attributes('alt')).toBe(expected);
        expect(img.attributes('alt')).toBeTruthy();
    });

    it('rejects an unknown variant or size', () => {
        const variant = BrandLogo.props.variant.validator;
        const size = BrandLogo.props.size.validator;

        expect(variant('light')).toBe(true);
        expect(variant('inverted')).toBe(false);
        expect(size('header')).toBe(true);
        expect(size('huge')).toBe(false);
    });
});
