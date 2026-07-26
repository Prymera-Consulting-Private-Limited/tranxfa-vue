---
name: hotel-search
description: How the travel hotels search is wired — URL-driven criteria, region autocomplete, per-room occupancy, and the supplier's pricing rules. Use when touching anything under src/views/Travel/Hotels, src/models/travel/hotels, or src/composables/travel/hotels, or when changing search criteria, guests, rates, or the hotel card.
---

# Hotels search

Feature branch: `feature/travel_hotels`. Backend is a client API in front of an Emerging Travel
Group style supplier, so most odd rules below come from the supplier, not from us.

## Files

- `src/composables/travel/hotels/hotel_utils.js` — criteria/URL mapping, limits, `regions()`,
  `search()`, and the rate helpers (`getCheapestRate`, `getPhotoUrl`, `prettifyLabel`).
- `src/models/travel/hotels/*.js` — `Hotel`, `HotelRate`, `Region`, and the rate sub-objects
  (payment options, cancellation policy, meal data, VAT, commission…).
- `src/views/Travel/Hotels/IndexView.vue` — owns the search, the region lookup and all page state.
- `src/views/Travel/Hotels/HotelView.vue` — one hotel, priced for the stay on the url. Gallery and
  detail in a two-column span, the same `SearchBar` in a sticky sidebar (`stacked`).
- `src/views/Travel/Hotels/Partials/*.vue` — `SearchBar`, `HotelCard` and the small display
  components the card composes (image, rating, room type, badges, price, action, skeleton, empty).

## The URL is the source of truth

`IndexView` watches `route.query` with `{immediate: true}` and that watch is the **only** thing
that starts a search. `SearchBar` emits `search`, `updateSearch` turns it into
`router.replace({query})`, and the watch picks it up. First load, refresh, a shared link and the
back button therefore all replay the same search.

- `getCriteria(query)` → the POST body. `getQuery(criteria)` → the route query. Both are exported
  from `hotel_utils.js` and every comparison round-trips through the pair, so a signature match is
  reliable (`appliedSearch` guards against a double fetch, and lets an unchanged search re-run).
- Query contract: `?region=<uuid>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=2|1:5,9`.
  Rooms are `|`-separated, `adults[:age,age]`; a room with no children is just its adult count.
- Everything from the URL is validated and clamped, never trusted: past or malformed dates fall
  back to tomorrow → day after, a checkout not after checkin is pushed out a day, counts clamp
  into range, non-numeric ages are dropped, a repeated `?region=` (an array) is treated as absent.
- No `region_id` means no request at all — the page shows the "Start with a destination" prompt
  instead of skeletons or an empty result.
- The same query contract carries onto the hotel page: `viewHotel` pushes
  `/travel/hotel/:id/:slug` with `getQuery(criteria)`, so `HotelView` rebuilds the stay with
  `getCriteria(route.query)` and never has to ask for the dates again.
- `residency` is not part of the criteria: it is read per request from
  `customerStore.customer.data?.country?.iso2Alpha` (fallback `IN`), because `CustomerLayout`
  is still loading the customer while this page mounts.

## The hotel page

`getHotel(id)` posts the same criteria as a search minus `hotels_limit`, so the detail endpoint
prices the stay the customer arrived with. `HotelView` mirrors `IndexView`: one
`watch([() => props.id, () => route.query])` starts every load, and the signature carries the
hotel id because the router reuses the page from one result to the next.

- The response is the **catalog hotel**, not a search result, so it has its own models:
  `CatalogHotel` → `Region` + `HotelProvider` (→ `HotelPhoto[]`, `HotelFacility[]`) + the same
  `HotelRate[]` the search returns. `provider.room_types` is still an empty list from the api and
  deliberately unmodelled — the rooms on screen come from `rates`, not from it.
- Rates arrive one per room-and-board combination, so `getRoomGroups(rates)` folds them by
  `room_data_trans.main_room_type` and sorts both the groups and the rates inside them by price.
  `HotelRooms` → `HotelRoomCard` renders group headers with a "from" price and one row per rate,
  reusing the meal, cancellation, availability and amenity partials from the card.
- Picking a rate sets `selectedRate` in the view and is surfaced by `HotelStayCard` in the sidebar.
  It is keyed by `getRateKey` (`book_hash`, which is also what a booking is placed against) and is
  cleared on every reload, since a rate is only priced for the stay it was returned for. There is
  no booking step yet — selection is where the flow currently stops.
- Changing the dates or guests re-prices in place (`router.replace`); changing the **destination**
  is a region search, so it pushes back to the results page.
- A link that arrives without `?region=` backfills `criteria.region_id` from the hotel's own
  `primary_region`, so the search bar is never stuck with a disabled Search button.
- Provider addresses use semicolons here (`"220 Venice Way; Venice; CA 90291; USA, Los Angeles"`),
  which `CatalogHotel.getAddress` normalises before reusing `Hotel.getAddress` to drop the
  repeated city.
- `primary_region` is the same full region payload the autocomplete returns, nested country and
  all, so `Region.getInstance` covers it and the heading can show `region.country.commonName`.
- Facility names are null whenever the supplier only knows the group. `getFacilityGroups` keeps
  the group either way, and `HotelFacilities` renders named ones as a checklist and the rest as
  plain category chips — most hotels currently come back as chips only.

## Occupancy

Shape is per room, and the supplier prices each room on its own adults and the individual ages
of its children:

```js
guests = [{adults: 2, children: []}, {adults: 1, children: [5, 9]}]
```

Limits live in `hotel_utils.js` as named exports so the picker and the URL parser cannot drift:
`MAX_ROOMS` 9, `MIN_ADULTS` 1, `MAX_ADULTS` 6, `MAX_CHILDREN` 4, `MAX_ROOM_GUESTS` 10,
`MAX_CHILD_AGE` 17, and `CHILD_AGE` 7 as the age a newly added child starts on. The supplier
prices multi-room stays best when rooms are occupied alike, so the picker copies the last room's
adults when adding one and shows a non-blocking note when rooms differ.

In `SearchBar` the guests array is a **copy** of `props.criteria.guests` (`getRooms()`), resynced
by a watch, because the parent replaces the criteria object on every navigation.

## Filtering

One region search returns everything we may show, so the SERP filters are client side:
`getFacets(results)`, `getFilteredResults(results, filters)`, `getFilters()` and
`hasFilters(filters)` in `hotel_utils.js`, rendered by `Partials/HotelFilters.vue` in a sticky
left column (collapsed behind a Filters button below `lg`).

- Facets are built from the **unfiltered** results, so options and counts never vanish mid-use.
- Filters run against the rate the card shows (the cheapest bookable one), so price and badges on
  screen always match what was filtered.
- Groups: max total price (range input), star rating (OR within the group), photos (with / without,
  hidden unless the results are mixed), rate features from the supplier's own `serp_filters`, and
  amenities from `amenities_data` — features and amenities are ANDed, and both are discovered from
  the data rather than hard-coded.
- `getHotels()` resets the filters, because a price cap or an amenity from one city says nothing
  about the next.
- `hotels_limit` is 250, so the region arrives in one response and the list is paged in the browser
  at `HOTELS_PER_PAGE` (10) by `Partials/HotelPagination.vue`. The page is view state, not in the
  url, and resets whenever the filtered list changes.

## Supplier quirks worth remembering

- Photo urls contain a literal `{size}` placeholder — always go through `getPhotoUrl(url, size)`,
  and pick the size from `PHOTO_SIZE` (`thumbnail` / `card` / `large`): the cdn 404s on anything
  outside its own set.
- A rate with no `paymentOptions.paymentTypes` cannot be priced, so `getCheapestRate` skips it and
  `IndexView` only lists hotels that have one. Cards never guard against a missing rate.
- Prices come per stay, not per night, and `showAmount` wins over `amount`.
- Region names are not in the search response body — the name is read off the first result
  (`hotel.catalog_hotel.primary_region.name`), which is why `SearchBar` takes a `region` prop as
  the destination label fallback until the customer picks one.
- Star ratings of 0 mean "apartment/guest house", not "unrated" — `HotelRating` renders nothing.
- Descriptive values arrive as slugs (`half-board`, `king-bed`); run them through
  `prettifyLabel`.

## Search bar layout

One flex row, `divide-x` between four cells: destination `Combobox`, dates `Popover`, guests
`Popover`, Search button. Each dropdown cell is `relative` and its panel is `absolute top-full`,
so panels open flush under the bar and align with their own column (`left-0` for dates,
`right-0` for guests). The calendar is an `inline` datepicker inside the panel with
`:multi-calendars="isWide ? 2 : 1"` driven by a `matchMedia('(min-width: 1024px)')` listener, and
`@range-end` closes the panel. The guests panel uses dashed dividers between rooms and identical
`−  n  +` steppers for adults, children and each child's age — no selects, no per-room cards.
