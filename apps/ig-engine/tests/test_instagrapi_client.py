from datetime import UTC, datetime
from types import SimpleNamespace

from ig_engine.instagrapi_client import InstagrapiClient


class FakeLibrary:
    def __init__(self, collections: list[SimpleNamespace]) -> None:
        self.collection_list = collections
        self.requested: list[tuple[str, int]] = []
        self.answered: list[tuple[int, str]] = []

    def collections(self) -> list[SimpleNamespace]:
        return self.collection_list

    def direct_answer(self, thread_id: int, text: str) -> SimpleNamespace:
        self.answered.append((thread_id, text))
        return SimpleNamespace(
            id="m1",
            user_id="1",
            text=text,
            timestamp=datetime(2024, 1, 1, tzinfo=UTC),
            item_type="text",
            media=None,
        )

    def collection_medias(self, collection_id: str, amount: int) -> list[SimpleNamespace]:
        self.requested.append((collection_id, amount))
        return [
            SimpleNamespace(
                pk=1,
                code="Cabc123",
                user=SimpleNamespace(pk="2", username="alice"),
                caption_text="",
                taken_at=datetime(2024, 1, 1, tzinfo=UTC),
                product_type="clips",
                media_type=2,
                dimensions=None,
                video_url="https://cdn.example/r.mp4",
                thumbnail_url=None,
                resources=[],
            )
        ]


def client_with(library: FakeLibrary) -> InstagrapiClient:
    client = InstagrapiClient()
    client._client = library
    return client


def test_saved_uses_selected_collection_and_keeps_reels() -> None:
    library = FakeLibrary(
        [SimpleNamespace(id="9", name="All posts", type="ALL_MEDIA_AUTO_COLLECTION")]
    )
    posts = client_with(library).saved(7)
    assert library.requested == [("9", 7)]
    assert posts[0].product_type == "clips"


def test_saved_with_no_collections_is_empty_without_media_call() -> None:
    library = FakeLibrary([])
    assert client_with(library).saved(7) == []
    assert library.requested == []


def test_send_message_answers_the_existing_thread() -> None:
    library = FakeLibrary([])
    sent = client_with(library).send_message("340282366841710301", "ciao")
    assert library.answered == [(340282366841710301, "ciao")]
    assert (sent.text, sent.kind) == ("ciao", "text")
