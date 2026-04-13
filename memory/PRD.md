# orchestrAI — Conduct Your Commerce Symphony

## Vision
orchestrAI is the maestro of eCommerce — an AI agent orchestration platform that doesn't just advise, it EXECUTES. Agents build stores from scratch, manage operations, create marketing campaigns, analyze data, and handle customers — all autonomously with the user in full control.

## v4.0 — Execution Engine + Store Builder

### Core Architecture: FIND MONEY → MAKE MONEY → KEEP MONEY → REPEAT

### Authentication & Trial
- JWT auth with bcrypt, 30-day free trial
- Per-user data isolation, admin seeded on startup

### Execution Engine (NEW)
- **24 Agent Actions** — 6 per agent, each produces a complete deliverable
- **4 Workflow Templates** — Multi-step pipelines where agents pass context to each other
  - New Product Launch: desc → social → email → ads
  - Weekly Growth Cycle: report → optimize → promote → forecast
  - Store Health Check: inventory → catalog → SEO → FAQ
  - Customer Rescue: templates → policies → satisfaction → segments
- **Action History** — Full audit trail of every execution with results

### Store Builder (NEW)
- User says "I sell vintage jewelry" → AI generates complete store blueprint
- 10+ products with SEO descriptions, pricing, tags, collections
- Deployable directly to connected Shopify store via API
- Playwright installed for future visual automation on platforms without APIs

### Dynamic Agent Intelligence
- Every agent gets LIVE user context injected into every conversation
- Agents know: user's stores, products, orders, revenue, recent activity
- Platform-specific expertise: Shopify, Etsy, WooCommerce mastery
- Previous workflow step results feed into next step

### 5 Tab Navigation
- HQ (Dashboard) — Metrics, onboarding, trial banner, activity
- Agents (The Symphony) — 4 agents with toggles, capabilities, auto-execute
- Chat — Multi-agent AI conversations with store context
- Execute — Actions, Workflows, Store Builder
- Stores — OAuth connection (Shopify, Etsy), manual API keys

### Store Connections
- Shopify OAuth flow (pending redirect URL setup)
- Etsy OAuth with PKCE flow
- WooCommerce + Custom API manual connection
- Sync button pulls live data from Shopify

## Tech Stack
- Expo SDK 54, FastAPI, MongoDB, GPT-5.2 via Emergent Key
- JWT + bcrypt, Playwright (Chromium), httpx
- Dark theme with emerald/amber accents

## API Endpoints (key new ones)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/actions/catalog | All 24 available actions |
| POST | /api/actions/execute | Run a single agent action |
| GET | /api/actions/history | Execution audit trail |
| GET | /api/workflows/templates | 4 workflow pipelines |
| POST | /api/workflows/execute | Run a multi-step workflow |
| POST | /api/store-builder/plan | AI generates store blueprint |
| POST | /api/store-builder/deploy/{id} | Deploy products to Shopify |

## Pricing Model
- 30-day free trial (no credit card)
- Pro: $29/mo (5 stores, all agents, unlimited actions)
- Agency: $99/mo (unlimited, white-label, priority)

## Credentials
- Admin: admin@orchestrai.app / Orchestr2026!

## Tomorrow TODO
- Add Shopify redirect URL in Partner dashboard
- Add Etsy redirect URL in Developer dashboard
- See /app/memory/API_KEYS_SETUP.md for details
