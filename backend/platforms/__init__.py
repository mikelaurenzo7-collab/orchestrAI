"""
orchestrAI Platform Adapter System

Architecture: One agent framework, per-platform adapters.

Each platform provides:
  1. Knowledge module — domain expertise injected into the LLM prompt
  2. API adapter — for platforms with public REST/GraphQL APIs (Shopify, Etsy, eBay)
  3. Browser adapter — for platforms without APIs (Poshmark, Mercari, Faire)
  4. Capability manifest — what actions this platform supports

Usage:
    from platforms import get_platform, get_platform_prompt

    platform = get_platform("shopify")
    prompt = get_platform_prompt("shopify", user_context)
    result = await platform.execute_action("create_product", payload, credentials)
"""
from .registry import (
    get_platform,
    get_platform_prompt,
    get_all_platforms,
    get_platform_capabilities,
    PlatformAdapter,
    PlatformCapability,
)

__all__ = [
    "get_platform",
    "get_platform_prompt",
    "get_all_platforms",
    "get_platform_capabilities",
    "PlatformAdapter",
    "PlatformCapability",
]
