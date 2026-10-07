from tests.conftest import Harness


def record_sleeps(harness: Harness) -> list[float]:
    sleeps: list[float] = []
    pool = harness.pool

    async def record(seconds: float) -> None:
        sleeps.append(seconds)

    pool._sleeper = record
    pool._jitter = lambda low, high: high
    pool._min_delay = 3.0
    pool._max_delay = 3.0
    pool._fast_min_delay = 0.6
    pool._fast_max_delay = 0.6
    return sleeps


def test_fast_header_selects_the_short_pacing(harness: Harness) -> None:
    sleeps = record_sleeps(harness)
    harness.login()
    harness.request("GET", "/v1/following", extra_headers={"x-ig-pacing": "fast"})
    harness.request("GET", "/v1/following", extra_headers={"x-ig-pacing": "fast"})
    assert len(sleeps) == 2
    assert all(0 < sleep <= 0.6 for sleep in sleeps)


def test_requests_without_the_header_keep_normal_pacing(harness: Harness) -> None:
    sleeps = record_sleeps(harness)
    harness.login()
    harness.request("GET", "/v1/following")
    harness.request("GET", "/v1/following", extra_headers={"x-ig-pacing": "turbo"})
    assert sleeps == [3.0, 3.0]
