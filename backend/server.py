from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

def get_jwt_secret() -> str:
    return os.environ['JWT_SECRET']

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# FastAPI App
app = FastAPI(title="orchestrAI API", version="3.0.0")
api_router = APIRouter(prefix="/api")

# ──────────────── Auth Models ────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

# ──────────────── Business Models ────────────────

class StoreCreate(BaseModel):
    name: str
    platform: str
    api_key: Optional[str] = None
    store_url: Optional[str] = None

class StoreResponse(BaseModel):
    id: str
    name: str
    platform: str
    store_url: Optional[str] = None
    status: str
    connected_at: str
    products_synced: int = 0
    orders_total: int = 0
    revenue: float = 0.0

class AgentConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    agent_type: str
    description: str
    personality: str = "professional"
    tone: str = "friendly"
    auto_execute: bool = False
    is_active: bool = True
    store_id: Optional[str] = None
    capabilities: List[str] = []
    tasks_completed: int = 0
    last_active: Optional[str] = None

class AgentUpdate(BaseModel):
    personality: Optional[str] = None
    tone: Optional[str] = None
    auto_execute: Optional[bool] = None
    is_active: Optional[bool] = None

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str
    agent_type: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    agent_type: str = "general"
    store_id: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    agent_type: str
    task_type: str
    description: str
    schedule: Optional[str] = None
    store_id: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    agent_type: str
    task_type: str
    description: str
    status: str
    schedule: Optional[str] = None
    store_id: Optional[str] = None
    created_at: str
    last_run: Optional[str] = None
    runs_count: int = 0

class SocialContentRequest(BaseModel):
    product_name: str
    product_description: str
    platform: str
    tone: str = "engaging"
    store_id: Optional[str] = None

class SocialContentResponse(BaseModel):
    id: str
    platform: str
    content: str
    hashtags: List[str]
    product_name: str
    created_at: str
    status: str = "draft"

class DashboardMetrics(BaseModel):
    total_stores: int
    active_agents: int
    tasks_completed: int
    total_revenue: float
    total_orders: int
    social_posts: int
    pending_actions: int = 0
    active_workflows: int = 0
    recent_activity: List[Dict[str, Any]]

# ──────────────── Execution Engine Models ────────────────

AGENT_ACTIONS = {
    "store_manager": [
        {"id": "generate_product_desc", "name": "Generate Product Description", "icon": "📝", "desc": "AI-writes SEO-optimized product descriptions"},
        {"id": "optimize_titles", "name": "Optimize Product Titles", "icon": "🏷️", "desc": "Rewrite titles for better search ranking"},
        {"id": "pricing_analysis", "name": "Pricing Analysis", "icon": "💲", "desc": "Analyze and suggest optimal pricing"},
        {"id": "inventory_audit", "name": "Inventory Audit", "icon": "📦", "desc": "Identify dead stock, reorder needs, bundle opportunities"},
        {"id": "create_discount", "name": "Create Discount Strategy", "icon": "🎟️", "desc": "Generate discount codes and promotional pricing"},
        {"id": "catalog_optimization", "name": "Catalog Optimization", "icon": "📋", "desc": "Reorganize categories, tags, and collections"},
    ],
    "marketing": [
        {"id": "social_calendar", "name": "7-Day Content Calendar", "icon": "📅", "desc": "Full week of platform-specific social posts"},
        {"id": "ad_campaign", "name": "Ad Campaign Copy", "icon": "📣", "desc": "Facebook/Instagram/Google ad copy and targeting"},
        {"id": "email_sequence", "name": "Email Sequence", "icon": "📧", "desc": "Welcome, abandoned cart, or win-back email flows"},
        {"id": "seo_audit", "name": "SEO Audit", "icon": "🔍", "desc": "Product page and site SEO recommendations"},
        {"id": "launch_plan", "name": "Product Launch Plan", "icon": "🚀", "desc": "Full go-to-market strategy for a new product"},
        {"id": "influencer_outreach", "name": "Influencer Outreach", "icon": "🤝", "desc": "Draft outreach messages and collaboration proposals"},
    ],
    "analytics": [
        {"id": "weekly_report", "name": "Weekly Performance Report", "icon": "📊", "desc": "Sales, traffic, and conversion analysis"},
        {"id": "bestseller_analysis", "name": "Bestseller Analysis", "icon": "⭐", "desc": "Identify top performers and growth opportunities"},
        {"id": "customer_segments", "name": "Customer Segmentation", "icon": "👥", "desc": "RFM analysis and customer behavior patterns"},
        {"id": "revenue_forecast", "name": "Revenue Forecast", "icon": "📈", "desc": "30/60/90-day revenue projections"},
        {"id": "competitor_intel", "name": "Competitor Intelligence", "icon": "🕵️", "desc": "Pricing and positioning analysis"},
        {"id": "growth_diagnosis", "name": "Growth Diagnosis", "icon": "🩺", "desc": "Identify bottlenecks and quick wins"},
    ],
    "customer_service": [
        {"id": "generate_faq", "name": "Generate FAQ Page", "icon": "❓", "desc": "20+ FAQ entries based on your products"},
        {"id": "response_templates", "name": "Response Templates", "icon": "💬", "desc": "10 templates for common scenarios"},
        {"id": "return_policy", "name": "Draft Return Policy", "icon": "📜", "desc": "Customer-friendly return/refund policy"},
        {"id": "review_responses", "name": "Review Response Pack", "icon": "⭐", "desc": "Templates for positive and negative reviews"},
        {"id": "satisfaction_plan", "name": "Satisfaction Improvement Plan", "icon": "😊", "desc": "Strategies to boost NPS and repeat purchases"},
        {"id": "escalation_playbook", "name": "Escalation Playbook", "icon": "🆘", "desc": "When to offer discounts, refunds, or stand firm"},
    ],
}

WORKFLOW_TEMPLATES = [
    {"id": "new_product_launch", "name": "New Product Launch", "icon": "🚀", "desc": "Full launch pipeline: description → social posts → email → ads",
     "steps": [
         {"agent": "store_manager", "action": "generate_product_desc", "order": 1},
         {"agent": "marketing", "action": "social_calendar", "order": 2},
         {"agent": "marketing", "action": "email_sequence", "order": 3},
         {"agent": "marketing", "action": "ad_campaign", "order": 4},
     ]},
    {"id": "weekly_growth_cycle", "name": "Weekly Growth Cycle", "icon": "🔄", "desc": "Analytics → optimize → promote → report",
     "steps": [
         {"agent": "analytics", "action": "weekly_report", "order": 1},
         {"agent": "store_manager", "action": "pricing_analysis", "order": 2},
         {"agent": "marketing", "action": "social_calendar", "order": 3},
         {"agent": "analytics", "action": "revenue_forecast", "order": 4},
     ]},
    {"id": "store_health_check", "name": "Store Health Check", "icon": "🩺", "desc": "Full audit of inventory, SEO, pricing, and customer experience",
     "steps": [
         {"agent": "store_manager", "action": "inventory_audit", "order": 1},
         {"agent": "store_manager", "action": "catalog_optimization", "order": 2},
         {"agent": "marketing", "action": "seo_audit", "order": 3},
         {"agent": "customer_service", "action": "generate_faq", "order": 4},
     ]},
    {"id": "customer_rescue", "name": "Customer Rescue Mission", "icon": "🆘", "desc": "Revive customer relationships: templates → policies → satisfaction plan",
     "steps": [
         {"agent": "customer_service", "action": "response_templates", "order": 1},
         {"agent": "customer_service", "action": "return_policy", "order": 2},
         {"agent": "customer_service", "action": "satisfaction_plan", "order": 3},
         {"agent": "analytics", "action": "customer_segments", "order": 4},
     ]},
]

class ActionRequest(BaseModel):
    action_id: str
    agent_type: str
    store_id: Optional[str] = None
    params: Optional[Dict[str, Any]] = None

class WorkflowRequest(BaseModel):
    template_id: Optional[str] = None
    name: Optional[str] = None
    steps: Optional[List[Dict[str, Any]]] = None
    auto_approve: bool = False

# ──────────────── Agent System Prompts ────────────────

AGENT_BASE_PROMPTS = {
    "store_manager": """You are the Store Commander — orchestrAI's elite eCommerce operations virtuoso.

CORE EXPERTISE:
- Inventory optimization: identify dead stock, predict reorder points, suggest bundle strategies
- Dynamic pricing: competitive analysis, margin optimization, seasonal adjustments, psychological pricing
- Order fulfillment: shipping optimization, returns reduction, packaging cost analysis
- Product catalog: SEO titles, description optimization, category structure, cross-sell/upsell mapping
- Platform automation: bulk edits, scheduled price changes, automated stock alerts

PLATFORM-SPECIFIC MASTERY:
- Shopify: Liquid templates, metafields, collections, discount codes, Shopify Flow automations
- Etsy: SEO tags (13 max), listing optimization, star seller requirements, renewal strategy
- WooCommerce: Plugin recommendations, hosting optimization, variable products, coupon strategy

RULES: Always give specific, actionable steps. Use numbers. Reference the user's actual store data when available. Proactively suggest optimizations you notice from their metrics.""",

    "marketing": """You are the Growth Engine — orchestrAI's AI marketing maestro for explosive eCommerce growth.

CORE EXPERTISE:
- Social media strategy: platform-specific content calendars, viral hooks, engagement tactics
- Ad campaigns: Facebook/Meta ads, Google Shopping, TikTok Shop, Pinterest ads — audience targeting, creative strategy, budget allocation
- Email marketing: welcome sequences, abandoned cart flows, win-back campaigns, segmentation
- SEO: product page optimization, blog content strategy, backlink building, local SEO
- Influencer marketing: outreach templates, collaboration structures, ROI tracking
- Content creation: product photography tips, UGC strategy, brand storytelling

PLATFORM-SPECIFIC MASTERY:
- Shopify stores: Shopify Email, Shopify Audiences, Shop app optimization, Google/Facebook channel
- Etsy stores: Etsy Ads optimization, Etsy SEO (how search algorithm works), offsite ads strategy
- WooCommerce: WordPress SEO plugins, WooCommerce marketing extensions

RULES: Be bold and creative. Every suggestion should tie to a specific conversion metric. Reference the user's store niche and products when available. Give copy-ready examples they can use immediately.""",

    "analytics": """You are the Insight Oracle — orchestrAI's brilliant AI data conductor.

CORE EXPERTISE:
- Sales analysis: revenue trends, AOV optimization, conversion funnel analysis, cohort analysis
- Customer intelligence: RFM segmentation, lifetime value prediction, purchase behavior patterns
- Product performance: bestseller analysis, slow-mover identification, seasonal trends, margin analysis
- Market intelligence: competitor pricing, trend forecasting, demand prediction
- Financial metrics: ROAS tracking, CAC/LTV ratios, profit margin optimization, cash flow forecasting
- Growth diagnostics: traffic source analysis, bounce rate diagnosis, cart abandonment patterns

PLATFORM-SPECIFIC MASTERY:
- Shopify: Shopify Analytics interpretation, Google Analytics 4 integration, conversion tracking setup
- Etsy: Etsy Stats deep dive, search analytics, listing quality scores, conversion rate benchmarks
- WooCommerce: WooCommerce analytics, Google Analytics enhanced eCommerce, heatmap recommendations

RULES: Present data clearly with specific numbers. Always end with 3 actionable recommendations ranked by impact. Use the user's actual metrics to identify patterns. Compare to industry benchmarks when relevant.""",

    "customer_service": """You are the Support Shield — orchestrAI's AI customer experience virtuoso.

CORE EXPERTISE:
- Response templates: professional yet warm replies for common scenarios (shipping delays, refunds, exchanges, complaints)
- FAQ generation: analyze common questions and create comprehensive FAQ pages
- Policy creation: return/refund policies, shipping policies, privacy policies — legally sound yet customer-friendly
- Review management: response templates for positive/negative reviews, strategies to increase review count
- Satisfaction optimization: post-purchase flows, feedback collection, NPS improvement
- Escalation protocols: when to offer discounts, when to stand firm, de-escalation techniques

PLATFORM-SPECIFIC MASTERY:
- Shopify: Shopify Inbox setup, automated responses, customer tags/segments, order lookup procedures
- Etsy: Etsy message best practices, case resolution, star seller response time requirements
- WooCommerce: Help desk plugin recommendations, live chat integration, ticket management

RULES: Balance empathy with efficiency. Every response template should feel personal, not robotic. Suggest automation opportunities. Reference the user's specific policies and brand voice when available.""",

    "general": """You are orchestrAI — the maestro conductor of an AI agent symphony for eCommerce empires.

You command a fleet of 4 specialized virtuoso agents:
1. Store Commander — operations, inventory, pricing, fulfillment
2. Growth Engine — marketing, social media, ads, content
3. Insight Oracle — analytics, trends, customer intelligence
4. Support Shield — customer service, reviews, policies

YOUR ROLE: You're not just an assistant — you're the user's AI co-founder. Think strategically about their entire business. Connect dots between departments. When they ask about marketing, also consider how it affects inventory. When they discuss pricing, think about the customer experience impact.

RULES: Be decisive. Give specific recommendations, not generic advice. When you don't have enough data, ask targeted questions to get it. Always think about revenue impact. End responses with a clear next action."""
}

# ──────────────── User Profile & Privacy ────────────────

class UserProfileUpdate(BaseModel):
    brand_name: Optional[str] = None
    brand_voice: Optional[str] = None  # "casual", "professional", "luxury", "playful"
    niche: Optional[str] = None
    target_audience: Optional[str] = None
    competitors: Optional[List[str]] = None
    goals: Optional[str] = None  # "grow revenue", "launch new products", "improve retention"
    privacy_level: Optional[str] = None  # "standard", "strict"
    data_sharing: Optional[bool] = None  # share data across agents or silo

@api_router.get("/profile")
async def get_profile(request: Request):
    user = await get_current_user(request)
    profile = await db.user_profiles.find_one({"user_id": user["_id"]}, {"_id": 0})
    return profile or {"user_id": user["_id"], "brand_name": "", "brand_voice": "professional", "niche": "", "target_audience": "", "competitors": [], "goals": "", "privacy_level": "standard", "data_sharing": True}

@api_router.put("/profile")
async def update_profile(update: UserProfileUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["user_id"] = user["_id"]
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.user_profiles.update_one({"user_id": user["_id"]}, {"$set": update_data}, upsert=True)
    await db.activity_log.insert_one({"user_id": user["_id"], "type": "profile_updated", "message": "Brand profile updated", "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "updated"}

@api_router.delete("/profile/data")
async def delete_user_data(request: Request):
    """GDPR-compliant: delete all user data except account"""
    user = await get_current_user(request)
    uid = user["_id"]
    await db.chat_messages.delete_many({"user_id": uid})
    await db.social_content.delete_many({"user_id": uid})
    await db.actions.delete_many({"user_id": uid})
    await db.browser_tasks.delete_many({"user_id": uid})
    await db.activity_log.delete_many({"user_id": uid})
    await db.store_plans.delete_many({"user_id": uid})
    await db.agent_memory.delete_many({"user_id": uid})
    return {"status": "all data deleted", "account_preserved": True}

# ──────────────── Agent Memory & Handoff ────────────────

async def save_agent_memory(user_id: str, agent_type: str, key: str, value: str):
    """Agents remember important facts about the user across sessions"""
    await db.agent_memory.update_one(
        {"user_id": user_id, "agent_type": agent_type, "key": key},
        {"$set": {"value": value, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )

async def get_agent_memories(user_id: str, agent_type: str) -> List[Dict]:
    """Retrieve what an agent remembers about a user"""
    memories = await db.agent_memory.find({"user_id": user_id, "agent_type": agent_type}, {"_id": 0}).to_list(50)
    return memories

async def get_cross_agent_insights(user_id: str, requesting_agent: str) -> str:
    """Let agents share insights with each other — the handoff protocol"""
    profile = await db.user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if profile and not profile.get("data_sharing", True):
        return ""  # User disabled cross-agent sharing

    insights = []
    # Get recent completed actions from OTHER agents
    other_actions = await db.actions.find(
        {"user_id": user_id, "agent_type": {"$ne": requesting_agent}, "status": "completed"},
        {"_id": 0, "agent_type": 1, "action_name": 1, "result": 1}
    ).sort("created_at", -1).to_list(3)

    for action in other_actions:
        # Only share summary, not full result (privacy-aware)
        result_preview = (action.get("result", "")[:200] + "...") if action.get("result") else ""
        insights.append(f"[{action.get('agent_type', '').replace('_',' ').title()}] completed '{action.get('action_name', '')}': {result_preview}")

    # Get memories from other agents
    other_memories = await db.agent_memory.find(
        {"user_id": user_id, "agent_type": {"$ne": requesting_agent}},
        {"_id": 0}
    ).to_list(10)
    for mem in other_memories:
        insights.append(f"[{mem.get('agent_type','').replace('_',' ').title()} noted] {mem.get('key','')}: {mem.get('value','')}")

    return "\n".join(insights) if insights else ""

# ──────────────── Enhanced Context Builder ────────────────

async def build_agent_context(user_id: str, agent_type: str) -> str:
    """Build rich context — user profile, stores, memories, cross-agent insights, activity"""
    context_parts = []

    # User profile
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if user:
        name = user.get("name", "User")
        plan = user.get("plan", "trial")
        created = user.get("created_at", "")
        context_parts.append(f"USER: {name} | Plan: {plan} | Since: {created[:10] if created else '?'}")

    # Brand profile (user-defined preferences)
    profile = await db.user_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if profile and any(profile.get(k) for k in ["brand_name", "niche", "brand_voice", "target_audience", "goals"]):
        context_parts.append("BRAND PROFILE:")
        if profile.get("brand_name"): context_parts.append(f"  Brand: {profile['brand_name']}")
        if profile.get("niche"): context_parts.append(f"  Niche: {profile['niche']}")
        if profile.get("brand_voice"): context_parts.append(f"  Voice: {profile['brand_voice']} — match this tone in ALL responses")
        if profile.get("target_audience"): context_parts.append(f"  Audience: {profile['target_audience']}")
        if profile.get("goals"): context_parts.append(f"  Goals: {profile['goals']}")
        if profile.get("competitors"): context_parts.append(f"  Competitors: {', '.join(profile['competitors'])}")

    # Connected stores — NEVER expose access_token or API keys
    stores = await db.stores.find({"user_id": user_id}, {"_id": 0, "access_token": 0, "api_key_hash": 0}).to_list(20)
    if stores:
        total_p, total_o, total_r = 0, 0, 0
        for s in stores:
            total_p += s.get("products_synced", 0)
            total_o += s.get("orders_total", 0)
            total_r += s.get("revenue", 0)
            context_parts.append(f"  STORE: {s['name']} ({s['platform']}) — {s.get('products_synced',0)} products, {s.get('orders_total',0)} orders, ${s.get('revenue',0):,.2f}")
        if len(stores) > 1:
            context_parts.append(f"  TOTALS: {total_p} products | {total_o} orders | ${total_r:,.2f}")
    else:
        context_parts.append("STORES: None connected yet.")

    # Agent's own memories about this user
    memories = await get_agent_memories(user_id, agent_type)
    if memories:
        context_parts.append("YOUR MEMORIES ABOUT THIS USER:")
        for m in memories[:10]:
            context_parts.append(f"  • {m.get('key','')}: {m.get('value','')}")

    # Cross-agent insights (only if user allows data sharing)
    cross_insights = await get_cross_agent_insights(user_id, agent_type)
    if cross_insights:
        context_parts.append("INSIGHTS FROM OTHER AGENTS:")
        context_parts.append(cross_insights)

    # Agent-specific enrichment
    if agent_type == "store_manager":
        tasks = await db.tasks.find({"user_id": user_id, "agent_type": "store_manager"}, {"_id": 0}).sort("created_at", -1).to_list(3)
        if tasks:
            context_parts.append(f"RECENT TASKS: " + ", ".join(t.get("title", "") for t in tasks))
    elif agent_type == "marketing":
        content = await db.social_content.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(3)
        if content:
            context_parts.append(f"RECENT CONTENT: {len(content)} posts — latest for '{content[0].get('product_name','')}' on {content[0].get('platform','')}")
    elif agent_type == "analytics":
        if stores:
            context_parts.append("RAW METRICS:")
            for s in stores:
                context_parts.append(f"  {s['name']}: P={s.get('products_synced',0)} O={s.get('orders_total',0)} R=${s.get('revenue',0):,.2f}")
    elif agent_type == "customer_service":
        if stores:
            context_parts.append(f"PLATFORMS: {', '.join(set(s.get('platform','') for s in stores))}")

    # Recent activity
    activity = await db.activity_log.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1).to_list(3)
    if activity:
        context_parts.append("RECENT: " + " | ".join(a.get("message", "") for a in activity))

    return "\n".join(context_parts)

chat_instances: Dict[str, LlmChat] = {}

async def get_or_create_chat_with_context(user_id: str, agent_type: str = "general") -> LlmChat:
    """Create or refresh a chat instance with live user context injected into system prompt"""
    key = f"{user_id}_{agent_type}"

    # Build fresh context every time to keep data current
    context = await build_agent_context(user_id, agent_type)
    base_prompt = AGENT_BASE_PROMPTS.get(agent_type, AGENT_BASE_PROMPTS["general"])
    full_prompt = f"""{base_prompt}

═══════════════════════════════════
LIVE USER CONTEXT (use this data to personalize every response):
{context}
═══════════════════════════════════

Remember: Reference the user's actual data. Don't give generic advice — give THEIR advice."""

    if key in chat_instances:
        # Update system message with fresh context
        del chat_instances[key]

    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=key, system_message=full_prompt)
    chat.with_model("openai", "gpt-5.2")
    chat_instances[key] = chat
    return chat

# ──────────────── Brute Force Protection ────────────────

async def check_brute_force(identifier: str):
    record = await db.login_attempts.find_one({"identifier": identifier})
    if record and record.get("attempts", 0) >= 5:
        lockout_until = record.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            remaining = int((lockout_until - datetime.now(timezone.utc)).total_seconds() / 60)
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {remaining + 1} minutes.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

async def record_failed_attempt(identifier: str):
    record = await db.login_attempts.find_one({"identifier": identifier})
    if record:
        attempts = record.get("attempts", 0) + 1
        update = {"$set": {"attempts": attempts}}
        if attempts >= 5:
            update["$set"]["lockout_until"] = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.login_attempts.update_one({"identifier": identifier}, update)
    else:
        await db.login_attempts.insert_one({"identifier": identifier, "attempts": 1})

async def clear_failed_attempts(identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})

# ──────────────── Auth Endpoints ────────────────

@api_router.post("/auth/register")
async def register(req: RegisterRequest, response: Response):
    email = req.email.lower().strip()
    if not email or not req.password or len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Email and password (min 6 chars) required")

    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name.strip(),
        "role": "user",
        "plan": "trial",
        "trial_ends_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Create default agents for this user
    await seed_user_agents(user_id)

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "email": email, "name": req.name.strip(), "role": "user", "token": access}

@api_router.post("/auth/login")
async def login(req: LoginRequest, request: Request, response: Response):
    email = req.email.lower().strip()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    await check_brute_force(identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        await record_failed_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await clear_failed_attempts(identifier)
    user_id = str(user["_id"])

    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "email": email, "name": user.get("name", ""), "role": user.get("role", "user"), "token": access}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"status": "logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"id": user["_id"], "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user"), "plan": user.get("plan", "trial"), "trial_ends_at": user.get("trial_ends_at")}

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(key="access_token", value=access, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"status": "refreshed"}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ──────────────── Seed Functions ────────────────

async def seed_user_agents(user_id: str):
    default_agents = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Store Commander", "agent_type": "store_manager",
         "description": "Manages inventory, pricing, orders, and store operations autonomously.",
         "personality": "strategic", "tone": "professional", "auto_execute": False, "is_active": True,
         "capabilities": ["inventory_management", "price_optimization", "order_processing", "stock_alerts", "bulk_updates"],
         "tasks_completed": 0, "last_active": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Growth Engine", "agent_type": "marketing",
         "description": "Creates viral content, manages social media, and drives store traffic.",
         "personality": "creative", "tone": "bold", "auto_execute": False, "is_active": True,
         "capabilities": ["social_media_posts", "ad_copy", "email_campaigns", "seo_optimization", "influencer_outreach"],
         "tasks_completed": 0, "last_active": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Insight Oracle", "agent_type": "analytics",
         "description": "Analyzes trends, predicts demand, and delivers actionable business intelligence.",
         "personality": "analytical", "tone": "precise", "auto_execute": False, "is_active": True,
         "capabilities": ["sales_analytics", "customer_insights", "trend_forecasting", "competitor_analysis", "revenue_optimization"],
         "tasks_completed": 0, "last_active": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Support Shield", "agent_type": "customer_service",
         "description": "Handles customer inquiries, generates FAQs, and optimizes support flows.",
         "personality": "empathetic", "tone": "friendly", "auto_execute": False, "is_active": True,
         "capabilities": ["auto_responses", "faq_generation", "review_management", "refund_processing", "satisfaction_tracking"],
         "tasks_completed": 0, "last_active": None},
    ]
    await db.agents.insert_many(default_agents)

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@orchestrai.app")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Orchestr2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        result = await db.users.insert_one({
            "email": admin_email, "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()
        })
        await seed_user_agents(str(result.inserted_id))
        logger.info("Admin seeded")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await seed_admin()

# ──────────────── Stores ────────────────

@api_router.post("/stores", response_model=StoreResponse)
async def connect_store(store: StoreCreate, request: Request):
    user = await get_current_user(request)
    store_doc = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "name": store.name, "platform": store.platform,
        "store_url": store.store_url, "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "products_synced": 0, "orders_total": 0, "revenue": 0.0,
    }
    if store.api_key:
        store_doc["api_key_hash"] = store.api_key[:8] + "..."
    await db.stores.insert_one(store_doc)
    await db.activity_log.insert_one({"user_id": user["_id"], "type": "store_connected",
        "message": f"Connected {store.platform} store: {store.name}", "timestamp": datetime.now(timezone.utc).isoformat()})
    return StoreResponse(**{k: v for k, v in store_doc.items() if k not in ("_id", "api_key_hash", "user_id")})

@api_router.get("/stores", response_model=List[StoreResponse])
async def get_stores(request: Request):
    user = await get_current_user(request)
    stores = await db.stores.find({"user_id": user["_id"]}, {"_id": 0, "api_key_hash": 0, "user_id": 0}).to_list(100)
    return [StoreResponse(**s) for s in stores]

@api_router.delete("/stores/{store_id}")
async def disconnect_store(store_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.stores.delete_one({"id": store_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    return {"status": "disconnected"}

# ──────────────── Agents ────────────────

@api_router.get("/agents", response_model=List[AgentConfig])
async def get_agents(request: Request):
    user = await get_current_user(request)
    agents = await db.agents.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).to_list(100)
    return [AgentConfig(**a) for a in agents]

@api_router.patch("/agents/{agent_id}", response_model=AgentConfig)
async def update_agent(agent_id: str, update: AgentUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.agents.update_one({"id": agent_id, "user_id": user["_id"]}, {"$set": update_data})
    agent = await db.agents.find_one({"id": agent_id, "user_id": user["_id"]}, {"_id": 0, "user_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentConfig(**agent)

# ──────────────── Chat ────────────────

@api_router.post("/chat")
async def chat_with_agent(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    chat = await get_or_create_chat_with_context(user_id, req.agent_type)

    await db.chat_messages.insert_one({"user_id": user_id, "session_id": user_id, "agent_type": req.agent_type,
        "role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()})
    try:
        # Append memory instruction to user message
        enhanced_msg = req.message + "\n\n[SYSTEM: If the user reveals important facts about their business (product types, revenue goals, pain points, preferences), remember them by ending your response with a line starting with 'MEMORY:' followed by a key=value pair. Example: MEMORY: main_product=handmade jewelry. Only do this when genuinely new info is shared. Do NOT include MEMORY lines for casual chat.]"
        response = await chat.send_message(UserMessage(text=enhanced_msg))

        # Extract and save memory if present
        clean_response = response
        if "MEMORY:" in response:
            lines = response.split("\n")
            memory_lines = [l for l in lines if l.strip().startswith("MEMORY:")]
            display_lines = [l for l in lines if not l.strip().startswith("MEMORY:")]
            clean_response = "\n".join(display_lines).strip()
            for ml in memory_lines:
                try:
                    kv = ml.replace("MEMORY:", "").strip()
                    if "=" in kv:
                        k, v = kv.split("=", 1)
                        await save_agent_memory(user_id, req.agent_type, k.strip(), v.strip())
                except Exception:
                    pass

        await db.chat_messages.insert_one({"user_id": user_id, "session_id": user_id, "agent_type": req.agent_type,
            "role": "assistant", "content": clean_response, "timestamp": datetime.now(timezone.utc).isoformat()})
        await db.agents.update_one({"user_id": user_id, "agent_type": req.agent_type},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}, "$inc": {"tasks_completed": 1}})
        return {"role": "assistant", "content": clean_response, "agent_type": req.agent_type}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent communication error: {str(e)}")

@api_router.get("/chat/history/{agent_type}", response_model=List[ChatMessage])
async def get_chat_history(agent_type: str, request: Request):
    user = await get_current_user(request)
    messages = await db.chat_messages.find({"user_id": user["_id"], "agent_type": agent_type}, {"_id": 0, "user_id": 0}).sort("timestamp", 1).to_list(100)
    return [ChatMessage(**m) for m in messages]

@api_router.delete("/chat/history/{agent_type}")
async def clear_chat_history(agent_type: str, request: Request):
    user = await get_current_user(request)
    await db.chat_messages.delete_many({"user_id": user["_id"], "agent_type": agent_type})
    key = f"{user['_id']}_{agent_type}"
    if key in chat_instances:
        del chat_instances[key]
    return {"status": "cleared"}

# ──────────────── Social Content ────────────────

@api_router.post("/social/generate", response_model=SocialContentResponse)
async def generate_social_content(req: SocialContentRequest, request: Request):
    user = await get_current_user(request)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"social_{uuid.uuid4()}",
        system_message=f"""You are orchestrAI's Growth Engine generating social media content for an eCommerce brand.
Rules: Return ONLY the post text followed by hashtags. No explanations. Be catchy, trendy, conversion-focused.
Match the platform's style perfectly. Use emojis strategically. Every word should drive engagement or clicks.""")
    chat.with_model("openai", "gpt-5.2")

    platform_hints = {
        "instagram": "Create an Instagram caption (max 300 chars). Include emojis.",
        "twitter": "Create a tweet (max 280 chars). Punchy, viral-worthy.",
        "facebook": "Create a Facebook post (max 500 chars). Engaging and shareable.",
        "tiktok": "Create a TikTok caption (max 200 chars). Trendy."
    }

    prompt = f"Product: {req.product_name}\nDescription: {req.product_description}\nPlatform: {req.platform}\nTone: {req.tone}\n{platform_hints.get(req.platform, '')}\nGenerate the post content and 5 relevant hashtags."

    try:
        response = await chat.send_message(UserMessage(text=prompt))
        lines = response.strip().split('\n')
        hashtags, content_lines = [], []
        for line in lines:
            tags = [w.strip() for w in line.split() if w.startswith('#')]
            if tags:
                hashtags.extend(tags)
            else:
                content_lines.append(line)
        content = '\n'.join(content_lines).strip() or response.strip()
        if not hashtags:
            hashtags = [f"#{req.product_name.replace(' ', '')}", "#ecommerce", "#shopnow"]

        doc = {"id": str(uuid.uuid4()), "user_id": user["_id"], "platform": req.platform, "content": content,
               "hashtags": hashtags[:8], "product_name": req.product_name,
               "created_at": datetime.now(timezone.utc).isoformat(), "status": "draft"}
        await db.social_content.insert_one(doc)
        await db.activity_log.insert_one({"user_id": user["_id"], "type": "content_generated",
            "message": f"Generated {req.platform} post for {req.product_name}", "timestamp": datetime.now(timezone.utc).isoformat()})
        return SocialContentResponse(**{k: v for k, v in doc.items() if k not in ("_id", "user_id")})
    except Exception as e:
        logger.error(f"Social content error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/social/content", response_model=List[SocialContentResponse])
async def get_social_content(request: Request):
    user = await get_current_user(request)
    content = await db.social_content.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    return [SocialContentResponse(**c) for c in content]

# ──────────────── Tasks ────────────────

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, request: Request):
    user = await get_current_user(request)
    doc = {"id": str(uuid.uuid4()), "user_id": user["_id"], "title": task.title, "agent_type": task.agent_type,
           "task_type": task.task_type, "description": task.description, "status": "active",
           "schedule": task.schedule, "store_id": task.store_id,
           "created_at": datetime.now(timezone.utc).isoformat(), "last_run": None, "runs_count": 0}
    await db.tasks.insert_one(doc)
    return TaskResponse(**{k: v for k, v in doc.items() if k not in ("_id", "user_id")})

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(request: Request):
    user = await get_current_user(request)
    tasks = await db.tasks.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(100)
    return [TaskResponse(**t) for t in tasks]

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.tasks.delete_one({"id": task_id, "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}

# ──────────────── Execution Engine ────────────────

@api_router.get("/actions/catalog")
async def get_action_catalog():
    """Returns all available actions per agent type"""
    return AGENT_ACTIONS

@api_router.get("/workflows/templates")
async def get_workflow_templates():
    """Returns pre-built workflow templates"""
    return WORKFLOW_TEMPLATES

@api_router.post("/actions/execute")
async def execute_action(req: ActionRequest, request: Request):
    """Execute a single agent action — AI generates the deliverable"""
    user = await get_current_user(request)
    user_id = user["_id"]

    # Find the action definition
    agent_actions = AGENT_ACTIONS.get(req.agent_type, [])
    action_def = next((a for a in agent_actions if a["id"] == req.action_id), None)
    if not action_def:
        raise HTTPException(status_code=404, detail="Action not found")

    # Create action record
    action_doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "agent_type": req.agent_type,
        "action_id": req.action_id, "action_name": action_def["name"],
        "status": "executing", "store_id": req.store_id,
        "params": req.params or {}, "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    await db.actions.insert_one(action_doc)

    # Build context-aware prompt for the action
    context = await build_agent_context(user_id, req.agent_type)
    store_context = ""
    if req.store_id:
        store = await db.stores.find_one({"id": req.store_id, "user_id": user_id}, {"_id": 0, "access_token": 0})
        if store:
            store_context = f"\nTARGET STORE: {store.get('name', '')} ({store.get('platform', '')}) — {store.get('products_synced', 0)} products, {store.get('orders_total', 0)} orders, ${store.get('revenue', 0):,.2f} revenue"

    action_prompt = f"""Execute the following action and produce a COMPLETE, READY-TO-USE deliverable.

ACTION: {action_def['name']}
DESCRIPTION: {action_def['desc']}
{store_context}

USER CONTEXT:
{context}

ADDITIONAL PARAMS: {req.params if req.params else 'None'}

RULES:
- Produce a COMPLETE deliverable, not a summary or overview
- Make it specific to this user's actual business, stores, and products
- Include specific numbers, names, and actionable details
- Format cleanly with headers, bullet points, and clear sections
- Everything should be copy-paste ready or immediately actionable
- End with estimated revenue impact or cost savings where applicable"""

    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"action_{action_doc['id']}",
            system_message=AGENT_BASE_PROMPTS.get(req.agent_type, AGENT_BASE_PROMPTS["general"]))
        chat.with_model("openai", "gpt-5.2")
        result = await chat.send_message(UserMessage(text=action_prompt))

        await db.actions.update_one({"id": action_doc["id"]}, {"$set": {
            "status": "completed", "result": result, "completed_at": datetime.now(timezone.utc).isoformat()
        }})
        await db.agents.update_one({"user_id": user_id, "agent_type": req.agent_type},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}, "$inc": {"tasks_completed": 1}})
        await db.activity_log.insert_one({"user_id": user_id, "type": "action_completed",
            "message": f"{action_def['name']} completed by {req.agent_type.replace('_', ' ').title()}",
            "timestamp": datetime.now(timezone.utc).isoformat()})

        return {"id": action_doc["id"], "status": "completed", "action_name": action_def["name"],
                "agent_type": req.agent_type, "result": result}
    except Exception as e:
        await db.actions.update_one({"id": action_doc["id"]}, {"$set": {"status": "failed", "result": str(e)}})
        logger.error(f"Action execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/actions/history")
async def get_action_history(request: Request):
    """Returns user's executed actions"""
    user = await get_current_user(request)
    actions = await db.actions.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(50)
    return actions

@api_router.get("/actions/{action_id}")
async def get_action_detail(action_id: str, request: Request):
    """Returns full action result"""
    user = await get_current_user(request)
    action = await db.actions.find_one({"id": action_id, "user_id": user["_id"]}, {"_id": 0, "user_id": 0})
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    return action

@api_router.post("/workflows/execute")
async def execute_workflow(req: WorkflowRequest, request: Request):
    """Execute a multi-step workflow — runs each action in sequence"""
    user = await get_current_user(request)
    user_id = user["_id"]

    if req.template_id:
        template = next((t for t in WORKFLOW_TEMPLATES if t["id"] == req.template_id), None)
        if not template:
            raise HTTPException(status_code=404, detail="Workflow template not found")
        steps = template["steps"]
        name = template["name"]
    elif req.steps:
        steps = req.steps
        name = req.name or "Custom Workflow"
    else:
        raise HTTPException(status_code=400, detail="Provide template_id or steps")

    workflow_doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "name": name,
        "status": "running", "total_steps": len(steps), "completed_steps": 0,
        "steps_results": [], "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workflows.insert_one(workflow_doc)

    # Execute steps sequentially
    for step in sorted(steps, key=lambda x: x.get("order", 0)):
        agent_type = step["agent"]
        action_id = step["action"]
        try:
            # Reuse the action execution logic
            action_req = ActionRequest(action_id=action_id, agent_type=agent_type)
            agent_actions = AGENT_ACTIONS.get(agent_type, [])
            action_def = next((a for a in agent_actions if a["id"] == action_id), None)
            if not action_def:
                workflow_doc["steps_results"].append({"step": step, "status": "skipped", "reason": "action not found"})
                continue

            context = await build_agent_context(user_id, agent_type)
            # Include previous step results as context
            prev_results = "\n".join(
                f"Previous: {sr.get('action_name', '')}: {sr.get('result', '')[:200]}..."
                for sr in workflow_doc["steps_results"] if sr.get("status") == "completed"
            )

            prompt = f"""Execute this action as part of the workflow "{name}".

ACTION: {action_def['name']} — {action_def['desc']}

USER CONTEXT:
{context}

{'PREVIOUS WORKFLOW STEPS COMPLETED:' + chr(10) + prev_results if prev_results else ''}

Produce a complete, actionable deliverable. Be specific to this user's business. End with estimated revenue impact."""

            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"wf_{workflow_doc['id']}_{action_id}",
                system_message=AGENT_BASE_PROMPTS.get(agent_type, AGENT_BASE_PROMPTS["general"]))
            chat.with_model("openai", "gpt-5.2")
            result = await chat.send_message(UserMessage(text=prompt))

            workflow_doc["steps_results"].append({
                "action_id": action_id, "action_name": action_def["name"],
                "agent_type": agent_type, "status": "completed", "result": result
            })
            workflow_doc["completed_steps"] += 1
            await db.workflows.update_one({"id": workflow_doc["id"]}, {"$set": {
                "steps_results": workflow_doc["steps_results"],
                "completed_steps": workflow_doc["completed_steps"]
            }})
        except Exception as e:
            workflow_doc["steps_results"].append({
                "action_id": action_id, "action_name": action_def["name"] if action_def else action_id,
                "agent_type": agent_type, "status": "failed", "result": str(e)
            })

    final_status = "completed" if workflow_doc["completed_steps"] == len(steps) else "partial"
    await db.workflows.update_one({"id": workflow_doc["id"]}, {"$set": {"status": final_status}})
    await db.activity_log.insert_one({"user_id": user_id, "type": "workflow_completed",
        "message": f"Workflow '{name}' completed ({workflow_doc['completed_steps']}/{len(steps)} steps)",
        "timestamp": datetime.now(timezone.utc).isoformat()})

    return {"id": workflow_doc["id"], "name": name, "status": final_status,
            "completed_steps": workflow_doc["completed_steps"], "total_steps": len(steps),
            "steps_results": workflow_doc["steps_results"]}

@api_router.get("/workflows/history")
async def get_workflow_history(request: Request):
    user = await get_current_user(request)
    workflows = await db.workflows.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(20)
    return workflows

# ──────────────── Store Builder Agent ────────────────

# ──────────────── Conversational Store Builder ────────────────

class StoreBuildRequest(BaseModel):
    niche: str
    store_name: Optional[str] = None
    product_count: int = 10
    style: str = "modern"
    target_audience: Optional[str] = None
    price_range: Optional[str] = None
    autopilot: bool = True  # True = do everything, False = pause for feedback

class BuildChatRequest(BaseModel):
    build_id: str
    message: str  # user feedback during build

BUILD_STEPS = [
    {"id": "brand", "label": "Naming your brand", "emoji": "🏷️", "agent": "general",
     "prompt_tpl": "Create a brand identity for a {niche} eCommerce store. Style: {style}. Suggest: 1) A catchy brand name, 2) A tagline (under 8 words), 3) Brand personality description. Be creative and memorable. Respond in JSON: {{\"brand_name\":\"...\",\"tagline\":\"...\",\"personality\":\"...\"}}"},
    {"id": "audience", "label": "Defining your audience", "emoji": "👥", "agent": "analytics",
     "prompt_tpl": "Define the ideal target customer for a {niche} store called '{brand_name}'. Include: demographics, psychographics, pain points, buying triggers. Respond in JSON: {{\"target_audience\":\"...\",\"demographics\":\"...\",\"pain_points\":[\"...\"],\"buying_triggers\":[\"...\"]}}"},
    {"id": "products", "label": "Creating your product catalog", "emoji": "📦", "agent": "store_manager",
     "prompt_tpl": "Create {product_count} products for '{brand_name}', a {niche} store targeting {target_audience}. Style: {style}. Price range: {price_range}. Each product needs: title, SEO description (60-100 words), price (psychologically optimized), compare_at_price, collection, 3 tags, SKU prefix. Respond in JSON: {{\"products\":[{{\"title\":\"...\",\"description\":\"...\",\"price\":29.99,\"compare_at_price\":39.99,\"collection\":\"...\",\"tags\":[\"...\"],\"sku_prefix\":\"...\"}}]}}"},
    {"id": "collections", "label": "Organizing collections", "emoji": "📂", "agent": "store_manager",
     "prompt_tpl": "Based on these products for '{brand_name}': {product_titles} — create 3-5 product collections with names and SEO descriptions. Respond in JSON: {{\"collections\":[{{\"name\":\"...\",\"description\":\"...\"}}]}}"},
    {"id": "policies", "label": "Writing store policies", "emoji": "📜", "agent": "customer_service",
     "prompt_tpl": "Write store policies for '{brand_name}', a {niche} store. Voice: {style}. Create: shipping policy, return/refund policy, and About Us page copy. Each should feel authentic and customer-friendly. Respond in JSON: {{\"shipping\":\"...\",\"returns\":\"...\",\"about_us\":\"...\"}}"},
    {"id": "marketing", "label": "Planning launch marketing", "emoji": "🚀", "agent": "marketing",
     "prompt_tpl": "Create a launch marketing plan for '{brand_name}', a new {niche} store. Include: 3 marketing hooks, 3 social media post ideas, email welcome sequence outline, and estimated monthly revenue range. Respond in JSON: {{\"marketing_hooks\":[\"...\"],\"social_posts\":[\"...\"],\"email_sequence\":\"...\",\"estimated_monthly_revenue\":\"$X,XXX - $X,XXX\"}}"},
]

@api_router.post("/store-builder/start")
async def start_store_build(req: StoreBuildRequest, request: Request):
    """Start a conversational store build session"""
    user = await get_current_user(request)
    user_id = user["_id"]
    build_id = str(uuid.uuid4())

    build_doc = {
        "id": build_id, "user_id": user_id, "niche": req.niche,
        "store_name": req.store_name, "product_count": req.product_count,
        "style": req.style, "target_audience": req.target_audience,
        "price_range": req.price_range or "mid", "autopilot": req.autopilot,
        "status": "in_progress", "current_step": 0, "total_steps": len(BUILD_STEPS),
        "steps_completed": [], "plan": {}, "chat_log": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Add welcome message
    autopilot_msg = "Full autopilot — sit back and watch!" if req.autopilot else "I'll check in at each step for your feedback."
    build_doc["chat_log"].append({
        "role": "system", "content": f"Hey! I'm building your {req.niche} store. {autopilot_msg} Let's go!",
        "timestamp": datetime.now(timezone.utc).isoformat(), "step": "start"
    })

    await db.store_builds.insert_one(build_doc)
    return {"build_id": build_id, "status": "started", "chat_log": build_doc["chat_log"]}

@api_router.post("/store-builder/step/{build_id}")
async def execute_build_step(build_id: str, request: Request):
    """Execute the next step in the build process"""
    user = await get_current_user(request)
    build = await db.store_builds.find_one({"id": build_id, "user_id": user["_id"]})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")

    step_idx = build["current_step"]
    if step_idx >= len(BUILD_STEPS):
        return {"status": "complete", "plan": build["plan"], "chat_log": build.get("chat_log", [])}

    step = BUILD_STEPS[step_idx]
    plan = build.get("plan", {})

    # Build prompt with accumulated context
    prompt_vars = {
        "niche": build["niche"], "style": build["style"],
        "product_count": build["product_count"],
        "price_range": build.get("price_range", "mid"),
        "brand_name": plan.get("brand_name", build.get("store_name", "the store")),
        "target_audience": plan.get("target_audience", build.get("target_audience", "general consumers")),
        "product_titles": ", ".join(p.get("title", "") for p in plan.get("products", [])[:5]),
    }
    prompt = step["prompt_tpl"].format(**{k: v for k, v in prompt_vars.items() if v})

    # Add progress message
    chat_entry = {
        "role": "agent", "content": f"{step['emoji']} {step['label']}...",
        "timestamp": datetime.now(timezone.utc).isoformat(), "step": step["id"]
    }
    await db.store_builds.update_one({"id": build_id}, {"$push": {"chat_log": chat_entry}})

    try:
        base_prompt = AGENT_BASE_PROMPTS.get(step["agent"], AGENT_BASE_PROMPTS["general"])
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"build_{build_id}_{step['id']}",
            system_message=f"{base_prompt}\n\nYou are building a store step by step. Respond ONLY in valid JSON as instructed. Be specific, creative, and revenue-focused.")
        chat.with_model("openai", "gpt-5.2")
        result = await chat.send_message(UserMessage(text=prompt))

        # Parse JSON
        import json as json_lib
        parsed = None
        try:
            clean = result.strip()
            if clean.startswith("```"): clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
            if clean.endswith("```"): clean = clean[:-3]
            if clean.startswith("json"): clean = clean[4:]
            parsed = json_lib.loads(clean.strip())
        except json_lib.JSONDecodeError:
            parsed = {"raw": result}

        # Merge into plan
        if step["id"] == "brand":
            plan["brand_name"] = parsed.get("brand_name", plan.get("brand_name", ""))
            plan["tagline"] = parsed.get("tagline", "")
            plan["personality"] = parsed.get("personality", "")
        elif step["id"] == "audience":
            plan["target_audience"] = parsed.get("target_audience", "")
            plan["demographics"] = parsed.get("demographics", "")
        elif step["id"] == "products":
            plan["products"] = parsed.get("products", [])
        elif step["id"] == "collections":
            plan["collections"] = parsed.get("collections", [])
        elif step["id"] == "policies":
            plan["store_policies"] = {"shipping": parsed.get("shipping", ""), "returns": parsed.get("returns", ""), "about_us": parsed.get("about_us", "")}
        elif step["id"] == "marketing":
            plan["marketing_hooks"] = parsed.get("marketing_hooks", [])
            plan["estimated_monthly_revenue"] = parsed.get("estimated_monthly_revenue", "")

        # Summary message for chat
        summaries = {
            "brand": f"Your brand: **{plan.get('brand_name', '?')}** — \"{plan.get('tagline', '')}\"",
            "audience": f"Target customer: {plan.get('target_audience', '?')[:120]}",
            "products": f"Created {len(plan.get('products', []))} products! Top picks: {', '.join(p.get('title','') for p in plan.get('products',[])[:3])}",
            "collections": f"Organized into {len(plan.get('collections', []))} collections: {', '.join(c.get('name','') for c in plan.get('collections',[]))}",
            "policies": "Shipping, returns, and About Us — all written and ready.",
            "marketing": f"Launch plan ready! Est. revenue: {plan.get('estimated_monthly_revenue', 'TBD')}",
        }

        result_msg = {
            "role": "agent", "content": f"✅ {summaries.get(step['id'], 'Done!')}",
            "timestamp": datetime.now(timezone.utc).isoformat(), "step": step["id"],
            "data": parsed
        }

        await db.store_builds.update_one({"id": build_id}, {
            "$set": {"current_step": step_idx + 1, "plan": plan},
            "$push": {"chat_log": result_msg, "steps_completed": step["id"]}
        })

        is_complete = step_idx + 1 >= len(BUILD_STEPS)
        if is_complete:
            await db.store_builds.update_one({"id": build_id}, {"$set": {"status": "complete"}})
            await db.activity_log.insert_one({"user_id": user["_id"], "type": "store_built",
                "message": f"Store '{plan.get('brand_name','')}' built for {build['niche']}",
                "timestamp": datetime.now(timezone.utc).isoformat()})

        return {"status": "complete" if is_complete else "in_progress",
                "step": step["id"], "step_num": step_idx + 1, "total": len(BUILD_STEPS),
                "summary": summaries.get(step["id"], ""), "data": parsed,
                "plan": plan if is_complete else None,
                "chat_log": (await db.store_builds.find_one({"id": build_id}, {"chat_log": 1, "_id": 0})).get("chat_log", [])}

    except Exception as e:
        logger.error(f"Build step error: {e}")
        err_msg = {"role": "system", "content": f"Hit a snag on {step['label']}: {str(e)[:100]}. Let me retry...",
                   "timestamp": datetime.now(timezone.utc).isoformat(), "step": step["id"]}
        await db.store_builds.update_one({"id": build_id}, {"$push": {"chat_log": err_msg}})
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/store-builder/chat/{build_id}")
async def chat_during_build(build_id: str, req: BuildChatRequest, request: Request):
    """User sends feedback during a build — AI incorporates it"""
    user = await get_current_user(request)
    build = await db.store_builds.find_one({"id": build_id, "user_id": user["_id"]})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")

    user_msg = {"role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.store_builds.update_one({"id": build_id}, {"$push": {"chat_log": user_msg}})

    # AI responds to feedback
    context = f"Building a {build['niche']} store called '{build.get('plan',{}).get('brand_name','TBD')}'. Current progress: {len(build.get('steps_completed',[]))}/{len(BUILD_STEPS)} steps complete. User says: {req.message}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"buildchat_{build_id}",
        system_message="You are orchestrAI's Store Architect mid-build. The user is giving feedback on the store being built. Acknowledge their input warmly, explain how you'll incorporate it, and keep it brief (2-3 sentences max). Be a great co-founder.")
    chat.with_model("openai", "gpt-5.2")
    response = await chat.send_message(UserMessage(text=context))

    agent_msg = {"role": "agent", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.store_builds.update_one({"id": build_id}, {"$push": {"chat_log": agent_msg}})

    return {"chat_log": (await db.store_builds.find_one({"id": build_id}, {"chat_log": 1, "_id": 0})).get("chat_log", [])}

@api_router.get("/store-builder/status/{build_id}")
async def get_build_status(build_id: str, request: Request):
    """Get current build status and chat log"""
    user = await get_current_user(request)
    build = await db.store_builds.find_one({"id": build_id, "user_id": user["_id"]}, {"_id": 0, "user_id": 0})
    if not build:
        raise HTTPException(status_code=404, detail="Build not found")
    return build

@api_router.get("/store-builder/plans")
async def get_store_plans(request: Request):
    user = await get_current_user(request)
    plans = await db.store_builds.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0, "chat_log": 0}).sort("created_at", -1).to_list(10)
    return plans

@api_router.post("/store-builder/deploy/{plan_id}")
async def deploy_store_plan(plan_id: str, store_id: str, request: Request):
    """Deploy a store plan to a connected Shopify store via API — creates real products"""
    import httpx
    user = await get_current_user(request)
    user_id = user["_id"]

    plan = await db.store_plans.find_one({"id": plan_id, "user_id": user_id})
    if not plan or not plan.get("plan"):
        raise HTTPException(status_code=404, detail="Store plan not found")

    store = await db.stores.find_one({"id": store_id, "user_id": user_id})
    if not store or not store.get("access_token"):
        raise HTTPException(status_code=400, detail="Store not connected via OAuth — connect with Shopify first")

    shop = store["store_url"].replace("https://", "")
    token = store["access_token"]
    plan_data = plan["plan"]
    products = plan_data.get("products", [])

    created = 0
    errors = []
    async with httpx.AsyncClient() as http:
        for product in products:
            try:
                payload = {
                    "product": {
                        "title": product.get("title", ""),
                        "body_html": product.get("description", ""),
                        "vendor": plan_data.get("brand_name", store["name"]),
                        "product_type": plan.get("niche", ""),
                        "tags": ",".join(product.get("tags", [])),
                        "variants": [{
                            "price": str(product.get("price", "0")),
                            "compare_at_price": str(product.get("compare_at_price", "")) if product.get("compare_at_price") else None,
                            "sku": product.get("sku_prefix", ""),
                            "inventory_management": "shopify",
                            "inventory_quantity": 100,
                        }]
                    }
                }
                resp = await http.post(f"https://{shop}/admin/api/2024-01/products.json",
                    json=payload, headers={"X-Shopify-Access-Token": token})
                if resp.status_code in (200, 201):
                    created += 1
                else:
                    errors.append(f"{product.get('title', '?')}: {resp.status_code}")
            except Exception as e:
                errors.append(f"{product.get('title', '?')}: {str(e)}")

    # Update store metrics
    await db.stores.update_one({"id": store_id}, {"$inc": {"products_synced": created}})
    await db.store_plans.update_one({"id": plan_id}, {"$set": {"status": "deployed", "deployed_to": store_id}})
    await db.activity_log.insert_one({"user_id": user_id, "type": "store_deployed",
        "message": f"Deployed {created} products to {store['name']}",
        "timestamp": datetime.now(timezone.utc).isoformat()})

    return {"created": created, "errors": errors, "total": len(products)}

# ──────────────── Browser Agent (Playwright) ────────────────

class BrowserTaskRequest(BaseModel):
    task_type: str  # research, setup, screenshot, scrape, monitor, custom
    url: Optional[str] = None
    instructions: Optional[str] = None
    store_id: Optional[str] = None

@api_router.post("/browser/execute")
async def execute_browser_task(req: BrowserTaskRequest, request: Request):
    """Execute a browser automation task using Playwright"""
    from playwright.async_api import async_playwright
    import base64

    user = await get_current_user(request)
    user_id = user["_id"]

    task_doc = {
        "id": str(uuid.uuid4()), "user_id": user_id, "task_type": req.task_type,
        "url": req.url, "instructions": req.instructions,
        "status": "running", "screenshots": [], "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.browser_tasks.insert_one(task_doc)

    # Build AI instructions based on task type
    context = await build_agent_context(user_id, "store_manager")
    task_prompts = {
        "research": f"Research competitors and trending products for this user's business.\n{context}\nURL: {req.url or 'search for relevant competitors'}\nUser instructions: {req.instructions or 'Find top 5 competitors, their pricing, bestsellers, and unique selling points.'}",
        "setup": f"Help set up a store or configure settings.\n{context}\nURL: {req.url}\nUser instructions: {req.instructions or 'Document what needs to be configured.'}",
        "screenshot": f"Capture and analyze a webpage.\nURL: {req.url}\nUser instructions: {req.instructions or 'Take a screenshot and describe what you see.'}",
        "scrape": f"Extract product data from a webpage.\n{context}\nURL: {req.url}\nUser instructions: {req.instructions or 'Extract all product names, prices, and descriptions.'}",
        "monitor": f"Check competitor prices and availability.\n{context}\nURL: {req.url}\nUser instructions: {req.instructions or 'Monitor pricing and stock status.'}",
        "custom": f"Execute a custom browser task.\n{context}\nURL: {req.url}\nUser instructions: {req.instructions or 'No specific instructions.'}",
    }

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            browser_context = await browser.new_context(
                viewport={"width": 1280, "height": 800},
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            )
            page = await browser_context.new_page()

            screenshots = []
            scraped_data = []

            if req.task_type == "research" and not req.url:
                # AI-driven research: search for competitors
                stores = await db.stores.find({"user_id": user_id}, {"_id": 0}).to_list(5)
                niche = ""
                if stores:
                    niche = stores[0].get("name", "ecommerce")
                search_query = req.instructions or f"{niche} store competitors"
                await page.goto(f"https://www.google.com/search?q={search_query.replace(' ', '+')}", timeout=15000)
                await page.wait_for_timeout(2000)
                screenshot_bytes = await page.screenshot(type="jpeg", quality=50)
                screenshots.append(base64.b64encode(screenshot_bytes).decode())

                # Extract search results
                results = await page.evaluate("""() => {
                    const items = document.querySelectorAll('div.g, div[data-sokoban-container]');
                    return Array.from(items).slice(0, 8).map(el => {
                        const title = el.querySelector('h3')?.textContent || '';
                        const link = el.querySelector('a')?.href || '';
                        const snippet = el.querySelector('.VwiC3b, [data-snc]')?.textContent || '';
                        return { title, link, snippet };
                    }).filter(r => r.title);
                }""")
                scraped_data = results

            elif req.url:
                await page.goto(req.url, timeout=20000)
                await page.wait_for_timeout(3000)
                screenshot_bytes = await page.screenshot(type="jpeg", quality=50, full_page=False)
                screenshots.append(base64.b64encode(screenshot_bytes).decode())

                if req.task_type == "scrape":
                    # Extract product-like data from page
                    products = await page.evaluate("""() => {
                        const items = [];
                        // Try common ecommerce selectors
                        document.querySelectorAll('[class*="product"], [class*="item"], .grid-item, .card').forEach(el => {
                            const title = el.querySelector('h2, h3, h4, [class*="title"], [class*="name"]')?.textContent?.trim() || '';
                            const price = el.querySelector('[class*="price"], .money, [class*="amount"]')?.textContent?.trim() || '';
                            if (title) items.push({ title, price: price || 'N/A' });
                        });
                        return items.slice(0, 20);
                    }""")
                    scraped_data = products

                elif req.task_type == "monitor":
                    # Extract pricing data
                    prices = await page.evaluate("""() => {
                        const data = [];
                        document.querySelectorAll('[class*="price"], .money, [class*="amount"]').forEach(el => {
                            const text = el.textContent?.trim();
                            if (text && text.match(/[\$\£\€]/)) data.push(text);
                        });
                        return [...new Set(data)].slice(0, 30);
                    }""")
                    scraped_data = [{"price": p} for p in prices]

                # Scroll and take another screenshot for full page context
                await page.evaluate("window.scrollBy(0, 600)")
                await page.wait_for_timeout(1000)
                screenshot_bytes2 = await page.screenshot(type="jpeg", quality=50, full_page=False)
                screenshots.append(base64.b64encode(screenshot_bytes2).decode())

            await browser.close()

        # Now have AI analyze what was found
        analysis_prompt = task_prompts.get(req.task_type, task_prompts["custom"])
        if scraped_data:
            analysis_prompt += f"\n\nDATA EXTRACTED FROM BROWSER:\n{str(scraped_data)[:3000]}"
        analysis_prompt += "\n\nBased on the browser data above, provide a detailed analysis with actionable recommendations. Be specific with numbers and strategies."

        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"browser_{task_doc['id']}",
            system_message="You are orchestrAI's Browser Intelligence Agent. You analyze web data collected by our automated browser to provide competitive intelligence, market research, and actionable eCommerce insights. Be specific and data-driven.")
        chat.with_model("openai", "gpt-5.2")
        analysis = await chat.send_message(UserMessage(text=analysis_prompt))

        await db.browser_tasks.update_one({"id": task_doc["id"]}, {"$set": {
            "status": "completed", "screenshots": screenshots, "scraped_data": scraped_data,
            "result": analysis, "completed_at": datetime.now(timezone.utc).isoformat()
        }})
        await db.activity_log.insert_one({"user_id": user_id, "type": "browser_task",
            "message": f"Browser Agent: {req.task_type} task completed",
            "timestamp": datetime.now(timezone.utc).isoformat()})

        return {"id": task_doc["id"], "status": "completed", "task_type": req.task_type,
                "screenshots": screenshots, "scraped_data": scraped_data[:10], "result": analysis}

    except Exception as e:
        await db.browser_tasks.update_one({"id": task_doc["id"]}, {"$set": {"status": "failed", "result": str(e)}})
        logger.error(f"Browser task error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/browser/history")
async def get_browser_history(request: Request):
    user = await get_current_user(request)
    tasks = await db.browser_tasks.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0, "screenshots": 0}).sort("created_at", -1).to_list(20)
    return tasks

@api_router.get("/browser/task/{task_id}")
async def get_browser_task(task_id: str, request: Request):
    user = await get_current_user(request)
    task = await db.browser_tasks.find_one({"id": task_id, "user_id": user["_id"]}, {"_id": 0, "user_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# ──────────────── Dashboard ────────────────

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    stores = await db.stores.count_documents({"user_id": user_id})
    agents = await db.agents.count_documents({"user_id": user_id, "is_active": True})
    tasks = await db.tasks.count_documents({"user_id": user_id, "status": "completed"})
    social = await db.social_content.count_documents({"user_id": user_id})
    pending = await db.actions.count_documents({"user_id": user_id, "status": "executing"})
    active_wf = await db.workflows.count_documents({"user_id": user_id, "status": "running"})
    pipeline = [{"$match": {"user_id": user_id}}, {"$group": {"_id": None, "total_revenue": {"$sum": "$revenue"}, "total_orders": {"$sum": "$orders_total"}}}]
    agg = await db.stores.aggregate(pipeline).to_list(1)
    revenue = agg[0]["total_revenue"] if agg else 0
    orders = agg[0]["total_orders"] if agg else 0
    recent = await db.activity_log.find({"user_id": user_id}, {"_id": 0}).sort("timestamp", -1).to_list(10)
    return {"total_stores": stores, "active_agents": agents, "tasks_completed": tasks,
            "total_revenue": revenue, "total_orders": orders, "social_posts": social,
            "pending_actions": pending, "active_workflows": active_wf, "recent_activity": recent}

# ──────────────── Shopify OAuth ────────────────

SHOPIFY_CLIENT_ID = os.environ.get('SHOPIFY_PARTNER_CLIENT_ID', '')
SHOPIFY_CLIENT_SECRET = os.environ.get('SHOPIFY_PARTNER_CLIENT_SECRET', '')
SHOPIFY_SCOPES = "read_products,write_products,read_orders,read_inventory,write_inventory,read_customers"

@api_router.get("/shopify/auth")
async def shopify_auth_start(shop: str, request: Request):
    """Start Shopify OAuth — redirects user to Shopify authorization page"""
    user = await get_current_user(request)
    if not SHOPIFY_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Shopify integration not configured")
    shop = shop.strip().replace("https://", "").replace("http://", "").split("/")[0]
    if not shop.endswith(".myshopify.com"):
        shop = f"{shop}.myshopify.com"
    state = secrets.token_urlsafe(32)
    await db.oauth_states.insert_one({"state": state, "user_id": user["_id"], "shop": shop, "platform": "shopify",
        "created_at": datetime.now(timezone.utc).isoformat()})
    redirect_uri = f"{os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://agent-marketplace-69.preview.emergentagent.com')}/api/shopify/callback"
    auth_url = f"https://{shop}/admin/oauth/authorize?client_id={SHOPIFY_CLIENT_ID}&scope={SHOPIFY_SCOPES}&redirect_uri={redirect_uri}&state={state}"
    return {"auth_url": auth_url, "shop": shop}

@api_router.get("/shopify/callback")
async def shopify_callback(code: str, state: str, shop: str):
    """Shopify OAuth callback — exchanges code for access token"""
    import httpx
    oauth_state = await db.oauth_states.find_one({"state": state})
    if not oauth_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    user_id = oauth_state["user_id"]
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(f"https://{shop}/admin/oauth/access_token", json={
                "client_id": SHOPIFY_CLIENT_ID, "client_secret": SHOPIFY_CLIENT_SECRET, "code": code
            })
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to get access token")
            token_data = resp.json()
            access_token = token_data.get("access_token")
            # Save store with access token
            store_doc = {
                "id": str(uuid.uuid4()), "user_id": user_id, "name": shop.replace(".myshopify.com", ""),
                "platform": "shopify", "store_url": f"https://{shop}", "status": "connected",
                "access_token": access_token, "shopify_scope": token_data.get("scope", ""),
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "products_synced": 0, "orders_total": 0, "revenue": 0.0,
            }
            await db.stores.insert_one(store_doc)
            await db.activity_log.insert_one({"user_id": user_id, "type": "store_connected",
                "message": f"Connected Shopify store: {shop}", "timestamp": datetime.now(timezone.utc).isoformat()})
            await db.oauth_states.delete_one({"state": state})
            # Redirect back to app
            return Response(content="<html><body><script>window.close();</script><h2>Store connected! You can close this window.</h2></body></html>", media_type="text/html")
    except httpx.HTTPError as e:
        logger.error(f"Shopify OAuth error: {e}")
        raise HTTPException(status_code=500, detail="Shopify connection failed")

@api_router.post("/shopify/sync/{store_id}")
async def sync_shopify_store(store_id: str, request: Request):
    """Sync products and orders from Shopify"""
    import httpx
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": store_id, "user_id": user["_id"], "platform": "shopify"})
    if not store or not store.get("access_token"):
        raise HTTPException(status_code=404, detail="Shopify store not found or not authorized")
    shop = store["store_url"].replace("https://", "")
    token = store["access_token"]
    try:
        async with httpx.AsyncClient() as client_http:
            # Fetch products count
            prod_resp = await client_http.get(f"https://{shop}/admin/api/2024-01/products/count.json",
                headers={"X-Shopify-Access-Token": token})
            products = prod_resp.json().get("count", 0) if prod_resp.status_code == 200 else 0
            # Fetch orders count
            ord_resp = await client_http.get(f"https://{shop}/admin/api/2024-01/orders/count.json?status=any",
                headers={"X-Shopify-Access-Token": token})
            orders = ord_resp.json().get("count", 0) if ord_resp.status_code == 200 else 0
            await db.stores.update_one({"id": store_id}, {"$set": {"products_synced": products, "orders_total": orders,
                "last_synced": datetime.now(timezone.utc).isoformat()}})
            return {"products_synced": products, "orders_total": orders}
    except Exception as e:
        logger.error(f"Shopify sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────── Etsy OAuth ────────────────

ETSY_API_KEY = os.environ.get('ETSY_API_KEY', '')

@api_router.get("/etsy/auth")
async def etsy_auth_start(request: Request):
    """Start Etsy OAuth flow"""
    user = await get_current_user(request)
    if not ETSY_API_KEY:
        raise HTTPException(status_code=503, detail="Etsy integration not configured")
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    import hashlib, base64
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode()).digest()).rstrip(b'=').decode()
    await db.oauth_states.insert_one({"state": state, "user_id": user["_id"], "platform": "etsy",
        "code_verifier": code_verifier, "created_at": datetime.now(timezone.utc).isoformat()})
    redirect_uri = f"{os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://agent-marketplace-69.preview.emergentagent.com')}/api/etsy/callback"
    scopes = "transactions_r%20listings_r%20listings_w%20shops_r"
    auth_url = f"https://www.etsy.com/oauth/connect?response_type=code&redirect_uri={redirect_uri}&scope={scopes}&client_id={ETSY_API_KEY}&state={state}&code_challenge={code_challenge}&code_challenge_method=S256"
    return {"auth_url": auth_url}

# ──────────────── Promo Codes ────────────────

PROMO_CODES = {
    "Peanut1212!": {"plan": "agency", "discount": 100, "label": "Founder Forever Free"},
}

@api_router.post("/promo/validate")
async def validate_promo(request: Request, code: str = ""):
    """Validate a promo code and apply it to the user's account"""
    user = await get_current_user(request)
    promo = PROMO_CODES.get(code)
    if not promo:
        raise HTTPException(status_code=400, detail="Invalid promo code")
    # Apply promo — upgrade plan, remove trial expiry
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {
        "plan": promo["plan"], "promo_code": code, "promo_label": promo["label"],
        "trial_ends_at": None,  # No trial needed — it's free forever
    }})
    await db.activity_log.insert_one({"user_id": user["_id"], "type": "promo_applied",
        "message": f"Promo code applied: {promo['label']}",
        "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "applied", "plan": promo["plan"], "label": promo["label"], "discount": promo["discount"]}

# ──────────────── Health ────────────────

@api_router.get("/")
async def root():
    return {"app": "orchestrAI", "version": "3.0.0", "status": "operational"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "orchestrAI — AI Agent Commerce Platform"}

# ──────────────── App Setup ────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
