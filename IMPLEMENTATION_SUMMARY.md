# 🎯 Implementation Complete: Tier-Based Agent System + Social Connector Permissions

## ✅ What's Been Implemented

### 1. **Tier-Based Agent Seeding** ✅ DONE
Users now only get agents they've paid for. No more giving away all 16 agents for free.

**Plan Breakdown:**
| Plan | Price | Agents Included | Store Platforms |
|------|-------|----------------|-----------------|
| **Free** | $0 | 1 (General Assistant) | 0 stores |
| **Starter**  | $29/mo | 3 (General, Marketing, Analytics) | 1 store |
| **Growth** | $79/mo | 6 (adds Email, CRM, Finance) | 3 stores |
| **Business** | $199/mo | All 10 (adds Sales, Ops, HR, Legal) | All 7 stores |
| **Enterprise** | $499/mo | Unlimited + Custom | Unlimited |

### 2. **Dynamic Store Agent Creation** ✅ DONE
Store agents are created automatically when a user connects a store via OAuth:
- ✅ Shopify OAuth callback now creates Shopify EA
- ✅ Plan limits enforced (user can't connect more stores than their plan allows)
- ✅ Error pages show upgrade prompts when limits hit

### 3. **Social Connector Permissions System** ✅ NEW!
Social media platforms are **CONNECTORS** (output channels), not standalone agents.

**Permission Model: Centralized (Phase 1)**
- ✅ **Marketing EA ONLY** can post to social media by default
- ✅ **Sales EA + HR EA** can post to LinkedIn (professional networking)
- ✅ **Analytics EA, CRM EA, Store EAs** get READ-ONLY access for analytics
- ✅ **Business+ plans** can customize permissions per agent

**Implementation:**
- `DEFAULT_CONNECTOR_PERMISSIONS` dict defines who can post where
- `check_agent_can_post()` enforces permissions before posting
- Twitter and Pinterest endpoints now check permissions
- Connector database tracks which platforms user has connected

### 4. **New API Endpoints** ✅ DONE
**Plan Management:**
- `GET /api/plan/limits` - Shows user's current plan limits and usage
- `POST /api/plan/upgrade` - Upgrades user plan and provisions new agents
- `GET /api/pricing` - Updated with max_social_connectors

**Connector Management:**
- `GET /api/connectors` - List all connected social/business platforms
- `GET /api/connectors/{platform}/permissions` - Get agent permissions for a platform
- `PUT /api/connectors/{platform}/permissions` - Update permissions (Business+ only)

### 5. **Environment Variables Template** ✅ DONE
Created `/workspaces/orchestrAI/backend/.env.example` with all required integrations.

### 6. **Integration Strategy Document** ✅ UPDATED
Created `/workspaces/orchestrAI/memory/INTEGRATION_STRATEGY.md` mapping which integrations make sense for each agent.

### 7. **Permission Strategy Document** ✅ NEW!
Created `/workspaces/orchestrAI/memory/SOCIAL_CONNECTOR_PERMISSIONS.md` with full brainstorming and architecture decisions.

---

## 🔑 What YOU Need to Configure

### Required Environment Variables

Copy `/workspaces/orchestrAI/backend/.env.example` to `/workspaces/orchestrAI/backend/.env` and fill in:

#### **Core (Required)**
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=orchestrai
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
EMERGENT_LLM_KEY=your-emergent-ai-api-key
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=SecurePassword123!
```

#### **E-Commerce Integrations (Get OAuth in order of priority)**

**1. Shopify** (WORKING - OAuth implemented)
```bash
SHOPIFY_PARTNER_CLIENT_ID=your-shopify-client-id
SHOPIFY_PARTNER_CLIENT_SECRET=your-shopify-client-secret
SHOPIFY_CLI_TOKEN=your-shopify-cli-token  # Optional
```
📌 **Get from:** https://partners.shopify.com/organizations

**2. Etsy** (OAuth partially implemented)
```bash
ETSY_API_KEY=your-etsy-api-key-v3
```
📌 **Get from:** https://www.etsy.com/developers/register

**3. eBay** (OAuth implemented)
```bash
EBAY_CLIENT_ID=your-ebay-client-id
EBAY_CLIENT_SECRET=your-ebay-client-secret
EBAY_RUNAME=your-ebay-runame
```
📌 **Get from:** https://developer.ebay.com/my/keys

**4-7. Others** (Browser-based - no keys needed yet)
- Walmart, Faire, Mercari, Poshmark use browser automation

#### **Social Media Connectors**

**Twitter/X** (Working - direct integration)
```bash
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
TWITTER_BEARER_TOKEN=your-bearer-token
```
📌 **Get from:** https://developer.twitter.com/en/portal/dashboard

**Pinterest** (Working - direct integration)
```bash
PINTEREST_ACCESS_TOKEN=your-pinterest-access-token
PINTEREST_APP_ID=your-pinterest-app-id
```
📌 **Get from:** https://developers.pinterest.com/apps/

**TikTok** (Needs OAuth implementation)
```bash
TIKTOK_CLIENT_KEY=your-tiktok-client-key
```
📌 **Get from:** https://developers.tiktok.com/apps/

**Meta (Facebook/Instagram)** (Needs OAuth implementation)
```bash
META_APP_ID=your-meta-app-id
```
📌 **Get from:** https://developers.facebook.com/apps/

#### **Business Tools** (Phase 2 - Optional for now)
```bash
# Google Workspace
GOOGLE_CLIENT_ID=your-google-client-id

# Microsoft 365
MICROSOFT_CLIENT_ID=your-microsoft-client-id

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-key

# HubSpot
HUBSPOT_API_KEY=your-hubspot-key

# Slack
SLACK_CLIENT_ID=your-slack-client-id

# Notion
NOTION_INTEGRATION_SECRET=your-notion-secret

# Mailjet
MAILJET_API_KEY=your-mailjet-key
```

---

## 🚀 What's Ready to Use RIGHT NOW

### ✅ Fully Working:
1. **Tier-based agent system** - Users get agents based on their plan
2. **Shopify OAuth** - Complete flow from auth → agent creation
3. **eBay OAuth** - Complete flow
4. **Twitter posting** - Works with direct tokens
5. **Pinterest posting** - Works with access token
6. **Plan upgrade system** - API ready
7. **Plan limits enforcement** - Blocks users who hit limits

### ⚠️ Needs OAuth Implementation:
1. **Etsy callback** - Auth start exists, needs callback completion
2. **TikTok** - Needs full OAuth flow
3. **Meta (FB/IG)** - Needs full OAuth flow
4. **LinkedIn** - Not yet implemented
5. **YouTube** - Not yet implemented

### 🔮 Future (Phase 3):
All business tools (Google, Microsoft, Stripe, HubSpot, etc.)

---

## 📝 Next Steps for YOU

### Immediate (To Make It Work):
1. **Copy `.env.example` to `.env`**
   ```bash
   cp /workspaces/orchestrAI/backend/.env.example /workspaces/orchestrAI/backend/.env
   ```

2. **Fill in Core Variables:**
   - `MONGO_URL` (your MongoDB connection)
   - `JWT_SECRET` (generate a random 32+ char string)
   - `EMERGENT_LLM_KEY` (your AI API key)
   - `ADMIN_EMAIL` + `ADMIN_PASSWORD`

3. **Get Shopify OAuth Credentials:**
   - Go to https://partners.shopify.com
   - Create/select organization
   - Apps → Create app → Distribution: Public
   - Copy Client ID & Client Secret

4. **Get Twitter API Credentials:**
   - https://developer.twitter.com/en/portal/dashboard
   - Create a project + app
   - Generate keys and tokens
   - Enable OAuth 1.0a

5. **Get Pinterest Credentials:**
   - https://developers.pinterest.com/apps/
   - Create app
   - Generate access token

### Testing the Tier System:
1. Register a new user (gets Free plan)
2. Check `/api/agents` - should see only 1 general agent
3. Try upgrading: `POST /api/plan/upgrade` with `{"plan": "starter"}`
4. Check `/api/agents` again - should see 3 agents (General, Marketing, Analytics)
5. Connect a Shopify store - should auto-create Shopify EA

---

## 🎨 Frontend TODOs (Not Done Yet)

Your React Native frontend needs:
1. **Pricing page** - Show plans and upgrade buttons
2. **OAuth connector buttons** - Launch OAuth flows for each platform
3. **Platform logos** - Add real logo images/SVGs
4. **Plan limits UI** - Show user their usage vs limits
5. **Upgrade prompts** - When hitting limits, show upgrade modal
6. **Connector settings** - UI to view/manage social connector permissions

I can help implement these next if you want!

---

## 🎯 How the Connector Permission System Works

### Default Behavior (Phase 1 - Centralized)

**When a user posts to social media:**
1. System checks which agent is trying to post
2. Looks up agent's permissions for that platform
3. **Marketing EA** → ✅ Can post to all social platforms
4. **Sales/HR EA** → ✅ Can post to LinkedIn only
5. **Store EAs** → ❌ Can only READ analytics, cannot post
6. **Other agents** → ❌ No access

**Example Flow:**
```
User: "Marketing EA, post this product to Instagram"
  ↓
Marketing EA composes post
  ↓
System checks: marketing_suite.can_post on "instagram" = TRUE ✅
  ↓
Post goes live
```

```
User: "Shopify EA, post this product to TikTok"
  ↓
Shopify EA tries to post
  ↓
System checks: shopify_ea.can_post on "tiktok" = FALSE ❌
  ↓
Error: "Shopify EA doesn't have permission to post to TikTok.
        Only Marketing EA can post to social media."
```

### Why This Design?

**Prevents chaos:**
- No 5 agents posting the same thing
- Consistent brand voice (Marketing EA trained for social)
- Single approval workflow

**Maintains flexibility:**
- Analytics EA can still pull engagement metrics
- CRM EA can do social listening
- LinkedIn exceptions for B2B use cases

**Future upgrades:**
- Business plan users can customize permissions
- Can enable Store EAs to post to social if they want
- Can add approval workflows

### Database Schema

**Connectors Collection:**
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  platform: "twitter",  // twitter, instagram, pinterest, tiktok, linkedin
  type: "social",
  status: "connected",
  connected_at: ISODate("2026-04-14"),
  
  // Agent permissions (defaults from DEFAULT_CONNECTOR_PERMISSIONS)
  permissions: {
    "marketing_suite": {
      "access_level": "write",
      "can_post": true,
      "can_delete": true,
      "can_read_analytics": true
    },
    "analytics": {
      "access_level": "read",
      "can_post": false,
      "can_read_analytics": true
    }
    // ... other agents
  }
}
```

---

## 🔐 Security Notes

- Never commit `.env` to git (it's in `.gitignore`)
- Use strong `JWT_SECRET` in production
- Rotate API keys regularly
- Set `ENV=production` when deploying
- Use HTTPS for all OAuth callbacks
- Connector credentials stored encrypted in database

---

## 💡 What Makes This Architecture Great

1. **Pay-per-use** - Users only get what they paid for
2. **Automatic provisioning** - Agents created on-demand when needed
3. **Graceful limits** - Clear errors + upgrade prompts
4. **Scalable** - Easy to add new plans/agents/integrations
5. **OAuth-first** - Secure, no manual API key entry for users
6. **Permission-based** - Fine-grained control over who can post where
7. **Brand safe** - Centralized social posting prevents inconsistency

---

Let me know which integrations you want me to prioritize next! 🚀
