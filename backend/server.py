from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ──────────────── Models ────────────────

class StoreCreate(BaseModel):
    name: str
    platform: str  # shopify, woocommerce, etsy, custom
    api_key: Optional[str] = None
    store_url: Optional[str] = None
    status: str = "pending"

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
    agent_type: str  # store_manager, marketing, analytics, customer_service
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
    role: str  # user or assistant
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
    task_type: str  # schedule, automation, one_time
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
    platform: str  # instagram, twitter, facebook, tiktok
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
    recent_activity: List[Dict[str, Any]]

# ──────────────── Agent System Prompts ────────────────

AGENT_PROMPTS = {
    "store_manager": """You are THEONE Store Manager Agent — an elite AI eCommerce operations expert. You help manage inventory, optimize pricing, process orders, and handle all store operations. You speak with authority about eCommerce operations. When asked about specific actions, describe exactly what you would do step-by-step. You have deep knowledge of Shopify, WooCommerce, and other platforms. Always provide actionable insights and be proactive about suggesting optimizations. Format responses clearly with bullet points when listing actions.""",

    "marketing": """You are THEONE Marketing Agent — a creative AI marketing genius specializing in eCommerce growth. You create compelling social media content, ad copy, email campaigns, and promotional strategies. You understand viral marketing, SEO, influencer partnerships, and conversion optimization. When creating content, be specific with platform-optimized formats. Always think about engagement, conversion, and brand voice. Be bold, creative, and data-driven in your suggestions.""",

    "analytics": """You are THEONE Analytics Agent — a brilliant AI data analyst for eCommerce businesses. You analyze sales trends, customer behavior, inventory patterns, and market opportunities. You provide actionable insights backed by data-driven reasoning. Present findings clearly with key metrics, trends, and specific recommendations. Think like a Chief Data Officer who translates numbers into business strategy.""",

    "customer_service": """You are THEONE Customer Service Agent — an empathetic and efficient AI customer support specialist. You help draft FAQ responses, handle common customer inquiries, create return/refund policies, and optimize the customer experience. You balance efficiency with genuine care. Provide template responses that feel personal, not robotic. Always suggest ways to turn complaints into loyalty.""",

    "general": """You are THEONE — the ultimate AI co-pilot for eCommerce entrepreneurs. You orchestrate a team of specialized agents: Store Manager, Marketing, Analytics, and Customer Service. You can help with any aspect of running an online business. Be strategic, bold, and always thinking about growth. You're not just an assistant — you're a co-founder who happens to be AI. Think big, act fast, deliver results."""
}

# ──────────────── Chat Sessions ────────────────

chat_instances: Dict[str, LlmChat] = {}

def get_or_create_chat(session_id: str, agent_type: str = "general") -> LlmChat:
    key = f"{session_id}_{agent_type}"
    if key not in chat_instances:
        system_msg = AGENT_PROMPTS.get(agent_type, AGENT_PROMPTS["general"])
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=key,
            system_message=system_msg
        )
        chat.with_model("openai", "gpt-5.2")
        chat_instances[key] = chat
    return chat_instances[key]

# ──────────────── Seed Data ────────────────

async def seed_agents():
    count = await db.agents.count_documents({})
    if count == 0:
        default_agents = [
            {
                "id": str(uuid.uuid4()),
                "name": "Store Commander",
                "agent_type": "store_manager",
                "description": "Manages inventory, pricing, orders, and store operations autonomously.",
                "personality": "strategic",
                "tone": "professional",
                "auto_execute": False,
                "is_active": True,
                "store_id": None,
                "capabilities": ["inventory_management", "price_optimization", "order_processing", "stock_alerts", "bulk_updates"],
                "tasks_completed": 0,
                "last_active": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Growth Engine",
                "agent_type": "marketing",
                "description": "Creates viral content, manages social media, and drives store traffic.",
                "personality": "creative",
                "tone": "bold",
                "auto_execute": False,
                "is_active": True,
                "store_id": None,
                "capabilities": ["social_media_posts", "ad_copy", "email_campaigns", "seo_optimization", "influencer_outreach"],
                "tasks_completed": 0,
                "last_active": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Insight Oracle",
                "agent_type": "analytics",
                "description": "Analyzes trends, predicts demand, and delivers actionable business intelligence.",
                "personality": "analytical",
                "tone": "precise",
                "auto_execute": False,
                "is_active": True,
                "store_id": None,
                "capabilities": ["sales_analytics", "customer_insights", "trend_forecasting", "competitor_analysis", "revenue_optimization"],
                "tasks_completed": 0,
                "last_active": None
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Support Shield",
                "agent_type": "customer_service",
                "description": "Handles customer inquiries, generates FAQs, and optimizes support flows.",
                "personality": "empathetic",
                "tone": "friendly",
                "auto_execute": False,
                "is_active": True,
                "store_id": None,
                "capabilities": ["auto_responses", "faq_generation", "review_management", "refund_processing", "satisfaction_tracking"],
                "tasks_completed": 0,
                "last_active": None
            }
        ]
        await db.agents.insert_many(default_agents)
        logger.info("Seeded default agents")

@app.on_event("startup")
async def startup():
    await seed_agents()

# ──────────────── Dashboard ────────────────

@api_router.get("/dashboard", response_model=DashboardMetrics)
async def get_dashboard():
    stores = await db.stores.count_documents({})
    agents = await db.agents.count_documents({"is_active": True})
    tasks = await db.tasks.count_documents({"status": "completed"})
    social = await db.social_content.count_documents({})

    # Aggregate revenue from stores
    pipeline = [{"$group": {"_id": None, "total_revenue": {"$sum": "$revenue"}, "total_orders": {"$sum": "$orders_total"}}}]
    agg = await db.stores.aggregate(pipeline).to_list(1)
    revenue = agg[0]["total_revenue"] if agg else 0
    orders = agg[0]["total_orders"] if agg else 0

    # Recent activity
    recent = await db.activity_log.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10)

    return DashboardMetrics(
        total_stores=stores,
        active_agents=agents,
        tasks_completed=tasks,
        total_revenue=revenue,
        total_orders=orders,
        social_posts=social,
        recent_activity=recent
    )

# ──────────────── Stores ────────────────

@api_router.post("/stores", response_model=StoreResponse)
async def connect_store(store: StoreCreate):
    store_doc = {
        "id": str(uuid.uuid4()),
        "name": store.name,
        "platform": store.platform,
        "store_url": store.store_url,
        "status": "connected",
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "products_synced": 0,
        "orders_total": 0,
        "revenue": 0.0,
    }
    if store.api_key:
        store_doc["api_key_hash"] = store.api_key[:8] + "..." # Store partial for display
    await db.stores.insert_one(store_doc)

    # Log activity
    await db.activity_log.insert_one({
        "type": "store_connected",
        "message": f"Connected {store.platform} store: {store.name}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return StoreResponse(**{k: v for k, v in store_doc.items() if k != "_id" and k != "api_key_hash"})

@api_router.get("/stores", response_model=List[StoreResponse])
async def get_stores():
    stores = await db.stores.find({}, {"_id": 0, "api_key_hash": 0}).to_list(100)
    return [StoreResponse(**s) for s in stores]

@api_router.delete("/stores/{store_id}")
async def disconnect_store(store_id: str):
    result = await db.stores.delete_one({"id": store_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Store not found")
    await db.activity_log.insert_one({
        "type": "store_disconnected",
        "message": f"Disconnected store {store_id}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    return {"status": "disconnected"}

# ──────────────── Agents ────────────────

@api_router.get("/agents", response_model=List[AgentConfig])
async def get_agents():
    agents = await db.agents.find({}, {"_id": 0}).to_list(100)
    return [AgentConfig(**a) for a in agents]

@api_router.get("/agents/{agent_id}", response_model=AgentConfig)
async def get_agent(agent_id: str):
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentConfig(**agent)

@api_router.patch("/agents/{agent_id}", response_model=AgentConfig)
async def update_agent(agent_id: str, update: AgentUpdate):
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.agents.update_one({"id": agent_id}, {"$set": update_data})
    agent = await db.agents.find_one({"id": agent_id}, {"_id": 0})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return AgentConfig(**agent)

# ──────────────── Chat ────────────────

@api_router.post("/chat")
async def chat_with_agent(req: ChatRequest):
    session_id = "default_session"
    chat = get_or_create_chat(session_id, req.agent_type)

    # Store user message
    user_msg = {
        "session_id": session_id,
        "agent_type": req.agent_type,
        "role": "user",
        "content": req.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(user_msg)

    # Get AI response
    try:
        user_message = UserMessage(text=req.message)
        response = await chat.send_message(user_message)

        # Store assistant message
        assistant_msg = {
            "session_id": session_id,
            "agent_type": req.agent_type,
            "role": "assistant",
            "content": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(assistant_msg)

        # Update agent activity
        await db.agents.update_one(
            {"agent_type": req.agent_type},
            {"$set": {"last_active": datetime.now(timezone.utc).isoformat()},
             "$inc": {"tasks_completed": 1}}
        )

        return {"role": "assistant", "content": response, "agent_type": req.agent_type}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Agent communication error: {str(e)}")

@api_router.get("/chat/history/{agent_type}", response_model=List[ChatMessage])
async def get_chat_history(agent_type: str):
    messages = await db.chat_messages.find(
        {"agent_type": agent_type},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    return [ChatMessage(**m) for m in messages]

@api_router.delete("/chat/history/{agent_type}")
async def clear_chat_history(agent_type: str):
    await db.chat_messages.delete_many({"agent_type": agent_type})
    key = f"default_session_{agent_type}"
    if key in chat_instances:
        del chat_instances[key]
    return {"status": "cleared"}

# ──────────────── Social Content ────────────────

@api_router.post("/social/generate", response_model=SocialContentResponse)
async def generate_social_content(req: SocialContentRequest):
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"social_{uuid.uuid4()}",
        system_message="""You are an elite social media content creator for eCommerce brands. Generate platform-optimized content. Return ONLY the post content text followed by a line break and hashtags. No explanations or meta-commentary. Be catchy, trendy, and conversion-focused."""
    )
    chat.with_model("openai", "gpt-5.2")

    platform_hints = {
        "instagram": "Create an Instagram caption (max 300 chars). Include emojis. Make it visually descriptive.",
        "twitter": "Create a tweet (max 280 chars). Punchy, viral-worthy. Include 1-2 emojis.",
        "facebook": "Create a Facebook post (max 500 chars). Engaging and shareable.",
        "tiktok": "Create a TikTok caption (max 200 chars). Trendy, use Gen-Z language."
    }

    prompt = f"""Product: {req.product_name}
Description: {req.product_description}
Platform: {req.platform}
Tone: {req.tone}
Instructions: {platform_hints.get(req.platform, 'Create engaging social media content.')}

Generate the post content and 5 relevant hashtags."""

    try:
        response = await chat.send_message(UserMessage(text=prompt))

        # Parse hashtags from response
        lines = response.strip().split('\n')
        hashtags = []
        content_lines = []
        for line in lines:
            tags = [w.strip() for w in line.split() if w.startswith('#')]
            if tags:
                hashtags.extend(tags)
            else:
                content_lines.append(line)

        content = '\n'.join(content_lines).strip()
        if not content:
            content = response.strip()
        if not hashtags:
            hashtags = [f"#{req.product_name.replace(' ', '')}", "#ecommerce", "#shopnow"]

        doc = {
            "id": str(uuid.uuid4()),
            "platform": req.platform,
            "content": content,
            "hashtags": hashtags[:8],
            "product_name": req.product_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "draft",
            "store_id": req.store_id
        }
        await db.social_content.insert_one(doc)

        await db.activity_log.insert_one({
            "type": "content_generated",
            "message": f"Generated {req.platform} post for {req.product_name}",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

        return SocialContentResponse(**{k: v for k, v in doc.items() if k != "_id"})

    except Exception as e:
        logger.error(f"Social content error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/social/content", response_model=List[SocialContentResponse])
async def get_social_content():
    content = await db.social_content.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [SocialContentResponse(**c) for c in content]

# ──────────────── Tasks ────────────────

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "title": task.title,
        "agent_type": task.agent_type,
        "task_type": task.task_type,
        "description": task.description,
        "status": "active",
        "schedule": task.schedule,
        "store_id": task.store_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_run": None,
        "runs_count": 0
    }
    await db.tasks.insert_one(doc)

    await db.activity_log.insert_one({
        "type": "task_created",
        "message": f"New task: {task.title}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    return TaskResponse(**{k: v for k, v in doc.items() if k != "_id"})

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks():
    tasks = await db.tasks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [TaskResponse(**t) for t in tasks]

@api_router.patch("/tasks/{task_id}")
async def update_task_status(task_id: str, status: str = "completed"):
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$set": {"status": status, "last_run": datetime.now(timezone.utc).isoformat()},
         "$inc": {"runs_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "updated"}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted"}

# ──────────────── Health ────────────────

@api_router.get("/")
async def root():
    return {"app": "THEONE", "version": "1.0.0", "status": "operational"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "THEONE AI Agent Platform"}

# ──────────────── App Setup ────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
