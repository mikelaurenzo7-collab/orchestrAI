"""
orchestrAI Background Task Runner

Handles long-running operations (Playwright browser automation, workflow execution,
LLM-heavy operations) outside the HTTP request cycle.

Architecture:
  1. API endpoint creates a Task document in MongoDB with status="queued"
  2. The TaskRunner picks it up and executes it asynchronously
  3. Results are written back to MongoDB
  4. Frontend polls /api/tasks/{id}/status (or gets WebSocket push — future)

This avoids:
  - HTTP request timeouts on 30-60s Playwright operations
  - Blocking the FastAPI event loop
  - Lost work if the connection drops

For true horizontal scale, replace the asyncio.Queue with Redis + ARQ/Celery.
This design makes that migration a config change, not a rewrite.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    BROWSER_ACTION = "browser_action"
    WORKFLOW = "workflow"
    STORE_SYNC = "store_sync"
    CAMPAIGN_PUBLISH = "campaign_publish"


@dataclass
class Task:
    id: str
    user_id: str
    task_type: TaskType
    platform: str = ""
    action: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
    status: TaskStatus = TaskStatus.QUEUED
    result: Any = None
    error: Optional[str] = None
    screenshots: List[str] = field(default_factory=list)
    created_at: str = ""
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress: int = 0  # 0-100
    progress_message: str = ""


class TaskRunner:
    """
    Async background task runner.

    Processes a bounded queue of tasks, executing them via registered handlers.
    Max concurrency is configurable (default: 3 concurrent browser tasks).
    """

    def __init__(self, db, max_concurrent: int = 3):
        self.db = db
        self._queue: asyncio.Queue[Task] = asyncio.Queue(maxsize=100)
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._handlers: Dict[TaskType, Callable] = {}
        self._running = False
        self._workers: List[asyncio.Task] = []

    def register_handler(self, task_type: TaskType, handler: Callable) -> None:
        """Register an async handler function for a task type."""
        self._handlers[task_type] = handler
        logger.info(f"Registered task handler: {task_type.value}")

    async def submit(self, task: Task) -> str:
        """Submit a task for background execution. Returns task ID."""
        task.id = task.id or str(uuid.uuid4())
        task.created_at = datetime.now(timezone.utc).isoformat()
        task.status = TaskStatus.QUEUED

        # Persist to DB immediately so frontend can track it
        await self.db.background_tasks.insert_one({
            "id": task.id, "user_id": task.user_id,
            "task_type": task.task_type.value,
            "platform": task.platform, "action": task.action,
            "payload": task.payload, "status": task.status.value,
            "created_at": task.created_at,
            "progress": 0, "progress_message": "Queued...",
        })

        await self._queue.put(task)
        logger.info(f"Task queued: {task.id} ({task.task_type.value}/{task.platform}/{task.action})")
        return task.id

    async def start(self, num_workers: int = 3) -> None:
        """Start background worker loops."""
        if self._running:
            return
        self._running = True
        for i in range(num_workers):
            worker = asyncio.create_task(self._worker_loop(i))
            self._workers.append(worker)
        logger.info(f"TaskRunner started with {num_workers} workers")

    async def stop(self) -> None:
        """Gracefully stop all workers."""
        self._running = False
        for worker in self._workers:
            worker.cancel()
        self._workers.clear()
        logger.info("TaskRunner stopped")

    async def _worker_loop(self, worker_id: int) -> None:
        """Single worker: pull tasks from queue, execute with semaphore."""
        while self._running:
            try:
                task = await asyncio.wait_for(self._queue.get(), timeout=5.0)
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break

            async with self._semaphore:
                await self._execute_task(task, worker_id)

    async def _execute_task(self, task: Task, worker_id: int) -> None:
        """Execute a single task via its registered handler."""
        handler = self._handlers.get(task.task_type)
        if not handler:
            logger.error(f"No handler for task type: {task.task_type}")
            await self._update_status(task.id, TaskStatus.FAILED, error="No handler registered")
            return

        logger.info(f"Worker {worker_id} executing task {task.id}")
        await self._update_status(task.id, TaskStatus.RUNNING, progress_message="Starting...")

        try:
            result = await handler(task, self._progress_callback(task.id))
            task.result = result
            task.status = TaskStatus.COMPLETED
            await self._update_status(
                task.id, TaskStatus.COMPLETED,
                result=result, progress=100, progress_message="Done",
            )
            logger.info(f"Task {task.id} completed")
        except Exception as e:
            logger.error(f"Task {task.id} failed: {e}")
            await self._update_status(
                task.id, TaskStatus.FAILED,
                error=str(e)[:500], progress_message=f"Failed: {str(e)[:100]}",
            )

    def _progress_callback(self, task_id: str):
        """Return an async callback that handlers can use to report progress."""
        async def update(progress: int, message: str = "", screenshots: List[str] = None):
            update_doc: Dict[str, Any] = {"progress": progress, "progress_message": message}
            if screenshots:
                update_doc["screenshots"] = screenshots
            await self.db.background_tasks.update_one(
                {"id": task_id}, {"$set": update_doc}
            )
        return update

    async def _update_status(self, task_id: str, status: TaskStatus, **kwargs) -> None:
        """Update task status in MongoDB."""
        update_doc: Dict[str, Any] = {"status": status.value}
        if status == TaskStatus.RUNNING:
            update_doc["started_at"] = datetime.now(timezone.utc).isoformat()
        elif status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
            update_doc["completed_at"] = datetime.now(timezone.utc).isoformat()
        update_doc.update({k: v for k, v in kwargs.items() if v is not None})
        await self.db.background_tasks.update_one({"id": task_id}, {"$set": update_doc})


# ──────────────── Browser Task Handler ────────────────

async def browser_task_handler(task: Task, progress_callback) -> Dict[str, Any]:
    """
    Execute a Playwright browser automation task.

    This handler:
    1. Launches a headless browser
    2. Runs the platform-specific playbook
    3. Captures screenshots at each step
    4. Returns structured results
    """
    from playwright.async_api import async_playwright

    platform = task.platform
    action = task.action
    payload = task.payload

    await progress_callback(10, f"Launching browser for {platform}...")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        page = await context.new_page()
        screenshots = []

        try:
            await progress_callback(20, f"Navigating to {platform}...")

            # Platform-specific playbooks
            if platform == "poshmark":
                result = await _poshmark_playbook(page, action, payload, progress_callback, screenshots)
            elif platform == "mercari":
                result = await _mercari_playbook(page, action, payload, progress_callback, screenshots)
            elif platform == "faire":
                result = await _faire_playbook(page, action, payload, progress_callback, screenshots)
            elif platform in ("shopify", "etsy", "ebay", "walmart"):
                result = await _generic_browser_playbook(page, platform, action, payload, progress_callback, screenshots)
            else:
                result = {"status": "unsupported_platform", "message": f"No playbook for {platform}"}

            await progress_callback(90, "Capturing final screenshot...", screenshots)
            return {"screenshots": screenshots, "platform": platform, "action": action, **result}

        finally:
            await browser.close()


async def _capture_screenshot(page, screenshots: list, label: str = "") -> None:
    """Capture and append a base64 screenshot."""
    try:
        img_bytes = await page.screenshot(type="jpeg", quality=50)
        screenshots.append(base64.b64encode(img_bytes).decode())
    except Exception as e:
        logger.warning(f"Screenshot failed ({label}): {e}")


# ──────────────── Platform Playbooks ────────────────

async def _poshmark_playbook(page, action, payload, progress_cb, screenshots) -> dict:
    """Poshmark automation playbook."""
    base_url = "https://poshmark.com"

    if action == "share_closet":
        await page.goto(f"{base_url}/closet/{payload.get('username', '')}", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "closet_loaded")
        await progress_cb(40, "Closet loaded, beginning share cycle...")

        # Find shareable items
        share_buttons = await page.query_selector_all('[data-test="share-button"], .share-btn, [aria-label*="Share"]')
        shared_count = 0
        for btn in share_buttons[:50]:  # Cap at 50 per run
            try:
                await btn.click()
                await page.wait_for_timeout(500)
                # Click "My Followers" in share modal
                followers_btn = await page.query_selector('[data-test="share-followers"], .share-to-followers')
                if followers_btn:
                    await followers_btn.click()
                    shared_count += 1
                    await page.wait_for_timeout(1500)  # Rate limit: ~2s between shares
                await progress_cb(40 + int(shared_count / max(len(share_buttons), 1) * 40),
                                  f"Shared {shared_count}/{len(share_buttons)} items...")
            except Exception:
                continue

        await _capture_screenshot(page, screenshots, "sharing_complete")
        return {"shared": shared_count, "total_items": len(share_buttons)}

    elif action == "create_listing":
        await page.goto(f"{base_url}/create-listing", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "listing_form")
        await progress_cb(30, "Listing form loaded...")
        # Fill form fields from payload
        # This is a skeleton — real implementation fills each field
        return {"status": "form_ready", "message": "Listing form navigated. Manual completion needed for image upload."}

    return {"status": "unknown_action", "action": action}


async def _mercari_playbook(page, action, payload, progress_cb, screenshots) -> dict:
    """Mercari automation playbook."""
    base_url = "https://www.mercari.com"

    if action == "create_listing":
        await page.goto(f"{base_url}/sell", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "sell_form")
        await progress_cb(30, "Mercari listing form loaded...")
        return {"status": "form_ready", "message": "Sell form navigated successfully."}

    elif action == "relist_item":
        item_id = payload.get("item_id", "")
        await page.goto(f"{base_url}/item/{item_id}", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "item_page")
        await progress_cb(50, "Item loaded for relist...")
        return {"status": "item_loaded", "item_id": item_id}

    return {"status": "unknown_action", "action": action}


async def _faire_playbook(page, action, payload, progress_cb, screenshots) -> dict:
    """Faire automation playbook."""
    base_url = "https://www.faire.com"

    if action == "create_product":
        await page.goto(f"{base_url}/brand-portal/products/new", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "product_form")
        await progress_cb(30, "Faire product form loaded...")
        return {"status": "form_ready", "message": "Product creation form ready."}

    elif action == "retailer_outreach":
        await page.goto(f"{base_url}/brand-portal/retailers", timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, "retailers_page")
        await progress_cb(40, "Retailer directory loaded...")
        return {"status": "directory_loaded", "message": "Retailer outreach page ready."}

    return {"status": "unknown_action", "action": action}


async def _generic_browser_playbook(page, platform, action, payload, progress_cb, screenshots) -> dict:
    """Generic browser action for API-capable platforms that need browser for specific tasks."""
    url = payload.get("url", "")
    if not url:
        platform_urls = {
            "shopify": "https://admin.shopify.com",
            "etsy": "https://www.etsy.com/your/shops/me/dashboard",
            "ebay": "https://www.ebay.com/sh/ovw",
            "walmart": "https://seller.walmart.com",
        }
        url = platform_urls.get(platform, "")

    if url:
        await page.goto(url, timeout=20000)
        await page.wait_for_timeout(3000)
        await _capture_screenshot(page, screenshots, f"{platform}_dashboard")
        await progress_cb(50, f"{platform} dashboard loaded...")
        return {"status": "page_loaded", "url": url}

    return {"status": "no_url", "message": f"No target URL for {platform}/{action}"}
