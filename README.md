# Tomba LinkedIn Finder

[![Price](https://img.shields.io/badge/Price-%243.12%20per%201K%20profiles-brightgreen)](#pricing)
[![No signup](https://img.shields.io/badge/Tomba%20account-not%20needed-blue)](#quick-start)
[![No rate limit](https://img.shields.io/badge/Rate%20limit-none-brightgreen)](#built-for-big-lists)

**Turn LinkedIn profiles into verified business emails.** Paste a list of LinkedIn profile URLs and get each person's professional email address, name, job title, company, country and a confidence score, ready to export to your CRM or outreach tool.

No Tomba account. No API key. No subscription. **You pay $0.00312 per profile, and only when Tomba returns an answer.** Need to call them too? Switch on phone numbers and get their direct lines in the same run.

## Why teams choose this Actor

- **Start in 30 seconds**: Open the Actor, paste your LinkedIn URLs, click Start. Nothing to sign up for
- **Pay only for answers**: Profiles Tomba knows nothing about, errors and invalid URLs are free
- **$3.12 per 1,000 profiles**: No monthly plan, no credits that expire, no minimum spend
- **Built for big lists**: No rate limit. Thousands of profiles run in parallel
- **Never pay twice**: Profiles you looked up in the last 24 hours come back from cache for free
- **Phone numbers on demand**: Tick one box to get the mobile and direct numbers linked to each profile
- **Every address, not just one**: Ask for all the addresses Tomba has stored for a person (up to 2) and keep both
- **More than an email**: Name, position, company, website, country, social profiles, verification status and the public sources where the email was seen
- **Export anywhere**: Download as CSV, Excel or JSON, or send results straight to your CRM with Apify integrations

## Promises we actually keep

- **Less than 5% bounce rate** — Every email is verified in real time before you're charged.
- **Highest coverage on the market** — 81% email coverage. That's 2x more valid emails than the next best competitor. We find contacts others simply can't.

## What you can do with it

| Goal                        | How LinkedIn-to-email helps                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Book more meetings**      | Move prospects from LinkedIn into email sequences and call lists                 |
| **Recruit faster**          | Contact the candidates you found on LinkedIn directly, without InMail limits     |
| **Account-based marketing** | Turn a list of decision makers into a ready-to-use contact list                  |
| **Enrich your CRM**         | Add verified emails, titles and companies to the LinkedIn leads you already have |
| **Network and partner**     | Reach founders, experts and partners you want to work with                       |

## Quick start

1. Click **Try for free**
2. Paste profile URLs into **LinkedIn URLs** (for example `https://www.linkedin.com/in/mattm`)
3. Click **Start**, then download your results as CSV, Excel or JSON

That's it. No Tomba account or API key is needed.

## Input

| Field            | Required | Default | Description                                                                            |
| ---------------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `linkedinUrls`   | Yes      |         | LinkedIn profile URLs in the form `https://www.linkedin.com/in/username` (up to 1,000) |
| `maxResults`     | No       | `50`    | Maximum number of profiles to process in this run                                      |
| `enrichMobile`   | No       | `false` | Also return the phone numbers linked to each profile                                   |
| `full`           | No       | `false` | Return every address Tomba has stored for the profile (up to 2), one row each          |
| `webhookUrl`     | No       |         | Your own `http(s)://` URL that Tomba also sends each result to                         |
| `maxConcurrency` | No       | `10`    | How many profiles to process at the same time (1–50)                                   |
| `maxRetries`     | No       | `3`     | How many times to retry a temporary failure (0–10)                                     |
| `useCache`       | No       | `true`  | Reuse results from your previous runs for free                                         |
| `cacheTtlHours`  | No       | `24`    | How long cached results stay valid (`0` turns the cache off)                           |

```json
{
    "linkedinUrls": [
        "https://www.linkedin.com/in/mattm",
        "https://www.linkedin.com/in/john-doe",
        "https://www.linkedin.com/in/jane-smith"
    ],
    "maxResults": 500,
    "enrichMobile": true
}
```

## Output

You get one row per LinkedIn profile (with `full` turned on, one row per stored address):

```json
{
    "email": "m@wordpress.org",
    "first_name": "Matt",
    "last_name": "Mullenweg",
    "full_name": "Matt Mullenweg",
    "country": "US",
    "gender": "male",
    "phone_number": false,
    "position": "CEO",
    "twitter": "photomatt",
    "linkedin": "https://www.linkedin.com/in/mattm",
    "company": "WordPress",
    "website_url": "wordpress.org",
    "accept_all": false,
    "phone_data": [{ "number": "+14155550123", "type": "mobile" }],
    "phoneNumbers": 1,
    "score": 99,
    "verification": { "date": "2026-09-01", "status": "valid" },
    "sources": [
        {
            "uri": "https://wordpress.org/about/",
            "website_url": "wordpress.org",
            "extracted_on": "2025-01-10T10:00:00+02:00",
            "last_seen_on": "2026-08-01T10:00:00+02:00",
            "still_on_page": true
        }
    ],
    "linkedin_url": "https://www.linkedin.com/in/mattm",
    "source": "tomba_linkedin_finder",
    "chargedCredits": 6,
    "charged": true,
    "cached": false
}
```

| Field                                  | Description                                                           |
| -------------------------------------- | --------------------------------------------------------------------- |
| `linkedin_url`                         | The LinkedIn URL you submitted                                        |
| `email`                                | Professional email address found for the profile                      |
| `first_name`, `last_name`, `full_name` | Person's name                                                         |
| `position`                             | Job title                                                             |
| `company`                              | Current company                                                       |
| `website_url`                          | Company website                                                       |
| `country`                              | Country code                                                          |
| `gender`                               | Gender, when known                                                    |
| `twitter`, `linkedin`                  | Social profiles, when known                                           |
| `phone_number`                         | Whether a phone number is available for this person                   |
| `phone_data`                           | Phone numbers and their type, when `enrichMobile` is on               |
| `phoneNumbers`                         | How many phone numbers were found (the numbers are in `phone_data`)   |
| `score`                                | Confidence score from 0 to 100 (higher is better)                     |
| `accept_all`                           | `true` if the company's mail server accepts every address (catch-all) |
| `verification`                         | Date and status of the latest email verification                      |
| `sources`                              | Public web pages where the email was found                            |
| `source`                               | Always `tomba_linkedin_finder`                                        |
| `chargedCredits`                       | Credits billed for this row ($0.00312 each)                           |
| `charged`                              | `true` if this lookup was billed                                      |
| `cached`                               | `true` if this result came from the cache (free)                      |
| `error`                                | Why no result was returned, if applicable (`email` is then empty)     |

Profile fields that Tomba doesn't know are returned empty. The dataset has three ready-made views: **Overview**, **Detailed View** and **Source Analysis**.

## Pricing

**One credit costs $0.00312.** A plain profile lookup is 1 credit ($3.12 per 1,000). No subscription and no Tomba account needed.

Tomba's credit rules:

- **1 credit per profile**, or **6 credits ($0.01872) when phone data comes back**
- With `full` on: **1 credit per returned address, plus 5 credits per phone number**

| Lookup                                                   | Credits              | Cost     |
| -------------------------------------------------------- | -------------------- | -------- |
| Profile with an email                                    | 1                    | $0.00312 |
| `enrichMobile` on, phone numbers found                   | 6                    | $0.01872 |
| `enrichMobile` on, no phone number found                 | 1                    | $0.00312 |
| `full` on, 2 addresses, no phone numbers                 | 1 + 1 = 2            | $0.00624 |
| `full` + `enrichMobile` on, 2 addresses, 2 phone numbers | (1 + 2 × 5) + 1 = 12 | $0.03744 |

You are only charged when Tomba returns an answer for the profile:

| What happens                                           | Charged |
| ------------------------------------------------------ | ------- |
| Email and profile found                                | Yes     |
| Profile recognized, but no email could be found for it | Yes     |
| Profile unknown to Tomba (nothing returned)            | No      |
| Invalid URL or any other error                         | No      |
| Temporary failure (it is retried automatically)        | No      |
| Result served from the cache                           | No      |

Every row shows `chargedCredits`, `charged` and `cached`, so you always know what you paid for. To cap your spend, set **Maximum cost per run** in the run options: the Actor stops cleanly when the limit is reached.

## Built for big lists

- **No rate limit**: up to 50 profiles are processed at the same time
- **Automatic retries**: temporary failures are retried for you, and never billed
- **Resumable**: if a run is interrupted, it continues where it stopped without charging you again
- **Cache**: repeat lookups within 24 hours are free
- **Clean input**: extra spaces and duplicate URLs are removed automatically

## Integrations

Run it on a schedule, call it from the Apify API, or connect it to Zapier, Make, Google Sheets, HubSpot, Slack and hundreds of other apps with [Apify integrations](https://docs.apify.com/platform/integrations). Webhooks let you trigger your own workflow as soon as a run finishes.

## FAQ

**Do I need a Tomba account or API key?**
No. Everything is built in. You only pay the per-profile price on Apify.

**How much does it cost?**
$0.00312 per profile with an answer ($3.12 per 1,000). Profiles that come back with phone numbers cost 6 credits ($0.01872). Unknown profiles, errors and cached lookups are free.

**Can I get phone numbers too?**
Yes. Turn on **Find phone numbers** (`enrichMobile`). When Tomba has a number for the person, you get it in `phone_data` (with its type), and `phoneNumbers` tells you how many were found. That profile costs 6 credits instead of 1. If no number is found, you pay the normal 1 credit.

**What does "Return all stored addresses" do?**
Some people have more than one address on record, for example a current and a previous employer. With `full` on, you get up to 2 rows per profile, one per address, and pay 1 credit per address (plus 5 per phone number when phone numbers are on).

**What URL format should I use?**
Use the public profile URL: `https://www.linkedin.com/in/username`. Duplicates and extra spaces are removed for you.

**How many profiles can I look up in one run?**
Up to 1,000 URLs per run, processed in parallel. Use **Maximum Results** to process only the first part of a list. There is no rate limit.

**Does it scrape LinkedIn or need my LinkedIn login?**
No. It never logs in to LinkedIn and never touches your LinkedIn account. Emails come from Tomba's database of publicly available business sources.

**Why didn't I get an email for some profiles?**
Some people have no public business email. If Tomba recognizes the profile but finds no email, you still get the profile details and the row is billed; if the profile is unknown, the row is free.

**What if my run is interrupted?**
It picks up where it stopped. Profiles already processed are not charged again.

**How do I limit what I spend?**
Set **Maximum cost per run** before you start. The Actor stops as soon as the limit is reached.

**Can I use the data for outreach?**
Yes, for legitimate business purposes. Make sure your outreach follows the privacy laws that apply to you, such as GDPR and CAN-SPAM.

## Support

Questions or feedback? We're happy to help:

- **Email**: support@tomba.io
- **Live chat**: on [tomba.io](https://tomba.io) during business hours
- **Issues**: use the **Issues** tab on this Actor's page

## About Tomba

Founded in 2020, [Tomba](https://tomba.io) is a B2B data platform for finding, verifying and enriching business contacts. Our Email Finder, Domain Search and Email Verifier help sales and marketing teams reach the right people.

![Tomba Logo](https://tomba.io/logo.png)
