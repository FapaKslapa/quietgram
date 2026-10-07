from pathlib import Path
from typing import Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    engine_secret: SecretStr = Field(min_length=16)
    data_dir: Path = Path("data")
    min_delay_seconds: float = Field(default=1.5, ge=0)
    max_delay_seconds: float = Field(default=4.0, ge=0)
    fast_min_delay_seconds: float = Field(default=0.3, ge=0)
    fast_max_delay_seconds: float = Field(default=0.8, ge=0)
    dm_send_enabled: bool = False
    interactions_enabled: bool = False
    interactions_max_per_hour: int = Field(default=30, ge=1)

    @model_validator(mode="after")
    def check_delay_range(self) -> Self:
        if self.min_delay_seconds > self.max_delay_seconds:
            raise ValueError("MIN_DELAY_SECONDS must not exceed MAX_DELAY_SECONDS")
        if self.fast_min_delay_seconds > self.fast_max_delay_seconds:
            raise ValueError("FAST_MIN_DELAY_SECONDS must not exceed FAST_MAX_DELAY_SECONDS")
        return self
