import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import axios from 'axios';

vi.mock('axios');

/**
 * SD-1074. What this pins down is the behaviour the ticket said to settle
 * once: what a product entry point does on the launch where service status
 * could not be reached at all.
 */
const load = async () => {
  vi.resetModules();
  return {
    ...(await import('@/composables/service_status.js')),
    ...(await import('@/licensed_products.js')),
  };
};

const answer = (codes) => ({data: {is_available: true, active_window: null, upcoming_window: null, value_added_services: codes}});

describe('the licensed products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('offers what the installation is licensed for, and nothing else', async () => {
    axios.get.mockResolvedValue(answer(['HOTELS', 'WALLETS']));
    const {refreshServiceStatus, offersProduct, PRODUCT} = await load();

    await refreshServiceStatus();

    expect(offersProduct(PRODUCT.HOTELS)).toBe(true);
    expect(offersProduct(PRODUCT.WALLETS)).toBe(true);
    expect(offersProduct(PRODUCT.COUPONS)).toBe(false);
    expect(offersProduct(PRODUCT.FLIGHTS)).toBe(false);
  });

  it('ignores a code it has no screens for rather than treating it as an error', async () => {
    axios.get.mockResolvedValue(answer(['BASE-RATE-FEEDER', 'BIRTHDAY-GREETINGS', 'HOTELS']));
    const {refreshServiceStatus, offersProduct, useServiceStatus, PRODUCT} = await load();

    await refreshServiceStatus();

    expect(offersProduct(PRODUCT.HOTELS)).toBe(true);
    expect(useServiceStatus().productsKnown.value).toBe(true);
  });

  it('offers nothing before an answer arrives', async () => {
    axios.get.mockReturnValue(new Promise(() => {}));
    const {offersProduct, PRODUCT} = await load();

    expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
  });

  // A product whose term has ended is simply absent. There is no third state
  // to render, and a customer is never told about their operator's licensing.
  it('drops a product the moment the licence stops carrying it', async () => {
    axios.get.mockResolvedValue(answer(['HOTELS']));
    const {refreshServiceStatus, applyServiceStatus, offersProduct, PRODUCT} = await load();
    await refreshServiceStatus();
    expect(offersProduct(PRODUCT.HOTELS)).toBe(true);

    applyServiceStatus({is_available: true, value_added_services: []});

    expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
  });

  describe('the launch where the call cannot be reached', () => {
    it('honours the last answer this browser had, while it is still credible', async () => {
      axios.get.mockResolvedValue(answer(['HOTELS']));
      const first = await load();
      await first.refreshServiceStatus();

      axios.get.mockRejectedValue(new Error('offline'));
      const {refreshServiceStatus, offersProduct, PRODUCT} = await load();
      await refreshServiceStatus();

      expect(offersProduct(PRODUCT.HOTELS)).toBe(true);
    });

    it('offers nothing once the remembered answer is too old to trust', async () => {
      axios.get.mockResolvedValue(answer(['HOTELS']));
      const first = await load();
      await first.refreshServiceStatus();

      const {REMEMBERED_FOR_MS} = await import('@/licensed_products.js');
      const stale = JSON.parse(localStorage.getItem(Object.keys(localStorage)[0]));
      stale.at = Date.now() - REMEMBERED_FOR_MS - 1;
      localStorage.setItem(Object.keys(localStorage)[0], JSON.stringify(stale));

      axios.get.mockRejectedValue(new Error('offline'));
      const {refreshServiceStatus, offersProduct, PRODUCT} = await load();
      await refreshServiceStatus();

      expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
    });

    it('offers nothing when this browser has never had an answer', async () => {
      axios.get.mockRejectedValue(new Error('offline'));
      const {refreshServiceStatus, offersProduct, PRODUCT} = await load();

      await refreshServiceStatus();

      expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
    });

    it('never lets a remembered answer overwrite a live one', async () => {
      axios.get.mockResolvedValue(answer(['HOTELS']));
      const first = await load();
      await first.refreshServiceStatus();

      const {refreshServiceStatus, offersProduct, PRODUCT} = await load();
      axios.get.mockResolvedValue(answer([]));
      await refreshServiceStatus();
      axios.get.mockRejectedValue(new Error('offline'));
      await refreshServiceStatus();

      expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
    });
  });

  it('keeps one installation from answering for another', async () => {
    vi.stubEnv('VITE_APP_BASE_URL', 'https://one.example');
    axios.get.mockResolvedValue(answer(['HOTELS']));
    const one = await load();
    await one.refreshServiceStatus();

    vi.stubEnv('VITE_APP_BASE_URL', 'https://two.example');
    axios.get.mockRejectedValue(new Error('offline'));
    const {refreshServiceStatus, offersProduct, PRODUCT} = await load();
    await refreshServiceStatus();

    expect(offersProduct(PRODUCT.HOTELS)).toBe(false);
  });
});

// The routes exist at all times now, so the guard is the whole of the rule:
// without it, a deep link to a product this installation does not hold would
// render a page whose every call answers 404.
describe('a deep link into a product page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const routerWith = async (codes) => {
    axios.get.mockResolvedValue(answer(codes));
    vi.resetModules();
    const {setActivePinia, createPinia} = await import('pinia');
    setActivePinia(createPinia());
    const {default: router} = await import('@/router/index.js');
    return router;
  };

  it('reaches the page when the installation is licensed', async () => {
    const router = await routerWith(['HOTELS']);

    const resolved = await router.resolve({path: '/travel/hotels'});

    expect(resolved.meta.requiresProduct).toBe('HOTELS');
  });

  it('names the product on every guarded route', async () => {
    const router = await routerWith(['HOTELS', 'WALLETS']);

    const guarded = router.getRoutes().filter(r => r.meta?.requiresProduct);

    expect(guarded.length, 'the hotel and wallet routes must carry their product').toBeGreaterThan(5);
    for (const route of guarded) {
      expect(['HOTELS', 'WALLETS']).toContain(route.meta.requiresProduct);
    }
  });
});
