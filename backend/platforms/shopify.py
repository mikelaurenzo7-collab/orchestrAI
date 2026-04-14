"""
Shopify Platform Adapter — Full API integration.
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


class ShopifyAdapter(PlatformAdapter):
    @property
    def platform_id(self) -> str:
        return "shopify"

    @property
    def platform_name(self) -> str:
        return "Shopify"

    @property
    def emoji(self) -> str:
        return "🛍️"

    @property
    def color(self) -> str:
        return "#96BF48"

    @property
    def has_api(self) -> bool:
        return True

    @property
    def has_browser_automation(self) -> bool:
        return True  # For theme customization, visual tasks

    @property
    def knowledge(self) -> str:
        return """SHOPIFY PLATFORM EXPERTISE:

PRODUCT MANAGEMENT:
- Shopify REST Admin API (2024-10): Products, Variants, Collections, Inventory
- Liquid templates for customization, metafields for custom data
- Product types, tags (comma-separated), vendor field for brand attribution
- Variants: up to 100 per product, 3 option axes (size/color/material)
- Images: up to 250 per product, alt text critical for SEO

SEO & DISCOVERY:
- Title: front-load keywords, 70 chars max for SERP display
- Meta description: 160 chars, include CTA
- URL handle: auto-generated from title, customize for keywords
- Collection pages rank better than product pages — use smart collections
- Structured data (JSON-LD) built into Dawn theme

COLLECTIONS & ORGANIZATION:
- Smart collections: auto-populate via rules (tags, price, vendor)
- Manual collections: curated, good for campaigns
- Collection SEO: unique descriptions, not just product grids
- Nested navigation: up to 3 levels deep

PRICING & DISCOUNTS:
- Compare-at price for "sale" display (psychological anchoring)
- Automatic discounts vs discount codes (automatic converts better)
- Shopify Scripts (Plus only) for complex pricing rules
- Price rounding: .99 for value, .00 for luxury

FULFILLMENT & INVENTORY:
- Multi-location inventory tracking
- Inventory policies: deny vs continue selling when out of stock
- Fulfillment services: Shopify Fulfillment Network, third-party 3PLs
- Shipping profiles for product-specific rates

SHOPIFY FLOW (AUTOMATION):
- Trigger → condition → action workflows
- Auto-tag customers, auto-hide out-of-stock, auto-notify on low inventory
- Can chain with email campaigns via Shopify Email

ANALYTICS HOOKS:
- Shopify Analytics: sales by channel, product, referrer
- Google Analytics 4 integration via Web Pixels API
- Conversion tracking: add to cart → checkout → purchase funnel"""

    def capabilities(self) -> List[PlatformCapability]:
        return [
            PlatformCapability("create_product", "Create Product", ExecutionMethod.API,
                               "Create a new product with variants, images, and SEO metadata"),
            PlatformCapability("update_product", "Update Product", ExecutionMethod.API,
                               "Edit title, description, price, images, or tags"),
            PlatformCapability("create_collection", "Create Collection", ExecutionMethod.API,
                               "Create a manual or smart collection"),
            PlatformCapability("update_inventory", "Update Inventory", ExecutionMethod.API,
                               "Adjust inventory levels at a location"),
            PlatformCapability("create_discount", "Create Discount Code", ExecutionMethod.API,
                               "Generate a discount code or automatic discount", money_touching=True),
            PlatformCapability("change_price", "Change Product Price", ExecutionMethod.API,
                               "Update variant price and compare-at price", money_touching=True),
            PlatformCapability("sync_data", "Sync Store Data", ExecutionMethod.API,
                               "Pull latest products, orders, and revenue from Shopify"),
            PlatformCapability("bulk_edit", "Bulk Edit Products", ExecutionMethod.API,
                               "Update tags, prices, or descriptions across multiple products"),
            PlatformCapability("seo_optimize", "SEO Optimization", ExecutionMethod.API,
                               "Rewrite titles, meta descriptions, and URL handles for search"),
            PlatformCapability("setup_store", "Store Setup via Browser", ExecutionMethod.BROWSER,
                               "Configure theme, navigation, and settings via Playwright"),
        ]

    async def execute_action(
        self,
        action_id: str,
        payload: Dict[str, Any],
        credentials: PlatformCredentials,
    ) -> ActionResult:
        """Execute a Shopify action via Admin API."""
        import httpx

        if not credentials.access_token or not credentials.shop_domain:
            return ActionResult(success=False, error="Shopify store not connected via OAuth")

        shop = credentials.shop_domain
        token = credentials.access_token
        api_version = "2024-10"
        headers = {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}
        base_url = f"https://{shop}/admin/api/{api_version}"

        try:
            async with httpx.AsyncClient(timeout=30) as client:
                if action_id == "create_product":
                    body = {"product": {
                        "title": payload.get("title", ""),
                        "body_html": payload.get("description", ""),
                        "vendor": payload.get("vendor", ""),
                        "product_type": payload.get("product_type", ""),
                        "tags": payload.get("tags", ""),
                        "variants": [{"price": str(payload.get("price", "0")),
                                      "compare_at_price": str(payload["compare_at_price"]) if payload.get("compare_at_price") else None,
                                      "sku": payload.get("sku", ""),
                                      "inventory_management": "shopify",
                                      "inventory_quantity": int(payload.get("inventory", 100))}],
                    }}
                    resp = await client.post(f"{base_url}/products.json", json=body, headers=headers)
                    if resp.status_code in (200, 201):
                        return ActionResult(success=True, data=resp.json().get("product", {}))
                    return ActionResult(success=False, error=f"Shopify API {resp.status_code}: {resp.text[:200]}")

                elif action_id == "create_collection":
                    body = {"custom_collection": {
                        "title": payload.get("title", ""),
                        "body_html": payload.get("description", ""),
                    }}
                    resp = await client.post(f"{base_url}/custom_collections.json", json=body, headers=headers)
                    if resp.status_code in (200, 201):
                        return ActionResult(success=True, data=resp.json())
                    return ActionResult(success=False, error=f"Shopify API error: {resp.status_code}")

                elif action_id == "sync_data":
                    products_resp = await client.get(f"{base_url}/products/count.json", headers=headers)
                    orders_resp = await client.get(f"{base_url}/orders/count.json?status=any", headers=headers)
                    revenue = 0.0
                    rev_resp = await client.get(
                        f"{base_url}/orders.json?status=any&limit=250&fields=total_price", headers=headers)
                    if rev_resp.status_code == 200:
                        for o in rev_resp.json().get("orders", []):
                            try:
                                revenue += float(o.get("total_price", 0))
                            except (ValueError, TypeError):
                                pass
                    return ActionResult(success=True, data={
                        "products": products_resp.json().get("count", 0) if products_resp.status_code == 200 else 0,
                        "orders": orders_resp.json().get("count", 0) if orders_resp.status_code == 200 else 0,
                        "revenue": revenue,
                    })

                elif action_id == "change_price":
                    variant_id = payload.get("variant_id")
                    if not variant_id:
                        return ActionResult(success=False, error="variant_id required")
                    body = {"variant": {
                        "id": variant_id,
                        "price": str(payload.get("price", "0")),
                    }}
                    if payload.get("compare_at_price"):
                        body["variant"]["compare_at_price"] = str(payload["compare_at_price"])
                    resp = await client.put(f"{base_url}/variants/{variant_id}.json", json=body, headers=headers)
                    if resp.status_code == 200:
                        return ActionResult(success=True, data=resp.json())
                    return ActionResult(success=False, error=f"Price update failed: {resp.status_code}")

                elif action_id == "update_inventory":
                    # Requires inventory_item_id and location_id
                    return ActionResult(success=False, error="Not yet implemented — use sync_data first")

                elif action_id == "setup_store":
                    # This delegates to the browser task system
                    return ActionResult(success=False, requires_approval=True,
                                        error="Browser-based setup — will be queued as a background task")

                else:
                    return ActionResult(success=False, error=f"Unknown action: {action_id}")

        except httpx.HTTPError as e:
            logger.error(f"Shopify API error: {e}")
            return ActionResult(success=False, error=f"Network error: {type(e).__name__}")


# Auto-register on import
register_platform(ShopifyAdapter())
