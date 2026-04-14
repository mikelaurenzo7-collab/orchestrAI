# orchestrAI - Autonomous AI Workforce Platform

> **Conduct Your Commerce Symphony**  
> Enterprise-grade AI agent orchestration platform for e-commerce and digital businesses.

## 🎯 Overview

orchestrAI is an autonomous AI workforce platform that doesn't just advise—it **EXECUTES**. Specialized AI agents build stores, manage operations, create marketing campaigns, analyze data, and handle customers autonomously while you maintain full control through a premium mobile command center.

## 🏗 Architecture

This repository contains **TWO** complete implementations:

### 1. ⚛️ React Native + Expo (Cross-Platform)
**Path**: `/frontend`  
Premium iOS/Android app built with React Native, Expo SDK 54, featuring:
- `expo-blur` for frosted glass Materials
- `react-native-reanimated` for 60fps spring animations
- `expo-haptics` for tactile feedback matrix
- `lucide-react-native` for professional iconography
- Custom fonts: Outfit (headers) + Manrope (body)

**Status**: ✅ Production Ready  
**Deploy**: `cd frontend && npx expo start`

### 2. 🍎 Native Swift/SwiftUI (iOS-First)
**Path**: `/ios-native`  
Pure native iOS implementation leveraging:
- SwiftUI with `@Observable` ViewModels
- Native `.ultraThinMaterial` blur effects
- SF Symbols professional icons
- Native sensory feedback (haptics)
- Keychain for secure token storage
- Spring physics animations

**Status**: ✅ App Store Ready  
**Deploy**: Open `ios-native/orchestrAI.xcodeproj` in Xcode

### 3. 🐍 Python FastAPI Backend
**Path**: `/backend`  
Production backend with:
- FastAPI + MongoDB
- JWT authentication with bcrypt
- 24 agent actions + 4 workflow templates
- Platform adapters (Shopify, Etsy, Twitter, Pinterest)
- Store builder AI + autonomous execution engine

**Status**: ✅ Production Ready  
**Deploy**: `cd backend && uvicorn server:app`

## ✨ Core Features

### 🤖 Specialized AI Agents
- **Shopify EA** - Store management, inventory, pricing
- **Marketing Executive** - Multi-platform social campaigns
- **Data Analyst** - Business intelligence & forecasting
- **CFO AI** - Financial tracking & optimization
- **Compliance Officer** - Legal & regulatory checks
- **HR Manager** - Team coordination & scheduling

### 🎬 Autonomous Actions (24 Total)
Each agent provides 6 complete deliverables:
- Product descriptions + SEO optimization
- Social media posts (Twitter, LinkedIn, Pinterest)
- Email campaign sequences
- Ad copy generation
- Sales forecasting
- Compliance audits

### 🔄 Workflow Templates
Multi-step pipelines where agents collaborate:
1. **New Product Launch** → Description → Social → Email → Ads
2. **Weekly Growth Cycle** → Report → Optimize → Promote → Forecast
3. **Store Health Check** → Inventory → SEO → FAQ → Catalog
4. **Customer Rescue** → Templates → Policies → Satisfaction

### 🏪 Store Builder
User says *"I sell vintage jewelry"* → AI generates:
- 10+ products with descriptions, pricing, tags
- Collections and categories
- Deployable directly to Shopify via API

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ (for React Native)
- **Python** 3.12+ (for backend)
- **MongoDB** (local or Atlas)
- **Xcode** 15+ (for native iOS)

### React Native Frontend
```bash
cd frontend
npm install
npx expo start
```

### Native iOS App
```bash
cd ios-native
open orchestrAI.xcodeproj
# Press Cmd+R in Xcode to run
```

### Backend API
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

## 📱 Screenshots

### React Native (Cross-Platform)
- [x] Frosted glass tab bar with spring animations
- [x] Dashboard with trial banner + live stats
- [x] Agent Hub with physics-based cards
- [x] iMessage-grade chat interface
- [x] Integration management
- [x] Social feed with engagement metrics

### Native iOS (SwiftUI)
- [x] Floating orb auth screen
- [x] Native Material blur depth
- [x] SF Symbols iconography
- [x] Haptic feedback on every interaction
- [x] Spring physics button press
- [x] Native keyboard avoidance

## 🎨 Design System

### Colors
```
Emerald  #10B981  Primary brand
Accent   #F59E0B  Secondary
Blue     #3B82F6  Intelligence
Error    #EF4444  Alerts
BG       #0A0A0A  Background
Text     #FFFFFF  Primary
```

### Typography
- **Headers**: Outfit (Light, Regular, Medium, SemiBold, Bold)
- **Body**: Manrope (Light, Regular, Medium, SemiBold, Bold)

### Animation Principles
- **Spring Physics**: `damping: 15, stiffness: 100-200`
- **Haptics**: `.light` (selections), `.medium` (actions), `.heavy` (auth)
- **Blur Intensity**: 20-40 (headers), 25-30 (cards)

## 🔐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Authenticate |
| GET | `/api/dashboard` | Metrics + activity |
| GET | `/api/agents` | AI workforce list |
| POST | `/api/chat` | Message agent |
| GET | `/api/stores` | Connected platforms |
| POST | `/api/actions/execute` | Run agent action |
| POST | `/api/workflows/execute` | Multi-step pipeline |
| POST | `/api/store-builder/plan` | Generate store blueprint |

## 💰 Business Model

### Tiers
1. **Starter** - $49/mo (5 stores, basic agents, 100 actions/mo)
2. **Pro** - $199/mo (Unlimited stores, all agents, workflows)
3. **Enterprise** - Custom (White-label, priority support, dedicated agents)

### Trial
- 30 days free (no credit card required)
- Full feature access
- Auto-downgrade to free tier on expiration

## 🏆 What Makes This Unique

### Technical Excellence
- **Dual Implementation**: Both React Native (cross-platform reach) AND Native Swift (iOS perfection)
- **60fps Physics**: Every button, every transition uses spring animations
- **Material Depth**: Multi-layer blur effects create visual hierarchy
- **Haptic Matrix**: Contextual vibration feedback on every interaction

### Business Innovation
- **Autonomous Execution**: Agents don't just suggest—they DO
- **Platform Adapters**: Direct API integration with Shopify, Stripe, Twitter
- **Workflow Orchestration**: Multi-agent collaboration with context passing
- **Store Builder**: AI generates complete deployable storefronts

## 📊 Stats Dashboard

Example metrics shown:
- **Active Stores**: 3 connected
- **AI Agents**: 8 online
- **Tasks Completed**: 156 this month
- **Revenue Tracked**: $47,842
- **Social Posts**: 23 published
- **Recent Activity**: Live execution feed

## 🛠 Tech Stack

### Frontend (React Native)
- React Native + Expo SDK 54
- TypeScript
- react-native-reanimated v3
- expo-blur, expo-haptics
- lucide-react-native
- @expo-google-fonts

### Frontend (Native iOS)
- Swift 5.9+
- SwiftUI
- @Observable (iOS 17+)
- Combine (reactive)
- URLSession (networking)
- Keychain (secure storage)

### Backend
- Python 3.12 + FastAPI
- MongoDB (Motor async driver)
- JWT + bcrypt
- emergentintegrations (LLM)
- Playwright (browser automation)

## 📄 License

Proprietary - All rights reserved © 2026 orchestrAI

## 🤝 Support

- **Email**: support@orchestrai.app
- **Docs**: `/memory/PRD.md`
- **API Keys**: `/memory/API_KEYS_SETUP.md`

---

**Built with precision by world-class developers.** 🚀
