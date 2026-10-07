// End-to-end tests: run the Actor against a mock Tomba API.
import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';

import type { MockHandler, MockServer } from './helpers.js';
import { removeStorage, runActor, startMockTomba, startStandbyActor, totalCharges } from './helpers.js';

const MATT = 'https://www.linkedin.com/in/mattm';

/** Realistic `data` object returned by GET /linkedin. */
function profile(url: string): Record<string, unknown> {
    return {
        email: 'm@wordpress.org',
        first_name: 'Matt',
        last_name: 'Mullenweg',
        full_name: 'Matt Mullenweg',
        country: 'US',
        gender: 'male',
        phone_number: false,
        position: 'CEO',
        twitter: 'photomatt',
        linkedin: url,
        company: 'WordPress',
        website_url: 'wordpress.org',
        accept_all: false,
        score: 99,
        verification: { date: '2026-09-01', status: 'valid' },
        sources: [
            {
                uri: 'https://wordpress.org/about/',
                website_url: 'wordpress.org',
                extracted_on: '2025-01-10T10:00:00+02:00',
                last_seen_on: '2026-08-01T10:00:00+02:00',
                still_on_page: true,
            },
        ],
    };
}

const PHONES = [
    { number: '+14155550123', type: 'mobile' },
    { number: '+14155550124', type: 'work' },
];

/** Second stored address returned with `full=true`; it never has phone data. */
function secondAddress(url: string): Record<string, unknown> {
    return { ...profile(url), email: 'matt@automattic.com', company: 'Automattic', website_url: 'automattic.com' };
}

/** Default Tomba behaviour keyed on the profile handle. Phone data is only returned with `enrich_mobile=true`. */
const tomba: MockHandler = (req) => {
    assert.equal(req.method, 'GET');
    assert.equal(req.path, '/linkedin');
    const { url } = req.query;
    const enrich = req.query.enrich_mobile === 'true';
    if (url.endsWith('/empty')) return { body: { data: req.query.full === 'true' ? [] : null } };
    if (url.endsWith('/noemail')) return { body: { data: { ...profile(url), email: null, score: 0, sources: [] } } };
    if (url.endsWith('/invalid')) return { status: 422, body: { errors: { message: 'Invalid LinkedIn URL' } } };
    if (url.endsWith('/html')) return { raw: '<html>Bad gateway</html>' };
    const phones = enrich ? { phone_data: url.endsWith('/nophone') ? [] : PHONES } : {};
    if (req.query.full === 'true') {
        return {
            body: {
                data: [
                    { ...profile(url), ...phones },
                    { ...secondAddress(url), ...(enrich ? { phone_data: [] } : {}) },
                ],
            },
        };
    }
    return { body: { data: { ...profile(url), ...phones } } };
};

const servers: MockServer[] = [];
const dirs: string[] = [];

async function mock(handler: MockHandler = tomba): Promise<MockServer> {
    const server = await startMockTomba(handler);
    servers.push(server);
    return server;
}

async function run(...args: Parameters<typeof runActor>) {
    const result = await runActor(...args);
    dirs.push(result.storageDir);
    return result;
}

afterEach(async () => {
    await Promise.all(servers.splice(0).map(async (s) => s.close()));
});

after(async () => {
    await Promise.all(dirs.map(removeStorage));
});

describe('linkedin-finder', () => {
    it('returns the email and profile and charges one event per billable profile', async () => {
        const server = await mock();
        const empty = 'https://www.linkedin.com/in/empty';
        const result = await run({ input: { linkedinUrls: [MATT, empty] }, endpoint: server.url });

        assert.equal(result.code, 0, result.output);
        assert.deepEqual(server.requests.map((r) => r.query.url).sort(), [empty, MATT]);

        const found = result.items.find((i) => i.linkedin_url === MATT);
        assert.deepEqual(found, {
            ...profile(MATT),
            phoneNumbers: 0,
            linkedin_url: MATT,
            source: 'tomba_linkedin_finder',
            chargedCredits: 1,
            charged: true,
            cached: false,
        });

        const none = result.items.find((i) => i.linkedin_url === empty);
        assert.deepEqual(none, {
            email: '',
            phoneNumbers: 0,
            linkedin_url: empty,
            source: 'tomba_linkedin_finder',
            chargedCredits: 0,
            charged: false,
            cached: false,
            error: 'No email found for this LinkedIn profile',
        });

        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('sends the built-in credentials to Tomba', async () => {
        const server = await mock();
        await run({ input: { linkedinUrls: [MATT] }, endpoint: server.url });
        assert.equal(server.requests[0].headers['x-tomba-key'], 'ta_test_key');
        assert.equal(server.requests[0].headers['x-tomba-secret'], 'ts_test_secret');
    });

    it('trims and deduplicates URLs and drops blank entries', async () => {
        const server = await mock();
        const result = await run({
            input: { linkedinUrls: [`  ${MATT}  `, MATT, '   ', ''] },
            endpoint: server.url,
        });
        assert.equal(result.code, 0, result.output);
        assert.deepEqual(
            server.requests.map((r) => r.query.url),
            [MATT],
        );
        assert.equal(result.items.length, 1);
    });

    it('charges a negative answer (profile found but no email)', async () => {
        const server = await mock();
        const url = 'https://www.linkedin.com/in/noemail';
        const result = await run({ input: { linkedinUrls: [url] }, endpoint: server.url });
        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].email, null);
        assert.equal(result.items[0].full_name, 'Matt Mullenweg');
        assert.equal(result.items[0].charged, true);
        assert.equal(result.items[0].error, undefined);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('does not charge Tomba error statuses and does not retry them', async () => {
        const server = await mock();
        const result = await run({
            input: { linkedinUrls: ['https://www.linkedin.com/in/invalid'] },
            endpoint: server.url,
        });
        assert.equal(result.code, 0, result.output);
        assert.equal(server.requests.length, 1);
        assert.equal(result.items[0].charged, false);
        assert.equal(result.items[0].email, '');
        assert.match(String(result.items[0].error), /422: Invalid LinkedIn URL/);
        assert.equal(totalCharges(result), 0);
    });

    it('does not charge a non-JSON body', async () => {
        const server = await mock();
        const result = await run({
            input: { linkedinUrls: ['https://www.linkedin.com/in/html'] },
            endpoint: server.url,
        });
        assert.equal(result.items[0].charged, false);
        assert.match(String(result.items[0].error), /Invalid response/);
        assert.equal(totalCharges(result), 0);
    });

    it('retries 429 and 5xx responses, then charges the success once', async () => {
        let calls = 0;
        const server = await mock(async (req) => {
            calls++;
            if (calls === 1)
                return {
                    status: 429,
                    body: { errors: { message: 'Too many requests' } },
                    headers: { 'retry-after': '1' },
                };
            if (calls === 2) return { status: 503, body: {} };
            return tomba(req);
        });
        const result = await run({ input: { linkedinUrls: [MATT], maxRetries: 3 }, endpoint: server.url });
        assert.equal(server.requests.length, 3);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].charged, true);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('serves repeated runs from the cache for free', async () => {
        const server = await mock();
        const first = await run({ input: { linkedinUrls: [MATT] }, endpoint: server.url });
        const second = await run({
            input: { linkedinUrls: [MATT] },
            endpoint: server.url,
            storageDir: first.storageDir,
        });

        assert.equal(server.requests.length, 1);
        assert.equal(second.items.length, 1);
        assert.equal(second.items[0].email, 'm@wordpress.org');
        assert.equal(second.items[0].cached, true);
        assert.equal(second.items[0].charged, false);
        assert.equal(second.items[0].chargedCredits, 0);
        assert.equal(totalCharges(second), 0);
    });

    it('serves repeated runs with phone data and full=true from the cache for free', async () => {
        const server = await mock();
        const input = { linkedinUrls: [MATT], enrichMobile: true, full: true };
        const first = await run({ input, endpoint: server.url });
        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir });

        assert.deepEqual(first.chargeCounts, { 'tomba-request': 12 });
        assert.equal(server.requests.length, 1);
        assert.equal(second.items.length, 2);
        assert.ok(second.items.every((i) => i.cached === true && i.charged === false && i.chargedCredits === 0));
        assert.deepEqual(second.items[0].phoneNumbers, 2);
        assert.equal(totalCharges(second), 0);
    });

    it('calls Tomba again when the cache is disabled', async () => {
        const server = await mock();
        const first = await run({ input: { linkedinUrls: [MATT], useCache: false }, endpoint: server.url });
        await run({
            input: { linkedinUrls: [MATT], useCache: false },
            endpoint: server.url,
            storageDir: first.storageDir,
        });
        assert.equal(server.requests.length, 2);
    });

    it('stops at the max charge limit and resumes without reprocessing', async () => {
        const server = await mock();
        const linkedinUrls = ['a', 'b', 'c', 'd', 'e'].map((h) => `https://www.linkedin.com/in/${h}`);
        const input = { linkedinUrls, maxConcurrency: 1, useCache: false, maxResults: 100 };

        // Locally every event costs $1, so a $2 budget allows two billable requests.
        const first = await run({ input, endpoint: server.url, maxTotalChargeUsd: 2 });
        assert.equal(first.code, 0, first.output);
        assert.equal(totalCharges(first), 2);
        assert.equal(server.requests.length, 2);
        assert.equal(first.items.length, 2);

        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir, keepStorage: true });
        assert.equal(second.code, 0, second.output);
        assert.deepEqual(
            server.requests.map((r) => r.query.url),
            linkedinUrls,
        );
        // The kept datasets accumulate: 2 items/charges from the first run + 3 from the resumed one.
        assert.equal(totalCharges(second), 5);
        assert.equal(second.items.length, 5);
    });

    it('respects maxResults', async () => {
        const server = await mock();
        const result = await run({
            input: {
                linkedinUrls: ['https://www.linkedin.com/in/a', 'https://www.linkedin.com/in/b'],
                maxResults: 1,
                maxConcurrency: 1,
            },
            endpoint: server.url,
        });
        assert.equal(server.requests.length, 1);
        assert.equal(result.items.length, 1);
        assert.equal(totalCharges(result), 1);
    });

    it('runs requests in parallel', async () => {
        let active = 0;
        let peak = 0;
        const server = await mock(async (req) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((r) => {
                setTimeout(r, 100);
            });
            active--;
            return tomba(req);
        });
        const linkedinUrls = Array.from({ length: 8 }, (_, i) => `https://www.linkedin.com/in/person-${i}`);
        await run({ input: { linkedinUrls, maxConcurrency: 4 }, endpoint: server.url });
        assert.equal(server.requests.length, 8);
        assert.ok(peak > 1 && peak <= 4, `peak concurrency ${peak}`);
    });

    it('sends enrich_mobile, full and webhook_url only when they are set', async () => {
        const server = await mock();
        await run({ input: { linkedinUrls: [MATT] }, endpoint: server.url });
        await run({
            input: { linkedinUrls: [MATT], enrichMobile: false, full: false, webhookUrl: '  ', useCache: false },
            endpoint: server.url,
        });
        await run({
            input: {
                linkedinUrls: [MATT],
                enrichMobile: true,
                full: true,
                webhookUrl: 'https://hooks.example.com/tomba',
            },
            endpoint: server.url,
        });

        assert.deepEqual(server.requests[0].query, { url: MATT });
        assert.deepEqual(server.requests[1].query, { url: MATT });
        assert.deepEqual(server.requests[2].query, {
            url: MATT,
            enrich_mobile: 'true',
            full: 'true',
            webhook_url: 'https://hooks.example.com/tomba',
        });
    });

    it('charges 6 credits when the profile comes with phone data', async () => {
        const server = await mock();
        const result = await run({ input: { linkedinUrls: [MATT], enrichMobile: true }, endpoint: server.url });

        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 1);
        const item = result.items[0];
        assert.deepEqual(item.phone_data, PHONES);
        assert.deepEqual(item.phoneNumbers, 2);
        assert.equal(item.chargedCredits, 6);
        assert.equal(item.charged, true);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 6 });
    });

    it('charges 1 credit when phone enrichment finds no number', async () => {
        const server = await mock();
        const url = 'https://www.linkedin.com/in/nophone';
        const result = await run({ input: { linkedinUrls: [url], enrichMobile: true }, endpoint: server.url });

        assert.equal(result.items[0].email, 'm@wordpress.org');
        assert.equal(result.items[0].phoneNumbers, 0);
        assert.equal(result.items[0].chargedCredits, 1);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('pushes one item per stored address with full=true and charges each address', async () => {
        const server = await mock();
        const result = await run({
            input: { linkedinUrls: [MATT], enrichMobile: true, full: true },
            endpoint: server.url,
        });

        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 2);
        const [first, second] = result.items;
        assert.deepEqual(first, {
            ...profile(MATT),
            phone_data: PHONES,
            phoneNumbers: 2,
            linkedin_url: MATT,
            source: 'tomba_linkedin_finder',
            chargedCredits: 11,
            charged: true,
            cached: false,
        });
        assert.equal(second.email, 'matt@automattic.com');
        assert.equal(second.linkedin_url, MATT);
        assert.equal(second.source, 'tomba_linkedin_finder');
        assert.equal(second.phoneNumbers, 0);
        assert.equal(second.chargedCredits, 1);
        assert.equal(second.charged, true);
        assert.equal(second.cached, false);
        // (1 + 2 × 5) + (1 + 0) = 12 credits.
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 12 });
    });

    it('charges 1 credit per address with full=true and no phone enrichment', async () => {
        const server = await mock();
        const result = await run({ input: { linkedinUrls: [MATT], full: true }, endpoint: server.url });

        assert.equal(result.items.length, 2);
        assert.deepEqual(
            result.items.map((i) => i.chargedCredits),
            [1, 1],
        );
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 2 });
    });

    it('does not charge an empty address list with full=true', async () => {
        const server = await mock();
        const url = 'https://www.linkedin.com/in/empty';
        const result = await run({ input: { linkedinUrls: [url], full: true }, endpoint: server.url });

        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].charged, false);
        assert.equal(result.items[0].chargedCredits, 0);
        assert.equal(totalCharges(result), 0);
    });

    it('fails without Tomba credentials and never calls the API', async () => {
        const server = await mock();
        const result = await run({ input: { linkedinUrls: [MATT] }, endpoint: server.url, withCredentials: false });
        assert.notEqual(result.code, 0);
        assert.match(result.output, /misconfigured/);
        assert.doesNotMatch(result.output, /ta_test_key|ts_test_secret/);
        assert.equal(server.requests.length, 0);
    });

    it('fails on empty input', async () => {
        const server = await mock();
        const result = await run({ input: { linkedinUrls: [] }, endpoint: server.url });
        assert.notEqual(result.code, 0);
        assert.equal(server.requests.length, 0);
        assert.equal(result.items.length, 0);
    });
});

describe('linkedin-finder standby (real-time API)', () => {
    it('answers the readiness probe and a bare GET with usage info', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const probe = await actor.call('/', { headers: { 'x-apify-container-server-readiness-probe': '1' } });
            assert.equal(probe.status, 200);
            const usage = await actor.call('/');
            assert.equal(usage.status, 200);
            assert.match(String(usage.body.usage), /GET/);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('looks up profiles from GET query parameters and charges per credit', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        const empty = 'https://www.linkedin.com/in/empty';
        let stopped;
        try {
            const res = await actor.call(
                `/?url=${encodeURIComponent(MATT)}&linkedinUrl=${encodeURIComponent(empty)}&enrichMobile=true`,
            );
            assert.equal(res.status, 200);
            const items = res.body.items as Record<string, unknown>[];
            const found = items.find((i) => i.linkedin_url === MATT);
            assert.equal(found?.email, 'm@wordpress.org');
            assert.equal(found?.chargedCredits, 6);
            assert.deepEqual(found?.phone_data, PHONES);
            assert.equal(
                items.find((i) => i.linkedin_url === empty)?.error,
                'No email found for this LinkedIn profile',
            );
            assert.ok(server.requests.every((r) => r.query.enrich_mobile === 'true'));
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 6 });
    });

    it('accepts a POST with the same JSON input as a normal run', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            const res = await actor.call('/', { body: { linkedinUrls: [MATT], full: true } });
            assert.equal(res.status, 200);
            const items = res.body.items as Record<string, unknown>[];
            assert.deepEqual(
                items.map((i) => i.email),
                ['m@wordpress.org', 'matt@automattic.com'],
            );
            assert.deepEqual(server.requests[0].query, { url: MATT, full: 'true' });
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 2 });
    });

    it('serves repeated requests from the cache for free', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            await actor.call(`/?url=${encodeURIComponent(MATT)}`);
            const second = await actor.call(`/?url=${encodeURIComponent(MATT)}`);
            assert.ok((second.body.items as Record<string, unknown>[]).every((i) => i.cached === true));
            assert.equal(server.requests.length, 1);
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 1 });
    });

    it('keeps serving after a request hits maxResults', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const first = await actor.call(
                '/?urls=https://www.linkedin.com/in/a,https://www.linkedin.com/in/b&maxResults=1',
            );
            assert.equal((first.body.items as unknown[]).length, 1);
            const second = await actor.call('/?url=https://www.linkedin.com/in/c');
            assert.equal((second.body.items as unknown[]).length, 1);
            assert.equal(server.requests.length, 2);
        } finally {
            await actor.stop();
        }
    });

    it('rejects invalid input with 400 and unknown paths with 404', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            assert.equal((await actor.call('/', { body: {} })).status, 400);
            assert.equal((await actor.call('/', { body: 'not json' })).status, 400);
            assert.equal((await actor.call(`/?url=${encodeURIComponent(MATT)}&maxResults=abc`)).status, 400);
            assert.equal((await actor.call(`/?url=${encodeURIComponent(MATT)}&full=maybe`)).status, 400);
            assert.equal((await actor.call('/?enrichMobile=true')).status, 400);
            assert.equal((await actor.call('/nope')).status, 404);
            assert.equal((await actor.call('/', { method: 'DELETE' })).status, 405);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('returns 402 once the max charge limit is reached', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url, maxTotalChargeUsd: 1 });
        try {
            const first = await actor.call('/?url=https://www.linkedin.com/in/a');
            assert.equal(first.status, 200);
            const second = await actor.call('/?url=https://www.linkedin.com/in/b');
            assert.equal(second.status, 402);
            assert.equal(server.requests.length, 1);
        } finally {
            await actor.stop();
        }
    });
});
