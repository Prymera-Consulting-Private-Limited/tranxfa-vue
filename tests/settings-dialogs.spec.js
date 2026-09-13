import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';

// SD-1124: on the deploy, opening Settings > Modify left the customer with no
// way out. No close button, Escape did nothing, clicking the backdrop did
// nothing - checked on the live page by measuring the panel, not the wrapper.
// The only exits were submitting the form or reloading, and a phone has no
// Escape key.
const source = readFileSync('src/views/SettingsView.vue', 'utf8');

// What this does not assert, and why: a harness that mounts the same dialog
// shape in jsdom and presses Escape did not reproduce the live behaviour in
// either direction - it closed when the deploy would not, and later would not
// close when it should. jsdom is not the environment the defect lives in, and
// a test that lies in both directions is worse than none. The close button is
// deliberately the fix that does not depend on the library's own dismissal
// working: it sets the flag directly. Escape and the backdrop are checked in a
// browser on the deploy.


const DIALOGS = [
  ['change password', 'isChangePasswordModalOpen', 'account.changePasswordTitle'],
  ['personal details', 'isPersonalDetailsModalOpen', 'account.personalDetailsTitle'],
  ['address', 'isAddressModalOpen', 'account.addressTitle'],
];

describe('every settings dialog can be left', () => {
  it.each(DIALOGS)('the %s dialog has a close button that clears its flag', (_name, flag) => {
    const opener = source.indexOf(`:show="${flag}"`);
    expect(opener, `${flag} is not a dialog in this view`).toBeGreaterThan(-1);

    const next = DIALOGS
      .map(([, other]) => source.indexOf(`:show="${other}"`))
      .filter(at => at > opener);
    const block = source.slice(opener, next.length ? Math.min(...next) : source.length);

    expect(block, `the ${_name} dialog has no button that closes it`)
      .toContain(`@click="${flag} = false"`);
    expect(block, `the ${_name} dialog's close button has no accessible name`)
      .toMatch(/<span class="sr-only">\{\{ \$t\('common\.close'\) \}\}<\/span>/);
  });

  it.each(DIALOGS)('the %s dialog says what it is', (_name, flag, key) => {
    const opener = source.indexOf(`:show="${flag}"`);
    const next = DIALOGS
      .map(([, other]) => source.indexOf(`:show="${other}"`))
      .filter(at => at > opener);
    const block = source.slice(opener, next.length ? Math.min(...next) : source.length);

    expect(block, `the ${_name} dialog has no DialogTitle`).toContain('<DialogTitle');
    expect(block, `the ${_name} dialog's title is not ${key}`).toContain(`$t('${key}')`);
  });

  // The library only wires Escape and the backdrop when the transition renders
  // no wrapper of its own, which is what `as="template"` means. `as="div"` is
  // how these were written.
  it.each(DIALOGS)('the %s dialog lets the library own the markup', (_name, flag) => {
    expect(source, `${flag} still uses as="div", so the library sees a wrapper it did not make`)
      .toContain(`<TransitionRoot as="template" :show="${flag}">`);
  });
});
