"""
Etsy Platform Adapter — API + Browser hybrid.
Etsy has a public API for listings/reviews but browser needed for some shop management.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from .registry import (
    ActionResult,
    ExecutionMethod,
    PlatformAdapter,
    PlatformCapability,
    PlatformCredentials,
    register_platform,
)

logger = logging.getLogger(__name__)


class EtsyAdapter(PlatformAdapter):
    @property
    def platform_id(self) -> str:
        return "etsy"

    @property
    def platform_name(self) -> str:
        return "Etsy"

    @property
    def emoji(self) -> str:
        return "🧶"

    @property
    def color(self) -> str:
        return "#F1641E"

    @property
    def has_api(self) -> bool:
        return True  # Etsy Open API v3

    @property
    def has_browser_automation(self) -> bool:
        return True  # For shop settings, renewal timing

    @property
    def knowledge(self) -> str:
        return """ETSY PLATFORM EXPERTISE:

SEARCH ALGORITHM (CRITICAL):
- Etsy search is a relevancy + recency engine. Fresh listings and renewals get a boost.
- Title: first 40 characters are weighted HEAVIEST. Front-load your best keyword phrase.
- Tags: 13 max per listing. Each tag up to 20 chars. Use ALL 13. Multi-word tags work.
- Categories: be as specific as possible — Etsy uses category for search matching.
- Listing quality score: views, favorites, purchases all compound the ranking.

LISTING OPTIMIZATION:
- Title formula: [Primary Keyword] [Secondary Keyword] [Descriptor] [Gift/Use Case]
- Description: first 160 chars show in search — treat as meta description.
- 10 images per listing, first image is your search thumbnail (bright, clear, white/lifestyle bg).
- Variations: use for size/color/personalization, avoid separate listings.
- Shipping profiles: free shipping boosts search ranking significantly.

STAR SELLER REQUIREMENTS:
- 95%+ messages responded within 24 hours
- 95%+ orders shipped on time with tracking
- $300+ in sales over review period (rolling 3 months)
- 4.8+ average review rating
- Losing Star Seller = immediate visibility drop

PRICING STRATEGY:
- Etsy fees: $0.20 listing + 6.5% transaction + 3% + $0.25 payment processing
- Total effective fee: ~13% of sale price — price accordingly
- Psychological pricing: $X.95 or $X.50 works better than .99 on Etsy (feels handmade)
- Free shipping hack: bake shipping into price, offer "free shipping" — Etsy rewards this

RENEWALS & FRESHNESS:
- Listings expire after 4 months, auto-renew for $0.20
- Manual renewal refreshes the "recency" signal — strategic renewal during peak hours
- Best renewal times: Sunday evening, Monday morning (US time zones)

SEO TAGS RULES:
- No repeating the exact title in tags — waste of a tag slot
- Use long-tail: "personalized name necklace" not just "necklace"
- Regional terms: Americans say "tumbler," Brits say "flask" — cover both if applicable
- Holiday/seasonal tags to add 6-8 weeks before the event"""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_listing", "Create Listing", ExecutionMethod.API,
                               "Create a new Etsy listing with images, tags, and pricing"),
            PlatformCapability("update_listing", "Update Listing", ExecutionMethod.API,
                               "Edit title, description, tags, price, or images"),
            PlatformCapability("optimize_seo", "Optimize SEO Tags", ExecutionMethod.API,
                               "Rewrite title and all 13 tags for maximum search visibility"),
            PlatformCapability("renew_listing", "Strategic Renewal", ExecutionMethod.API,
                               "Renew listings at optimal times for search boost", money_touching=True),
            PlatformCapability("sync_data", "Sync Shop Data", ExecutionMethod.API,
                               "Pull latest listings, reviews, and stats"),
            PlatformCapability("manage_shop_settings", "Shop Settings", ExecutionMethod.BROWSER,
                               "Update shop sections, banner, About page via browser"),
            PlatformCapability("analyze_competitors", "Competitor Analysis", ExecutionMethod.BROWSER,
                               "Browse competing shops for pricing and tag intelligence"),
        ]

    async def execute_action(
        self,
        action_id: str,
        payload: Dict[str, Any],
        credentials: PlatformCredentials,
    ) -> ActionResult:
        import httpx

        if not credentials.access_token:
            return ActionResult(success=False, error="Etsy not connected via OAuth")

        token = credentials.access_token
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        base_url = "https://openapi.etsy.com/v3/application"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                if action_id == "create_listing":
                    body = {
                        "title": payload.get("title", ""),
                        "description": payload.get("description", ""),
                        "price": {"amount": int(float(payload.get("price", 0)) * 100), "divisor": 100,
                                  "currency_code": "USD"},
                        "quantity": int(payload.get("quantity", 1)),
                        "tags": payload.get("tags", [])[:13],
                        "who_made": "i_did",
                        "when_made": "made_to_order",
                        "taxonomy_id": payload.get("taxonomy_id", 0),
                        "is_supply": False,
                    }
                    shop_id = credentials.extra.get("shop_id", "")
                    resp = await client.post(
                        f"{base_url}/shops/{shop_id}/listings", json=body, headers=headers)
                    if resp.status_code in (200, 201):
                        return ActionResult(success=True, data=resp.json())
                    return ActionResult(success=False, error=f"Etsy API {resp.status_code}: {resp.text[:200]}")

                elif action_id == "sync_data":
                    shop_id = credentials.extra.get("shop_id", "")
                    resp = await client.get(f"{base_url}/shops/{shop_id}", headers=headers)
                    if resp.status_code == 200:
                        return ActionResult(success=True, data=resp.json())
                    return ActionResult(success=False, error=f"Etsy sync failed: {resp.status_code}")

                elif action_id in ("manage_shop_settings", "analyze_competitors"):
                    return ActionResult(success=False, requires_approval=True,
                                        error="Browser task — will be queued as background job")

                else:
                    return ActionResult(success=False, error=f"Unknown action: {action_id}")

        except httpx.HTTPError as e:
            logger.error(f"Etsy API error: {e}")
            return ActionResult(success=False, error=f"Network error: {type(e).__name__}")


register_platform(EtsyAdapter())
