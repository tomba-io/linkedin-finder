# Tomba LinkedIn Finder Actor

[![Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/actors)
[![Tomba API](https://img.shields.io/badge/Tomba-API-green)](https://tomba.io)
[![Rate Limit](https://img.shields.io/badge/Rate%20Limit-150%2Fmin-orange)](https://tomba.io/api)

A powerful Apify Actor that **converts LinkedIn profile URLs into verified professional email addresses instantly**. Perfect for sales outreach, recruitment, and networking by finding verified email contacts from LinkedIn profiles using the **Tomba LinkedIn Finder API**.

## Key Features

- **Instant LinkedIn to Email**: Convert LinkedIn profile URLs to verified email addresses
- **Professional Contact Discovery**: Find business emails from LinkedIn profiles
- **Bulk Processing**: Process hundreds of LinkedIn URLs efficiently with rate limiting
- **Rate Limited**: Respects Tomba's 150 requests per minute limit
- **Rich Profile Data**: Get name, company, position, and contact information
- **Source Tracking**: Track where emails were found across the web
- **Built-in Error Handling**: Robust processing with comprehensive error reporting

## How it works

The Actor leverages Tomba's powerful LinkedIn Finder API to extract email addresses from LinkedIn profiles:

### Process Flow

1. **Authentication**: Connects to Tomba API using your credentials
2. **Input Processing**: Accepts array of LinkedIn profile URLs
3. **Email Discovery**: Uses Tomba's `linkedinFinder` method for each profile
4. **Data Extraction**: Extracts email, name, company, and position data
5. **Rate Limiting**: Automatically handles 150 requests/minute limit
6. **Data Storage**: Saves detailed contact information to Apify dataset

### What You Get

For each LinkedIn profile, you'll receive:

- **Email Address**: Verified professional email address
- **Personal Info**: First name, last name, full name
- **Professional**: Company, position, website URL
- **Location**: Country information (when available)
- **Confidence Score**: 0-100 score indicating data reliability
- **Source Tracking**: Multiple sources where email was found
- **LinkedIn URL**: Original profile URL for reference

## Quick Start

### Prerequisites

1. **Tomba Account**: Sign up at [Tomba.io](https://app.tomba.io/api) to get your API credentials

### Getting Your API Keys

1. Visit [Tomba API Dashboard](https://app.tomba.io/api)
2. Copy your **API Key** (starts with `ta_`)
3. Copy your **Secret Key** (starts with `ts_`)

## Input Configuration

### Required Parameters

| Parameter        | Type     | Description                     |
| ---------------- | -------- | ------------------------------- |
| `tombaApiKey`    | `string` | Your Tomba API key (ta_xxxx)    |
| `tombaApiSecret` | `string` | Your Tomba secret key (ts_xxxx) |
| `linkedinUrls`   | `array`  | Array of LinkedIn profile URLs  |

### Optional Parameters

| Parameter    | Type     | Default | Description                         |
| ------------ | -------- | ------- | ----------------------------------- |
| `maxResults` | `number` | `50`    | Maximum number of results to return |

### Example Input

```json
{
    "tombaApiKey": "ta_xxxxxxxxxxxxxxxxxxxx",
    "tombaApiSecret": "ts_xxxxxxxxxxxxxxxxxxxx",
    "linkedinUrls": [
        "https://www.linkedin.com/in/mattm",
        "https://www.linkedin.com/in/john-doe",
        "https://www.linkedin.com/in/jane-smith-ceo",
        "https://www.linkedin.com/in/tech-founder"
    ],
    "maxResults": 100
}
```

### Best Practices

- **URL Format**: Use full LinkedIn profile URLs (https://www.linkedin.com/in/username)
- **Rate Limits**: The Actor automatically handles Tomba's 150 requests/minute limit
- **Batch Size**: Process 50-100 LinkedIn URLs at a time for optimal performance
- **Quality URLs**: Use active, public LinkedIn profiles for best results

## Output Data Structure

The Actor returns comprehensive contact information for each LinkedIn profile:

```json
{
    "email": "john.doe@company.com",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "company": "Tech Company Inc",
    "position": "Senior Software Engineer",
    "linkedin_url": "https://www.linkedin.com/in/john-doe",
    "website_url": "company.com",
    "country": "US",
    "score": 95,
    "sources": [
        {
            "uri": "https://company.com/team",
            "website_url": "company.com",
            "extracted_on": "2024-09-17T11:26:56+02:00",
            "last_seen_on": "2025-09-06T04:51:06+02:00",
            "still_on_page": true
        }
    ],
    "source": "tomba_linkedin_finder"
}
```

### Data Fields Explained

- **email**: Professional email address found for the LinkedIn profile
- **first_name/last_name/full_name**: Person's name information
- **company**: Current company or organization
- **position**: Job title or role
- **linkedin_url**: Original LinkedIn profile URL processed
- **website_url**: Company or personal website (when available)
- **country**: Person's country location
- **score**: Confidence level from 0-100 (higher is better)
- **sources**: Array of websites where the email was found
- **source**: Data source identifier (tomba_linkedin_finder)

## Use Cases

### Sales & Outreach

- **Lead Generation**: Find email contacts from LinkedIn prospects
- **Cold Outreach**: Build verified email lists for sales campaigns
- **Account-Based Marketing**: Target specific companies and decision makers

### Recruitment

- **Candidate Sourcing**: Contact potential candidates directly
- **Talent Acquisition**: Build pipelines of qualified professionals
- **Executive Search**: Find contact information for senior roles

### Networking

- **Professional Connections**: Reach out to industry contacts
- **Partnership Building**: Connect with potential business partners
- **Conference Networking**: Follow up with LinkedIn connections

### Research

- **Market Research**: Contact industry experts and thought leaders
- **Competitive Analysis**: Research competitor team members
- **Industry Mapping**: Build comprehensive contact databases

## Data Views

The Actor provides specialized data views:

### Overview View

Quick summary showing email, name, position, company, LinkedIn URL, and confidence score

### Detailed View

Comprehensive view with all available contact and profile information

### Source Analysis View

Focus on source tracking and email discovery across multiple websites

## Resources & Documentation

### API Documentation

- [Tomba API Docs](https://tomba.io/api) - Complete API reference
- [LinkedIn Finder Endpoint](https://docs.tomba.io/api/finder#linkedin-finder) - Specific LinkedIn integration documentation
- [Authentication Guide](https://app.tomba.io/api) - Get your API keys
- [Pricing & Limits](https://tomba.io/pricing) - Understand rate limits and costs

### Rate Limiting

- Tomba limits to **150 requests per minute**
- Actor automatically handles rate limiting with delays
- Large LinkedIn lists may take time to complete

### Cost Considerations

- Each LinkedIn profile = 1 Tomba API request
- Monitor your Tomba usage dashboard
- Consider Tomba's pricing tiers for volume usage

### Best Practices

- **Profile Quality**: Use active, complete LinkedIn profiles
- **Batch Processing**: Group LinkedIn URLs for efficiency
- **Regular Updates**: Re-process profiles periodically for updated information
- **Compliance**: Respect LinkedIn's terms of service and privacy policies

## FAQ

### General Questions

**Q: What does LinkedIn finding do?**
A: LinkedIn finding takes LinkedIn profile URLs and finds associated email addresses, phone numbers, and additional contact information for those professional profiles.

**Q: How does this work with LinkedIn profiles?**
A: The service analyzes LinkedIn profile information and matches it against email databases to find verified contact information associated with those professional profiles.

**Q: What information can I get from LinkedIn profiles?**
A: You can get email addresses, phone numbers, additional social profiles, professional details, and verification status for contacts found through LinkedIn.

### Input & Usage

**Q: What LinkedIn URL formats are supported?**
A: Use standard LinkedIn profile URLs like "https://www.linkedin.com/in/username" or just the username part. Both formats are accepted.

**Q: Can I process multiple LinkedIn profiles at once?**
A: Yes, provide an array of LinkedIn URLs in the `linkedinUrls` parameter. You can process up to 1000 profiles per run.

**Q: What if a LinkedIn profile doesn't have contact information?**
A: Not all LinkedIn profiles have discoverable contact information. The result will show what's available, which may be limited for privacy-conscious professionals.

**Q: Do I need special permissions to use LinkedIn URLs?**
A: You should only use LinkedIn URLs for contacts you have legitimate business reasons to contact, in compliance with privacy laws and LinkedIn's terms of service.

### Technical Questions

**Q: What are the rate limits?**
A: The Actor automatically handles Tomba's rate limits for LinkedIn processing. Large batches are processed with appropriate delays.

**Q: How accurate are the found contact details?**
A: Accuracy varies based on profile completeness and data availability. Professional profiles with more public information typically yield better results.

**Q: Can I find contact info for any LinkedIn profile?**
A: Success depends on data availability and privacy settings. Senior professionals and those in sales/marketing roles often have more discoverable contact information.

**Q: What happens with private or restricted profiles?**
A: Private profiles or those with limited public information may return minimal results. This respects user privacy preferences.

### Data Quality & Privacy

**Q: Where does the contact information come from?**
A: Contact data comes from publicly available sources, professional databases, and information that LinkedIn users have made public or semi-public.

**Q: Is this compliant with LinkedIn's terms of service?**
A: The service uses only publicly available information and doesn't scrape LinkedIn directly. However, always ensure your use case complies with LinkedIn's terms and privacy policies.

**Q: How fresh is the contact information?**
A: Data freshness varies, but results include timestamps when available. Professional information changes over time, so periodic updates are recommended.

**Q: Is this GDPR compliant?**
A: Yes, the service only accesses publicly available information and follows privacy regulations. Ensure you have legitimate interests for contacting found individuals.

### Business Applications

**Q: How can I use this for recruitment?**
A: Find contact information for potential candidates you've identified on LinkedIn, enabling direct outreach for job opportunities.

**Q: Is this useful for sales prospecting?**
A: Yes! Convert LinkedIn research into actionable contact lists for sales outreach, especially for B2B sales and partnership development.

**Q: Can I use this for networking?**
A: Absolutely! Find contact information for professionals you want to connect with for partnerships, collaborations, or industry networking.

**Q: How does this help with lead generation?**
A: Turn LinkedIn research into qualified leads by getting direct contact information for decision-makers and influencers in your target companies.

### Best Practices

**Q: How should I use found contact information?**
A: Always personalize outreach, mention the LinkedIn connection, respect privacy preferences, and provide clear value in your communications.

**Q: Should I verify the found email addresses?**
A: Yes, consider using the Email Verifier actor to validate email addresses before important outreach campaigns.

**Q: How can I improve success rates?**
A: Focus on complete, active LinkedIn profiles. Profiles with more public information, company details, and professional history typically yield better results.

**Q: What's the best way to handle large LinkedIn lists?**
A: Process profiles in batches of 50-100, monitor your API usage, and consider the quality vs. quantity trade-off for your specific use case.

## Keywords

LinkedIn finder, LinkedIn profiles, professional networking, social media discovery, profile finder, LinkedIn search, professional contacts, social enrichment, contact discovery, professional intelligence, career profiles

## Support

If you need any help, have questions, or encounter any issues while using Tomba.io, please don't hesitate to reach out to our support team. You can contact us via:

- **Email**: support@tomba.io
- **Live chat**: Available on the Tomba.io website during business hours

## Contributing

We welcome contributions to improve this actor. Please feel free to submit issues, feature requests, or pull requests to help make this tool even better for the community.

## About Tomba

Founded in 2020, Tomba prides itself on being the most reliable, accurate, and in-depth source of email address data available anywhere. We process terabytes of data to produce our Email finder API.

![Tomba Logo](https://tomba.io/logo.png)
