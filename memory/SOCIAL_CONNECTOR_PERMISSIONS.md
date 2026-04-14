# 🎯 Social Media Connector Permissions Strategy

## The Question
**Which agents should have access to post to social media connectors?**
- Marketing EA only (centralized control)?
- Multiple agents (distributed access)?
- User-configurable (full flexibility)?

---

## 🏗️ Architectural Options

### **Option 1: Centralized (Marketing EA Only)** ⭐ RECOMMENDED

**How it works:**
- Marketing EA is the ONLY agent that can post to social media
- All other agents can REQUEST the Marketing EA to post
- Marketing EA maintains brand voice, timing, cross-platform strategy

**Flow Example:**
1. Shopify EA detects new product launch
2. Shopify EA sends request to Marketing EA: "Post this product to Instagram & Pinterest"
3. Marketing EA crafts platform-specific content
4. Marketing EA posts with consistent branding

**Pros:**
✅ Single source of truth for brand voice
✅ No conflicting posts from different agents
✅ Easier to maintain consistent messaging
✅ Simpler permission model
✅ Better for audit trail (one place to check all social posts)
✅ Marketing EA can coordinate timing (e.g., don't post 5 things in 10 minutes)

**Cons:**
❌ Potential bottleneck if Marketing EA is slow
❌ Less autonomy for other agents
❌ Store EAs can't react to flash sales immediately

**Best for:**
- Small teams (1-10 people)
- B2C brands with strong brand identity
- Users who want consistency > speed

---

### **Option 2: Distributed (Smart Defaults)**

**How it works:**
- Each agent has DEFAULT permissions for specific social platforms
- User can override defaults

**Default Permissions:**
| Agent | Twitter | Instagram | Pinterest | TikTok | LinkedIn | YouTube |
|-------|---------|-----------|-----------|--------|----------|---------|
| **Marketing EA** | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ✅ Write |
| **Store EAs** (Shopify, Etsy, etc.) | ✅ Write | ✅ Write | ✅ Write | ✅ Write | ❌ Read | ❌ Read |
| **Analytics EA** | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read |
| **Sales EA** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Write | ❌ None |
| **CRM EA** | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read |
| **Email EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Finance EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **Operations EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |
| **HR EA** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Write | ❌ None |
| **Legal EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |

**Permission Levels:**
- ✅ **Write** - Can post, edit, delete
- 📊 **Read** - Can analyze engagement, read comments
- ❌ **None** - No access

**Pros:**
✅ More autonomy for specialized agents
✅ Store EAs can react quickly to sales/inventory
✅ Sales EA can network on LinkedIn independently
✅ Still maintains some guardrails with defaults

**Cons:**
❌ Risk of brand voice inconsistency
❌ Potential for spam (5 agents posting at same time)
❌ Harder to audit (check multiple agents)
❌ More complex UX for users to understand

**Best for:**
- Larger teams (10+ people)
- Multi-brand businesses
- Users who want speed > consistency

---

### **Option 3: Fully User-Configurable**

**How it works:**
- Every agent has a permission matrix for every connector
- User sets permissions via UI
- No defaults (or very minimal)

**UI Example:**
```
┌─────────────────────────────────────────────┐
│ Social Media Permissions                    │
├─────────────────────────────────────────────┤
│ Agent: Shopify EA                           │
│                                             │
│ ☑ Twitter      [Write] [Read] [None]       │
│ ☑ Instagram    [Write] [Read] [None]       │
│ ☐ Pinterest    [Write] [Read] [None]       │
│ ☑ TikTok       [Write] [Read] [None]       │
│ ☐ LinkedIn     [Write] [Read] [None]       │
│ ☐ YouTube      [Write] [Read] [None]       │
│                                             │
│         [Save Permissions]                  │
└─────────────────────────────────────────────┘
```

**Pros:**
✅ Maximum flexibility
✅ Works for any business model
✅ Power users love fine-grained control

**Cons:**
❌ Overwhelming for new users
❌ Decision fatigue (which agent should post where?)
❌ Easy to misconfigure
❌ Requires education/documentation

**Best for:**
- Power users
- Agencies managing multiple brands
- Complex workflows

---

## 🎯 HYBRID RECOMMENDATION (Best of All Worlds)

### **Tiered Permissions by Plan**

**Free Plan:**
- No social connectors
- Marketing EA doesn't exist

**Starter Plan ($29/mo):**
- 2 social connectors unlocked
- **ONLY Marketing EA** can post (centralized)
- Other agents can READ for analytics

**Growth Plan ($79/mo):**
- All social connectors unlocked
- **Marketing EA + Store EAs** can post
- Store EAs have default permissions (can override)
- Approval workflow available

**Business Plan ($199/mo):**
- All connectors
- **Fully configurable** per-agent permissions
- Approval workflows
- Post scheduling
- Brand voice templates

**Enterprise Plan ($499/mo):**
- Everything from Business
- Custom agent creation with custom permissions
- Multi-brand support
- Advanced workflows (e.g., "Marketing EA must approve all posts")

---

## 🔐 Permission Model (Database Schema)

### Connector Document
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  platform: "twitter",  // twitter, instagram, pinterest, tiktok, linkedin, youtube
  type: "social",       // social, store, business_tool
  status: "connected",
  credentials: {
    access_token: "encrypted...",
    refresh_token: "encrypted...",
    expires_at: ISODate("2026-05-14")
  },
  
  // NEW: Agent permissions
  permissions: {
    "marketing_suite": {
      access_level: "write",  // write, read, none
      can_post: true,
      can_delete: true,
      can_read_analytics: true,
      requires_approval: false
    },
    "shopify_ea": {
      access_level: "write",
      can_post: true,
      can_delete: false,
      can_read_analytics: true,
      requires_approval: false
    },
    "analytics": {
      access_level: "read",
      can_post: false,
      can_delete: false,
      can_read_analytics: true,
      requires_approval: false
    }
    // ... other agents
  },
  
  // Default permissions for new agents
  default_permission: {
    access_level: "none",
    can_post: false,
    can_delete: false,
    can_read_analytics: false,
    requires_approval: true
  },
  
  connected_at: ISODate("2026-04-14"),
  last_post_at: ISODate("2026-04-14T10:30:00Z")
}
```

---

## 🎨 UX Flow

### 1. Connect Social Platform (Initial Setup)
```
User clicks "Connect Instagram"
  ↓
OAuth flow completes
  ↓
System asks: "Which agents should access Instagram?"
  ↓
Shows smart defaults based on plan:
  - Starter: ☑ Marketing EA only
  - Growth: ☑ Marketing EA, ☑ Store EAs (if any connected)
  - Business: Show full permission matrix
  ↓
User confirms or customizes
  ↓
Connector saved with permissions
```

### 2. Agent Posting Flow (With Permissions)
```
Shopify EA wants to post new product to Instagram
  ↓
Checks connector permissions
  ↓
IF shopify_ea.can_post = true:
  → Compose post → Schedule/Send
  ↓
ELSE IF shopify_ea.access_level = "none":
  → Send request to Marketing EA
  → Marketing EA reviews & posts
  ↓
ELSE:
  → Show user error: "Shopify EA doesn't have Instagram access"
```

### 3. Approval Workflow (Business+ Plan)
```
Store EA composes Instagram post
  ↓
IF requires_approval = true:
  → Send to approval queue
  → Notify user (push notification)
  → User reviews in app
  → User approves/edits/rejects
  ↓
ELSE:
  → Post immediately
```

---

## 📊 Analytics & Monitoring

### Agent Activity Log
Track which agent posted what:
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  agent_id: ObjectId("..."),
  agent_type: "shopify_ea",
  connector: "instagram",
  action: "post_created",
  content: {
    text: "New product launch! 🚀",
    media_urls: ["https://..."],
    scheduled_for: ISODate("2026-04-15T14:00:00Z")
  },
  status: "posted",  // draft, pending_approval, approved, posted, failed
  engagement: {
    likes: 147,
    comments: 23,
    shares: 8
  },
  created_at: ISODate("2026-04-14T10:30:00Z"),
  posted_at: ISODate("2026-04-14T10:31:00Z")
}
```

---

## 🚀 Implementation Phases

### **Phase 1: MVP (Centralized)** ⭐ START HERE
- Marketing EA ONLY can post to social
- Store EAs can READ for analytics
- Simple permission model
- Fast to implement, easy to understand

**Code needed:**
1. Add `connector_permissions` field to agent schema
2. Create `/api/connectors` endpoint (list connected platforms)
3. Create `/api/connectors/:platform/permissions` endpoint
4. Update Marketing EA to check permissions before posting
5. Frontend: Simple toggle UI in settings

### **Phase 2: Smart Defaults (Growth Users)**
- Store EAs gain write access to social
- Default permission matrix based on agent type
- User can override defaults

**Code needed:**
1. Expand permission model to include all agents
2. Create DEFAULT_PERMISSIONS dict in backend
3. Add permission override UI
4. Update all agents to check permissions

### **Phase 3: Full Configurability (Business Users)**
- Per-agent, per-platform permission matrix
- Approval workflows
- Post scheduling
- Brand voice templates

**Code needed:**
1. Full permission matrix UI
2. Approval queue system
3. Scheduled posts system
4. Template management

---

## ✅ FINAL RECOMMENDATION

**Start with Phase 1 (Centralized + Read-only)**

**Default Permissions:**
```python
DEFAULT_CONNECTOR_PERMISSIONS = {
    "social": {  # Twitter, Instagram, Pinterest, TikTok, LinkedIn, YouTube
        "marketing_suite": {
            "access_level": "write",
            "can_post": True,
            "can_delete": True,
            "can_read_analytics": True
        },
        "analytics": {
            "access_level": "read",
            "can_post": False,
            "can_delete": False,
            "can_read_analytics": True
        },
        "crm": {
            "access_level": "read",  # For social listening
            "can_post": False,
            "can_delete": False,
            "can_read_analytics": True
        },
        # All Store EAs get read-only
        "shopify_ea": {"access_level": "read", "can_post": False},
        "etsy_ea": {"access_level": "read", "can_post": False},
        # All other agents: none
        "default": {"access_level": "none", "can_post": False}
    }
}
```

**Why this wins:**
1. ✅ Simple to explain: "Marketing EA posts to social, other agents can analyze"
2. ✅ Prevents chaos/spam
3. ✅ Maintains brand consistency
4. ✅ Easy to implement (1-2 days)
5. ✅ Can evolve to distributed model later based on user feedback
6. ✅ Analytics EA + CRM EA can still provide value (listening, insights)

**Exception:**
- Sales EA gets LinkedIn write access (for professional networking)
- HR EA gets LinkedIn write access (for recruiting posts)

---

## 🎬 Next Steps

1. **Decide:** Green-light Phase 1?
2. **Implement:** Add connector permission checks
3. **Test:** Marketing EA posting flow
4. **Document:** User guide for social connectors
5. **Iterate:** Collect feedback, consider Phase 2

---

**Questions to resolve:**
- Should Store EAs be able to REQUEST Marketing EA to post? (Yes - build internal messaging)
- Should users be able to override centralized control? (Not in Phase 1)
- How do we handle urgent posts? (Marketing EA gets priority queue flag)
