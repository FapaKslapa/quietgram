import time
from collections import defaultdict, deque
from collections.abc import Callable

from ig_engine.errors import ApiError

WINDOW_SECONDS = 3600


class InteractionLimiter:
    def __init__(self, max_per_hour: int, clock: Callable[[], float] = time.monotonic) -> None:
        self._max = max_per_hour
        self._clock = clock
        self._events: defaultdict[str, deque[float]] = defaultdict(deque)

    def acquire(self, account_id: str) -> float:
        now = self._clock()
        events = self._events[account_id]
        while events and now - events[0] >= WINDOW_SECONDS:
            events.popleft()
        if len(events) >= self._max:
            retry_after = max(1, int(WINDOW_SECONDS - (now - events[0])) + 1)
            raise ApiError(429, "throttled", retry_after_seconds=retry_after)
        events.append(now)
        return now

    def release(self, account_id: str, ticket: float) -> None:
        events = self._events.get(account_id)
        if events is not None and ticket in events:
            events.remove(ticket)
