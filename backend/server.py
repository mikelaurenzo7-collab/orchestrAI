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
    mode: str = "copilot"
    spending_cap: float = 50.0

class StoreSafetyUpdate(BaseModel):
    mode: Optional[str] = None  # "autonomous" | "copilot" | "observe"
    spending_cap: Optional[float] = None
    # Money-touching actions — locked by default, user can unlock
    auto_change_prices: Optional[bool] = None      # default: False (needs approval)
    auto_create_discounts: Optional[bool] = None    # default: False (needs approval)
    auto_purchase_inventory: Optional[bool] = None  # default: False (needs approval)
    auto_run_ads: Optional[bool] = None             # default: False (needs approval)
    auto_issue_refunds: Optional[bool] = None       # default: False (needs approval)
    # Non-money actions — autonomous by default, user can lock
    auto_edit_products: Optional[bool] = None       # default: True (autonomous)
    auto_manage_collections: Optional[bool] = None  # default: True (autonomous)
    auto_post_social: Optional[bool] = None         # default: True (autonomous)
    auto_respond_customers: Optional[bool] = None   # default: True (autonomous)
    auto_update_seo: Optional[bool] = None          # default: True (autonomous)
    max_price_change_pct: Optional[float] = None    # max price change before approval
    max_discount_pct: Optional[float] = None        # max discount before approval

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
    social_scope: Optional[str] = None  # "personal", "store", "business"

class SocialScopeUpdate(BaseModel):
    scope: str  # "personal", "store", "business"

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
    "store_manager": """You are Maestro — orchestrAI's master store conductor. You build, optimize, and manage every aspect of eCommerce operations.
Your name is Maestro. Introduce yourself as Maestro when users first interact with you.

IMPORTANT: If a user doesn't have a store yet or their store is under review, guide them through creating a new one:
1. Ask what niche/products they want to sell
2. Suggest a store name based on their brand
3. Tell them you can help set up a brand new Shopify development store — they just need to go to partners.shopify.com → Stores → Create development store
4. Once they have the store, walk them through connecting it in the Stores tab
5. Then immediately start building: create products, collections, and optimize everything

You are proactive. Don't wait for the user to figure things out — lead them step by step.

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

    "marketing": """You are Aria — orchestrAI's powerful marketing voice. You create viral content, manage social media, and drive explosive eCommerce growth.
Your name is Aria. Introduce yourself as Aria when users first interact with you.

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

    "analytics": """You are Cadence — orchestrAI's brilliant data conductor. You read the rhythm of business data and deliver actionable intelligence.
Your name is Cadence. Introduce yourself as Cadence when users first interact with you.

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

    "customer_service": """You are Harmony — orchestrAI's customer experience virtuoso. You bring resolution, peace, and lasting loyalty.
Your name is Harmony. Introduce yourself as Harmony when users first interact with you.

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

You command a fleet of 8 platform-specific Executive Assistants:
- Shopify EA, Etsy EA, eBay EA — manage your stores
- Twitter EA, Pinterest EA, TikTok EA, Meta EA — manage your social presence
- Analytics Command Center — cross-platform intelligence

YOUR ROLE: You're not just an assistant — you're the user's AI co-founder. Think strategically about their entire business. Connect dots between departments. When they ask about marketing, also consider how it affects inventory. When they discuss pricing, think about the customer experience impact.

RULES: Be decisive. Give specific recommendations, not generic advice. When you don't have enough data, ask targeted questions to get it. Always think about revenue impact. End responses with a clear next action.""",

    "shopify": """You are the user's Shopify Executive Assistant. You are an expert in everything Shopify — products, inventory, orders, themes, SEO, and store optimization.

CRITICAL: If the user doesn't have a Shopify store yet or says their store is under review:
1. Ask what niche/products they want to sell
2. Suggest a great store name
3. Walk them through creating a dev store: partners.shopify.com → Stores → Create development store
4. Once created, guide them to connect it in the Stores tab
5. Then immediately start building products for them

You are proactive — lead the user, don't wait for them to figure it out. When creating products, use ACTION blocks.
Be specific with pricing, descriptions, and SEO tags. Know Shopify inside and out.""",

    "etsy": """You are the user's Etsy Executive Assistant. You are an expert in the Etsy marketplace — handmade listings, Etsy SEO, tags, categories, shop policies, and the Etsy algorithm.
You know that Etsy rewards: strong tags (13 per listing), first 40 chars of title matter most, high-quality mockups, and consistent shop activity. Help the user dominate Etsy search.""",

    "ebay": """You are the user's eBay Executive Assistant. You know eBay auctions, Buy It Now, Best Offer strategies, seller metrics, feedback optimization, and listing templates.
You understand eBay's algorithm rewards: competitive pricing, fast shipping, good seller ratings, and detailed item specifics.""",

    "twitter": """You are the user's Twitter/X Executive Assistant. You create viral content, manage engagement, and grow their audience.
You know the X algorithm: early engagement in first 30 min matters most, replies boost reach, threads outperform single tweets, controversy drives impressions. Max 280 chars. Be punchy, provocative, and quotable.""",

    "pinterest": """You are the user's Pinterest Executive Assistant. You are a Pinterest SEO master.
Pinterest is a SEARCH ENGINE, not a social network. Every pin needs keyword-rich titles and descriptions. Long-tail keywords win. Vertical images perform 80% better. Fresh pins get priority. Help users rank #1 in Pinterest search.""",

    "tiktok": """You are the user's TikTok Executive Assistant. You ride trends and create hooks that prevent swipe-aways.
TikTok's algorithm: first 3 seconds decide everything, trending sounds boost reach 200%, hashtag challenges drive virality, authentic > polished. Keep captions under 150 chars. Sound like a real person, not a brand.""",

    "meta": """You are the user's Meta Executive Assistant covering Facebook AND Instagram.
FB: Conversational posts get 3x engagement, questions drive comments, Reels get 2x reach of photos, Groups build community.
IG: First line of caption must hook, 20-30 hashtags still work (mix sizes), Stories drive DM sales, Reels > everything else.""",

    "email": """You are the user's Email Executive Assistant. You manage their inbox like a world-class chief of staff.
Draft professional emails, create follow-up sequences, manage campaign copy, sort priorities. Never send without approval. Match the user's brand voice exactly. Keep emails concise — nobody reads long emails.""",

    "crm": """You are the user's CRM Executive Assistant. You manage their sales pipeline and customer relationships.
Track every lead, suggest follow-up timing, score leads by engagement, forecast deal closings, and never let a prospect fall through the cracks. Think like a VP of Sales.""",

    "marketing_suite": """You are the user's Marketing Executive Assistant. You run campaigns, optimize ad spend, and grow their audience.
Know email marketing (subject lines, segmentation, timing), paid ads (ROAS optimization, audience targeting), and conversion funnels. Every dollar should have measurable ROI.""",

    "finance": """You are the user's Finance Executive Assistant. You keep their books clean and their cash flow healthy.
Track expenses, generate invoice copy, forecast revenue, flag unusual spending, and prepare financial summaries. Think like a CFO — every number matters.""",

    "hr": """You are the user's HR Executive Assistant. You manage people operations.
Draft job descriptions, create onboarding checklists, write team policies, manage hiring pipelines, and keep the team aligned. Be empathetic but efficient.""",

    "sales": """You are the user's Sales Executive Assistant. You close deals.
Qualify leads, craft outreach messages, prepare proposals, handle objections, and book meetings. Know the difference between enterprise sales cycles and SMB quick closes. Always be closing.""",

    "operations": """You are the user's Operations Executive Assistant. You keep the machine running.
Manage projects, assign tasks, track deadlines, create status reports, and optimize workflows. Think like a COO — efficiency is everything.""",

    "legal": """You are the user's Legal Executive Assistant. You protect the business.
Generate contract drafts, create NDA templates, review terms of service, check compliance requirements, and flag legal risks. Always recommend professional legal review for critical documents.""",

    "youtube": """You are the user's YouTube Executive Assistant. You grow their channel.
Optimize titles for CTR (curiosity + keyword), descriptions with timestamps and keywords, thumbnail concepts that pop, and content strategy based on audience retention data. Know the YouTube algorithm: watch time > everything.""",

    "whatsapp": """You are the user's WhatsApp Business Executive Assistant.
Manage customer conversations, create broadcast lists, set up quick replies, share product catalogs, and send order updates. Keep messages personal — WhatsApp is intimate, not broadcast.""",

    "threads": """You are the user's Threads Executive Assistant.
Create conversational, authentic posts. Threads rewards real opinions over polished content. No hashtags needed. Cross-post from Instagram when relevant. Engage in replies — the algorithm rewards conversation.""",

    "reddit": """You are the user's Reddit Executive Assistant.
Reddit HATES obvious marketing. Be authentic, provide value, engage genuinely in relevant subreddits. Know the culture of each sub before posting. AMAs drive massive traffic. Never be salesy.""",

    "linkedin": """You are the user's LinkedIn Executive Assistant.
Create thought leadership content, optimize their company page, manage B2B networking, draft professional posts. LinkedIn rewards: personal stories > corporate speak, carousels > text posts, comments on others' posts boost your reach.""",

    "discord": """You are the user's Discord Executive Assistant.
Set up and manage community servers, create channel structures, write welcome messages, moderate discussions, and plan events. Discord communities drive the most loyal customers.""",

    "walmart": """You are the user's Walmart Marketplace Executive Assistant.
Optimize listings for Walmart search, manage pricing for Buy Box competition, track fulfillment metrics, and maintain seller scorecard. Walmart rewards: fast shipping, competitive pricing, detailed item specifics.""",

    "faire": """You are the user's Faire Executive Assistant.
Manage wholesale catalog, set retailer pricing tiers, handle B2B orders, and build retailer relationships. Faire rewards: fast response times, good fill rates, and Net 60 payment terms.""",

    "mercari": """You are the user's Mercari Executive Assistant.
Optimize listings with clear photos and honest descriptions, price competitively, ship fast, and maintain high ratings. Mercari rewards: quick shipping, responsive sellers, fair pricing.""",

    "poshmark": """You are the user's Poshmark Executive Assistant.
Manage closet strategy, share listings during Posh Parties, create bundles, and engage with the community. Poshmark rewards: frequent sharing (30+ items/day), community engagement, and fast shipping."""
}

# ──────────────── Pricing & Plans ────────────────

# Social posting: ONLY social agents post. User chooses the purpose.
# - Personal: user's own social content
# - Store: promoting their ecommerce products
# - Business: Marketing EA delegates to social agents
# Other agents (Email, CRM, Finance, HR, Sales, Ops, Legal, Analytics) NEVER post directly.
# They can REQUEST the Marketing EA to coordinate social posting on their behalf.
SOCIAL_AGENT_TYPES = {
    "twitter", "pinterest", "tiktok", "meta", "youtube",
    "whatsapp", "threads", "linkedin", "reddit", "discord",
}
SOCIAL_DELEGATOR = "marketing_suite"  # Business agents route through Marketing EA

PRICING_PLANS = {
    "free": {
        "name": "Free", "price": 0, "interval": "forever",
        "agents": 2, "actions_per_month": 100, "connectors": 1,
        "features": ["2 AI agents", "100 actions/mo", "1 connector", "Basic chat"],
        "categories": ["commerce"],
    },
    "starter": {
        "name": "Starter", "price": 29, "interval": "month",
        "agents": 5, "actions_per_month": 1000, "connectors": 3,
        "features": ["5 AI agents", "1,000 actions/mo", "3 connectors", "Campaign launcher", "Safety controls"],
        "categories": ["commerce", "social"],
    },
    "growth": {
        "name": "Growth", "price": 79, "interval": "month",
        "agents": 10, "actions_per_month": 5000, "connectors": 8,
        "features": ["All commerce & social agents", "5,000 actions/mo", "8 connectors", "Autopilot mode", "Custom training", "Priority support"],
        "categories": ["commerce", "social"],
        "popular": True,
    },
    "business": {
        "name": "Business", "price": 199, "interval": "month",
        "agents": 16, "actions_per_month": 25000, "connectors": "unlimited",
        "features": ["All 16 agents (commerce + business)", "25,000 actions/mo", "Unlimited connectors", "Email, CRM, Finance, HR, Sales, Ops, Legal agents", "White-glove onboarding"],
        "categories": ["commerce", "social", "business"],
    },
    "enterprise": {
        "name": "Enterprise", "price": 499, "interval": "month",
        "agents": "unlimited", "actions_per_month": "unlimited", "connectors": "unlimited",
        "features": ["Unlimited everything", "Custom agents", "API access", "White-label option", "Dedicated success manager", "SLA guarantee"],
        "categories": ["commerce", "social", "business", "custom"],
    },
}

@api_router.get("/pricing")
async def get_pricing():
    """Get pricing plans"""
    return PRICING_PLANS

@api_router.get("/connectors")
async def get_available_connectors():
    """Get all available tool connectors"""
    return {
        "commerce": [
            {"id": "shopify", "name": "Shopify", "icon": "🛍️", "color": "#96BF48", "status": "live"},
            {"id": "etsy", "name": "Etsy", "icon": "🧶", "color": "#F1641E", "status": "live"},
            {"id": "ebay", "name": "eBay", "icon": "🏷️", "color": "#E53238", "status": "live"},
            {"id": "woocommerce", "name": "WooCommerce", "icon": "🛒", "color": "#7B51AD", "status": "coming_soon"},
            {"id": "amazon", "name": "Amazon", "icon": "📦", "color": "#FF9900", "status": "coming_soon"},
        ],
        "social": [
            {"id": "twitter", "name": "Twitter/X", "icon": "🐦", "color": "#1DA1F2", "status": "live"},
            {"id": "pinterest", "name": "Pinterest", "icon": "📌", "color": "#E60023", "status": "live"},
            {"id": "tiktok", "name": "TikTok", "icon": "🎵", "color": "#FE2C55", "status": "live"},
            {"id": "meta", "name": "Meta", "icon": "📘", "color": "#0866FF", "status": "live"},
        ],
        "business": [
            {"id": "gmail", "name": "Gmail", "icon": "📧", "color": "#EA4335", "status": "coming_soon"},
            {"id": "outlook", "name": "Outlook", "icon": "📧", "color": "#0078D4", "status": "coming_soon"},
            {"id": "hubspot", "name": "HubSpot", "icon": "🤝", "color": "#FF7A59", "status": "coming_soon"},
            {"id": "salesforce", "name": "Salesforce", "icon": "☁️", "color": "#00A1E0", "status": "coming_soon"},
            {"id": "mailchimp", "name": "Mailchimp", "icon": "📮", "color": "#FFE01B", "status": "coming_soon"},
            {"id": "google_ads", "name": "Google Ads", "icon": "📊", "color": "#4285F4", "status": "coming_soon"},
            {"id": "quickbooks", "name": "QuickBooks", "icon": "💰", "color": "#2CA01C", "status": "coming_soon"},
            {"id": "stripe", "name": "Stripe", "icon": "💳", "color": "#635BFF", "status": "coming_soon"},
            {"id": "calendly", "name": "Calendly", "icon": "📅", "color": "#006BFF", "status": "coming_soon"},
            {"id": "slack", "name": "Slack", "icon": "💬", "color": "#4A154B", "status": "coming_soon"},
            {"id": "asana", "name": "Asana", "icon": "⚙️", "color": "#F06A6A", "status": "coming_soon"},
            {"id": "notion", "name": "Notion", "icon": "📝", "color": "#000000", "status": "coming_soon"},
            {"id": "docusign", "name": "DocuSign", "icon": "📋", "color": "#4C2B90", "status": "coming_soon"},
            {"id": "zoom", "name": "Zoom", "icon": "🎥", "color": "#2D8CFF", "status": "coming_soon"},
            {"id": "gusto", "name": "Gusto", "icon": "👥", "color": "#F45D48", "status": "coming_soon"},
        ],
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
            context_parts.append("RECENT TASKS: " + ", ".join(t.get("title", "") for t in tasks))
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

    # Agent custom training (user-defined rules, brand voice, dos/donts)
    agent_doc = await db.agents.find_one({"user_id": user_id, "agent_type": agent_type})
    if agent_doc and agent_doc.get("training"):
        t = agent_doc["training"]
        context_parts.append("\n=== YOUR CUSTOM TRAINING (FOLLOW STRICTLY) ===")
        if t.get("brand_voice"):
            context_parts.append(f"BRAND VOICE: {t['brand_voice']} — Match this tone in EVERY response and action.")
        if t.get("target_audience"):
            context_parts.append(f"TARGET AUDIENCE: {t['target_audience']}")
        if t.get("competitive_edge"):
            context_parts.append(f"COMPETITIVE EDGE: {t['competitive_edge']}")
        if t.get("custom_rules"):
            context_parts.append("RULES (never break these):")
            for rule in t["custom_rules"]:
                context_parts.append(f"  ⚡ {rule}")
        if t.get("dos"):
            context_parts.append("ALWAYS DO:")
            for d in t["dos"]:
                context_parts.append(f"  ✅ {d}")
        if t.get("donts"):
            context_parts.append("NEVER DO:")
            for d in t["donts"]:
                context_parts.append(f"  ❌ {d}")
        if t.get("tone_examples"):
            context_parts.append("EXAMPLE MESSAGES (match this style):")
            for ex in t["tone_examples"][:3]:
                context_parts.append(f'  "{ex}"')

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
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Shopify Executive Assistant", "agent_type": "shopify",
         "category": "store", "platform": "shopify",
         "description": "Manages your Shopify store — products, inventory, orders, and optimization.",
         "personality": "strategic", "tone": "executive", "auto_execute": True, "is_active": True,
         "capabilities": ["product_management", "inventory_optimization", "order_processing", "store_setup", "catalog_audit"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Etsy Executive Assistant", "agent_type": "etsy",
         "category": "store", "platform": "etsy",
         "description": "Manages your Etsy shop — listings, SEO, reviews, and marketplace strategy.",
         "personality": "creative", "tone": "artisan", "auto_execute": True, "is_active": True,
         "capabilities": ["listing_optimization", "etsy_seo", "review_management", "shop_policies", "seasonal_strategy"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "eBay Executive Assistant", "agent_type": "ebay",
         "category": "store", "platform": "ebay",
         "description": "Manages your eBay presence — listings, auctions, pricing, and seller metrics.",
         "personality": "analytical", "tone": "competitive", "auto_execute": True, "is_active": True,
         "capabilities": ["auction_strategy", "listing_optimization", "pricing_intelligence", "seller_metrics", "bulk_listing"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Twitter Executive Assistant", "agent_type": "twitter",
         "category": "social", "platform": "twitter",
         "description": "Manages your X/Twitter — viral tweets, threads, engagement, and audience growth.",
         "personality": "witty", "tone": "punchy", "auto_execute": True, "is_active": True,
         "capabilities": ["tweet_creation", "thread_strategy", "engagement_replies", "trending_hooks", "audience_growth"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Pinterest Executive Assistant", "agent_type": "pinterest",
         "category": "social", "platform": "pinterest",
         "description": "Manages your Pinterest — pins, boards, SEO descriptions, and traffic generation.",
         "personality": "aspirational", "tone": "visual", "auto_execute": True, "is_active": True,
         "capabilities": ["pin_creation", "board_strategy", "pinterest_seo", "traffic_generation", "seasonal_content"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "TikTok Executive Assistant", "agent_type": "tiktok",
         "category": "social", "platform": "tiktok",
         "description": "Manages your TikTok — trend-riding content, viral hooks, and gen-z engagement.",
         "personality": "trendy", "tone": "casual", "auto_execute": True, "is_active": True,
         "capabilities": ["trend_riding", "hook_creation", "hashtag_strategy", "viral_content", "sound_selection"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Meta Executive Assistant", "agent_type": "meta",
         "category": "social", "platform": "meta",
         "description": "Manages your Facebook & Instagram — community, reels, stories, and ads.",
         "personality": "community", "tone": "conversational", "auto_execute": True, "is_active": True,
         "capabilities": ["community_management", "reel_creation", "story_strategy", "ad_optimization", "audience_building"],
         "tasks_completed": 0, "last_active": None, "training": {}},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Analytics Command Center", "agent_type": "analytics",
         "category": "intelligence", "platform": "all",
         "description": "Cross-platform intelligence — analyzes all stores and socials for patterns and opportunities.",
         "personality": "analytical", "tone": "precise", "auto_execute": True, "is_active": True,
         "capabilities": ["cross_platform_analytics", "trend_prediction", "revenue_forecasting", "competitor_tracking", "customer_intelligence"],
         "tasks_completed": 0, "last_active": None, "training": {}},
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
    await db.agents.create_index([("user_id", 1), ("agent_type", 1)])
    await db.stores.create_index("user_id")
    await db.chat_messages.create_index([("user_id", 1), ("agent_type", 1)])
    await db.actions.create_index([("user_id", 1), ("status", 1)])
    await db.social_content.create_index("user_id")
    await db.tasks.create_index("user_id")
    await db.activity_log.create_index([("user_id", 1), ("timestamp", -1)])
    await db.agent_memory.create_index([("user_id", 1), ("agent_type", 1)])
    await db.user_profiles.create_index("user_id")
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
        "mode": "copilot", "spending_cap": 50.0,
        "safety": {"auto_create_products": False, "auto_change_prices": False,
                   "auto_create_discounts": False, "auto_manage_inventory": False,
                   "max_price_change_pct": 20, "max_discount_pct": 30},
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

# ──────────────── Social Agent Scope Management ────────────────

@api_router.put("/agents/{agent_id}/scope")
async def update_social_scope(agent_id: str, body: SocialScopeUpdate, request: Request):
    """Set the scope of a social agent: personal, store, or business"""
    user = await get_current_user(request)
    if body.scope not in ("personal", "store", "business"):
        raise HTTPException(status_code=400, detail="Scope must be 'personal', 'store', or 'business'")
    agent = await db.agents.find_one({"id": agent_id, "user_id": user["_id"]})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.get("agent_type") not in SOCIAL_AGENT_TYPES:
        raise HTTPException(status_code=400, detail="Only social agents can have a scope")
    await db.agents.update_one({"id": agent_id, "user_id": user["_id"]}, {"$set": {"social_scope": body.scope}})
    return {"status": "updated", "agent_id": agent_id, "scope": body.scope}

@api_router.get("/agents/social")
async def get_social_agents(request: Request):
    """Get all social agents with their scopes for the current user"""
    user = await get_current_user(request)
    agents = await db.agents.find(
        {"user_id": user["_id"], "agent_type": {"$in": list(SOCIAL_AGENT_TYPES)}},
        {"_id": 0, "user_id": 0}
    ).to_list(50)
    for a in agents:
        a["social_scope"] = a.get("social_scope", "personal")
    return agents

# ──────────────── Chat ────────────────

@api_router.post("/chat")
async def chat_with_agent(req: ChatRequest, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]

    # ── Social Agent Scope Enforcement ──
    scope_context = ""
    if req.agent_type in SOCIAL_AGENT_TYPES:
        social_agent = await db.agents.find_one({"user_id": user_id, "agent_type": req.agent_type})
        scope = social_agent.get("social_scope", "personal") if social_agent else "personal"
        if scope == "business":
            scope_context = "\n\n[SCOPE: BUSINESS — You are operating under the Marketing EA's direction. All content must align with the business brand voice, marketing calendar, and campaign objectives. Coordinate with the Marketing EA for approval on campaign-level posts. Focus on ROI-driven content.]"
        elif scope == "store":
            scope_context = "\n\n[SCOPE: STORE — You are managing social media for the user's eCommerce store(s). All content should promote products, drive traffic, and support sales. Feature product launches, deals, reviews, and store updates. Coordinate with the Store EA for product data.]"
        else:
            scope_context = "\n\n[SCOPE: PERSONAL — You are managing the user's personal social media. Content should reflect their personal brand, interests, and voice. No direct product promotion unless the user asks.]"
    elif req.agent_type not in SOCIAL_AGENT_TYPES and req.agent_type not in ("general", "marketing_suite"):
        # Non-social, non-marketing agents cannot post to social — they delegate
        scope_context = "\n\n[SYSTEM: You do NOT have permission to post to social media directly. If the user asks you to create social content or post on social media, tell them to use the Marketing EA or the specific platform's Social Agent instead. You may draft content suggestions but cannot execute social posting.]"

    chat = await get_or_create_chat_with_context(user_id, req.agent_type)

    await db.chat_messages.insert_one({"user_id": user_id, "session_id": user_id, "agent_type": req.agent_type,
        "role": "user", "content": req.message, "timestamp": datetime.now(timezone.utc).isoformat()})
    try:
        # Check if user has connected stores (for store-aware agents)
        user_stores = await db.stores.find({"user_id": user_id, "status": "connected"}).to_list(10)
        store_context = ""
        if user_stores and req.agent_type in ("store", "marketing"):
            store_names = ", ".join([f"{s['platform']}:{s.get('name','')}" for s in user_stores])
            store_context = f"\n\n[CONNECTED STORES: {store_names}]"

        # Store Commander gets special instructions for creating products
        action_instruction = ""
        if req.agent_type == "store" and user_stores:
            action_instruction = """

[SYSTEM: You can create products, collections, and manage stores. When the user asks you to create a product or build out their store, respond with your recommendation AND include a structured ACTION block at the end of your response.

Format for each product:
ACTION:CREATE_PRODUCT|title=Product Name|description=HTML description|price=29.99|product_type=Category|tags=tag1,tag2|inventory=10

Format for collections:
ACTION:CREATE_COLLECTION|title=Collection Name|description=Collection description

You can include MULTIPLE action lines. The user will approve each one before it executes on their store. Always explain what you're about to create BEFORE the action lines. Be creative with product names, descriptions, and pricing based on the niche.]"""

        enhanced_msg = req.message + store_context + action_instruction + scope_context + "\n\n[SYSTEM: If the user reveals important facts about their business (product types, revenue goals, pain points, preferences), remember them by ending your response with a line starting with 'MEMORY:' followed by a key=value pair. Example: MEMORY: main_product=handmade jewelry. Only do this when genuinely new info is shared. Do NOT include MEMORY lines for casual chat.]"
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

        # Extract and queue store actions if present
        queued_actions = []
        if "ACTION:" in clean_response:
            lines = clean_response.split("\n")
            action_lines = [l.strip() for l in lines if l.strip().startswith("ACTION:")]
            display_lines = [l for l in lines if not l.strip().startswith("ACTION:")]
            clean_response = "\n".join(display_lines).strip()

            for al in action_lines:
                try:
                    parts = al.replace("ACTION:", "").strip().split("|")
                    action_type_raw = parts[0].strip().lower()
                    params = {}
                    for part in parts[1:]:
                        if "=" in part:
                            k, v = part.split("=", 1)
                            params[k.strip()] = v.strip()

                    action_type_map = {
                        "create_product": "create_product",
                        "create_collection": "create_collection",
                        "update_price": "update_price",
                    }
                    action_type = action_type_map.get(action_type_raw)
                    if action_type and user_stores:
                        target_store = user_stores[0]  # Default to first connected store
                        action_doc = {
                            "id": str(uuid.uuid4()), "user_id": user_id, "store_id": target_store["id"],
                            "store_name": target_store.get("name", ""), "platform": target_store.get("platform", ""),
                            "action_type": action_type, "payload": params,
                            "status": "pending",
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "executed_at": None, "result": None,
                        }
                        await db.store_actions.insert_one(action_doc)
                        queued_actions.append({"id": action_doc["id"], "type": action_type,
                            "title": params.get("title", ""), "price": params.get("price", "")})
                except Exception as e:
                    logger.error(f"Action parsing error: {e}")

        await db.chat_messages.insert_one({"user_id": user_id, "session_id": user_id, "agent_type": req.agent_type,
            "role": "assistant", "content": clean_response, "timestamp": datetime.now(timezone.utc).isoformat(),
            "queued_actions": queued_actions if queued_actions else None})
        await db.agents.update_one({"user_id": user_id, "agent_type": req.agent_type},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}, "$inc": {"tasks_completed": 1}})

        response_data = {"role": "assistant", "content": clean_response, "agent_type": req.agent_type}
        if queued_actions:
            response_data["queued_actions"] = queued_actions
            response_data["content"] += f"\n\n📋 **{len(queued_actions)} action(s) queued for your approval.** Check your pending actions to review and approve."
        return response_data
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

# ──────────────── Agent Training ────────────────

class AgentTrainingUpdate(BaseModel):
    brand_voice: Optional[str] = None      # "professional", "casual", "luxury", "playful"
    custom_rules: Optional[List[str]] = None  # ["Never discount below 20%", "Always mention free shipping"]
    dos: Optional[List[str]] = None        # Things agent should always do
    donts: Optional[List[str]] = None      # Things agent should never do
    tone_examples: Optional[List[str]] = None  # Example messages in the desired tone
    target_audience: Optional[str] = None  # Description of target audience
    competitive_edge: Optional[str] = None # What makes this brand unique

@api_router.get("/agents/{agent_id}/training")
async def get_agent_training(agent_id: str, request: Request):
    """Get training data for an agent"""
    user = await get_current_user(request)
    agent = await db.agents.find_one({"id": agent_id, "user_id": user["_id"]}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent.get("training", {})

@api_router.put("/agents/{agent_id}/training")
async def update_agent_training(agent_id: str, training: AgentTrainingUpdate, request: Request):
    """Train an agent with custom rules, brand voice, dos/donts"""
    user = await get_current_user(request)
    agent = await db.agents.find_one({"id": agent_id, "user_id": user["_id"]})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    current_training = agent.get("training", {})
    update_data = {k: v for k, v in training.dict().items() if v is not None}
    current_training.update(update_data)
    await db.agents.update_one({"id": agent_id}, {"$set": {"training": current_training}})
    # Clear chat instance so new training takes effect
    key = f"{user['_id']}_{agent['agent_type']}"
    if key in chat_instances:
        del chat_instances[key]
    await db.activity_log.insert_one({"user_id": user["_id"], "type": "agent_trained",
        "message": f"Trained {agent['name']} with custom rules", "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "updated", "training": current_training}

# ──────────────── Social Content ────────────────

@api_router.post("/social/generate", response_model=SocialContentResponse)
async def generate_social_content(req: SocialContentRequest, request: Request):
    user = await get_current_user(request)
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"social_{uuid.uuid4()}",
        system_message="""You are orchestrAI's Growth Engine generating social media content for an eCommerce brand.
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

STORE_DEFAULT_SAFETY = {
    # AUTONOMOUS by default — agents act freely
    "auto_edit_products": True, "auto_manage_collections": True,
    "auto_post_social": True, "auto_respond_customers": True,
    "auto_update_seo": True,
    # Social agents CAN communicate with customers autonomously
    "auto_social_reply": True, "auto_social_dm": True,
    # APPROVAL REQUIRED — money-touching actions
    "auto_change_prices": False, "auto_create_discounts": False,
    "auto_purchase_inventory": False, "auto_run_ads": False,
    "auto_issue_refunds": False,
    # APPROVAL REQUIRED — store-level customer communication (emails, bulk messages)
    "auto_email_customers": False, "auto_dm_customers": False,
    "max_price_change_pct": 20, "max_discount_pct": 30,
}

@api_router.get("/stores/{store_id}/safety")
async def get_store_safety(store_id: str, request: Request):
    """Get safety settings for a store"""
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": store_id, "user_id": user["_id"]}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    return {
        "mode": store.get("mode", "autonomous"),
        "spending_cap": store.get("spending_cap", 0.0),
        "safety": store.get("safety", STORE_DEFAULT_SAFETY),
    }

@api_router.put("/stores/{store_id}/safety")
async def update_store_safety(store_id: str, request: Request):
    """Update safety settings for a store"""
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": store_id, "user_id": user["_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    body = await request.json()
    update = {}
    if "mode" in body and body["mode"] in ("observe", "copilot", "autopilot"):
        update["mode"] = body["mode"]
    if "spending_cap" in body and isinstance(body["spending_cap"], (int, float)):
        update["spending_cap"] = max(0, body["spending_cap"])
    if "safety" in body and isinstance(body["safety"], dict):
        current_safety = store.get("safety", {})
        current_safety.update(body["safety"])
        update["safety"] = current_safety
    if update:
        await db.stores.update_one({"id": store_id}, {"$set": update})
        await db.activity_log.insert_one({"user_id": user["_id"], "type": "safety_updated",
            "message": f"Updated safety settings for {store.get('name', store_id)}: mode={update.get('mode', store.get('mode'))}",
            "timestamp": datetime.now(timezone.utc).isoformat()})
    return {"status": "updated", **update}

# ──────────────── Shopify OAuth ────────────────

SHOPIFY_CLIENT_ID = os.environ.get('SHOPIFY_PARTNER_CLIENT_ID', '')
SHOPIFY_CLIENT_SECRET = os.environ.get('SHOPIFY_PARTNER_CLIENT_SECRET', '')
SHOPIFY_SCOPES = "read_products,write_products,read_orders,read_inventory,write_inventory,read_customers"

class CreateShopifyStoreRequest(BaseModel):
    store_name: str  # e.g., "mikes-vintage-store"
    niche: Optional[str] = None

@api_router.post("/shopify/create-store")
async def create_shopify_dev_store(req: CreateShopifyStoreRequest, request: Request):
    """Create a new Shopify development store via Partners API using CLI token"""
    user = await get_current_user(request)
    cli_token = os.environ.get('SHOPIFY_CLI_TOKEN', '')
    if not cli_token:
        # Fallback: guide user to create manually
        return {
            "status": "manual_required",
            "message": f"To create your store, go to partners.shopify.com → Stores → Create development store → Name it '{req.store_name}'",
            "store_name": req.store_name,
            "url": f"https://partners.shopify.com",
        }
    # If we have the CLI token, we could automate via Partners API
    # For now, return instructions since Partners API store creation requires GraphQL
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            # Shopify Partners GraphQL API
            resp = await hc.post("https://partners.shopify.com/api/2024-10/graphql.json",
                headers={"Authorization": f"Bearer {cli_token}", "Content-Type": "application/json"},
                json={"query": f"""mutation {{
                    devStoreCreate(input: {{
                        name: "{req.store_name}",
                        storeType: TRANSFER_DISABLED
                    }}) {{
                        shop {{ id name myshopifyDomain }}
                        userErrors {{ field message }}
                    }}
                }}"""})
            if resp.status_code == 200:
                data = resp.json()
                errors = data.get("data", {}).get("devStoreCreate", {}).get("userErrors", [])
                if errors:
                    return {"status": "error", "message": errors[0].get("message", "Failed to create store")}
                shop = data.get("data", {}).get("devStoreCreate", {}).get("shop", {})
                if shop:
                    domain = shop.get("myshopifyDomain", f"{req.store_name}.myshopify.com")
                    await db.activity_log.insert_one({"user_id": user["_id"], "type": "store_created",
                        "message": f"Created Shopify dev store: {domain}",
                        "timestamp": datetime.now(timezone.utc).isoformat()})
                    return {"status": "created", "domain": domain, "name": shop.get("name", req.store_name),
                            "message": f"Store created! Now connect it: go to Stores → Shopify → enter '{domain}'"}
            return {"status": "manual_required",
                    "message": f"Couldn't auto-create. Go to partners.shopify.com → Stores → Create development store → Name: '{req.store_name}'"}
    except Exception as e:
        logger.error(f"Shopify store creation error: {e}")
        return {"status": "manual_required",
                "message": f"Go to partners.shopify.com → Stores → Create development store → Name: '{req.store_name}'"}

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
                "mode": "autonomous", "spending_cap": 0.0,
                "safety": STORE_DEFAULT_SAFETY,
            }
            await db.stores.insert_one(store_doc)
            await db.oauth_states.delete_one({"state": state})
            await db.activity_log.insert_one({"user_id": user_id, "type": "store_connected",
                "message": f"Connected Shopify store: {shop}",
                "timestamp": datetime.now(timezone.utc).isoformat()})
            # Redirect back to app stores page
            app_url = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://agent-marketplace-69.preview.emergentagent.com')
            return Response(
                content=f"""<html><head><meta http-equiv="refresh" content="2;url={app_url}/stores"></head>
                <body style="background:#030712;color:#34D399;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
                <h1 style="font-size:48px">✅</h1><h2>Shopify Connected!</h2><p style="color:#94A3B8">Redirecting to orchestrAI...</p>
                </body></html>""", media_type="text/html"
            )
    except httpx.HTTPError as e:
        logger.error(f"Shopify OAuth error: {e}")
        raise HTTPException(status_code=500, detail="Shopify connection failed")

@api_router.post("/shopify/sync/{store_id}")
async def sync_shopify_store(store_id: str, request: Request):
    """Sync products, orders, and revenue from Shopify"""
    import httpx
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": store_id, "user_id": user["_id"], "platform": "shopify"})
    if not store or not store.get("access_token"):
        raise HTTPException(status_code=404, detail="Shopify store not found or not authorized")
    shop = store["store_url"].replace("https://", "")
    token = store["access_token"]
    api_version = "2024-10"
    headers = {"X-Shopify-Access-Token": token}
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            # Fetch products count
            prod_resp = await hc.get(f"https://{shop}/admin/api/{api_version}/products/count.json", headers=headers)
            products = prod_resp.json().get("count", 0) if prod_resp.status_code == 200 else 0

            # Fetch orders count
            ord_resp = await hc.get(f"https://{shop}/admin/api/{api_version}/orders/count.json?status=any", headers=headers)
            orders = ord_resp.json().get("count", 0) if ord_resp.status_code == 200 else 0

            # Fetch recent orders for revenue calculation
            revenue = 0.0
            rev_resp = await hc.get(f"https://{shop}/admin/api/{api_version}/orders.json?status=any&limit=250&fields=total_price",
                headers=headers)
            if rev_resp.status_code == 200:
                order_list = rev_resp.json().get("orders", [])
                revenue = sum(float(o.get("total_price", 0)) for o in order_list)

            # Fetch shop info for name
            shop_resp = await hc.get(f"https://{shop}/admin/api/{api_version}/shop.json", headers=headers)
            shop_name = store.get("name", shop.replace(".myshopify.com", ""))
            if shop_resp.status_code == 200:
                shop_data = shop_resp.json().get("shop", {})
                shop_name = shop_data.get("name", shop_name)

            await db.stores.update_one({"id": store_id}, {"$set": {
                "name": shop_name, "products_synced": products, "orders_total": orders,
                "revenue": revenue, "last_synced": datetime.now(timezone.utc).isoformat()
            }})

            await db.activity_log.insert_one({"user_id": user["_id"], "type": "store_synced",
                "message": f"Synced {shop_name}: {products} products, {orders} orders, ${revenue:,.2f} revenue",
                "timestamp": datetime.now(timezone.utc).isoformat()})

            return {"products_synced": products, "orders_total": orders, "revenue": revenue, "name": shop_name}
    except Exception as e:
        logger.error(f"Shopify sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────── Store Action Queue (Approval System) ────────────────

class StoreAction(BaseModel):
    store_id: str
    action_type: str  # "create_product", "update_price", "create_collection", "create_discount"
    payload: Dict[str, Any]
    auto_approve: bool = False

@api_router.post("/stores/actions/queue")
async def queue_store_action(action: StoreAction, request: Request):
    """Queue a store action for approval (copilot mode) or auto-execute (autopilot mode)"""
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": action.store_id, "user_id": user["_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    mode = store.get("mode", "autonomous")
    safety = store.get("safety", STORE_DEFAULT_SAFETY)

    # Money-touching + customer communication actions ALWAYS need approval unless user explicitly unlocked
    MONEY_ACTIONS = {
        "update_price": "auto_change_prices",
        "create_discount": "auto_create_discounts",
        "purchase_inventory": "auto_purchase_inventory",
        "run_ads": "auto_run_ads",
        "issue_refund": "auto_issue_refunds",
        "email_customers": "auto_email_customers",
        "dm_customers": "auto_dm_customers",
    }
    # Non-money actions are autonomous by default, user can lock them
    NON_MONEY_ACTIONS = {
        "create_product": "auto_edit_products",
        "edit_product": "auto_edit_products",
        "create_collection": "auto_manage_collections",
        "update_seo": "auto_update_seo",
        "post_social": "auto_post_social",
        "respond_customer": "auto_respond_customers",
    }

    auto_execute = False
    is_money_action = action.action_type in MONEY_ACTIONS

    if mode == "observe":
        raise HTTPException(status_code=403, detail="Store is in observe mode. Switch to autonomous to enable agent actions.")
    elif is_money_action:
        # Money actions: only auto-execute if user explicitly enabled
        safety_key = MONEY_ACTIONS.get(action.action_type, "")
        auto_execute = safety.get(safety_key, False)
    else:
        # Non-money actions: auto-execute by default unless user locked them
        safety_key = NON_MONEY_ACTIONS.get(action.action_type, "auto_edit_products")
        auto_execute = safety.get(safety_key, True)

    action_doc = {
        "id": str(uuid.uuid4()), "user_id": user["_id"], "store_id": action.store_id,
        "store_name": store.get("name", ""), "platform": store.get("platform", ""),
        "action_type": action.action_type, "payload": action.payload,
        "status": "approved" if auto_execute else "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "executed_at": None, "result": None,
    }
    await db.store_actions.insert_one(action_doc)

    if auto_execute:
        result = await _execute_store_action(action_doc, store)
        return {"status": "executed", "action_id": action_doc["id"], "result": result}

    return {"status": "pending_approval", "action_id": action_doc["id"],
            "message": f"Action queued. Approve in the app to execute."}

@api_router.get("/stores/actions/pending")
async def get_pending_actions(request: Request):
    """Get all pending store actions awaiting approval"""
    user = await get_current_user(request)
    actions = await db.store_actions.find(
        {"user_id": user["_id"], "status": "pending"}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return actions

@api_router.post("/stores/actions/{action_id}/approve")
async def approve_store_action(action_id: str, request: Request):
    """Approve and execute a pending store action"""
    user = await get_current_user(request)
    action = await db.store_actions.find_one({"id": action_id, "user_id": user["_id"]})
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if action["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Action is already {action['status']}")
    store = await db.stores.find_one({"id": action["store_id"], "user_id": user["_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    result = await _execute_store_action(action, store)
    return {"status": "executed", "result": result}

@api_router.post("/stores/actions/{action_id}/reject")
async def reject_store_action(action_id: str, request: Request):
    """Reject a pending store action"""
    user = await get_current_user(request)
    await db.store_actions.update_one({"id": action_id, "user_id": user["_id"]},
        {"$set": {"status": "rejected", "executed_at": datetime.now(timezone.utc).isoformat()}})
    return {"status": "rejected"}

async def _execute_store_action(action: dict, store: dict) -> dict:
    """Execute a store action on the actual platform"""
    import httpx
    platform = store.get("platform", "")
    token = store.get("access_token", "")
    result = {"success": False, "detail": "Unknown platform"}

    try:
        if platform == "shopify":
            shop = store["store_url"].replace("https://", "")
            api_version = "2024-10"
            headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
            base = f"https://{shop}/admin/api/{api_version}"

            async with httpx.AsyncClient(timeout=30) as hc:
                if action["action_type"] == "create_product":
                    payload = action["payload"]
                    product_data = {
                        "product": {
                            "title": payload.get("title", ""),
                            "body_html": payload.get("description", ""),
                            "vendor": payload.get("vendor", store.get("name", "")),
                            "product_type": payload.get("product_type", ""),
                            "tags": payload.get("tags", ""),
                            "variants": [{"price": str(payload.get("price", "0.00")),
                                          "inventory_quantity": payload.get("inventory", 10)}],
                        }
                    }
                    if payload.get("image_url"):
                        product_data["product"]["images"] = [{"src": payload["image_url"]}]
                    resp = await hc.post(f"{base}/products.json", headers=headers, json=product_data)
                    if resp.status_code == 201:
                        product = resp.json().get("product", {})
                        result = {"success": True, "product_id": product.get("id"), "title": product.get("title"),
                                  "url": f"https://{shop}/products/{product.get('handle', '')}"}
                    else:
                        result = {"success": False, "detail": resp.text}

                elif action["action_type"] == "create_collection":
                    payload = action["payload"]
                    coll_data = {"custom_collection": {
                        "title": payload.get("title", ""),
                        "body_html": payload.get("description", ""),
                    }}
                    resp = await hc.post(f"{base}/custom_collections.json", headers=headers, json=coll_data)
                    if resp.status_code == 201:
                        coll = resp.json().get("custom_collection", {})
                        result = {"success": True, "collection_id": coll.get("id"), "title": coll.get("title")}
                    else:
                        result = {"success": False, "detail": resp.text}

                elif action["action_type"] == "update_price":
                    payload = action["payload"]
                    variant_id = payload.get("variant_id")
                    new_price = payload.get("price")
                    resp = await hc.put(f"{base}/variants/{variant_id}.json", headers=headers,
                        json={"variant": {"id": variant_id, "price": str(new_price)}})
                    result = {"success": resp.status_code == 200, "detail": resp.text if resp.status_code != 200 else "Price updated"}

        await db.store_actions.update_one({"id": action["id"]}, {"$set": {
            "status": "executed" if result.get("success") else "failed",
            "executed_at": datetime.now(timezone.utc).isoformat(), "result": result}})

        if result.get("success"):
            await db.activity_log.insert_one({"user_id": action["user_id"], "type": "store_action_executed",
                "message": f"Executed {action['action_type']} on {store.get('name', '')}: {result.get('title', '')}",
                "timestamp": datetime.now(timezone.utc).isoformat()})

    except Exception as e:
        logger.error(f"Store action execution error: {e}")
        result = {"success": False, "detail": str(e)}
        await db.store_actions.update_one({"id": action["id"]}, {"$set": {"status": "failed", "result": result}})

    return result

# ──────────────── eBay OAuth ────────────────

EBAY_CLIENT_ID = os.environ.get('EBAY_CLIENT_ID', '')
EBAY_CLIENT_SECRET = os.environ.get('EBAY_CLIENT_SECRET', '')
EBAY_RUNAME = os.environ.get('EBAY_RUNAME', '')
EBAY_API_BASE = "https://api.ebay.com"
EBAY_AUTH_BASE = "https://auth.ebay.com"
EBAY_SCOPES = "https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.marketing"

@api_router.get("/ebay/auth")
async def ebay_auth_start(request: Request):
    """Start eBay OAuth2 flow"""
    import urllib.parse
    user = await get_current_user(request)
    if not EBAY_CLIENT_ID or not EBAY_RUNAME:
        raise HTTPException(status_code=503, detail="eBay integration not configured")
    state = secrets.token_urlsafe(32)
    await db.oauth_states.insert_one({"state": state, "user_id": user["_id"], "platform": "ebay",
        "created_at": datetime.now(timezone.utc).isoformat()})
    params = urllib.parse.urlencode({
        "client_id": EBAY_CLIENT_ID,
        "redirect_uri": EBAY_RUNAME,
        "response_type": "code",
        "scope": EBAY_SCOPES,
        "state": state,
    })
    auth_url = f"{EBAY_AUTH_BASE}/oauth2/authorize?{params}"
    return {"auth_url": auth_url}

@api_router.get("/ebay/callback")
async def ebay_callback(code: str, state: str):
    """eBay OAuth callback — exchanges code for access token"""
    import httpx, base64
    oauth_state = await db.oauth_states.find_one({"state": state, "platform": "ebay"})
    if not oauth_state:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    user_id = oauth_state["user_id"]
    try:
        credentials = base64.b64encode(f"{EBAY_CLIENT_ID}:{EBAY_CLIENT_SECRET}".encode()).decode()
        async with httpx.AsyncClient(timeout=30) as hc:
            resp = await hc.post(f"{EBAY_API_BASE}/identity/v1/oauth2/token",
                headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded"},
                data={"grant_type": "authorization_code", "code": code, "redirect_uri": EBAY_RUNAME})
            if resp.status_code != 200:
                logger.error(f"eBay token error: {resp.status_code} {resp.text}")
                raise HTTPException(status_code=400, detail="Failed to get eBay access token")
            token_data = resp.json()
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token", "")

            store_name = "My eBay Store"
            try:
                user_resp = await hc.get(f"{EBAY_API_BASE}/commerce/identity/v1/user/",
                    headers={"Authorization": f"Bearer {access_token}"})
                if user_resp.status_code == 200:
                    store_name = user_resp.json().get("username", store_name)
            except Exception:
                pass

            store_doc = {
                "id": str(uuid.uuid4()), "user_id": user_id, "name": store_name,
                "platform": "ebay", "store_url": f"https://www.ebay.com/usr/{store_name}",
                "status": "connected", "access_token": access_token, "refresh_token": refresh_token,
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "products_synced": 0, "orders_total": 0, "revenue": 0.0,
                "mode": "autonomous", "spending_cap": 0.0,
                "safety": STORE_DEFAULT_SAFETY,
            }
            await db.stores.insert_one(store_doc)
            await db.activity_log.insert_one({"user_id": user_id, "type": "store_connected",
                "message": f"Connected eBay store: {store_name}", "timestamp": datetime.now(timezone.utc).isoformat()})
            await db.oauth_states.delete_one({"state": state})

            app_url = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://agent-marketplace-69.preview.emergentagent.com')
            return Response(
                content=f"""<html><head><meta http-equiv="refresh" content="2;url={app_url}/stores"></head>
                <body style="background:#030712;color:#E53238;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
                <h1 style="font-size:48px">✅</h1><h2>eBay Connected!</h2><p style="color:#94A3B8">Redirecting to orchestrAI...</p>
                </body></html>""", media_type="text/html")
    except httpx.HTTPError as e:
        logger.error(f"eBay OAuth error: {e}")
        raise HTTPException(status_code=500, detail="eBay connection failed")

@api_router.get("/ebay/declined")
async def ebay_declined():
    """eBay OAuth declined by user"""
    app_url = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://agent-marketplace-69.preview.emergentagent.com')
    return Response(
        content=f"""<html><head><meta http-equiv="refresh" content="2;url={app_url}/stores"></head>
        <body style="background:#030712;color:#E53238;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column">
        <h1 style="font-size:48px">❌</h1><h2>Authorization Declined</h2><p style="color:#94A3B8">Redirecting back...</p>
        </body></html>""", media_type="text/html")

@api_router.post("/ebay/sync/{store_id}")
async def sync_ebay_store(store_id: str, request: Request):
    """Sync inventory and orders from eBay"""
    import httpx
    user = await get_current_user(request)
    store = await db.stores.find_one({"id": store_id, "user_id": user["_id"], "platform": "ebay"})
    if not store or not store.get("access_token"):
        raise HTTPException(status_code=404, detail="eBay store not found or not authorized")
    token = store["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=30) as hc:
            products = 0
            inv_resp = await hc.get(f"{EBAY_API_BASE}/sell/inventory/v1/inventory_item?limit=1", headers=headers)
            if inv_resp.status_code == 200:
                products = inv_resp.json().get("total", 0)

            orders = 0
            revenue = 0.0
            ord_resp = await hc.get(f"{EBAY_API_BASE}/sell/fulfillment/v1/order?limit=200", headers=headers)
            if ord_resp.status_code == 200:
                order_data = ord_resp.json()
                orders = order_data.get("total", 0)
                for order in order_data.get("orders", []):
                    price_str = order.get("pricingSummary", {}).get("total", {}).get("value", "0")
                    revenue += float(price_str)

            await db.stores.update_one({"id": store_id}, {"$set": {
                "products_synced": products, "orders_total": orders, "revenue": revenue,
                "last_synced": datetime.now(timezone.utc).isoformat()}})
            await db.activity_log.insert_one({"user_id": user["_id"], "type": "store_synced",
                "message": f"Synced eBay: {products} listings, {orders} orders, ${revenue:,.2f}",
                "timestamp": datetime.now(timezone.utc).isoformat()})
            return {"products_synced": products, "orders_total": orders, "revenue": revenue}
    except Exception as e:
        logger.error(f"eBay sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ──────────────── Etsy OAuth (duplicate header removed) ────────────────

# ──────────────── Twitter / X Integration ────────────────

TWITTER_API_KEY = os.environ.get('TWITTER_API_KEY', '')
TWITTER_API_SECRET = os.environ.get('TWITTER_API_SECRET', '')
TWITTER_ACCESS_TOKEN = os.environ.get('TWITTER_ACCESS_TOKEN', '')
TWITTER_ACCESS_TOKEN_SECRET = os.environ.get('TWITTER_ACCESS_TOKEN_SECRET', '')
TWITTER_BEARER_TOKEN = os.environ.get('TWITTER_BEARER_TOKEN', '')

class TwitterPostRequest(BaseModel):
    text: str
    content_id: Optional[str] = None  # link to social_content doc

class CampaignRequest(BaseModel):
    product_name: str
    product_description: Optional[str] = None
    platforms: List[str] = ["twitter", "pinterest"]  # which platforms to target
    auto_post: bool = True  # True = post immediately, False = queue for approval

@api_router.post("/campaigns/launch")
async def launch_campaign(req: CampaignRequest, request: Request):
    """Autonomous campaign: AI generates platform-specific content and posts to ALL connected platforms"""
    user = await get_current_user(request)
    user_id = user["_id"]

    # Check which integrations are actually configured
    available = {
        "twitter": bool(TWITTER_API_KEY and TWITTER_ACCESS_TOKEN),
        "pinterest": bool(PINTEREST_ACCESS_TOKEN),
    }
    target_platforms = [p for p in req.platforms if available.get(p)]
    if not target_platforms:
        raise HTTPException(status_code=400, detail="No connected platforms found. Connect Twitter or Pinterest first.")

    # Check if user's Growth Engine has auto_execute enabled
    growth_agent = await db.agents.find_one({"user_id": user_id, "agent_type": "marketing"})
    agent_auto = growth_agent.get("auto_execute", False) if growth_agent else False
    should_auto_post = req.auto_post and agent_auto

    # Build context for personalized content
    context = await build_agent_context(user_id, "marketing")

    campaign_id = str(uuid.uuid4())
    campaign_doc = {
        "id": campaign_id, "user_id": user_id, "product_name": req.product_name,
        "status": "generating", "platforms": target_platforms,
        "auto_post": should_auto_post, "posts": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.campaigns.insert_one(campaign_doc)

    PLATFORM_STRATEGIES = {
        "twitter": {
            "system": "You are a viral Twitter/X copywriter. Your tweets get millions of impressions. You know the algorithm rewards controversy, curiosity gaps, and bold takes. Never be generic.",
            "brief": f"""Create a TWITTER/X post for: {req.product_name}
Description: {req.product_description or req.product_name}

TWITTER STRATEGY:
- Max 280 characters TOTAL (including hashtags)
- Lead with a curiosity gap or hot take (e.g., "Most people don't know this about...")
- Use 1-2 hashtags MAX (Twitter punishes hashtag spam)
- No emojis at the start — text-first
- Make it quotable, retweetable, controversial enough to engage
- Thread hooks work: end with something that makes people want to respond

USER CONTEXT:
{context}

Return ONLY the tweet. Nothing else. No labels, no explanations."""
        },
        "pinterest": {
            "system": "You are a Pinterest SEO expert. You create pins that rank #1 in Pinterest search. Every word is a searchable keyword. You write for the algorithm first, humans second.",
            "brief": f"""Create a PINTEREST pin for: {req.product_name}
Description: {req.product_description or req.product_name}

PINTEREST STRATEGY:
- Title: 40-60 chars, keyword-rich, aspirational (this is the headline)
- Description: 150-300 chars, packed with searchable keywords
- Use 3-5 hashtags that are actual Pinterest search terms
- Format: lifestyle-focused, aspirational, "save for later" worthy
- Pinterest users are PLANNERS — frame it as inspiration, not a hard sell
- Include a subtle CTA like "tap to shop" or "save for later"

USER CONTEXT:
{context}

Return the pin title on line 1, then description, then hashtags on a new line. Nothing else."""
        },
        "instagram": {
            "system": "You are an Instagram growth hacker. Your captions stop the scroll. You know Reels captions need different treatment than feed posts. You weaponize the hashtag strategy.",
            "brief": f"""Create an INSTAGRAM caption for: {req.product_name}
Description: {req.product_description or req.product_name}

INSTAGRAM STRATEGY:
- First line is EVERYTHING (it shows before "...more") — make it a hook
- 150-250 chars for the caption body
- Storytelling angle: behind-the-scenes, customer transformation, or lifestyle aspirational
- Emojis are strategic — use 3-5 max, never random
- CTA: "Link in bio", "Save this", "Tag someone who needs this"
- 20-30 hashtags in a SEPARATE paragraph (mix of: 5 broad, 10 niche, 10 micro-niche)
- First 5 hashtags are most important for reach

USER CONTEXT:
{context}

Return caption, then hashtags in a separate block. Nothing else."""
        },
        "facebook": {
            "system": "You are a Facebook community builder. Your posts start conversations and get shared. You know Facebook rewards meaningful interactions and longer dwell time.",
            "brief": f"""Create a FACEBOOK post for: {req.product_name}
Description: {req.product_description or req.product_name}

FACEBOOK STRATEGY:
- Conversational, warm, community-oriented
- 100-300 chars
- Ask a question or tell a micro-story — Facebook rewards comments
- Use 2-3 hashtags max (Facebook de-prioritizes hashtag-heavy posts)
- Frame it as sharing with friends, not selling
- "What do you think?" / "Have you tried this?" type endings
- Emojis: 1-2 max, natural placement

USER CONTEXT:
{context}

Return ONLY the post text with hashtags at the end. Nothing else."""
        },
        "tiktok": {
            "system": "You are a TikTok content strategist. You ride trends and create hooks that prevent swipe-aways. Every caption you write makes people watch the full video.",
            "brief": f"""Create a TIKTOK caption for: {req.product_name}
Description: {req.product_description or req.product_name}

TIKTOK STRATEGY:
- 100-150 chars MAX (TikTok truncates long captions)
- Start with a HOOK that creates FOMO or curiosity
- Reference trends: "POV:", "Things TikTok made me buy:", "Wait for it..."
- Use 3-5 trending hashtags + #fyp #foryoupage
- Casual, gen-z energy, slightly chaotic
- Never sound corporate — sound like a real person

USER CONTEXT:
{context}

Return ONLY the caption with hashtags. Nothing else."""
        },
    }

    for platform in target_platforms:
        strategy = PLATFORM_STRATEGIES.get(platform, PLATFORM_STRATEGIES.get("twitter"))
        if not strategy:
            continue

    posts_created = []
    posts_published = []

    for platform in target_platforms:
        strategy = PLATFORM_STRATEGIES.get(platform, PLATFORM_STRATEGIES.get("twitter"))
        if not strategy:
            continue

        try:
            chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"campaign_{campaign_id}_{platform}",
                system_message=strategy["system"])
            chat.with_model("openai", "gpt-5.2")
            result = await chat.send_message(UserMessage(text=strategy["brief"]))

            # Parse content and hashtags
            lines = result.strip().split('\n')
            hashtags = []
            content_lines = []
            for line in lines:
                tags = [w.strip() for w in line.split() if w.startswith('#')]
                if tags:
                    hashtags.extend(tags)
                    remaining = ' '.join(w for w in line.split() if not w.startswith('#')).strip()
                    if remaining:
                        content_lines.append(remaining)
                else:
                    content_lines.append(line)
            content = '\n'.join(content_lines).strip() or result.strip()
            if not hashtags:
                hashtags = [f"#{req.product_name.replace(' ', '')}", "#ecommerce"]

            post_doc = {
                "id": str(uuid.uuid4()), "user_id": user_id, "campaign_id": campaign_id,
                "platform": platform, "content": content, "hashtags": hashtags[:8],
                "product_name": req.product_name,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "status": "pending_approval" if not should_auto_post else "publishing",
                "platform_post_id": None, "platform_url": None,
            }
            await db.social_content.insert_one(post_doc)
            posts_created.append(post_doc)

            # Auto-post if enabled
            if should_auto_post:
                post_result = await _publish_post(post_doc)
                if post_result:
                    post_doc.update(post_result)
                    posts_published.append(post_doc)

        except Exception as e:
            logger.error(f"Campaign content generation error for {platform}: {e}")

    # Update campaign status
    final_status = "posted" if len(posts_published) == len(target_platforms) else "partial" if posts_published else "queued"
    if not should_auto_post:
        final_status = "pending_approval"
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {
        "status": final_status, "posts": [{"id": p["id"], "platform": p["platform"], "status": p["status"]} for p in posts_created],
    }})

    await db.agents.update_one({"user_id": user_id, "agent_type": "marketing"},
        {"$set": {"last_active": datetime.now(timezone.utc).isoformat()}, "$inc": {"tasks_completed": 1}})
    await db.activity_log.insert_one({"user_id": user_id, "type": "campaign_launched",
        "message": f"Growth Engine {'auto-posted' if should_auto_post else 'queued'} campaign for {req.product_name} across {len(target_platforms)} platform(s)",
        "timestamp": datetime.now(timezone.utc).isoformat()})

    return {
        "campaign_id": campaign_id, "status": final_status,
        "posts_created": len(posts_created), "posts_published": len(posts_published),
        "auto_posted": should_auto_post,
        "posts": [{
            "id": p["id"], "platform": p["platform"], "content": p["content"],
            "hashtags": p["hashtags"], "status": p["status"],
            "platform_url": p.get("platform_url"),
        } for p in posts_created],
    }

async def _publish_post(post: dict) -> Optional[dict]:
    """Internal: publish a single post to its target platform"""
    try:
        if post["platform"] == "twitter":
            import tweepy
            client_tw = tweepy.Client(
                consumer_key=TWITTER_API_KEY, consumer_secret=TWITTER_API_SECRET,
                access_token=TWITTER_ACCESS_TOKEN, access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
            )
            full_text = (post["content"] + '\n' + ' '.join(post.get("hashtags", [])))[:280]
            response = client_tw.create_tweet(text=full_text)
            tweet_id = response.data.get("id") if response.data else None
            tweet_url = f"https://x.com/i/status/{tweet_id}" if tweet_id else None
            await db.social_content.update_one({"id": post["id"]}, {"$set": {
                "status": "posted", "posted_at": datetime.now(timezone.utc).isoformat(),
                "platform_post_id": tweet_id, "platform_url": tweet_url,
            }})
            return {"status": "posted", "platform_post_id": tweet_id, "platform_url": tweet_url}

        elif post["platform"] == "pinterest":
            import httpx
            headers = {"Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}", "Content-Type": "application/json"}
            async with httpx.AsyncClient() as hc:
                boards_resp = await hc.get(f"{PINTEREST_API_BASE}/boards", headers=headers)
                board_id = None
                if boards_resp.status_code == 200:
                    boards = boards_resp.json().get("items", [])
                    if boards:
                        board_id = boards[0]["id"]
                if not board_id:
                    return None
                pin_data = {
                    "title": post["product_name"][:100],
                    "description": (post["content"] + '\n' + ' '.join(post.get("hashtags", [])))[:500],
                    "board_id": board_id,
                }
                resp = await hc.post(f"{PINTEREST_API_BASE}/pins", headers=headers, json=pin_data)
                if resp.status_code in (200, 201):
                    pin = resp.json()
                    await db.social_content.update_one({"id": post["id"]}, {"$set": {
                        "status": "posted", "posted_at": datetime.now(timezone.utc).isoformat(),
                        "platform_post_id": pin.get("id"),
                    }})
                    return {"status": "posted", "platform_post_id": pin.get("id")}
        return None
    except Exception as e:
        logger.error(f"Publish error for {post['platform']}: {e}")
        await db.social_content.update_one({"id": post["id"]}, {"$set": {"status": "failed", "error": str(e)}})
        return None

@api_router.post("/campaigns/approve/{post_id}")
async def approve_post(post_id: str, request: Request):
    """Approve and publish a pending post"""
    user = await get_current_user(request)
    post = await db.social_content.find_one({"id": post_id, "user_id": user["_id"]})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["status"] != "pending_approval":
        raise HTTPException(status_code=400, detail=f"Post is already {post['status']}")
    result = await _publish_post(post)
    if result:
        return {"status": "posted", **result}
    raise HTTPException(status_code=500, detail="Failed to publish")

@api_router.post("/campaigns/reject/{post_id}")
async def reject_post(post_id: str, request: Request):
    """Reject a pending post"""
    user = await get_current_user(request)
    await db.social_content.update_one({"id": post_id, "user_id": user["_id"]}, {"$set": {"status": "rejected"}})
    return {"status": "rejected"}

@api_router.get("/campaigns")
async def get_campaigns(request: Request):
    """Get user's campaign history"""
    user = await get_current_user(request)
    campaigns = await db.campaigns.find({"user_id": user["_id"]}, {"_id": 0, "user_id": 0}).sort("created_at", -1).to_list(20)
    return campaigns

@api_router.post("/twitter/post")
async def post_to_twitter(req: TwitterPostRequest, request: Request):
    """Post a tweet using OAuth 1.0a user context"""
    import tweepy
    user = await get_current_user(request)
    if not TWITTER_API_KEY or not TWITTER_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="Twitter integration not configured. Add API keys.")
    try:
        client_tw = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
        )
        response = client_tw.create_tweet(text=req.text[:280])
        tweet_id = response.data.get("id") if response.data else None
        tweet_url = f"https://x.com/i/status/{tweet_id}" if tweet_id else None

        # Update content status if linked
        if req.content_id:
            await db.social_content.update_one({"id": req.content_id, "user_id": user["_id"]},
                {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat(),
                          "platform_post_id": tweet_id, "platform_url": tweet_url}})

        await db.activity_log.insert_one({"user_id": user["_id"], "type": "twitter_posted",
            "message": f"Posted to Twitter/X: {req.text[:60]}...",
            "timestamp": datetime.now(timezone.utc).isoformat()})

        return {"status": "posted", "tweet_id": tweet_id, "url": tweet_url}
    except tweepy.TweepyException as e:
        logger.error(f"Twitter post error: {e}")
        raise HTTPException(status_code=500, detail=f"Twitter error: {str(e)}")

@api_router.get("/twitter/verify")
async def verify_twitter(request: Request):
    """Verify Twitter credentials are working"""
    import tweepy
    await get_current_user(request)
    if not TWITTER_API_KEY:
        return {"status": "not_configured"}
    try:
        client_tw = tweepy.Client(
            consumer_key=TWITTER_API_KEY,
            consumer_secret=TWITTER_API_SECRET,
            access_token=TWITTER_ACCESS_TOKEN,
            access_token_secret=TWITTER_ACCESS_TOKEN_SECRET,
        )
        me = client_tw.get_me()
        if me.data:
            return {"status": "connected", "username": me.data.username, "name": me.data.name, "id": me.data.id}
        return {"status": "error", "detail": "Could not verify"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# ──────────────── Pinterest Integration ────────────────

PINTEREST_ACCESS_TOKEN = os.environ.get('PINTEREST_ACCESS_TOKEN', '')
PINTEREST_APP_ID = os.environ.get('PINTEREST_APP_ID', '')
PINTEREST_API_BASE = "https://api.pinterest.com/v5"

class PinterestPinRequest(BaseModel):
    title: str
    description: str
    link: Optional[str] = None
    image_url: Optional[str] = None
    board_id: Optional[str] = None
    content_id: Optional[str] = None

@api_router.post("/pinterest/pin")
async def create_pinterest_pin(req: PinterestPinRequest, request: Request):
    """Create a pin on Pinterest"""
    import httpx
    user = await get_current_user(request)
    if not PINTEREST_ACCESS_TOKEN:
        raise HTTPException(status_code=503, detail="Pinterest not configured. Add access token.")
    try:
        headers = {"Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}", "Content-Type": "application/json"}

        # If no board specified, get the first board
        board_id = req.board_id
        if not board_id:
            async with httpx.AsyncClient() as hc:
                boards_resp = await hc.get(f"{PINTEREST_API_BASE}/boards", headers=headers)
                if boards_resp.status_code == 200:
                    boards = boards_resp.json().get("items", [])
                    if boards:
                        board_id = boards[0]["id"]
                    else:
                        raise HTTPException(status_code=400, detail="No Pinterest boards found. Create a board first.")
                else:
                    raise HTTPException(status_code=400, detail=f"Pinterest API error: {boards_resp.text}")

        pin_data: Dict[str, Any] = {
            "title": req.title[:100],
            "description": req.description[:500],
            "board_id": board_id,
        }
        if req.link:
            pin_data["link"] = req.link
        if req.image_url:
            pin_data["media_source"] = {"source_type": "image_url", "url": req.image_url}

        async with httpx.AsyncClient() as hc:
            resp = await hc.post(f"{PINTEREST_API_BASE}/pins", headers=headers, json=pin_data)
            if resp.status_code in (200, 201):
                pin = resp.json()
                pin_id = pin.get("id")

                if req.content_id:
                    await db.social_content.update_one({"id": req.content_id, "user_id": user["_id"]},
                        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc).isoformat(),
                                  "platform_post_id": pin_id}})

                await db.activity_log.insert_one({"user_id": user["_id"], "type": "pinterest_posted",
                    "message": f"Created Pinterest pin: {req.title[:60]}",
                    "timestamp": datetime.now(timezone.utc).isoformat()})

                return {"status": "posted", "pin_id": pin_id, "pin": pin}
            else:
                raise HTTPException(status_code=resp.status_code, detail=f"Pinterest error: {resp.text}")
    except httpx.HTTPError as e:
        logger.error(f"Pinterest error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/pinterest/boards")
async def get_pinterest_boards(request: Request):
    """Get user's Pinterest boards"""
    import httpx
    await get_current_user(request)
    if not PINTEREST_ACCESS_TOKEN:
        return {"status": "not_configured", "boards": []}
    try:
        headers = {"Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}"}
        async with httpx.AsyncClient() as hc:
            resp = await hc.get(f"{PINTEREST_API_BASE}/boards", headers=headers)
            if resp.status_code == 200:
                boards = resp.json().get("items", [])
                return {"status": "connected", "boards": [{"id": b["id"], "name": b["name"]} for b in boards]}
            return {"status": "error", "boards": [], "detail": resp.text}
    except Exception as e:
        return {"status": "error", "boards": [], "detail": str(e)}

@api_router.get("/pinterest/verify")
async def verify_pinterest(request: Request):
    """Verify Pinterest credentials"""
    import httpx
    await get_current_user(request)
    if not PINTEREST_ACCESS_TOKEN:
        return {"status": "not_configured"}
    try:
        headers = {"Authorization": f"Bearer {PINTEREST_ACCESS_TOKEN}"}
        async with httpx.AsyncClient() as hc:
            resp = await hc.get(f"{PINTEREST_API_BASE}/user_account", headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {"status": "connected", "username": data.get("username", ""), "profile_image": data.get("profile_image", "")}
            return {"status": "error", "detail": resp.text}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# ──────────────── Integration Status ────────────────

@api_router.get("/integrations/status")
async def get_integration_status(request: Request):
    """Returns which integrations are configured"""
    await get_current_user(request)
    return {
        "commerce": {
            "shopify": {"configured": bool(SHOPIFY_CLIENT_ID), "type": "oauth", "status": "live"},
            "etsy": {"configured": bool(ETSY_API_KEY), "type": "oauth", "status": "live"},
            "ebay": {"configured": bool(EBAY_CLIENT_ID and EBAY_CLIENT_SECRET), "type": "oauth", "status": "live"},
        },
        "social": {
            "twitter": {"configured": bool(TWITTER_API_KEY and TWITTER_ACCESS_TOKEN), "type": "direct", "status": "live"},
            "pinterest": {"configured": bool(PINTEREST_ACCESS_TOKEN), "type": "direct", "status": "live"},
            "tiktok": {"configured": bool(os.environ.get('TIKTOK_CLIENT_KEY', '')), "type": "oauth", "status": "live"},
            "meta": {"configured": bool(os.environ.get('META_APP_ID', '')), "type": "oauth", "status": "live"},
        },
        "business": {
            "google": {"configured": bool(os.environ.get('GOOGLE_CLIENT_ID', '')), "type": "oauth", "status": "live"},
            "microsoft": {"configured": bool(os.environ.get('MICROSOFT_CLIENT_ID', '')), "type": "oauth", "status": "live"},
            "stripe": {"configured": bool(os.environ.get('STRIPE_SECRET_KEY', '')), "type": "api_key", "status": "live"},
            "hubspot": {"configured": bool(os.environ.get('HUBSPOT_API_KEY', '')), "type": "api_key", "status": "live"},
            "slack": {"configured": bool(os.environ.get('SLACK_CLIENT_ID', '')), "type": "oauth", "status": "live"},
            "notion": {"configured": bool(os.environ.get('NOTION_INTEGRATION_SECRET', '')), "type": "api_key", "status": "live"},
            "mailjet": {"configured": bool(os.environ.get('MAILJET_API_KEY', '')), "type": "api_key", "status": "live"},
        },
    }

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
    import hashlib
    import base64
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
