import {describe, expect, it} from "vitest";
import {mount} from "@vue/test-utils";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import Pagination from "@/components/Pagination.vue";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const paginate = ({current = 1, total = 4, prev = null, next = 'x'} = {}) => ({
    current_page: current,
    total_pages: total,
    links: {prev, next},
});

const mountAt = options => mount(Pagination, {props: {pagination: paginate(options)}});

describe('pagination', () => {
    // Every control was <a href="javascript:">. That is not a link, and a
    // javascript: URL is inline script - a CSP blocks it the moment it stops
    // being report-only.
    it('uses buttons, never a javascript: URL', () => {
        const wrapper = mountAt();

        expect(wrapper.html()).not.toContain('javascript:');
        expect(wrapper.findAll('a')).toHaveLength(0);
        expect(wrapper.findAll('button').length).toBeGreaterThan(2);
    });

    // "Previous" on page one was a live link announced as available, greyed only
    // by colour - which a screen reader does not read.
    it('marks an unavailable direction as disabled, not just grey', () => {
        const wrapper = mountAt({current: 1, prev: null, next: 'x'});
        const [previous] = wrapper.findAll('button');

        expect(previous.text()).toContain('Previous');
        expect(previous.attributes('disabled')).toBeDefined();
    });

    it('leaves an available direction operable', async () => {
        const wrapper = mountAt({current: 2, prev: 'x', next: 'x'});
        const [previous] = wrapper.findAll('button');

        expect(previous.attributes('disabled')).toBeUndefined();
        await previous.trigger('click');

        expect(wrapper.emitted('pageClicked')?.[0]).toEqual([1]);
    });

    it('names the page a number refers to, and marks the current one', () => {
        const wrapper = mountAt({current: 2, total: 4, prev: 'x', next: 'x'});
        const current = wrapper.findAll('button').find(b => b.attributes('aria-current') === 'page');

        expect(current.text()).toBe('2');
        expect(current.attributes('aria-label')).toBe('Page 2');
        // Nothing to navigate to: you are already here.
        expect(current.attributes('disabled')).toBeDefined();
    });

    it('gives the landmark a name and hides the gap marker', () => {
        const wrapper = mountAt({current: 5, total: 20, prev: 'x', next: 'x'});

        expect(wrapper.get('nav').attributes('aria-label')).toBe('Pagination');
        const ellipsis = wrapper.findAll('span').filter(s => s.text() === '...');
        expect(ellipsis.length).toBeGreaterThan(0);
        for (const gap of ellipsis) expect(gap.attributes('aria-hidden')).toBe('true');
    });

    // The whole app still carries these; this component is no longer one of them.
    it('is not one of the components still reaching for a javascript: URL', () => {
        const src = fs.readFileSync(path.join(SRC, 'components', 'Pagination.vue'), 'utf8');

        expect(src).not.toMatch(/href="javascript:/);
    });
});
