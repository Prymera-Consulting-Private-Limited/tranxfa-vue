/**
 * Customer-scoped realtime channels.
 *
 * tranxfa authorises its websocket with the session token header set up in
 * main.js, so this file only names the channel helpers the payment and
 * document code subscribe through. payvel's copy also carries the Sanctum
 * authoriser for private channels; the call sites are identical.
 */
export function customerChannel(name) {
    return window.Echo.channel(name);
}

export function leaveCustomerChannel(name) {
    window.Echo.leaveChannel(name);
}
