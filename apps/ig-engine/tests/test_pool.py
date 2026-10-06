import asyncio
import threading
import time
from collections.abc import Callable
from pathlib import Path

from ig_engine.client_pool import ClientPool
from ig_engine.instagram import InstagramClient
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
