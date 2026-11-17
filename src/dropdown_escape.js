/**
 * SD-1185. An Escape that closes a dropdown is not an Escape for the dialog.
 *
 * The add-recipient wizard lives in a Headless UI `<Dialog>`, which closes on
 * Escape by design. vue-select does not stop the key when its own dropdown is
 * open, so one press closed the dropdown *and* dismissed the wizard, discarding
 * every value the customer had entered - no confirmation, no undo. A customer
 * clearing a bank search the obvious way lost the whole form.
 *
 * Headless UI's dialog skips any keydown whose default is already prevented:
 *
 *     useEventListener(defaultView, 'keydown', e => {
 *         enabled.value && (e.defaultPrevented || e.key === Escape && (...close()))
 *     })
 *
 * so marking the event is all it takes. `preventDefault()` does not stop
 * propagation, so vue-select still receives the key and still closes its own
 * dropdown. Escape does nothing else in a browser, so nothing else is lost.
 *
 * This listens on the document in the CAPTURE phase, which runs before the
 * input vue-select is listening on and long before the dialog's own listener on
 * the window. That ordering is the point: it reads whether a dropdown was open
 * at the moment the key went down, rather than after something has closed it.
 *
 * One press closes the dropdown; a second press, with nothing open, closes the
 * dialog as before.
 */

/** vue-select renders its menu only while open, so presence is the open test. */
const OPEN_DROPDOWN = '.vs__dropdown-menu';

/**
 * @param {Document} doc
 * @returns {() => void} removes the listener
 */
export function installDropdownEscapeGuard(doc = document) {
    const onKeydown = (event) => escapeBelongsToAnOpenDropdown(event, doc);

    doc.addEventListener('keydown', onKeydown, true);

    return () => doc.removeEventListener('keydown', onKeydown, true);
}

/**
 * Marks an Escape that a dropdown is about to consume, so the dialog leaves it
 * alone. Exported for the tests; `installDropdownEscapeGuard` is the entry point.
 *
 * @param {KeyboardEvent} event
 * @param {Document} doc
 * @returns {boolean} whether the key was claimed by a dropdown
 */
export function escapeBelongsToAnOpenDropdown(event, doc = document) {
    if (event.key !== 'Escape') {
        return false;
    }

    if (! doc.querySelector(OPEN_DROPDOWN)) {
        return false;
    }

    event.preventDefault();

    return true;
}
