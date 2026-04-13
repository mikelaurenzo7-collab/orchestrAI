# orchestrAI — Launch Plan

## Pre-Launch (Days 1-3)

### Day 1 — Keys & Connections
- Paste all API keys + update redirect URLs (see API_KEYS_SETUP.md)
- Test live Shopify OAuth with your store
- Apply promo code `Peanut1212!` on your account
- Dogfood: run the Store Builder on your own niche, test all 4 agents

### Day 2 — App Store Prep
- Apple Developer Account ($99/yr) → developer.apple.com
- Run `npx eas init` then `npx eas build --platform ios`
- While building (~30 min), prepare App Store listing:
  - **App Name**: orchestrAI - AI Commerce Manager
  - **Subtitle**: AI agents that build & run your store
  - **Category**: Business (primary), Shopping (secondary)
  - **Keywords**: ecommerce,ai,shopify,store builder,marketing,automation,agents,etsy,analytics,social media
  - **Screenshots**: Take 6 screenshots (landing, dashboard, agents, chat, execute, stores) at 1290x2796 (iPhone 15 Pro Max)
  - **Description** (draft below)

### Day 3 — Submit & Prep Marketing
- Submit to App Store via `npx eas submit --platform ios`
- Apple review takes 24-48 hours
- Use waiting time to prep all social content below

---

## App Store Description

```
orchestrAI — Your AI Commerce Command Center

4 autonomous AI agents that build, manage, and grow your eCommerce store.

WHAT ORCHESTRAI DOES:
• Store Commander — manages inventory, optimizes pricing, processes orders
• Growth Engine — creates social content, ad campaigns, email sequences
• Insight Oracle — analyzes sales, forecasts demand, finds opportunities  
• Support Shield — handles customer service, generates FAQs, manages reviews

FEATURES:
• Build a store from scratch — tell us your niche, AI does the rest
• 24 one-click actions — SEO audits, ad copy, pricing analysis, and more
• Browser Agent — scrapes competitors, monitors prices, researches markets
• Connect Shopify, Etsy, Amazon, eBay, WooCommerce, and more
• Auto-post to Instagram, Twitter, Facebook, TikTok, Pinterest

30-day free trial. No credit card required.
```

---

## Launch Marketing Plan

### Twitter/X Strategy
**Week 1 — Tease (before App Store approval)**
1. "We gave 4 AI agents full control of an eCommerce store. Here's what happened..." (thread)
2. Screen recording of the Store Builder building a store in real-time
3. "Most eCommerce tools tell you what to do. orchestrAI does it for you."
4. Poll: "What would you automate first? Inventory / Marketing / Analytics / Customer Service"

**Week 2 — Launch**
5. "orchestrAI is live on the App Store. 30 days free. Your AI agents are waiting." + link
6. Demo video: connect Shopify → agents analyze store → first action executed in 60 seconds
7. Retweet/engage with every early user who posts about it

**Ongoing**
- Daily tips: "orchestrAI tip: Ask your Growth Engine to create a 7-day content calendar. One tap."
- User wins: RT any user sharing results

### Instagram/TikTok Strategy
- **Format**: 15-30 sec screen recordings with voiceover
- **Video 1**: "I let AI build my Shopify store from scratch" (Store Builder demo)
- **Video 2**: "4 AI agents run my store 24/7" (dashboard walkthrough)
- **Video 3**: "I made $X in my first week using AI agents" (after dogfooding results)
- **Video 4**: "The browser agent that spies on your competitors" (Browser Agent demo)
- Post 3x/week on both platforms, use trending audio

### Reddit / Indie Hackers
- Post in: r/ecommerce, r/shopify, r/SideProject, r/startups, r/artificial
- Title: "I built an app that gives you 4 AI agents to run your eCommerce store"
- Be genuine, share the building story, offer free trials
- Post on IndieHackers with revenue/user updates

### Product Hunt Launch
- Prep a Product Hunt page with:
  - Tagline: "4 AI agents that build and run your eCommerce store"
  - 4 screenshots + 1 demo video (60 sec)
  - Maker comment explaining why you built it
- Launch on a Tuesday or Wednesday (best PH days)
- Ask your network to upvote in the first 2 hours (critical window)

---

## iOS App Store Success Strategies

### ASO (App Store Optimization)
- **Title**: orchestrAI - AI Commerce Manager (30 char max for title)
- **Keywords**: Pack all 100 chars: `ecommerce,ai,shopify,store,builder,marketing,automation,agents,etsy,analytics,social,media,bot`
- **Screenshots**: First 3 are most important (visible without scrolling). Lead with:
  1. Landing page with robot + "4 AI Agents"
  2. Dashboard showing metrics
  3. Chat with agent showing a real response
- **App Preview Video**: 30 sec — show: landing → sign up → agents → chat → action executed
- **Localization**: Add Spanish, French, German descriptions (AI can generate these)

### Reviews Strategy
- In-app prompt after user's 3rd successful agent interaction (not on first open)
- "Your agents completed 3 tasks! Rate orchestrAI?" → direct to App Store review
- Never prompt during errors or empty states

### Retention
- Push notification after 24 hours: "Your agents found 3 insights about your store"
- Weekly digest: "This week your agents completed X tasks, generated Y content"
- Day 25 of trial: "5 days left — your agents have done [summary]. Upgrade to keep them working."

---

## Pricing Tiers (for Stripe integration)

| Tier | Price | Stores | Agents | Actions/mo | Browser Agent |
|------|-------|--------|--------|------------|---------------|
| Trial | Free 30 days | 1 | 4 | 50 | 5 runs |
| Pro | $29/mo | 5 | 4 | Unlimited | 30 runs |
| Agency | $99/mo | Unlimited | 4 + custom | Unlimited | Unlimited |

---

## Week 1 Post-Launch Priorities
1. Monitor App Store reviews — respond to every one within 24 hours
2. Fix any crashes from Crashlytics/Sentry (add error tracking)
3. Track: signups, trial starts, store connections, agent interactions, conversion rate
4. Double down on whatever content format gets traction
5. Reach out to 10 Shopify/Etsy influencers for partnerships

---

## Success Metrics (First 30 Days)
- 500+ App Store downloads
- 200+ trial signups
- 50+ store connections
- 10+ paid conversions
- 4.5+ star App Store rating
