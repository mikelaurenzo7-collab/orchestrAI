# orchestrAI — Complete API Key & Redirect URL Setup Guide

> **IMPORTANT**: Your old keys are tied to a previous app. For each platform below,
> you'll need to update redirect URLs/callback URLs to point to orchestrAI.
> Your actual key values likely stay the same — it's the URLS in each dashboard that need changing.

---

## orchestrAI Callback Base URL
```
https://agent-marketplace-69.preview.emergentagent.com
```
Use this as the base for ALL redirect/callback URLs below.

---

## 1. SHOPIFY (OAuth — Store Connection)

**Keys you have:**
- `SHOPIFY_PARTNER_CLIENT_ID` ✅ already saved
- `SHOPIFY_PARTNER_CLIENT_SECRET` ✅ already saved

**What to change in Shopify dashboard:**
1. Go to: https://partners.shopify.com → Apps → Select your app → **App setup**
2. Under **URLs**, update:
   - **App URL**: `https://agent-marketplace-69.preview.emergentagent.com`
   - **Allowed redirection URL(s)**: Add this EXACT URL:
     ```
     https://agent-marketplace-69.preview.emergentagent.com/api/shopify/callback
     ```
   - Remove any old redirect URLs pointing to your previous app
3. Under **API access scopes**, ensure these are enabled:
   - `read_products`, `write_products`, `read_orders`, `read_inventory`, `write_inventory`, `read_customers`
4. Click **Save**

**If creating a NEW Shopify app instead:**
1. Go to: https://partners.shopify.com → Apps → Create app → Create app manually
2. App name: `orchestrAI`
3. App URL: `https://agent-marketplace-69.preview.emergentagent.com`
4. Redirect URL: `https://agent-marketplace-69.preview.emergentagent.com/api/shopify/callback`
5. Copy the new Client ID and Client Secret → paste to me

---

## 2. ETSY (OAuth — Store Connection)

**Keys you have:**
- `ETSY_API_KEY` ✅ already saved
- `ETSY_SHARED_SECRET` ✅ already saved

**What to change in Etsy dashboard:**
1. Go to: https://www.etsy.com/developers/your-apps → Select your app
2. Under **Callback URLs**, update to:
   ```
   https://agent-marketplace-69.preview.emergentagent.com/api/etsy/callback
   ```
3. Remove any old callback URLs
4. Ensure these **scopes** are enabled: `transactions_r`, `listings_r`, `listings_w`, `shops_r`
5. Click **Save**

**If creating a NEW Etsy app:**
1. Go to: https://www.etsy.com/developers/register
2. App name: `orchestrAI`
3. Callback URL: `https://agent-marketplace-69.preview.emergentagent.com/api/etsy/callback`
4. Copy API Key and Shared Secret → paste to me

---

## 3. TWITTER / X (Social Media Posting)

**Keys you need to paste (7 total):**
```
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx
```

**What to change in Twitter/X dashboard:**
1. Go to: https://developer.x.com/en/portal/dashboard
2. Select your project/app → **Settings**
3. Under **User authentication settings** → Edit:
   - **Callback URI / Redirect URL**: 
     ```
     https://agent-marketplace-69.preview.emergentagent.com/api/twitter/callback
     ```
   - **Website URL**: `https://agent-marketplace-69.preview.emergentagent.com`
4. Under **App permissions**: Ensure **Read and Write** is enabled (not just Read)
5. If using OAuth 2.0, enable it and set the redirect URL above
6. Click **Save**

**Note**: The `TWITTER_ACCESS_TOKEN` and `TWITTER_ACCESS_TOKEN_SECRET` are specific to YOUR account (the account that will post). These don't change — they're tied to your Twitter account, not the app URL.

**The `TWITTER_BEARER_TOKEN` is app-level** — it stays the same regardless of redirect URLs.

---

## 4. META / FACEBOOK / INSTAGRAM (Social Media + Ads)

**Keys you need to paste (8 total):**
```
META_CLIENT_ID=xxx
META_CLIENT_SECRET=xxx
META_APP_ID=xxx
META_APP_SECRET=xxx
META_BUSINESS_ID=xxx
META_GRAPH_API_BASE=xxx
META_OAUTH_AUTH_URL=xxx
META_OAUTH_TOKEN_URL=xxx
BEASTBOTS_PAGE_ID=xxx
```

**What to change in Meta dashboard:**
1. Go to: https://developers.facebook.com → Select your app
2. Go to **Settings** → **Basic**:
   - **App Domains**: Add `agent-marketplace-69.preview.emergentagent.com`
   - **Privacy Policy URL**: You'll need one eventually for App Store (can use a placeholder for now)
   - **Site URL**: `https://agent-marketplace-69.preview.emergentagent.com`
3. Go to **Facebook Login** → **Settings**:
   - **Valid OAuth Redirect URIs**: Add:
     ```
     https://agent-marketplace-69.preview.emergentagent.com/api/meta/callback
     ```
   - Remove old redirect URIs from your previous app
4. Go to **Instagram Basic Display** (if used):
   - Update redirect URI to: `https://agent-marketplace-69.preview.emergentagent.com/api/instagram/callback`
5. Ensure these **permissions** are granted:
   - `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`, `instagram_content_publish`, `business_management`
6. Click **Save Changes**

**Note on META_GRAPH_API_BASE**: This is likely `https://graph.facebook.com/v18.0` or similar. It doesn't change — it's Meta's API URL, not yours.

**Note on META_OAUTH_AUTH_URL / META_OAUTH_TOKEN_URL**: These are Meta's OAuth endpoints:
- Auth: `https://www.facebook.com/v18.0/dialog/oauth`
- Token: `https://graph.facebook.com/v18.0/oauth/access_token`
These don't change.

**Note on BEASTBOTS_PAGE_ID**: This is your Facebook Page ID. If you're using the same page, it stays the same. If you want to use a different page for orchestrAI, get the new page ID from: Facebook Page → About → Page ID.

---

## 5. PINTEREST (Social Media Posting)

**Keys you need to paste (2 total):**
```
PINTEREST_APP_ID=xxx
PINTEREST_ACCESS_TOKEN=xxx
```

**What to change in Pinterest dashboard:**
1. Go to: https://developers.pinterest.com/manage/ → Select your app
2. Under **Redirect URIs**, add:
   ```
   https://agent-marketplace-69.preview.emergentagent.com/api/pinterest/callback
   ```
3. Remove old redirect URIs
4. Click **Save**

**Note**: `PINTEREST_ACCESS_TOKEN` may be a long-lived token tied to your account. If it was generated for your old app, it should still work — Pinterest tokens aren't URL-dependent.

---

## 6. TIKTOK (Social Media Posting)

**Keys you need to paste (3 total):**
```
TIKTOK_CLIENT_KEY=xxx
TIKTOK_CLIENT_SECRET=xxx
TIKTOK_APP_ID=xxx
```

**What to change in TikTok dashboard:**
1. Go to: https://developers.tiktok.com → **Manage apps** → Select your app
2. Under **Platform settings** → **Web**:
   - **Redirect URI**: 
     ```
     https://agent-marketplace-69.preview.emergentagent.com/api/tiktok/callback
     ```
   - **Redirect domain**: `agent-marketplace-69.preview.emergentagent.com`
3. Under **Scopes**, ensure: `user.info.basic`, `video.publish`, `video.list`
4. Remove old redirect URIs
5. Click **Save**

---

## 7. OTHER KEYS

**VITE_FRONTEND_FORGE_API_URL & VITE_APP_ID**:
- These appear to be from your previous app's frontend. Let me know what service they connect to and I'll determine if we need them for orchestrAI.

---

## SUMMARY CHECKLIST

| Platform | Keys Saved | Redirect URL Updated | Status |
|----------|-----------|---------------------|--------|
| Shopify | ✅ | ❌ Do tomorrow | OAuth ready |
| Etsy | ✅ | ❌ Do tomorrow | OAuth ready |
| Twitter/X | ❌ Paste tomorrow | ❌ Do tomorrow | Not yet |
| Meta/FB/IG | ❌ Paste tomorrow | ❌ Do tomorrow | Not yet |
| Pinterest | ❌ Paste tomorrow | ❌ Do tomorrow | Not yet |
| TikTok | ❌ Paste tomorrow | ❌ Do tomorrow | Not yet |

**For each platform, the process is:**
1. Paste your key values to me (I save them in .env)
2. You go to the platform's developer dashboard
3. Update the redirect/callback URL to the orchestrAI URL shown above
4. I wire up the integration endpoint
5. Test it

---

## QUICK REFERENCE — All Callback URLs

Copy-paste these when updating each dashboard:

```
Shopify:   https://agent-marketplace-69.preview.emergentagent.com/api/shopify/callback
Etsy:      https://agent-marketplace-69.preview.emergentagent.com/api/etsy/callback
Twitter:   https://agent-marketplace-69.preview.emergentagent.com/api/twitter/callback
Meta/FB:   https://agent-marketplace-69.preview.emergentagent.com/api/meta/callback
Instagram: https://agent-marketplace-69.preview.emergentagent.com/api/instagram/callback
Pinterest: https://agent-marketplace-69.preview.emergentagent.com/api/pinterest/callback
TikTok:    https://agent-marketplace-69.preview.emergentagent.com/api/tiktok/callback
```
