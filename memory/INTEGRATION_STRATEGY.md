# orchestrAI Integration Strategy

## 🎯 IMPLEMENTED: Phase 1 - Centralized Social Connector Permissions

**Status:** ✅ LIVE in backend/server.py

### Architecture Decision
Social media platforms (Twitter, Instagram, Pinterest, TikTok, LinkedIn, YouTube) are **CONNECTORS** — output channels that agents use to post content, NOT standalone agents.

**Permission Model:** Centralized with smart defaults
- **Marketing EA ONLY** can post to most social platforms
- **Sales EA + HR EA** can post to LinkedIn (professional networking/recruiting)
- **All other agents** get READ-ONLY access for analytics

---

## Agent-to-Integration Mapping

### 🏪 **Store EAs** (Category: commerce)
Each Store EA manages one specific marketplace platform:
- **Shopify EA** → Shopify Partner OAuth
- **Etsy EA** → Etsy OAuth v3
- **eBay EA** → eBay OAuth
- **Walmart EA** → Walmart Seller API
- **Faire EA** → Faire Wholesale API
- **Mercari EA** → Browser automation (no public API)
- **Poshmark EA** → Browser automation (no public API)

**Unlocked by plan:**
- Free: 0 (must upgrade)
- Starter: 1 store platform
- Growth: 3 store platforms
- Business: All 7 stores
- Enterprise: All 7 stores + custom

---

### 📣 **Marketing EA** (Category: employee)
Orchestrates all social media + ad campaigns:

**Social Platforms (OAuth):**
- Twitter/X → Twitter API v2 OAuth
- Pinterest → Pinterest OAuth
- TikTok → TikTok for Business OAuth
- Instagram/Facebook → Meta Graph API OAuth
- LinkedIn → LinkedIn Marketing API OAuth
- YouTube → YouTube Data API OAuth

**Ad Platforms:**
- Google Ads API
- Facebook Ads Manager API
- TikTok Ads Manager API

**Email Marketing:**
- Mailchimp OAuth
- Klaviyo API
- SendGrid API

**Unlocked by plan:**
- Free: 0 social connectors
- Starter: 2 social connectors
- Growth: All social + 1 ad platform
- Business/Enterprise: Everything

---

### 📊 **Analytics EA** (Category: intelligence)
Cross-platform data intelligence:

**Analytics Platforms:**
- Google Analytics 4 → Google OAuth
- Meta Pixel → Meta OAuth
- TikTok Pixel → TikTok OAuth
- Store analytics come from connected stores

**Unlocked by plan:**
- Free: Basic (from connected stores only)
- Starter+: Google Analytics
- Growth+: All analytics platforms

---

### 📧 **Email EA** (Category: employee)
Professional communication:

**Email Providers:**
- Gmail → Google Workspace OAuth
- Outlook → Microsoft 365 OAuth

**Email Marketing (shared with Marketing EA):**
- Mailchimp
- Klaviyo
- SendGrid
- Mailjet

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: 1 email provider
- Business+: All providers

---

### 🤝 **CRM EA** (Category: employee)
Customer relationship management:

**CRM Platforms:**
- HubSpot → HubSpot OAuth
- Salesforce → Salesforce OAuth
- Pipedrive → Pipedrive OAuth
- Close.com → Close API
- Airtable → Airtable OAuth (as lightweight CRM)

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: 1 CRM
- Business+: All CRMs

---

### 💰 **Finance EA** (Category: employee)
Financial tracking and accounting:

**Payment Processors:**
- Stripe → Stripe API
- PayPal → PayPal OAuth
- Square → Square OAuth

**Accounting:**
- QuickBooks → QuickBooks OAuth
- Xero → Xero OAuth
- Wave → Wave API (free tier exists)

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: Stripe only
- Business+: All platforms

---

### 💼 **Sales EA** (Category: employee)
Deal closing and pipeline:

**Sales Tools:**
- HubSpot (shared with CRM)
- Salesforce (shared with CRM)
- Calendly → Calendly OAuth (meeting booking)
- DocuSign → DocuSign OAuth (contracts)
- LinkedIn Sales Navigator → LinkedIn OAuth
- Zoom → Zoom OAuth (for meeting scheduling)

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: Calendly only
- Business+: All tools

---

### ⚙️ **Operations EA** (Category: employee)
Project management and workflows:

**PM Tools:**
- Slack → Slack OAuth
- Asana → Asana OAuth
- Trello → Trello OAuth
- Monday.com → Monday OAuth
- Notion → Notion OAuth
- ClickUp → ClickUp OAuth

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: Slack only
- Business+: All tools

---

### 👥 **HR EA** (Category: employee)
People operations:

**HR Platforms:**
- BambooHR → BambooHR API
- Gusto → Gusto OAuth
- Rippling → Rippling API
- Google Workspace (email/calendar)
- Slack (team comm)

**Unlocked by plan:**
- Free: Not included
- Starter: Not included
- Growth: Not included
- Business+: All platforms

---

### ⚖️ **Legal EA** (Category: employee)
Contracts and compliance:

**Document Signing:**
- DocuSign (shared with Sales)
- HelloSign → HelloSign OAuth
- PandaDoc → PandaDoc OAuth

**Legal Services:**
- Clio → Clio OAuth (legal practice management)
- LegalZoom (no API - manual integration)

**Unlocked by plan:**
- Free: Not included
- Starter: Not included  
- Growth: Not included
- Business+: All platforms

---

## Pricing Tier Summary

| Plan | Store EAs | Employee EAs | Social Connectors | Total Agents |
|------|-----------|--------------|-------------------|--------------|
| **Free** | 0 | 1 (General) | 0 | 1 |
| **Starter** ($29/mo) | 1 | 2 (Marketing, Analytics) | 2 | 3 |
| **Growth** ($79/mo) | 3 | 5 (Marketing, Analytics, Email, CRM, Finance) | 6 | 8 |
| **Business** ($199/mo) | 7 | All 9 | Unlimited | 16 |
| **Enterprise** ($499/mo) | Unlimited | Unlimited + Custom | Unlimited | Unlimited |

---

## Implementation Priority

### Phase 1 (Now):
- ✅ Shopify OAuth
- ✅ eBay OAuth  
- ✅ Twitter/X integration
- ✅ Pinterest integration
- ⚠️ Tier-based agent seeding

### Phase 2 (Next):
- Etsy OAuth completion
- TikTok OAuth
- Meta (Facebook/Instagram) OAuth
- Stripe API
- Google Workspace OAuth
- Microsoft 365 OAuth

### Phase 3 (Later):
- HubSpot OAuth
- Mailchimp OAuth
- Slack OAuth
- QuickBooks OAuth
- Calendly OAuth

### Phase 4 (Future):
- Salesforce
- LinkedIn
- Asana
- Notion
- All remaining integrations
