import pytest

from ig_engine.totp import decode_secret, totp_code

RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"


@pytest.mark.parametrize(
    ("moment", "expected"),
    [(59, "287082"), (1111111109, "081804"), (1234567890, "005924"), (2000000000, "279037")],
)
def test_matches_rfc_6238_vectors(moment: int, expected: str) -> None:
    assert totp_code(RFC_SECRET, moment) == expected


def test_secret_tolerates_spaces_case_and_missing_padding() -> None:
    assert totp_code("gezd gnbv gy3t qojq gezd gnbv gy3t qojq", 59) == "287082"
    assert decode_secret("MFRGG") == b"abc"


@pytest.mark.parametrize("secret", ["", "   ", "not base32 !"])
def test_invalid_secret_is_rejected(secret: str) -> None:
    with pytest.raises(ValueError, match="totp secret"):
        decode_secret(secret)
