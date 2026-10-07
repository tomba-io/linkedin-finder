import { log } from 'apify';
import { Finder } from 'tomba';

import { InputError, queryBool, queryInt, queryList, queryString, runActor } from './standby.js';
import type { RunOptions } from './tomba.js';
import {
    callTomba,
    EVENT_REQUEST,
    getClient,
    hasPhoneData,
    isBillable,
    PHONE_CREDITS,
    phoneDataCount,
    runPool,
    unique,
} from './tomba.js';

interface LinkedInFinderInput extends RunOptions {
    linkedinUrls?: string[];
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

await runActor<LinkedInFinderInput>({
    title: 'LinkedIn Finder',
    count: (input) => input.linkedinUrls?.length ?? 0,
    fromQuery: (query) => ({
        linkedinUrls: queryList(query, 'url', 'urls', 'linkedinUrl', 'linkedinUrls'),
        enrichMobile: queryBool(query, 'enrichMobile'),
        full: queryBool(query, 'full'),
        webhookUrl: queryString(query, 'webhookUrl'),
        maxResults: queryInt(query, 'maxResults'),
    }),
    run: async (input, { push, isDone, markDone, standby }) => {
        if (!input.linkedinUrls?.length) {
            throw new InputError('Input must contain at least one LinkedIn URL in "linkedinUrls".');
        }

        const { linkedinUrls: rawUrls, maxResults = 50, enrichMobile = false, full = false, webhookUrl } = input;
        const webhook = typeof webhookUrl === 'string' && webhookUrl.trim() ? webhookUrl.trim() : undefined;
        const finder = new Finder(getClient());

        const linkedinUrls = unique(rawUrls.map((url) => (typeof url === 'string' ? url.trim() : '')));
        const doneCount = linkedinUrls.filter((url) => isDone(url)).length;
        const pending = linkedinUrls.filter((url) => !isDone(url)).slice(0, Math.max(0, maxResults - doneCount));
        if (doneCount > 0) {
            log.info(`Resuming: ${doneCount} LinkedIn URLs already processed.`);
        }

        /** Request parameters; optional ones are only sent when set. */
        const requestParams = (url: string): LinkedInParams => {
            const params: LinkedInParams = { url };
            if (enrichMobile) params.enrich_mobile = true;
            if (full) params.full = true;
            if (webhook) params.webhook_url = webhook;
            return params;
        };

        if (!standby) {
            log.info(`Finding emails for ${pending.length} LinkedIn URLs`, {
                enrichMobile,
                full,
                webhook: Boolean(webhook),
            });
        }

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
                await push(items);
                for (const [index, record] of records.entries()) {
                    const email = typeof record.email === 'string' && record.email ? record.email : 'no email found';
                    const phoneCount = items[index].phoneNumbers;
                    const phones = phoneCount ? `, ${phoneCount} phone number(s)` : '';
                    log.info(`${linkedinUrl}: ${email}${phones}${res.cached ? ' (cached)' : ''}`);
                }
            } else {
                await push({
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

            markDone(linkedinUrl);
        });
    },
});
