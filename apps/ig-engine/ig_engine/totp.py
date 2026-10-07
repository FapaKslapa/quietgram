import base64
import binascii
import hashlib
import hmac
import struct

STEP_SECONDS = 30
DIGITS = 6


def decode_secret(secret: str) -> bytes:
    cleaned = "".join(secret.split()).upper()
    padded = cleaned + "=" * (-len(cleaned) % 8)
    try:
        key = base64.b32decode(padded)
    except binascii.Error:
        raise ValueError("totp secret must be base32") from None
    if not key:
        raise ValueError("totp secret must not be empty")
    return key


def totp_code(secret: str, now: float) -> str:
    counter = int(now // STEP_SECONDS)
    digest = hmac.new(decode_secret(secret), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return str(value % 10**DIGITS).zfill(DIGITS)
