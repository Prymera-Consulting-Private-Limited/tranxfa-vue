---
name: hotel-search
description: How the travel hotels search is wired — URL-driven criteria, region autocomplete, per-room occupancy, and the supplier's pricing rules. Use when touching anything under src/views/Travel/Hotels, src/models/travel/hotels, or src/composables/travel/hotels, or when changing search criteria, guests, rates, or the hotel card.
---

# Hotels search

Merged into `main`. Backend is a client API in front of an Emerging Travel Group style
supplier, so most odd rules below come from the supplier, not from us.

Travel is licensed per deployment. `travelEnabled()` in `src/feature_flags.js` reads
`VITE_TRAVEL_ENABLED` (default on) and gates the Hotels and Bookings entries in
`Header.vue`. Read it through that helper, never `import.meta.env` directly - Vite hands
env vars over as strings, so a bare read treats `"false"` and `0` as on. Without the
licence every travel route answers 404, so a deployment that does not sell travel must
set the flag off or its customers get tabs leading nowhere.

## Files

- `src/composables/travel/hotels/hotel_utils.js` — criteria/URL mapping and limits; filters, sort
  and page with their url halves; the rate helpers (`getRateGroups`, `getCheapestRate`); guest and
  stay labels; and `useHotelUtils()` with every call the journey makes: `regions()`, `search()`,
  `getHotelView()`, `createQuote()`, `getQuote()`.
- `src/models/travel/hotels/` — `Hotel` (a search result), `HotelRate`, `HotelDetail` (the hotel
  page), `HotelSearch` (the resolved stay and its `search_id`), `RateCancellation` and
  `HouseRuleCharge`. `Region` is `src/models/travel/region.js`.
- `src/views/Travel/Hotels/IndexView.vue` — owns the search, the region lookup and all page state.
- `src/views/Travel/Hotels/HotelView.vue` — one hotel, priced for the search it was found under.
  Gallery, heading, rooms, description, amenities and house rules span two columns; `HotelStayCard`
  sits in a sticky sidebar. There is no search bar on this page.
- `src/views/Travel/Hotels/HotelQuoteView.vue` — the held price the hotel page hands off to.
- `src/views/Travel/Hotels/Partials/*.vue` — `SearchBar`, `PassportCountry`, `HotelFilters`,
  `HotelSort`, `HotelPagination`, `HotelCard` and the badges it composes, and the hotel page's
  `HotelGallery`, `HotelHeading`, `HotelRooms` (with `HotelRoomPhotos`), `HotelHouseRules` and
  `HotelStayCard`. `HotelPhotoLightbox` is the one lightbox, opened by the gallery and by each
  room's photos.

Nothing live imports `hotel_booking.js` or `hotel_prebook.js`, or the chain under them
(`hotel_quote`, `catalog_hotel`, `hotel_selection`, `hotel_selection_rate`, `hotel_provider`,
`hotel_photo`, `hotel_facility`, `room_data_translation`, `room_extension`), or
`Partials/PriceChangeDialog.vue`. They model the supplier's raw shape from before SD-1218. Don't
build on them.

## The URL is the source of truth

`IndexView` watches `route.query` with `{immediate: true}` and that watch is the **only** thing
that starts a search. `SearchBar` emits `search`, `updateSearch` turns it into
`router.replace({query})`, and the watch picks it up. First load, refresh, a shared link and the
back button therefore all replay the same search.

- `getCriteria(query)` → the POST body. `getQuery(criteria)` → the route query. Both are exported
  from `hotel_utils.js` and every comparison round-trips through the pair, so a signature match is
  reliable (`appliedSearch` guards against a double fetch, and lets an unchanged search re-run).
- Query contract: `?region=<uuid>&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&guests=2|1:5,9`, plus
  `&residency=GB` when the customer chose the guests' passport country.
  Rooms are `|`-separated, `adults[:age,age]`; a room with no children is just its adult count.
- **Everything from the URL is validated and clamped, never trusted:**
  - a check-in that is malformed, in the past or more than `MAX_CHECKIN_DAYS` (730) out falls back
    to tomorrow;
  - a checkout that isn't one to `MAX_STAY_NIGHTS` (30) nights after check-in falls back to one
    night;
  - counts clamp into range, and non-numeric ages are dropped;
  - a repeated `?region=` (an array) is treated as absent.
- No `region_id` means no request at all — the page shows the "Start with a destination" prompt
  instead of skeletons or an empty result.
- The same query travels onto the hotel page with `?search=<search_id>` beside it, but only so
  that page can link back. The hotel page never prices from the url. See below.
- `residency` is the country that **issued the guests' passports**, not where they live: the
  supplier prices on it and can withhold rooms by it (SD-1775). It is never defaulted. The
  search sends `criteria.residency` (from `?residency=`) or else the profile's
  `nationality.iso2Alpha`; with neither, nothing is searched and `PassportCountry` asks for it in
  place of the results. Nothing is searched until `customerStore.isLoaded`, because
  `CustomerLayout` is still loading the customer while this page mounts, and `search()` throws
  rather than send a request without a residency. `tests/hotel-residency.spec.js` holds all of it.

## The hotel page

`viewHotel` opens `/travel/hotel/:id/:slug?search=<search_id>` plus the search's own query. The
**`search_id` is the stay**: `getHotelView(searchId, hotelId)` posts
`/client/v1/travel/hotel/{search}/{hotel}` with no body, and the backend resolves the stay from it.
Nothing past the region search ever sends raw criteria again.

- **No `search_id` means no request.** The page shows "These results are out of date". A search
  lives thirty minutes. Past that, or for a hotel we don't sell, or for somebody else's search,
  the api answers 404 with a message written to be shown, and the failure panel shows it.
- **One `watch([() => props.id, searchId])` starts every load.** The router reuses the page from
  one hotel to the next. A repeated `?search=` arrives as an array, and `searchId` treats it as
  absent.
- **The response is the hotel page's own shape:** `hotel` → `HotelDetail`, `rates[]` →
  `HotelRate`, `search` → `HotelSearch`, and a `labels` dictionary.
  - The stay card reads the stay from `search` and never from the url. A url reached by the back
    button can describe a different stay from the one these prices were quoted for.
  - Photos arrive ordered and pre-sized (`thumbnail`, `card`, `large`, `xlarge`). The gallery
    leads with `large` and keeps `xlarge` for the lightbox.
  - The description is the supplier's prose, section by section, rendered as written. House
    rules keep prose apart from `charges`, which are money in the property's own currency.
- **Rates come one per room and board.** `getRateGroups(rates)` groups them by room and sorts
  the groups and the rates inside them by total. A group's "from" price is its cheapest rate's
  own total, never mixed with another rate's terms.
  - ~~Grouped by `roomName`~~: since SD-1838 a group is the name **together with** the rate's
    `roomPhotos` and `roomAmenities`, and is keyed by `group.key`. One name can be two rooms: the
    certification hotel lists two "Standard Double room"s whose photos and amenities differ, so
    grouping on the name pictured one room's rates with the other's photos. A rate the console
    could not match to a room carries neither and still groups by name.
  - Each card shows its room's photos (`HotelRoomPhotos`, four and a count, then the shared
    `HotelPhotoLightbox`) and amenities (`HotelAmenities`, worded from `labels`). Room amenity
    codes start `ROOM-` and are open-ended, so they are only ever looked up, never matched.
    `tests/hotel-room-photos-amenities.spec.js` holds it.
- **A row is identified by `rate.id`**, with position as the fallback for a rate that has none.
  The selected row is matched by the rate object itself, never by its token. Before console
  2026.10.6 the token was the supplier's match key, which near-identical rates shared, so keying
  on it lit three rows at once (SD-1219, `tests/hotel-rate-identity.spec.js`).
- **A rate without `bookable` and a `token` is shown priced but "Not available".** "Lowest price"
  marks the cheapest bookable rate on the whole page, not one per group. On every full load
  `getCheapestRate` preselects that rate, so the stay card never sits empty.
- **The stay card's Continue (`holdPrice`) calls `createQuote(searchId, hotelId, token)`** and
  routes to `travelQuote` on the quote's id. From console 2026.10.6 the token is the rate's own id, and the console prices
  the one rate it names.
  - A 409 is an ordinary answer. The room sold out, or the token came from a page opened before
    2026.10.6. The stay card says "That room has just gone", the selection clears, and the rates
    are fetched again quietly: no skeleton, nothing preselected.
  - Any other failure shows the api's message, or "We could not hold this price".
- **Back to results reads the query through `getQuery(getCriteria(route.query))`**, so a chosen
  `?residency=` survives the way back (SD-1775). It carries the criteria only. Filters, sort and
  page are not on the hotel page's url, so they reset unless the browser's back button is used.
- **The dates and guests can't be changed here.** There is no search bar on this page, so a
  different stay starts from the results.

`HotelQuoteView` re-reads the held quote on every open with `getQuote(quoteId)`, because its
cancellation terms are worked out again on each read. Past its expiry the answer is a 410 with a
message to show. Everything from there on is the order journey in
`src/composables/travel/order_utils.js`, which this skill does not cover.

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

One region search returns everything we may show, so filtering, sorting and paging all happen in
the browser. The helpers in `hotel_utils.js` are `getFilters()`, `getFacets(hotels, money, labels)`,
`getFilteredResults()`, `getSortedResults()` and `hasFilters()`. They render as
`Partials/HotelFilters.vue` (a sticky left column, collapsed behind a Filters button below `lg`),
`HotelSort` and `HotelPagination`.

- **Facets are built from the unfiltered results**, so options and counts never vanish mid-use.
- **Filters and sorts run against `hotel.cheapestRate`**, the one rate the card shows, so the price
  on screen always matches what was filtered.
- **The groups:**
  - max total price, a range input in minor units, hidden when every price is the same;
  - star rating, ORed within the group and rounded, with an unrated hotel matching none;
  - photos, with or without, shown only when the results are mixed;
  - amenities, ANDed: codes discovered from the results and named from `labels`. The first six
    show, then "Show all".
- **Sort** is `recommended` (the supplier's own order, the default), price either way, or star
  rating. It runs after filtering.
- **`HOTELS_LIMIT` is 250,** so the region arrives in one response and is sliced into pages of
  `HOTELS_PER_PAGE` (10).

**Filters, sort and page live in the url beside the criteria.** `getListQuery` writes them as
`max_price`, repeated `stars` and `amenities`, `photos`, `sort` and `page`, each only when it isn't
the default. `applySearch` reads them back on every navigation, so a filter change, a sort or a
page turn never re-runs the search, and the back button restores what was on screen.
- Changing a filter or the sort goes back to page 1.
- A page a filter has since ruled out clamps to the last page.
- A new search drops all three, since a price cap or an amenity from one destination says nothing
  about the next. Repeating an unchanged search keeps them.

## Supplier quirks worth remembering

The backend normalises most of the supplier's raw answer (SD-1218). What still shows through:

- **A search hotel carries one `cheapest_rate` and a `rate_count`, never a `rates[]`.** The
  backend drops a hotel it cannot price, and `results` only guards against a rate that went
  missing in between. `getCheapestRate` is for the hotel page's `rates[]` and nothing else.
  Handing it a search hotel was the "filter is not a function" crash.
- **Money is integers in minor units of one currency per response** (`currency`,
  `currency_decimal_places`). Every amount also arrives pre-formatted (`currencyPrefixed`) and is
  shown as sent. The price slider is the one place that formats a number itself (`formatMoney`),
  because its position is a value no rate has.
- **Prices are per stay.** `per_night` is the server's own division, shown beside the total for
  comparison and never charged.
- **Photos arrive pre-sized.** That's an object of sizes on a search hotel, `null` when it has
  none, and an ordered list on the hotel page. `getPhotoUrl` and `PHOTO_SIZE` are left from the
  `{size}` placeholder urls, and nothing on screen calls them.
- **Region names aren't in the search response.** The name is read off the first result's
  `region`, so `SearchBar` takes a `region` prop as the destination label, and it reads "Where
  to?" until results arrive, including while `PassportCountry` asks its question.
- **Star ratings:** null is unrated, and 0 means an apartment or guest house, not a rating either.
  `HotelRating` renders nothing for both.
- **Codes come with a `labels` dictionary** (amenities, meals, house-rule charges, region kinds),
  read with `getLabels`. `prettifyLabel` is only the fallback for a code with no label.
- **`total_hotels` can exceed the results,** because the supplier caps a region, and the page
  says so.
- **The supplier reports failures inside 200 bodies,** so the backend raises instead. An empty
  list really is no matches, and a rejection really is an outage. A 404 is neither: without the
  travel licence every travel route answers one.

## Search bar layout

One flex row, `divide-x` between four cells: destination `Combobox`, dates `Popover`, guests
`Popover`, Search button. Each dropdown cell is `relative` and its panel is `absolute top-full`,
so panels open flush under the bar and align with their own column (`left-0` for dates,
`right-0` for guests). The calendar is an `inline` datepicker inside the panel with
`:multi-calendars="isWide ? 2 : 1"` driven by a `matchMedia('(min-width: 1024px)')` listener, and
`@range-end` closes the panel. The guests panel uses dashed dividers between rooms and identical
`−  n  +` steppers for adults, children and each child's age — no selects, no per-room cards.
