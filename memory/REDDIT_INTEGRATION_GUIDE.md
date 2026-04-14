# 🚀 Reddit Integration Guide for orchestrAI

## ❓ What You Have vs What You Need

### You Got: Reddit Devvit Command ❌
```bash
npm create devvit@latest Ch5SR2JQWjQwV1NpWEluRkNrVHFIX09TNmhVUGo0cncSCm9yY2hlc3RyYWkaBXJlYWN0
cd orchestrai
npm run dev
```

**What is Devvit?**
- Reddit's platform for building **apps that run ON Reddit**
- Creates interactive widgets, custom post types, bots
- Think: Reddit-native games, polls, mini-apps
- **NOT what you need for orchestrAI**

### You Need: Reddit OAuth API Credentials ✅

For orchestrAI's Marketing EA to **post TO Reddit** from your app, you need:
- Client ID
- Client Secret
- Username & Password (for posting)

---

## 🎯 How to Get Reddit OAuth Credentials

### Step 1: Go to Reddit Apps
https://www.reddit.com/prefs/apps

### Step 2: Create a New Application
Click **"create another app..."** at the bottom

### Step 3: Fill Out Form
```
Name: orchestrAI
App type: ☑ script (for personal use)
         OR
         ☑ web app (if you'll add OAuth later)

Description: AI agent marketing automation for Reddit

About URL: (leave blank or your website)

Redirect URI: 
  - For "script": http://localhost:8000
  - For "web app": https://your-backend-url.com/api/reddit/callback
```

Click **"create app"**

### Step 4: Copy Your Credentials
You'll see:
```
[YOUR APP NAME]
personal use script (or web app)
───────────────────────────────
[CLIENT ID] <-- Copy this (under your app name)
───────────────────────────────
secret: [CLIENT SECRET] <-- Copy this
```

---

## ⚙️ Configure Reddit in orchestrAI

### 1. Open `.env` File
```bash
cd /workspaces/orchestrAI/backend
nano .env  # or use VS Code
```

### 2. Add Reddit Credentials
```bash
# ─────────────────── Reddit ───────────────────
REDDIT_CLIENT_ID=your-client-id-from-step-4
REDDIT_CLIENT_SECRET=your-client-secret-from-step-4
REDDIT_USER_AGENT=orchestrAI:v1.0.0 (by /u/yourusername)
REDDIT_USERNAME=your-reddit-username
REDDIT_PASSWORD=your-reddit-password
```

**Important:**
- `REDDIT_USER_AGENT`: Must follow format `AppName:Version (by /u/YourRedditUsername)`
- `REDDIT_USERNAME`: Your actual Reddit username (without /u/)
- `REDDIT_PASSWORD`: Your Reddit account password

**Security Tip:** Use a dedicated Reddit account for API posting, not your personal account.

### 3. Install Python Reddit API Wrapper (PRAW)
```bash
cd /workspaces/orchestrAI/backend
pip install praw
```

Or add to `requirements.txt`:
```
praw>=7.7.0
```

### 4. Restart Backend
```bash
# If running dev server
Ctrl+C
python server.py
```

---

## 🧪 Test Reddit Integration

### 1. Verify Credentials
```bash
curl http://localhost:8000/api/reddit/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "status": "connected",
  "username": "yourusername",
  "karma": {
    "link": 1234,
    "comment": 5678
  }
}
```

### 2. Test Posting to a Subreddit
```bash
curl -X POST http://localhost:8000/api/reddit/post \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subreddit": "test",
    "title": "Testing orchestrAI Reddit integration",
    "text": "This is a test post from my AI marketing automation system!"
  }'
```

**Expected Response:**
```json
{
  "status": "posted",
  "post_id": "abc123",
  "url": "https://reddit.com/r/test/comments/abc123/testing_orchestrai_reddit_integration/",
  "subreddit": "test"
}
```

**Note:** Always test in /r/test first! Don't spam real subreddits.

---

## 🔐 Connector Permissions (How It Works)

Reddit is a **social connector** in orchestrAI, just like Twitter and Pinterest.

### Default Permissions:
| Agent | Can Post to Reddit? | Can Read Analytics? |
|-------|---------------------|---------------------|
| **Marketing EA** | ✅ YES | ✅ YES |
| **Sales EA** | ❌ NO | ❌ NO |
| **HR EA** | ❌ NO | ❌ NO |
| **Analytics EA** | ❌ NO | 📊 YES (read-only) |
| **Store EAs** | ❌ NO | 📊 YES (read-only) |
| **Other Agents** | ❌ NO | ❌ NO |

### Why Only Marketing EA?
- **Reddit hates obvious marketing** - needs authentic voice
- Marketing EA is trained on Reddit culture:
  - Know each subreddit's rules
  - Engage genuinely, don't spam
  - Provide value, not sales pitches
  - AMAs drive massive traffic when done right
- Prevents 5 agents posting to same subreddit

### What Happens When:

**Marketing EA posts:**
```
User: "Marketing EA, post this product to /r/entrepreneur"
  ↓
Marketing EA crafts authentic, value-first post
  ↓
Permission check: ✅ PASS
  ↓
Post goes live on Reddit
```

**Shopify EA tries to post:**
```
User: "Shopify EA, post to /r/ecommerce"
  ↓
Shopify EA attempts to post
  ↓
Permission check: ❌ DENIED
  ↓
Error: "Only Marketing EA can post to social media"
```

### Override Permissions (Business+ Plan)
If you want Store EAs to post to Reddit:
```bash
curl -X PUT http://localhost:8000/api/connectors/reddit/permissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "marketing_suite": {"access_level": "write", "can_post": true},
    "shopify_ea": {"access_level": "write", "can_post": true}
  }'
```

---

## 📋 API Reference

### POST /api/reddit/post
Submit a post to a subreddit

**Request:**
```json
{
  "subreddit": "test",           // Subreddit name (without /r/)
  "title": "Post title",         // Required, max ~300 chars
  "text": "Post body...",        // For text posts
  "url": "https://...",          // For link posts (mutually exclusive with text)
  "content_id": "optional-id"    // Link to internal content tracking
}
```

**Response (Success):**
```json
{
  "status": "posted",
  "post_id": "abc123",
  "url": "https://reddit.com/r/test/comments/abc123/...",
  "subreddit": "test"
}
```

**Response (Permission Denied):**
```json
{
  "detail": "Agent 'shopify_ea' does not have permission to post to Reddit. Only Marketing EA can post to social media by default."
}
```

**Response (Rate Limited):**
```json
{
  "detail": "Reddit rate limit exceeded. Please wait before posting again."
}
```

**Response (Subreddit Doesn't Exist):**
```json
{
  "detail": "Subreddit /r/fakesub does not exist"
}
```

---

### GET /api/reddit/verify
Verify Reddit credentials are working

**Response (Connected):**
```json
{
  "status": "connected",
  "username": "yourusername",
  "karma": {
    "link": 1234,
    "comment": 5678
  }
}
```

**Response (Not Configured):**
```json
{
  "status": "not_configured"
}
```

---

## 🎯 Reddit Best Practices

### 1. Subreddit Research
```python
# Marketing EA should research target subreddits:
# - Read rules (each sub has unique rules)
# - Check recent top posts (understand what resonates)
# - Engage in comments before posting
# - Build karma before promoting
```

### 2. Timing
- Post when subreddit is most active
- Use tools like https://dashboard.laterforreddit.com/analysis/ to find best times
- Avoid weekends for B2B subreddits
- Avoid weekdays for hobbyist subreddits

### 3. Content Strategy
**❌ DON'T:**
- Spam links to your store
- Post same content to multiple subreddits (crossposting without disclosure)
- Use salesy language
- Ignore comments on your posts

**✅ DO:**
- Provide genuine value (guides, case studies, insights)
- Ask thoughtful questions
- Share failures as well as wins
- Engage authentically in comments
- Disclose if you're promoting your own product

### 4. Karma Building
New accounts need karma to post in most subreddits:
1. Comment genuinely on relevant posts
2. Answer questions in your niche
3. Build reputation before promoting

---

## 🚨 Common Errors & Solutions

### Error: "Reddit rate limit exceeded"
**Cause:** Reddit limits posting frequency (varies by karma/age)
**Solution:** 
- Wait 10-15 minutes between posts
- Build account karma/age
- Don't post to multiple subreddits rapidly

### Error: "Incorrect username or password"
**Cause:** Invalid REDDIT_USERNAME or REDDIT_PASSWORD
**Solution:**
- Double-check credentials in .env
- Try logging into reddit.com with same credentials
- Enable 2FA and use app-specific password if needed

### Error: "SUBREDDIT_NOEXIST"
**Cause:** Subreddit name is wrong or doesn't exist
**Solution:**
- Check spelling (/r/entrepreneur not /r/enterprenuer)
- Visit reddit.com/r/subredditname to verify it exists

### Error: "NOT_WHITELISTED_BY_USER_MESSAGE"
**Cause:** Your account is too new or low karma
**Solution:**
- Build karma by commenting
- Wait for account to age (some subs require 30+ days)

### Error: "RATELIMIT: you are doing that too much"
**Cause:** Reddit's anti-spam protection
**Solution:**
- Slow down posting
- Verify email on Reddit account
- Build karma

---

## 🆚 Devvit vs Reddit API - Quick Comparison

| Feature | **Devvit** | **Reddit OAuth API** |
|---------|-----------|---------------------|
| **Purpose** | Build apps ON Reddit | Post TO Reddit from external apps |
| **Use Cases** | Interactive widgets, bots, games | Marketing automation, content scheduling |
| **Setup** | `npm create devvit@latest` | OAuth app at reddit.com/prefs/apps |
| **Runs** | On Reddit's servers | On your servers |
| **Tech** | TypeScript/JavaScript | Any language (Python/PRAW for us) |
| **For orchestrAI?** | ❌ NO | ✅ YES |

---

## ✅ What's Implemented

**Backend (server.py):**
- ✅ `POST /api/reddit/post` - Submit posts to subreddits
- ✅ `GET /api/reddit/verify` - Verify credentials
- ✅ Permission checks (Marketing EA only by default)
- ✅ Connector tracking in database
- ✅ Activity logging
- ✅ Error handling (rate limits, invalid subs, etc.)

**Environment:**
- ✅ `.env.example` updated with Reddit vars
- ✅ Integration status shows Reddit config

**Permissions:**
- ✅ Reddit follows social connector permission model
- ✅ Marketing EA has write access
- ✅ Analytics/CRM have read access
- ✅ Business+ can customize per-agent

---

## 🚀 Next Steps

1. **Get OAuth credentials** from https://www.reddit.com/prefs/apps
2. **Add to .env** file
3. **Install PRAW**: `pip install praw`
4. **Test with /r/test** subreddit
5. **Define subreddit strategy** for your niche
6. **Build karma** before promoting

---

## 📚 Additional Resources

- **Reddit API Docs:** https://www.reddit.com/dev/api
- **PRAW Documentation:** https://praw.readthedocs.io/
- **Reddit Marketing Guide:** https://www.reddit.com/r/ModSupport/wiki/
- **Best Times to Post:** https://dashboard.laterforreddit.com/analysis/

---

**Note:** The Devvit token you received is for building Reddit-native apps. You don't need it for orchestrAI's Marketing EA to post content. Stick with the OAuth API approach outlined in this guide.
