import { Actor } from 'apify';
import { Finder, TombaClient } from 'tomba';

interface LinkedInFinderInput {
    tombaApiKey: string;
    tombaApiSecret: string;
    linkedinUrls: string[];
    maxResults?: number;
}

// Rate limiting function - 150 requests per minute
async function rateLimit(lastRequestTime: number): Promise<void> {
    const minInterval = 60000 / 150; // 150 requests per minute
    const timeSinceLastRequest = Date.now() - lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
        const delay = minInterval - timeSinceLastRequest;
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), delay);
        });
    }
}

await Actor.init();

try {
    const input = await Actor.getInput<LinkedInFinderInput>();

    if (!input) {
        throw new Error('Input is required');
    }

    const { tombaApiKey, tombaApiSecret, linkedinUrls, maxResults = 50 } = input;

    if (!tombaApiKey || !tombaApiSecret) {
        throw new Error('Tomba API key and secret are required');
    }

    if (!linkedinUrls || !Array.isArray(linkedinUrls) || linkedinUrls.length === 0) {
        throw new Error('At least one LinkedIn URL is required');
    }

    // Initialize Tomba client
    const client = new TombaClient();
    const finder = new Finder(client);

    client.setKey(tombaApiKey).setSecret(tombaApiSecret);

    console.log(`Starting LinkedIn finder for ${linkedinUrls.length} URLs`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let lastRequestTime = 0;
    const startTime = Date.now();

    for (const linkedinUrl of linkedinUrls) {
        if (processedCount >= maxResults) {
            console.log(`Reached maximum results limit of ${maxResults}`);
            break;
        }

        try {
            // Apply rate limiting
            await rateLimit(lastRequestTime);
            lastRequestTime = Date.now();

            console.log(`Processing LinkedIn URL: ${linkedinUrl}`);

            const result = await finder.linkedinFinder(linkedinUrl);

            if (result && typeof result === 'object') {
                const resultData = result;

                if (resultData.data && typeof resultData.data === 'object') {
                    const linkedinResult = resultData.data;

                    await Actor.pushData(linkedinResult);
                    processedCount++;
                    successCount++;

                    console.log(`Found email: ${linkedinResult.email} for ${linkedinUrl}`);
                } else {
                    console.log(`No data found for LinkedIn URL: ${linkedinUrl}`);

                    const errorResult = {
                        email: '',
                        linkedin_url: linkedinUrl,
                        source: 'tomba_linkedin_finder',
                    };

                    await Actor.pushData(errorResult);
                    processedCount++;
                    errorCount++;
                }
            } else {
                console.log(`Invalid response for LinkedIn URL: ${linkedinUrl}`);
                errorCount++;
            }
        } catch (error) {
            console.error(`Error processing LinkedIn URL ${linkedinUrl}:`, error);

            const errorResult = {
                email: '',
                linkedin_url: linkedinUrl,
                source: 'tomba_linkedin_finder',
            };

            await Actor.pushData(errorResult);
            processedCount++;
            errorCount++;
        }

        // Small delay between requests
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100);
        });
    }

    const endTime = Date.now();
    const executionTime = Math.round((endTime - startTime) / 1000);
    const successRate = processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0;
    const avgTimePerUrl = processedCount > 0 ? Math.round(executionTime / processedCount) : 0;

    // Log comprehensive summary
    console.log('\n LINKEDIN FINDER SUMMARY');
    console.log('================================');
    console.log(`Total LinkedIn URLs processed: ${processedCount}/${linkedinUrls.length}`);
    console.log(`Successful email discoveries: ${successCount}`);
    console.log(`Failed attempts: ${errorCount}`);
    console.log(`Success rate: ${successRate}%`);
    console.log(`Total execution time: ${executionTime} seconds`);
    console.log(`Average time per URL: ${avgTimePerUrl} seconds`);
    console.log(`API requests made: ${processedCount}`);
    console.log(`Rate limiting: 150 requests/minute (${Math.round(60000 / 150)}ms interval)`);
    console.log('================================');

    console.log(`LinkedIn finder completed. Processed ${processedCount} URLs.`);
} catch (error) {
    console.error('LinkedIn finder failed:', error);
    throw error;
}

await Actor.exit();
