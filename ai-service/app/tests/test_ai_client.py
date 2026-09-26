import pytest
from unittest.mock import MagicMock, patch
import json
import httpx

from app.services.ai_client import AIClient
from app.core.config import settings
from app.core.exceptions import AIServiceError

# Helper to avoid sleeping during tests
@pytest.fixture(autouse=True)
def mock_sleep():
    with patch("time.sleep", return_value=None):
        yield

def test_mock_mode_works():
    # Setup
    settings.AI_MOCK_MODE = True
    ai_client = AIClient()
    
    # Execute
    response = ai_client.generate("Generate exactly 1 questions. multiple-choice quiz", "test-model")
    
    # Assert
    assert "questions" in response
    assert len(response["questions"]) == 1

def test_successful_request_no_retry():
    settings.AI_MOCK_MODE = False
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.return_value = MagicMock(output_text='{"success": true}')
        
        ai_client = AIClient()
        response = ai_client.generate("test prompt", "test-model")
        
        assert response == {"success": True}
        mock_client.interactions.create.assert_called_once()

def test_transient_failure_causes_retry():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 2
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.side_effect = [
            httpx.TimeoutException("Timeout"),
            MagicMock(output_text='{"recovered": true}')
        ]
        
        ai_client = AIClient()
        response = ai_client.generate("test prompt", "test-model")
        
        assert response == {"recovered": True}
        assert mock_client.interactions.create.call_count == 2

def test_retry_exhaustion_raises_error():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 2
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.side_effect = [
            httpx.TimeoutException("Timeout"),
            httpx.TimeoutException("Timeout")
        ]
        
        ai_client = AIClient()
        with pytest.raises(AIServiceError, match="AI generation failed after retries"):
            ai_client.generate("test prompt", "test-model")
            
        assert mock_client.interactions.create.call_count == 2

def test_timeout_handled_as_error():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 1
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.side_effect = httpx.TimeoutException("Timeout")
        
        ai_client = AIClient()
        with pytest.raises(AIServiceError):
            ai_client.generate("test prompt", "test-model")

def test_non_transient_errors_not_retried():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 3
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.side_effect = RuntimeError("Fatal Error")
        
        ai_client = AIClient()
        with pytest.raises(RuntimeError):
            ai_client.generate("test prompt", "test-model")

def test_json_decode_error_not_retried():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 3
    settings.GEMINI_API_KEY = "test-key"
    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.interactions.create.return_value = MagicMock(output_text='invalid json output')
        
        ai_client = AIClient()
        with pytest.raises(AIServiceError, match="AI returned invalid JSON"):
            ai_client.generate("test prompt", "test-model")
            
        mock_client.interactions.create.assert_called_once()

def test_missing_api_key_raises_error():
    settings.AI_MOCK_MODE = False
    orig_gemini = settings.GEMINI_API_KEY
    orig_google = settings.GOOGLE_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        settings.GOOGLE_API_KEY = ""
        with pytest.raises(AIServiceError, match="Gemini API key is missing"):
            AIClient()
    finally:
        settings.GEMINI_API_KEY = orig_gemini
        settings.GOOGLE_API_KEY = orig_google