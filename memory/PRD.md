# THEONE - AI eCommerce Agent Platform

## Vision
THEONE is an AI-powered eCommerce command center. Autonomous AI agents connect to your stores (Shopify, WooCommerce, Etsy), manage operations, generate social media content, provide analytics, and handle customer service — all from one mobile app.

## v2.0 Features

### Authentication (NEW)
- JWT-based email/password auth with bcrypt hashing
- Admin account auto-seeded on startup
- Per-user data isolation (each user gets own agents, stores, content)
- Token refresh, brute force protection, secure logout

### Command Dashboard
- Real-time metrics: stores, agents, revenue, orders, tasks, social posts
- Agent fleet status, recent activity feed, personalized greeting

### AI Agent Hub
- **Store Commander** — Inventory, pricing, orders
- **Growth Engine** — Social media, ad copy, campaigns
- **Insight Oracle** — Analytics, forecasting, trends
- **Support Shield** — Customer service, FAQs, reviews
- Toggle on/off, auto-execute, expandable capabilities

### AI Chat Interface
- Multi-agent conversation powered by GPT-5.2
- 5 agent types with contextual suggestions
- Persistent chat history per user

### Social Media Studio
- AI-generated posts for Instagram, Twitter/X, Facebook, TikTok
- Tone & platform optimization, hashtag generation

### Store Connection Hub
- Connect Shopify, WooCommerce, Etsy, Custom API
- Secure API key storage, sync controls

### iOS App Store Ready (NEW)
- Custom T1 monogram app icon and splash screen
- Proper app.json with bundleIdentifier, permissions, dark theme
- EAS Build compatible configuration

### Web App Ready (NEW)
- Expo web output configured, works on any browser
- Already functional at preview URL

## Tech Stack
- **Frontend**: React Native Expo SDK 54, Expo Router, TypeScript
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic
- **Database**: MongoDB (per-user data isolation)
- **AI**: GPT-5.2 via Emergent Universal Key
- **Auth**: JWT + bcrypt + AsyncStorage
- **Design**: Dark Jewel theme (#030712, Emerald/Amber accents)

## Credentials
- Admin: admin@theone.ai / TheOne2026!

## Next Steps
- Shopify OAuth real integration (user will provide keys)
- Social media API posting (Instagram, Twitter APIs)
- Subscription tiers (Free/Pro/Enterprise)
- Push notifications for agent actions
