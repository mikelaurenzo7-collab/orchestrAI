# 🚀 Social Connector Permissions - Quick Reference

## ✅ IMPLEMENTED (Phase 1 - Centralized Control)

### Default Permissions by Agent Type

| Agent | Twitter | Instagram | Pinterest | TikTok | Facebook | LinkedIn | YouTube |
|-------|---------|-----------|-----------|--------|----------|----------|---------|
| **Marketing EA** | ✅ Post | ✅ Post | ✅ Post | ✅ Post | ✅ Post | ✅ Post | ✅ Post |
| **Sales EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Post | ❌ None |
| **HR EA** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Post | ❌ None |
| **Analytics EA** | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read |
| **CRM EA** | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read |
| **All Store EAs** | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read | 📊 Read |
| **Other Agents** | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None | ❌ None |

Legend:
- ✅ **Post** = Can create, edit, delete posts
- 📊 **Read** = Can view analytics, read comments
- ❌ **None** = No access

---

## 📚 API Endpoints

### List Connected Platforms
```http
GET /api/connectors
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "connector_123",
    "platform": "twitter",
    "type": "social",
    "status": "connected",
    "connected_at": "2026-04-14T10:30:00Z",
    "last_used_at": "2026-04-14T12:00:00Z",
    "permissions": {
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
    }
  }
]
```

---

### Get Permissions for a Platform
```http
GET /api/connectors/twitter/permissions
Authorization: Bearer {token}
```

**Response:**
```json
{
  "platform": "twitter",
  "permissions": {
    "marketing_suite": {
      "access_level": "write",
      "can_post": true,
      "can_delete": true,
      "can_read_analytics": true
    },
    "shopify_ea": {
      "access_level": "read",
      "can_post": false,
      "can_delete": false,
      "can_read_analytics": true
    }
  }
}
```

---

### Update Permissions (Business+ Only)
```http
PUT /api/connectors/instagram/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "marketing_suite": {
    "access_level": "write",
    "can_post": true,
    "can_delete": true,
    "can_read_analytics": true
  },
  "shopify_ea": {
    "access_level": "write",
    "can_post": true,
    "can_delete": false,
    "can_read_analytics": true
  }
}
```

**Response:**
```json
{
  "status": "updated",
  "platform": "instagram"
}
```

**Error (if not Business+):**
```json
{
  "detail": "Permission customization requires Business or Enterprise plan"
}
```

---

## 🔧 Backend Implementation Details

### Permission Check Function
```python
async def check_agent_can_post(user_id: str, agent_type: str, platform: str) -> bool:
    """Check if an agent has permission to post to a connector."""
    # Returns True/False based on permissions
```

### Helper Function
```python
async def create_or_update_connector(
    user_id: str, 
    platform: str, 
    connector_type: str = "social", 
    credentials: dict = None
) -> str:
    """Create or update a connector in the database. Returns connector ID."""
```

### Default Permissions Config
```python
DEFAULT_CONNECTOR_PERMISSIONS = {
    "social": {
        "marketing_suite": {
            "access_level": "write",
            "can_post": True,
            "can_delete": True,
            "can_read_analytics": True,
        },
        "analytics": {
            "access_level": "read",
            "can_post": False,
            "can_delete": False,
            "can_read_analytics": True,
        },
        # ... more agents
    },
    "linkedin": {
        # LinkedIn has special permissions for Sales + HR
    }
}
```

---

## 🎯 Usage Examples

### Marketing EA Posts to Twitter
```python
# User asks Marketing EA to post
# Marketing EA calls: POST /api/twitter/post

# Backend checks:
can_post = await check_agent_can_post(user_id, "marketing_suite", "twitter")
# Returns: True ✅

# Post goes through
```

### Shopify EA Tries to Post to Instagram
```python
# Shopify EA tries to post
# Backend checks:
can_post = await check_agent_can_post(user_id, "shopify_ea", "instagram")
# Returns: False ❌

# Raises HTTPException(403):
# "Agent 'shopify_ea' does not have permission to post to Instagram.
#  Only Marketing EA can post to social media by default."
```

### Analytics EA Reads Twitter Metrics
```python
# Analytics EA wants engagement data
permissions = get_connector_permissions("twitter", "analytics")
# Returns: {"access_level": "read", "can_read_analytics": True}

# Analytics call succeeds ✅
```

---

## 🚀 Next Steps

### Phase 2 (Future): Distributed Permissions
- Allow Store EAs to post to social (opt-in)
- Post approval workflows
- Scheduled posting with review queue

### Phase 3 (Future): Full Customization
- Per-agent, per-platform permission matrix UI
- Brand voice templates per platform
- Multi-user collaboration with role-based access

---

## 🎨 Frontend Integration

### Show Connector Status
```typescript
// Fetch connected platforms
const response = await fetch('/api/connectors', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const connectors = await response.json();

// Display: "✅ Twitter connected" or "❌ Instagram not connected"
```

### Show Permission Warnings
```typescript
// Before posting, check if agent can post
const permissions = await fetch(`/api/connectors/${platform}/permissions`);
const data = await permissions.json();

if (!data.permissions[agentType]?.can_post) {
  alert('This agent cannot post to this platform');
}
```

### Upgrade Prompt
```typescript
// If user tries to customize permissions on Starter plan
if (planLevel < "business" && userTriesToCustomize) {
  showUpgradeModal("Business plan required to customize permissions");
}
```

---

## 📖 Documentation Files

- **Strategy & Brainstorming:** `/memory/SOCIAL_CONNECTOR_PERMISSIONS.md`
- **Integration Mapping:** `/memory/INTEGRATION_STRATEGY.md`
- **Implementation Summary:** `/IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** April 14, 2026  
**Status:** ✅ Phase 1 Complete, No Errors
