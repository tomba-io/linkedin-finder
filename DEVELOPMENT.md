# Development

Notes for maintainers of the Tomba LinkedIn Finder Actor. The README is the end-user page shown on Apify Store.

## Requirements

- Node.js 20+
- [Apify CLI](https://docs.apify.com/cli) for deployment

## Scripts

```bash
npm install
npm run build     # compile TypeScript to dist/
npm run lint      # ESLint (src and test)
npm run format    # Prettier
npm test          # unit + end-to-end tests (node:test)
npm start         # run locally with tsx
```

## Credentials

The Actor uses our Tomba account. Credentials come from environment variables, never from the input:

| Variable             | Description                                        |
| -------------------- | -------------------------------------------------- |
| `TOMBA_API_KEY`      | Tomba API key (`ta_…`)                             |
| `TOMBA_API_SECRET`   | Tomba secret (`ts_…`)                              |
| `TOMBA_API_ENDPOINT` | Optional API base URL; only used by the test suite |

`.actor/actor.json` maps the variables to Apify secrets:

```bash
apify secrets add tombaApiKey ta_xxxxxxxxxxxxxxxxxxxx
apify secrets add tombaApiSecret ts_xxxxxxxxxxxxxxxxxxxx
apify push
```

Run locally:

```bash
TOMBA_API_KEY=ta_… TOMBA_API_SECRET=ts_… npm start
```

## Pricing (pay per event)

In **Apify Console → Publication → Monetization**, choose **Pay per event** and add:

| Event           | Price    | Charged when                                       |
| --------------- | -------- | -------------------------------------------------- |
| `tomba-request` | $0.00312 | Once per credit of a billable response (see below) |

LinkedIn Finder costs credits, charged as `tomba-request` events with `count`:

- without `full`: 1 credit, or 6 (`1 + PHONE_CREDITS`) when `data.phone_data` is non-empty (`hasPhoneData()`)
- with `full=true`: Tomba returns an array of stored addresses (up to 2); 1 credit per address plus 5 per phone number (`1 + PHONE_CREDITS * phoneDataCount(address)`)

`linkedinCredits()` in `src/main.ts` computes this from the response body and passes it to `callTomba()` as the charge count. With `full=true` the charged credits are split over the pushed rows (each address gets its own share), so the dataset's `chargedCredits` add up to what was billed.

`isBillable()` in `src/tomba.ts` mirrors Tomba's billing:

| Tomba outcome                                          | Charged |
| ------------------------------------------------------ | ------- |
| JSON with non-empty `data`, including negative answers | Yes     |
| Error status (4xx, 5xx, including 422 and 429)         | No      |
| Success with empty or null `data`                      | No      |
| Success with an `errors` object                        | No      |
| Non-JSON body (reported as 502)                        | No      |
| Cache hit                                              | No      |

## Architecture

- `src/tomba.ts`: shared helper, identical in every Tomba Actor. It handles credentials, caching (`tomba-cache` key-value store), retries with exponential backoff, pay-per-event charging, budget reservation, the concurrency pool and resume state.
- `src/main.ts`: Actor-specific input handling and output mapping. LinkedIn URLs are trimmed and deduplicated (no other normalization; the input schema enforces `https://www.linkedin.com/in/<handle>`). `maxResults` caps how many profiles are processed. Each profile calls `Finder.linkedinFinder(url, enrich_mobile, full, webhook_url)` (`GET /linkedin`); the optional parameters are only sent when set (`enrichMobile`/`full` true, `webhookUrl` non-blank) and are part of the cache key. It pushes one item per returned address (one without `full`, up to 2 with `full=true`): Tomba's address object spread, plus `phoneNumbers` (count of `phone_data` entries), `linkedin_url`, `source`, `chargedCredits`, `charged` and `cached`. A non-billable outcome pushes a free item with `email: ''`, `phoneNumbers: 0`, `chargedCredits: 0` and `error`.
- The `tomba` SDK v1.1.1 resolves every call to `{ data, rateLimit }`, where `data` is the response body. Its `.d.ts` types still declare the old return type, so always go through `callTomba()`.

## Tests

- `test/tomba.test.ts`: unit tests for the shared helper (identical in every Actor)
- `test/main.test.ts`: end-to-end tests that run `src/main.ts` against a local mock Tomba API
- `test/helpers.ts`: mock server and Actor runner (identical in every Actor)

Locally, the Apify SDK prices every event at $1 when `ACTOR_TEST_PAY_PER_EVENT=true`, so the tests use `maxTotalChargeUsd` as an event count.
