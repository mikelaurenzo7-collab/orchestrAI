# THEONE - AI eCommerce Agent Platform

## Vision
THEONE is an AI-powered eCommerce command center that connects autonomous AI agents to users' online stores (Shopify, WooCommerce, Etsy) via API. Agents manage store operations, generate social media content, provide analytics insights, and handle customer service — all from a single mobile app.

## Core Features (MVP)

### 1. Command Dashboard
- Real-time metrics: stores, agents, revenue, orders, tasks, social posts
- Agent fleet status (4 specialized agents all ONLINE)
- Quick action buttons
- Recent activity feed
- Pull-to-refresh

### 2. AI Agent Hub
- **Store Commander** (store_manager) - Inventory, pricing, orders, bulk updates
- **Growth Engine** (marketing) - Social media, ad copy, email campaigns, SEO
- **Insight Oracle** (analytics) - Sales trends, customer insights, forecasting
- **Support Shield** (customer_service) - Auto-responses, FAQs, review management
- Toggle agents on/off, enable auto-execute
- View capabilities and configure personality/tone

### 3. AI Chat Interface
- Multi-agent conversation (switch between 5 agent types)
- GPT-5.2 powered via Emergent Universal Key
- Chat history persistence (MongoDB)
- Contextual suggestions per agent type
- Clear chat functionality

### 4. Social Media Content Studio
- AI-generated posts for Instagram, Twitter/X, Facebook, TikTok
- Platform-optimized content with hashtags
- Tone selection (engaging, professional, casual, luxury)
- Draft management
- Platform stats overview

### 5. Store Connection Hub
- Connect Shopify, WooCommerce, Etsy, or Custom API stores
- Secure API key storage
- Store metrics (products, orders, revenue)
- Sync and disconnect functionality

### 6. Task Automation
- Create tasks assigned to specific agents
- Schedule, one-time, and automation task types
- Task status tracking and execution logs

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), Expo Router, TypeScript
- **Backend**: FastAPI, Motor (MongoDB async), Pydantic
- **Database**: MongoDB
- **AI**: GPT-5.2 via Emergent Universal Key (emergentintegrations)
- **Design**: Dark Jewel theme (#030712 bg, Emerald/Amber accents)

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard | Dashboard metrics |
| GET/POST | /api/stores | List/Connect stores |
| DELETE | /api/stores/{id} | Disconnect store |
| GET | /api/agents | List all agents |
| GET/PATCH | /api/agents/{id} | Get/Update agent |
| POST | /api/chat | Send message to agent |
| GET/DELETE | /api/chat/history/{type} | Chat history |
| POST | /api/social/generate | Generate social content |
| GET | /api/social/content | List generated content |
| GET/POST | /api/tasks | List/Create tasks |
| PATCH/DELETE | /api/tasks/{id} | Update/Delete task |

## Scale Roadmap
- Real Shopify OAuth integration
- Social media API posting (Instagram, Twitter, etc.)
- Browser automation agent for store management
- Multi-user/multi-store SaaS model
- Subscription tiers (Free, Pro, Enterprise)
- Real-time analytics with charts
- Push notifications for agent actions
- Voice command integration
