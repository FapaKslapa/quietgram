from collections.abc import Callable

import pytest

from tests.conftest import Harness


def test_send_is_forbidden_when_disabled_and_makes_no_client_call(harness: Harness) -> None:
    harness.login()
    harness.calls.clear()
    response = harness.request("POST", "/v1/threads/42/messages", {"text": "hello"})
    assert response.status_code == 403
    assert response.json() == {"code": "send_disabled"}
    assert harness.calls == []


@pytest.mark.parametrize("text", ["", "   \n\t", "x" * 1001])
def test_invalid_text_is_rejected_before_the_gate(harness: Harness, text: str) -> None:
    response = harness.request("POST", "/v1/threads/42/messages", {"text": text})
    assert response.status_code == 422
    assert harness.calls == []


def test_missing_text_is_rejected(harness: Harness) -> None:
    assert harness.request("POST", "/v1/threads/42/messages", {}).status_code == 422


def test_send_works_when_enabled(harness_factory: Callable[[bool], Harness]) -> None:
    harness = harness_factory(True)
    harness.login()
    response = harness.request("POST", "/v1/threads/42/messages", {"text": "hello"})
    assert response.status_code == 200
    assert response.json()["text"] == "hello"
    assert harness.calls[-1] == "send_message"


def test_max_length_text_is_accepted(harness_factory: Callable[[bool], Harness]) -> None:
    harness = harness_factory(True)
    harness.login()
    response = harness.request("POST", "/v1/threads/42/messages", {"text": "x" * 1000})
    assert response.status_code == 200


def test_thread_listing_and_messages(harness: Harness) -> None:
    harness.login()
    threads = harness.request("GET", "/v1/threads", query="?amount=5").json()
    assert threads["threads"][0]["unread"] is True
    messages = harness.request("GET", "/v1/threads/42").json()
    assert messages["messages"][0]["sender_id"] == "5"


def test_thread_id_must_be_numeric(harness: Harness) -> None:
    harness.login()
    assert harness.request("GET", "/v1/threads/abc").status_code == 422
