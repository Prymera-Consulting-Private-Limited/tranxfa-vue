import {afterEach, describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {escapeBelongsToAnOpenDropdown, installDropdownEscapeGuard} from '@/dropdown_escape.js';

// SD-1185. The add-recipient wizard lives in a Headless UI <Dialog>, which
// closes on Escape. vue-select does not stop the key when its own dropdown is
// open, so one press closed the dropdown AND dismissed the wizard, discarding
// everything the customer had typed. Found by pressing Escape to clear a bank
// search on payvel production - the whole form went.

const openDropdown = () => {
    const menu = document.createElement('ul');
    menu.className = 'vs__dropdown-menu';
    document.body.appendChild(menu);

    return menu;
};

const escape = () => new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true});

let uninstall = null;

afterEach(() => {
    uninstall?.();
    uninstall = null;
    document.body.innerHTML = '';
});

describe('an Escape that closes a dropdown is not an Escape for the dialog', () => {
    it('claims the key while a dropdown is open', () => {
        openDropdown();
        const event = escape();

        expect(escapeBelongsToAnOpenDropdown(event)).toBe(true);
        expect(event.defaultPrevented, 'the dialog skips a keydown whose default is prevented').toBe(true);
    });

    it('leaves the key alone when no dropdown is open', () => {
        const event = escape();

        expect(escapeBelongsToAnOpenDropdown(event)).toBe(false);
        expect(event.defaultPrevented, 'a second press must still close the dialog').toBe(false);
    });

    it('ignores every other key', () => {
        openDropdown();
        const event = new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true});

        expect(escapeBelongsToAnOpenDropdown(event)).toBe(false);
        expect(event.defaultPrevented).toBe(false);
    });

    // The listener has to see the key before vue-select's own handler closes the
    // dropdown, so it runs in the capture phase. Dispatching at the input proves
    // the guard reads the state at press time rather than after the fact.
    it('marks the key from an input inside the dialog, before anything closes', () => {
        uninstall = installDropdownEscapeGuard();
        openDropdown();
        const input = document.createElement('input');
        document.body.appendChild(input);

        const event = escape();
        input.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    });

    it('does not keep marking keys once it is removed', () => {
        installDropdownEscapeGuard()();
        openDropdown();

        const event = escape();
        document.body.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });

    it('is installed at start-up, not per dialog', () => {
        const main = readFileSync('src/main.js', 'utf8');

        expect(main).toContain("import {installDropdownEscapeGuard} from \"@/dropdown_escape.js\";");
        expect(main).toContain('installDropdownEscapeGuard()');
    });
});

// The whole fix rests on one line of somebody else's library: the dialog opts
// out of a keydown whose default is already prevented. If a Headless UI upgrade
// drops that check, the guard silently stops working and the wizard starts
// vanishing again - with nothing in our own code to show why. So assert it.
describe('the Headless UI behaviour this relies on', () => {
    it('skips a keydown whose default is already prevented', () => {
        const dialog = readFileSync('node_modules/@headlessui/vue/dist/components/dialog/dialog.js', 'utf8');

        expect(dialog).toContain('"keydown"');
        expect(dialog).toMatch(/defaultPrevented\|\|[a-zA-Z$_.]*key===[a-zA-Z$_.]*Escape/);
    });
});
