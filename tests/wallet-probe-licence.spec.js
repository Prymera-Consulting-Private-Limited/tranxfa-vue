import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createPinia, setActivePinia} from 'pinia';
import {flushPromises, mount} from '@vue/test-utils';
import axios from 'axios';
import {installFakeEcho} from './helpers.js';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}}}));

/**
 * SD-1204: the Wallet tab never appeared on a deployment licensed to sell
 * wallets, and the customer had no way to reach the wallet at all.
 *
 * CustomerLayout decides whether to probe inside onMounted, and it asked
 * offersProduct() - which reads a list that is empty until service-status
 * answers. The router only awaits that answer for routes declaring
 * requiresProduct, and /dashboard declares none, so the question was asked
 * while the request was still in flight and the answer was always no. Nothing
 * watches the list and onMounted runs once, so availability stayed UNKNOWN for
 * the session and Header never rendered the tab. The only link to /wallet is
 * that tab, so the one route that would have fixed the state was unreachable.
 *
 * The test that matters is the timing one: the licence must arrive on a LATER
 * tick than the mount, which is what happens in a browser and what the original
 * code got wrong. A test whose service-status resolves before mounting passes
 * against the broken version and guards nothing.
 */
describe('the wallet probe waits for the licence', () => {
  let deferred;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.resetModules();
    installFakeEcho();
    deferred = {};
    deferred.promise = new Promise((resolve) => { deferred.resolve = resolve; });
  });

  const mountLayout = async () => {
    const CustomerLayout = (await import('@/components/CustomerLayout.vue')).default;
    return mount(CustomerLayout, {
      global: {
        stubs: {
          Header: true,
          Footer: true,
          ServiceStatusBanner: true,
          NotificationGroup: true,
          Notification: true,
          RouterView: true,
        },
        mocks: {$t: (key) => key},
      },
    });
  };

  it('probes once service-status answers with WALLETS, even though the answer lands after mount', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/client/v1/service-status') return deferred.promise;
      if (url === '/client/v1/wallet/subscription') {
        return Promise.reject({response: {status: 404, data: {type: 'wallet_subscription_required', wallet_offered: true}}});
      }
      return Promise.resolve({data: {data: {}}});
    });

    const {refreshServiceStatus} = await import('@/composables/service_status.js');
    refreshServiceStatus();

    await mountLayout();
    await flushPromises();

    // The licence has not arrived. Nothing may have been asked about the wallet.
    expect(axios.get).not.toHaveBeenCalledWith('/client/v1/wallet/subscription');

    deferred.resolve({data: {is_available: true, active_window: null, upcoming_window: null, value_added_services: ['WALLETS']}});
    await flushPromises();

    expect(axios.get, 'the probe must run once the licence says WALLETS').toHaveBeenCalledWith('/client/v1/wallet/subscription');
  });

  it('does not probe when the licence omits WALLETS', async () => {
    axios.get.mockImplementation((url) => {
      if (url === '/client/v1/service-status') return deferred.promise;
      return Promise.resolve({data: {data: {}}});
    });

    const {refreshServiceStatus} = await import('@/composables/service_status.js');
    refreshServiceStatus();

    await mountLayout();
    deferred.resolve({data: {is_available: true, active_window: null, upcoming_window: null, value_added_services: ['HOTELS']}});
    await flushPromises();

    expect(axios.get, 'SD-1074 stands: no licence, no product').not.toHaveBeenCalledWith('/client/v1/wallet/subscription');
  });
});
