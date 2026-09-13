import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import axios from 'axios';

vi.mock('axios', () => ({default: {get: vi.fn(), post: vi.fn(), defaults: {}}}));

// GET /client/v1/service-status, as the Client API reference asks: branch on
// is_available, show operations' own wording, poll on load, on return to the
// tab and after a maintenance refusal, and never count down to
// expected_to_end_at. Behind VITE_SERVICE_STATUS_ENABLED.

const window_ = (overrides = {}) => ({
  message: 'We are upgrading our systems and expect to be back by 3:30am.',
  starts_at: '2026-09-07T02:00:00+00:00',
  expected_to_end_at: '2026-09-07T03:30:00+00:00',
  affected_actions: ['NEW-TRANSFERS', 'TRANSFER-PAYMENTS'],
  ...overrides,
});

async function load() {
  vi.resetModules();
  return await import('@/composables/service_status.js');
}

describe('service status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  // SD-1074: this used to assert that a deployment with the banner turned off
  // asked nothing. The call carries value_added_services now, which is how the
  // app knows what it may offer, so it always runs; the flag decides only
  // whether the banner renders. The assertion moves rather than goes.
  it('asks even when the banner is turned off, because the licence rides along', async () => {
    vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', '');
    axios.get.mockResolvedValue({data: {is_available: true, active_window: null, upcoming_window: null, value_added_services: ['HOTELS']}});
    const {refreshServiceStatus, useServiceStatus} = await load();

    await refreshServiceStatus();

    expect(axios.get).toHaveBeenCalledWith('/client/v1/service-status', {skipAuthRedirect: true, skipMfaRedirect: true});
    expect(useServiceStatus().products.value).toEqual(['HOTELS']);
  });

  it('reads the answer and frozen actions from the active window', async () => {
    axios.get.mockResolvedValue({data: {is_available: false, active_window: window_(), upcoming_window: null}});
    const {CUSTOMER_ACTIONS, refreshServiceStatus, useServiceStatus, isActionFrozen} = await load();
    await refreshServiceStatus();
    expect(axios.get).toHaveBeenCalledWith('/client/v1/service-status', {skipAuthRedirect: true, skipMfaRedirect: true});
    const {status} = useServiceStatus();
    expect(status.isAvailable).toBe(false);
    expect(status.activeWindow.message).toMatch(/upgrading/);
    expect(isActionFrozen(CUSTOMER_ACTIONS.NEW_TRANSFERS)).toBe(true);
    expect(isActionFrozen(CUSTOMER_ACTIONS.WALLET_TOPUPS)).toBe(false);
  });

  it('treats a window with no declared actions as every customer action, and an internal-only window as none', async () => {
    const {CUSTOMER_ACTIONS, isActionFrozen, parseWindow} = await load();
    const legacy = {isAvailable: false, activeWindow: parseWindow(window_({affected_actions: null}))};
    expect(isActionFrozen(CUSTOMER_ACTIONS.WALLET_TOPUPS, legacy)).toBe(true);
    const internal = {isAvailable: true, activeWindow: parseWindow(window_({affected_actions: []}))};
    expect(isActionFrozen(CUSTOMER_ACTIONS.NEW_TRANSFERS, internal)).toBe(false);
  });

  it('keeps the last answer when a read fails, and shares one request', async () => {
    axios.get.mockResolvedValueOnce({data: {is_available: true, active_window: null, upcoming_window: window_()}});
    const {refreshServiceStatus, useServiceStatus} = await load();
    await Promise.all([refreshServiceStatus(), refreshServiceStatus()]);
    expect(axios.get).toHaveBeenCalledTimes(1);
    axios.get.mockRejectedValueOnce({request: {}});
    await refreshServiceStatus();
    expect(useServiceStatus().status.upcomingWindow.message).toMatch(/upgrading/);
  });

  it('reads again when the tab becomes visible', async () => {
    axios.get.mockResolvedValue({data: {is_available: true, active_window: null, upcoming_window: null}});
    const {startServiceStatusWatch, resetServiceStatus} = await load();
    startServiceStatusWatch();
    await new Promise((r) => setTimeout(r, 0));
    const onLaunch = axios.get.mock.calls.length;
    Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((r) => setTimeout(r, 0));

    // One more than the launch read, whatever the launch read cost.
    expect(axios.get).toHaveBeenCalledTimes(onLaunch + 1);
    resetServiceStatus();
  });
});

describe('ServiceStatusBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SERVICE_STATUS_ENABLED', 'true');
  });
  afterEach(() => vi.unstubAllEnvs());

  // The banner renders state; it does not fetch it. Starting the watch moved to
  // main.js when the same call became how the app learns which products it may
  // offer (SD-1074), so the read happens here instead of on mount.
  async function mountBanner(payload) {
    axios.get.mockResolvedValue({data: payload});
    vi.resetModules();
    const {refreshServiceStatus} = await import('@/composables/service_status.js');
    await refreshServiceStatus();
    const {default: Banner} = await import('@/components/ServiceStatusBanner.vue');
    const wrapper = mount(Banner);
    await new Promise((r) => setTimeout(r, 0));
    return wrapper;
  }

  it('shows operations\' wording and the expected end while the service is down', async () => {
    const wrapper = await mountBanner({is_available: false, active_window: window_(), upcoming_window: null});
    expect(wrapper.attributes('role')).toBe('alert');
    expect(wrapper.text()).toContain('We are upgrading our systems');
    expect(wrapper.text()).toContain('We expect to be back around');
  });

  it('warns about a declared window in advance, as information', async () => {
    const wrapper = await mountBanner({is_available: true, active_window: null, upcoming_window: window_()});
    expect(wrapper.attributes('role')).toBe('status');
    expect(wrapper.text()).toContain('Planned maintenance');
  });

  it('renders nothing when the service is available and nothing is planned', async () => {
    const wrapper = await mountBanner({is_available: true, active_window: null, upcoming_window: null});
    expect(wrapper.html()).not.toContain('maintenance');
  });
});

describe('wired in', () => {
  it('the wizard hides Confirm while new transfers are frozen and re-reads after the refusal', async () => {
    const {readFileSync} = await import('node:fs');
    const s = readFileSync('src/views/Transfer/IndexView.vue', 'utf8');
    expect(s).toContain('serviceStatus.isFrozen(CUSTOMER_ACTIONS.NEW_TRANSFERS)');
    expect(s).toMatch(/active_transfer_disable_rule"\) \{\n[\s\S]*?refreshServiceStatus\(\);/);
    expect(readFileSync('src/components/CustomerLayout.vue', 'utf8')).toContain('<ServiceStatusBanner />');
    expect(readFileSync('src/views/SignInView.vue', 'utf8')).toContain('<ServiceStatusBanner');
    expect(readFileSync('src/components/Wallet/TopUpFlow.vue', 'utf8')).toContain('CUSTOMER_ACTIONS.WALLET_TOPUPS');
  });
});
