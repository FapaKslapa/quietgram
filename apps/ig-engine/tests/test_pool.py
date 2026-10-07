import asyncio
import threading
import time
from collections.abc import Callable
from pathlib import Path

import pytest
from instagrapi.exceptions import PleaseWaitFewMinutes

from ig_engine.client_pool import ClientPool
from ig_engine.errors import ApiError
from ig_engine.instagram import InstagramClient
from ig_engine.pacing import requested_pacing
from tests.fakes import SESSION_ID, Behavior, FakeInstagramClient


def make_pool(tmp_path: Path, behavior: Behavior, sleeps: list[float]) -> ClientPool:
    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    return ClientPool(
        data_dir=tmp_path,
        factory=lambda: FakeInstagramClient(behavior),
        min_delay=1.5,
        max_delay=4.0,
        sleeper=record_sleep,
        jitter=lambda low, high: (low + high) / 2,
    )


async def test_first_call_has_no_delay_and_later_calls_sleep(tmp_path: Path) -> None:
    sleeps: list[float] = []
    pool = make_pool(tmp_path, Behavior(), sleeps)
    await pool.login("acc", SESSION_ID)
    assert sleeps == []
    await pool.run("acc", lambda client: client.following(1))
    await pool.run("acc", lambda client: client.followers(1))
    assert sleeps == [2.75, 2.75]


async def test_calls_are_serialized(tmp_path: Path) -> None:
    sleeps: list[float] = []
    pool = make_pool(tmp_path, Behavior(), sleeps)
    await pool.login("acc", SESSION_ID)
    events: list[str] = []
    guard = threading.Lock()

    def operation(name: str) -> Callable[[InstagramClient], str]:
        def run(_: InstagramClient) -> str:
            with guard:
                events.append(f"start-{name}")
            time.sleep(0.05)
            with guard:
                events.append(f"end-{name}")
            return name

        return run

    await asyncio.gather(
        pool.run("acc", operation("a")),
        pool.run("acc", operation("b")),
    )
    assert events in (
        ["start-a", "end-a", "start-b", "end-b"],
        ["start-b", "end-b", "start-a", "end-a"],
    )
    assert len(sleeps) == 2


def fast_pool(tmp_path: Path, sleeps: list[float], clock: list[float]) -> ClientPool:
    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    return ClientPool(
        data_dir=tmp_path,
        factory=lambda: FakeInstagramClient(Behavior()),
        min_delay=1.5,
        max_delay=4.0,
        sleeper=record_sleep,
        jitter=lambda low, high: (low + high) / 2,
        fast_min_delay=0.3,
        fast_max_delay=0.7,
        backoff_seconds=1800,
        clock=lambda: clock[0],
    )


async def test_fast_pacing_uses_short_gaps_and_skips_elapsed_time(tmp_path: Path) -> None:
    sleeps: list[float] = []
    clock = [100.0]
    pool = fast_pool(tmp_path, sleeps, clock)
    await pool.login("acc", SESSION_ID)
    token = requested_pacing.set("fast")
    try:
        await pool.run("acc", lambda client: client.following(1))
        await pool.run("acc", lambda client: client.followers(1))
        clock[0] += 0.4
        await pool.run("acc", lambda client: client.followers(1))
        clock[0] += 5
        await pool.run("acc", lambda client: client.followers(1))
    finally:
        requested_pacing.reset(token)
    assert sleeps == pytest.approx([0.5, 0.5, 0.1])


async def test_normal_pacing_ignores_missing_fast_request(tmp_path: Path) -> None:
    sleeps: list[float] = []
    pool = fast_pool(tmp_path, sleeps, [0.0])
    await pool.login("acc", SESSION_ID)
    await pool.run("acc", lambda client: client.following(1))
    assert sleeps == [2.75]


async def test_throttle_steps_the_account_down_to_normal_pacing(tmp_path: Path) -> None:
    sleeps: list[float] = []
    clock = [0.0]
    behavior = Behavior()

    async def record_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    pool = ClientPool(
        data_dir=tmp_path,
        factory=lambda: FakeInstagramClient(behavior),
        min_delay=1.5,
        max_delay=4.0,
        sleeper=record_sleep,
        jitter=lambda low, high: (low + high) / 2,
        clock=lambda: clock[0],
    )
    await pool.login("acc", SESSION_ID)
    behavior.failure = PleaseWaitFewMinutes()
    token = requested_pacing.set("fast")
    try:
        with pytest.raises(ApiError):
            await pool.run("acc", lambda client: client.following(1))
        behavior.failure = None
        clock[0] += 60
        await pool.run("acc", lambda client: client.following(1))
        clock[0] += 1800
        await pool.run("acc", lambda client: client.following(1))
    finally:
        requested_pacing.reset(token)
    assert sleeps == pytest.approx([0.55, 2.75])
