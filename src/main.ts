import { Actor, log } from 'apify';
import { Finder } from 'tomba';

import type { RunOptions } from './tomba.js';
import {
    callTomba,
    EVENT_REQUEST,
    hasPhoneData,
    isBillable,
    logSummary,
    PHONE_CREDITS,
    phoneDataCount,
    runPool,
    setupTomba,
    unique,
    useRunState,
} from './tomba.js';

interface LinkedInFinderInput extends RunOptions {
    linkedinUrls: string[];
    maxResults?: number;
    enrichMobile?: boolean;
    full?: boolean;
    webhookUrl?: string;
}

interface LinkedInParams {
    url: string;
    enrich_mobile?: boolean;
    full?: boolean;
    webhook_url?: string;
}

const SOURCE = 'tomba_linkedin_finder';

await Actor.init();

const input = await Actor.getInput<LinkedInFinderInput>();
if (!input?.linkedinUrls?.length) {
    await Actor.fail('Input must contain at least one LinkedIn URL in "linkedinUrls".');
}

const {
    linkedinUrls: rawUrls,
    maxResults = 50,
    enrichMobile = false,
    full = false,
    webhookUrl,
    ...runOptions
} = input!;
const webhook = typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined;
const client = await setupTomba(runOptions);
const finder = new Finder(client);
const state = await useRunState();

const linkedinUrls = unique(rawUrls.map((url) => (typeof url === 'string' ? url.trim() : '')));
const doneCount = linkedinUrls.filter((url) => state.done[url]).length;
const pending = linkedinUrls.filter((url) => !state.done[url]).slice(0, Math.max(0, maxResults - doneCount));
if (doneCount > 0) {
    log.info(`Resuming: ${doneCount} LinkedIn URLs already processed.`);
}

/** Request parameters; optional ones are only sent when set. */
function requestParams(url: string): LinkedInParams {
    const params: LinkedInParams = { url };
    if (enrichMobile) params.enrich_mobile = true;
    if (full) params.full = true;
    if (webhook) params.webhook_url = webhook;
    return params;
}

/** Credits for one stored address: 1, plus 5 per phone number in `phone_data`. */
function addressCredits(address: unknown): number {
    return 1 + PHONE_CREDITS * phoneDataCount(address);
}

/**
 * LinkedIn Finder pricing: 1 credit, or 6 when the result has phone data.
 * With `full=true` Tomba returns an array of stored addresses: 1 credit per address plus 5 per phone number.
 */
function linkedinCredits(data: unknown): number {
    if (Array.isArray(data)) return data.reduce<number>((sum, address) => sum + addressCredits(address), 0);
    return 1 + (hasPhoneData(data) ? PHONE_CREDITS : 0);
}

const startedAt = Date.now();
log.info(`Finding emails for ${pending.length} LinkedIn URLs`, { enrichMobile, full, webhook: Boolean(webhook) });

await runPool(pending, async (linkedinUrl) => {
    const params = requestParams(linkedinUrl);
    const res = await callTomba(
        'linkedin',
        { ...params },
        async () => finder.linkedinFinder(params.url, params.enrich_mobile, params.full, params.webhook_url),
        EVENT_REQUEST,
        (body) => linkedinCredits(body.data),
    );
    if (res.skipped) return;

    if (isBillable(res.body)) {
        const records = (Array.isArray(res.data) ? res.data : [res.data]).filter(
            (record): record is Record<string, unknown> => typeof record === 'object' && record !== null,
        );
        // Split the charged credits over the returned addresses so the dataset adds up to what was billed.
        let creditsLeft = res.chargedCount ?? 0;
        const items = records.map((record) => {
            const credits = Array.isArray(res.data)
                ? Math.min(creditsLeft, addressCredits(record))
                : (res.chargedCount ?? 0);
            creditsLeft -= credits;
            return {
                ...record,
                phoneNumbers: phoneDataCount(record),
                linkedin_url: linkedinUrl,
                source: SOURCE,
                chargedCredits: credits,
                charged: res.charged,
                cached: res.cached,
            };
        });
        await Actor.pushData(items);
        for (const [index, record] of records.entries()) {
            const email = typeof record.email === 'string' && record.email ? record.email : 'no email found';
            const phoneCount = items[index].phoneNumbers;
            const phones = phoneCount ? `, ${phoneCount} phone number(s)` : '';
            log.info(`${linkedinUrl}: ${email}${phones}${res.cached ? ' (cached)' : ''}`);
        }
    } else {
        await Actor.pushData({
            email: '',
            phoneNumbers: 0,
            linkedin_url: linkedinUrl,
            source: SOURCE,
            chargedCredits: 0,
            charged: res.charged,
            cached: res.cached,
            error: res.error ?? 'No email found for this LinkedIn profile',
        });
        log.info(`${linkedinUrl}: ${res.error ?? 'no email found'}`);
    }

    state.done[linkedinUrl] = true;
});

logSummary('LinkedIn Finder', linkedinUrls.length, startedAt);

await Actor.exit();
