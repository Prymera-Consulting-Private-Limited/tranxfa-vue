import {
  BellAlertIcon,
  PaperAirplaneIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
} from '@heroicons/vue/24/outline'

/** Slugs must match `comingSoon` route param and sidebar links. */
export const COMING_SOON_FEATURES = ['rate-alerts', 'flight', 'hotels', 'budgets']

export const comingSoonByFeature = {
  'rate-alerts': {
    pageTitle: 'Rate alerts',
    badge: 'Rate alerts',
    icon: BellAlertIcon,
    headline: 'Coming',
    headlineAccent: 'soon',
    description:
      'We are building smart rate alerts so you never miss a favourable exchange rate. Check back shortly, or reach out if you need anything in the meantime.',
    lottieSrc: '/animation/coming-soon.json',
    lottieLabel: 'Animation for upcoming rate alerts',
  },
  budgets: {
    pageTitle: 'Budgets',
    badge: 'Budgets',
    icon: BanknotesIcon,
    headline: 'Coming',
    headlineAccent: 'soon',
    description:
      'Budget management through Payvel is on the way. Soon you will be able to create and manage budgets alongside your transfers.',
    lottieSrc: '/animation/coming-soon.json',
    lottieLabel: 'Animation for upcoming budget management',
  },
  flight: {
    pageTitle: 'Flights',
    badge: 'Flights',
    icon: PaperAirplaneIcon,
    headline: 'Coming',
    headlineAccent: 'soon',
    description:
      'Flight booking through Payvel is on the way. Soon you will be able to search and manage trips alongside your transfers.',
    lottieSrc: '/animation/coming-soon.json',
    lottieLabel: 'Animation for upcoming flight booking',
  },
  hotels: {
    pageTitle: 'Hotels',
    badge: 'Hotels',
    icon: BuildingOffice2Icon,
    headline: 'Coming',
    headlineAccent: 'soon',
    description:
      'Hotel stays integrated with your travel money are in development. We will let you know as soon as this feature is ready.',
    lottieSrc: '/animation/coming-soon.json',
    lottieLabel: 'Animation for upcoming hotel booking',
  },
}
