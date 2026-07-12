"""Minimal in-memory sliding-window rate limiter for auth endpoints.

Deliberately simple: process-local (per worker), no external store. It raises
the bar against credential brute-forcing without adding infrastructure. For a
multi-node deployment this should be backed by Redis.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, status

_ATTEMPTS: dict[str, list[float]] = defaultdict(list)

MAX_ATTEMPTS = 8
WINDOW_SECONDS = 300  # 5 minutes


def check_rate_limit(key: str) -> None:
    """Raise 429 if `key` has exceeded the failure budget in the window."""
    now = time.time()
    recent = [t for t in _ATTEMPTS[key] if now - t < WINDOW_SECONDS]
    _ATTEMPTS[key] = recent
    if len(recent) >= MAX_ATTEMPTS:
        retry_in = int(WINDOW_SECONDS - (now - recent[0]))
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many attempts. Try again in {max(retry_in, 1)} seconds.",
            headers={"Retry-After": str(max(retry_in, 1))},
        )


def record_failure(key: str) -> None:
    _ATTEMPTS[key].append(time.time())


def reset(key: str) -> None:
    _ATTEMPTS.pop(key, None)
