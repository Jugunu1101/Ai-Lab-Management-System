import pytest
from app.core.config import settings


@pytest.fixture(autouse=True)
def ensure_mock_mode_per_test():
    original_mode = settings.AI_MOCK_MODE
    settings.AI_MOCK_MODE = True
    try:
        yield
    finally:
        settings.AI_MOCK_MODE = original_mode
