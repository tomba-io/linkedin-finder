# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2026-10-07)

### ⚠ BREAKING CHANGES

- `tombaApiKey` and `tombaApiSecret` inputs were removed. The Actor now uses built-in Tomba credentials from the `TOMBA_API_KEY` / `TOMBA_API_SECRET` environment variables, so users no longer need a Tomba account.

### Features

- Pay-per-event pricing in credits of $0.00312 (`tomba-request`): 1 credit per profile, or 6 with phone data; with `full=true`, 1 credit per returned address plus 5 per phone number; errors, empty results and cache hits are free
- New `enrichMobile` input: return the phone numbers linked to each profile (`phone_data`, `phoneNumbers`)
- New `full` input: return every stored address (up to 2), one dataset item per address
- New `webhookUrl` input, sent to Tomba as `webhook_url`
- Each item includes `chargedCredits` and `phoneNumbers`
- No client-side rate limit; parallel processing with `maxConcurrency`
- Automatic retries with exponential backoff for network errors, 429 and 5xx (`maxRetries`)
- Cross-run result cache (`useCache`, `cacheTtlHours`)
- Resume after migration or restart
- Each dataset item now includes `charged` and `cached`
- URLs are trimmed and deduplicated
- Every item now includes `linkedin_url` and `source`; failed lookups include an `error` field
- Real-time API (Apify Standby mode): `GET /?url=…` or `POST /` with the run input returns results as JSON, with an OpenAPI web server schema
- Key-value store schema for the default store (`INPUT`, `TOMBA_STATE`)
- Default memory set to 256 MB

### Dependencies

- `tomba` upgraded to 1.1.1 (responses are now `{ data, rateLimit }`)
- `apify` upgraded to 3.7.2

### [0.0.3](https://github.com/tomba-io/linkedin-finder/compare/v0.0.2...v0.0.3) (2025-10-24)

### Bug Fixes

- Dataset schema accepts `null` for every Tomba field and a boolean or string `phone_number`, so Apify's item validation can't fail a run
- ensure email data is present before processing LinkedIn results ([993467c](https://github.com/tomba-io/linkedin-finder/commit/993467c0f08e25da41911d6f34087689f437bfe8))
- update dataset schema descriptions for LinkedIn profile fields ([6f810bb](https://github.com/tomba-io/linkedin-finder/commit/6f810bb1f40ac6585a2c23a17de3f3d5609146f3))

### 0.0.2 (2025-10-24)
