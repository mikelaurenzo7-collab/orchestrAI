"""
Platform adapter base class and registry.

Every eCommerce/social platform implements PlatformAdapter.
The registry maps platform IDs → adapter instances.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class ExecutionMethod(Enum):
    """How an action is carried out on the platform."""
    API = "api"             # Direct REST/GraphQL call
    BROWSER = "browser"     # Playwright automation
    MANUAL = "manual"       # Generates instructions for the user


@dataclass
class PlatformCapability:
    """A single action a platform supports."""
    id: str
    name: str
    method: ExecutionMethod
    description: str
    requires_auth: bool = True
    money_touching: bool = False  # Requires user approval


@dataclass
class PlatformCredentials:
    """Abstraction over whatever auth a platform needs."""
    access_token: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    shop_domain: Optional[str] = None
    extra: Dict[str, str] = field(default_factory=dict)


@dataclass
class ActionResult:
    """Uniform result from any platform action."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    screenshots: List[str] = field(default_factory=list)  # base64, for browser actions
    requires_approval: bool = False


class PlatformAdapter(ABC):
    """
    Base class for all platform adapters.

    Subclasses MUST implement:
      - platform_id, platform_name, knowledge
      - capabilities()
      - execute_action()
    """

    @property
    @abstractmethod
    def platform_id(self) -> str:
        """Unique identifier: 'shopify', 'etsy', 'poshmark', etc."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Human-readable name."""

    @property
    @abstractmethod
    def knowledge(self) -> str:
        """
        Platform-specific expertise block injected into the agent system prompt.
        This is what makes a per-platform agent genuinely useful.
        """

    @property
    def emoji(self) -> str:
        return "🏪"

    @property
    def color(self) -> str:
        return "#34D399"

    @property
    def has_api(self) -> bool:
        """Whether this platform has a usable REST/GraphQL API."""
        return False

    @property
    def has_browser_automation(self) -> bool:
        """Whether we have Playwright playbooks for this platform."""
        return False

    @abstractmethod
    def capabilities(self) -> List[PlatformCapability]:
        """Return all actions this platform supports."""

    @abstractmethod
    async def execute_action(
        self,
        action_id: str,
        payload: Dict[str, Any],
        credentials: PlatformCredentials,
    ) -> ActionResult:
        """Execute a platform-specific action."""

    def build_agent_prompt(self, user_context: str = "") -> str:
        """
        Compose the full system prompt for this platform's agent.
        Base personality + platform knowledge + user context.
        """
        base = f"""You are the user's {self.platform_name} Executive Assistant.
You are an expert in everything {self.platform_name} — the go-to specialist.
Your name is the {self.platform_name} EA. Be proactive, specific, and action-oriented.

If the user doesn't have a {self.platform_name} store/account connected yet, guide them step-by-step.
When you can take action, do so. When you need approval (price changes, purchases), ask first.

{self.knowledge}"""

        capabilities_desc = "\n".join(
            f"  • {c.name} ({'API' if c.method == ExecutionMethod.API else 'Browser' if c.method == ExecutionMethod.BROWSER else 'Manual'})"
            f"{' ⚠️ requires approval' if c.money_touching else ''}"
            for c in self.capabilities()
        )

        prompt = f"""{base}

YOUR CAPABILITIES ON {self.platform_name.upper()}:
{capabilities_desc}

{'=' * 50}
LIVE USER CONTEXT:
{user_context}
{'=' * 50}

RULES:
- Reference the user's actual data — never give generic advice.
- When you can execute an action directly, tell the user and do it.
- For money-touching actions, always describe what you'll do and wait for approval.
- End responses with a clear next action."""

        return prompt


# ──────────────── Platform Registry ────────────────

_registry: Dict[str, PlatformAdapter] = {}


def register_platform(adapter: PlatformAdapter) -> None:
    """Register a platform adapter in the global registry."""
    _registry[adapter.platform_id] = adapter
    logger.info(f"Registered platform adapter: {adapter.platform_id}")


def get_platform(platform_id: str) -> Optional[PlatformAdapter]:
    """Get an adapter by platform ID."""
    return _registry.get(platform_id)


def get_platform_prompt(platform_id: str, user_context: str = "") -> str:
    """Get the composed agent prompt for a platform."""
    adapter = _registry.get(platform_id)
    if not adapter:
        return f"You are an eCommerce assistant for the {platform_id} platform."
    return adapter.build_agent_prompt(user_context)


def get_all_platforms() -> Dict[str, PlatformAdapter]:
    """Return all registered platform adapters."""
    return dict(_registry)


def get_platform_capabilities(platform_id: str) -> List[PlatformCapability]:
    """Return capabilities for a specific platform."""
    adapter = _registry.get(platform_id)
    return adapter.capabilities() if adapter else []
