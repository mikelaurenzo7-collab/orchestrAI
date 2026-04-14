"""
Browser-only platform adapters.

These platforms have no public API (or extremely limited ones).
All real actions go through Playwright automation via the background task system.
The adapters define capabilities and knowledge, then delegate execution to the task runner.
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


class _BrowserOnlyAdapter(PlatformAdapter):
    """Base for platforms that rely entirely on Playwright."""

    @property
    def has_api(self) -> bool:
        return False

    @property
    def has_browser_automation(self) -> bool:
        return True

    async def execute_action(
        self,
        action_id: str,
        payload: Dict[str, Any],
        credentials: PlatformCredentials,
    ) -> ActionResult:
        """
        All browser-only executions are deferred to the background task runner.
        This method returns a "queued" result — the caller should create a BrowserTask.
        """
        cap = next((c for c in self.capabilities() if c.id == action_id), None)
        if not cap:
            return ActionResult(success=False, error=f"Unknown action: {action_id}")
        return ActionResult(
            success=True,
            requires_approval=cap.money_touching,
            data={
                "status": "queued_for_browser",
                "platform": self.platform_id,
                "action": action_id,
                "payload": payload,
                "message": f"This action requires browser automation. "
                           f"It will be executed by our Playwright agent in the background.",
            },
        )


# ──────────────── Poshmark ────────────────

class PoshmarkAdapter(_BrowserOnlyAdapter):
    @property
    def platform_id(self) -> str:
        return "poshmark"

    @property
    def platform_name(self) -> str:
        return "Poshmark"

    @property
    def emoji(self) -> str:
        return "👗"

    @property
    def color(self) -> str:
        return "#C12B5B"

    @property
    def knowledge(self) -> str:
        return """POSHMARK PLATFORM EXPERTISE:

THE SHARING ECONOMY (CRITICAL):
- Poshmark's algorithm is driven by SHARING, not SEO keywords.
- Share your closet 30+ times/day minimum. More shares = more visibility.
- Share OTHER sellers' items too — community engagement gets reciprocated.
- Best sharing times: 7-9 AM, 12-2 PM, 7-10 PM (buyer's local time).

POSH PARTIES:
- Theme-specific 2-hour selling events, 3x daily
- Sharing TO a party puts your item in front of a targeted audience
- Host picks = massive visibility spike. Engage with hosts.
- Party categories: "Best in Shoes," "Everything Kids," etc.

LISTING OPTIMIZATION:
- Title: include brand name, size, color, item type. Buyers search by brand.
- 16 photos max — use all 16. Flat lay + lifestyle + detail shots.
- Description: measurements, material, condition, styling suggestions.
- Cover photo: clean, well-lit, flat lay on white background.

PRICING & OFFERS:
- List 20-30% above your target price — everyone negotiates.
- "Offer to Likers" sends bulk price drops to interested buyers.
- $4.99 shipping discount on Offer to Likers converts well.
- Bundles: 2+ items = reduced shipping. Incentivize with 10-15% bundle discount.

CLOSET STRATEGY:
- New listings get a "just listed" boost — list frequently.
- Cross-list from other platforms (Mercari, eBay) to maximize exposure.
- Closet sections: organize by category (tops, bottoms, shoes, accessories).
- Share newly listed items first — compound the newness boost with sharing.

SELLER METRICS:
- Average ship time: under 2 days for "Fast Shipper" badge.
- 5-star reviews: follow up politely, include a thank-you note.
- Posh Ambassador: apply after 5000 shares, 15 sales, other criteria."""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_listing", "Create Listing", ExecutionMethod.BROWSER,
                               "List a new item with photos, description, and pricing"),
            PlatformCapability("share_closet", "Share Entire Closet", ExecutionMethod.BROWSER,
                               "Auto-share all active listings to followers and relevant parties"),
            PlatformCapability("share_to_party", "Share to Posh Party", ExecutionMethod.BROWSER,
                               "Share matching items to an active Posh Party"),
            PlatformCapability("send_offers", "Send Offers to Likers", ExecutionMethod.BROWSER,
                               "Bulk price drop to everyone who liked your items", money_touching=True),
            PlatformCapability("relist_stale", "Relist Stale Items", ExecutionMethod.BROWSER,
                               "Delete and recreate old listings for the 'just listed' boost"),
            PlatformCapability("community_share", "Community Engagement", ExecutionMethod.BROWSER,
                               "Share items from other closets to build reciprocal engagement"),
        ]


# ──────────────── Mercari ────────────────

class MercariAdapter(_BrowserOnlyAdapter):
    @property
    def platform_id(self) -> str:
        return "mercari"

    @property
    def platform_name(self) -> str:
        return "Mercari"

    @property
    def emoji(self) -> str:
        return "🔴"

    @property
    def color(self) -> str:
        return "#E24444"

    @property
    def knowledge(self) -> str:
        return """MERCARI PLATFORM EXPERTISE:

SEARCH & DISCOVERY:
- Mercari search = keyword matching + recency. New and updated listings rank higher.
- Title: front-load keywords. Buyers type "Nike Air Max 90 size 10" — match that pattern.
- Description: detailed condition notes, measurements, reason for selling build trust.
- 12 photos max — use all 12. First photo = thumbnail in search results.

PRICING STRATEGY:
- Mercari fees: 10% selling fee + payment processing.
- Smart Pricing: auto-lower price over time. Use cautiously — set a floor.
- Promote for $X: paid boost. Only worth it on items >$50 with good margins.
- Offers: buyers lowball. Price 15-25% above your minimum acceptable.

SHIPPING:
- Mercari prepaid labels cheaper than self-ship for most weights.
- Ship within 3 days — "Fast Shipper" badge boosts visibility.
- USPS, UPS, FedEx options. USPS First Class for items under 1 lb.

RATINGS & TRUST:
- 5-star ratings critical. Pack carefully, ship fast, be responsive.
- Complete profiles with a photo sell more.
- Response time matters: reply to questions within hours.

CROSS-LISTING STRATEGY:
- Many sellers list the same item on Mercari + Poshmark + eBay.
- When it sells on one, immediately deactivate on others.
- Mercari tends to be faster for electronics and general goods.
- Poshmark better for fashion. eBay better for collectibles."""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_listing", "Create Listing", ExecutionMethod.BROWSER,
                               "List a new item with photos, description, and pricing"),
            PlatformCapability("update_listing", "Update Listing", ExecutionMethod.BROWSER,
                               "Edit price, description, or photos for better visibility"),
            PlatformCapability("promote_listing", "Promote Listing", ExecutionMethod.BROWSER,
                               "Pay to boost a listing in search results", money_touching=True),
            PlatformCapability("relist_item", "Relist Item", ExecutionMethod.BROWSER,
                               "Delete and recreate for the recency boost"),
            PlatformCapability("adjust_pricing", "Smart Price Adjustment", ExecutionMethod.BROWSER,
                               "Enable or configure Smart Pricing floors", money_touching=True),
        ]


# ──────────────── Faire ────────────────

class FaireAdapter(_BrowserOnlyAdapter):
    @property
    def platform_id(self) -> str:
        return "faire"

    @property
    def platform_name(self) -> str:
        return "Faire"

    @property
    def emoji(self) -> str:
        return "🏪"

    @property
    def color(self) -> str:
        return "#FF6B35"

    @property
    def knowledge(self) -> str:
        return """FAIRE WHOLESALE PLATFORM EXPERTISE:

B2B FUNDAMENTALS:
- Faire connects brands (you) with independent retailers (buyers).
- Net 60 payment terms: retailers pay 60 days after delivery. Plan cash flow accordingly.
- Faire takes ~25% commission on first orders from new retailers, 15% on reorders.
- Free returns for retailers on first orders — factor into COGS.

PRICING TIERS:
- Wholesale price: typically 50% of retail (keystone markup).
- MSRP (suggested retail price): what retailers charge their customers.
- Minimum order: set high enough to cover shipping and margins ($100-$150 typical).
- Case packs: sell in predefined quantities (e.g., pack of 6).

FAIRE SEARCH OPTIMIZATION:
- Product tags and categories drive search visibility.
- High-quality lifestyle photography converts retailers.
- Fill rate and response time affect your Faire Brand Score.
- "Faire Direct" (your own website link) = lower commission (0%).

RETAILER RELATIONSHIPS:
- Personalized outreach to retailers in your target market converts 3-5x better.
- Trade shows: list "As seen at [show name]" in your brand story.
- Reorder incentive: retailers who reorder have 15% lower commission for you.

BRAND PAGE OPTIMIZATION:
- Brand story: tell the founder story, sustainability angle, handmade process.
- Hero image: lifestyle shot of products in a retail setting.
- Minimum 20 SKUs for a credible wholesale catalog.
- Line sheets: professional PDF available for download."""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_product", "Add Product to Catalog", ExecutionMethod.BROWSER,
                               "Add a new product with wholesale and retail pricing"),
            PlatformCapability("update_catalog", "Update Catalog", ExecutionMethod.BROWSER,
                               "Edit products, pricing tiers, or case pack sizes"),
            PlatformCapability("retailer_outreach", "Retailer Outreach", ExecutionMethod.BROWSER,
                               "Send personalized messages to target retailers"),
            PlatformCapability("manage_orders", "Manage Orders", ExecutionMethod.BROWSER,
                               "View and fulfill wholesale orders"),
            PlatformCapability("optimize_brand_page", "Optimize Brand Page", ExecutionMethod.BROWSER,
                               "Update brand story, images, and policies"),
        ]


# ──────────────── eBay ────────────────

class EbayAdapter(PlatformAdapter):
    """eBay has a robust API but some actions need browser for complex flows."""

    @property
    def platform_id(self) -> str:
        return "ebay"

    @property
    def platform_name(self) -> str:
        return "eBay"

    @property
    def emoji(self) -> str:
        return "🏷️"

    @property
    def color(self) -> str:
        return "#E53238"

    @property
    def has_api(self) -> bool:
        return True

    @property
    def has_browser_automation(self) -> bool:
        return True

    @property
    def knowledge(self) -> str:
        return """EBAY PLATFORM EXPERTISE:

LISTING FORMATS:
- Auction: best for rare/collectible items where true value is uncertain
- Buy It Now (BIN): best for commodity items with known market price
- Best Offer + BIN: capture impatient buyers AND negotiators (usually optimal)
- Fixed Price with quantity: for inventory sellers

SEARCH ALGORITHM (CASSINI):
- Item specifics are CRITICAL — fill every field. eBay penalizes incomplete listings.
- Title: 80 chars max. Use every char. No emoji, no ALL CAPS, no filler words.
- Keyword order matters: brand → model → size → color → condition → descriptor
- Best Match sort factors: price + shipping, item specifics completeness, seller metrics

SELLER METRICS:
- Top Rated Seller: <0.5% defect rate, <3% late shipment, >100 transactions
- Top Rated Plus: 1-day handling + free 30-day returns = 10% fee discount
- Below Standard = search suppression, higher fees. Avoid at all costs.

PRICING:
- Research completed listings ("Sold" filter) for realistic pricing
- Promotions Manager: markdown sales, order discounts, volume pricing
- International: Global Shipping Program handles customs automatically
- eBay fees: ~13% total (final value + payment processing)

ITEM CONDITION:
- New, Open Box, Refurbished, Used (grades). Accuracy prevents returns.
- "Certified Refurbished" program for qualifying electronics

SHIPPING:
- Free shipping wins the search ranking race.
- Calculated shipping for heavy/large items to avoid fee losses.
- Same-day or 1-day handling gives ranking boost.
- USPS, FedEx, UPS all integrated — compare rates."""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_listing", "Create Listing", ExecutionMethod.API,
                               "Create a BIN, auction, or Best Offer listing"),
            PlatformCapability("update_listing", "Update Listing", ExecutionMethod.API,
                               "Edit title, description, price, or item specifics"),
            PlatformCapability("change_price", "Change Price", ExecutionMethod.API,
                               "Update listing price or start a promotion", money_touching=True),
            PlatformCapability("sync_data", "Sync Store Data", ExecutionMethod.API,
                               "Pull latest listings, orders, and seller metrics"),
            PlatformCapability("bulk_relist", "Bulk Relist", ExecutionMethod.BROWSER,
                               "Relist ended items that didn't sell"),
            PlatformCapability("promoted_listings", "Manage Promoted Listings", ExecutionMethod.BROWSER,
                               "Set up or adjust promoted listing ad rates", money_touching=True),
        ]

    async def execute_action(
        self,
        action_id: str,
        payload: Dict[str, Any],
        credentials: PlatformCredentials,
    ) -> ActionResult:
        # eBay API implementation — similar pattern to Shopify
        # For now, browser actions delegate to task runner
        if not credentials.access_token:
            return ActionResult(success=False, error="eBay not connected via OAuth")

        cap = next((c for c in self.capabilities() if c.id == action_id), None)
        if not cap:
            return ActionResult(success=False, error=f"Unknown action: {action_id}")

        if cap.method == ExecutionMethod.BROWSER:
            return ActionResult(
                success=True, requires_approval=cap.money_touching,
                data={"status": "queued_for_browser", "platform": "ebay",
                      "action": action_id, "payload": payload})

        # TODO: Implement eBay REST API calls (similar pattern to Shopify adapter)
        return ActionResult(success=False, error=f"eBay API action '{action_id}' not yet implemented")


# ──────────────── Walmart ────────────────

class WalmartAdapter(_BrowserOnlyAdapter):
    @property
    def platform_id(self) -> str:
        return "walmart"

    @property
    def platform_name(self) -> str:
        return "Walmart"

    @property
    def emoji(self) -> str:
        return "🏬"

    @property
    def color(self) -> str:
        return "#0071DC"

    @property
    def knowledge(self) -> str:
        return """WALMART MARKETPLACE EXPERTISE:

BUY BOX:
- Walmart.com has a Buy Box system like Amazon. Lowest price + fast shipping wins.
- Offer Walmart Fulfillment Services (WFS) for automatic Buy Box preference.
- Price parity: Walmart monitors competitors. If your price is lower elsewhere, you lose Buy Box.

LISTING OPTIMIZATION:
- Item specifics (attributes) are critical — fill every field for search.
- Title: structured format. [Brand] + [Product Name] + [Key Features] + [Size/Color]
- Rich content: A+ style descriptions, comparison charts, 360° images.
- SEO: category placement matters more than on other marketplaces.

SELLER SCORECARD:
- On-time shipping rate, valid tracking rate, return/defect rates.
- Below 90% on key metrics = suspension risk.
- Pro Seller Badge = better visibility + customer trust.

FULFILLMENT:
- WFS (Walmart Fulfillment Services): 2-day shipping, returns handled.
- Seller-fulfilled: must meet 2-day delivery promise for many categories.
- Free shipping threshold: $35. Items priced above get natural search boost."""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_listing", "Create Listing", ExecutionMethod.BROWSER,
                               "Add a product to Walmart Marketplace"),
            PlatformCapability("update_listing", "Update Listing", ExecutionMethod.BROWSER,
                               "Edit product details, pricing, or inventory"),
            PlatformCapability("manage_pricing", "Manage Pricing", ExecutionMethod.BROWSER,
                               "Adjust prices for Buy Box competitiveness", money_touching=True),
            PlatformCapability("sync_orders", "Sync Orders", ExecutionMethod.BROWSER,
                               "Pull latest orders and fulfillment status"),
        ]


# ──────────────── Register All ────────────────

register_platform(PoshmarkAdapter())
register_platform(MercariAdapter())
register_platform(FaireAdapter())
register_platform(EbayAdapter())
register_platform(WalmartAdapter())
