import pytest
from unittest.mock import MagicMock, patch
import json

from openai import OpenAIError, APITimeoutError, APIConnectionError, InternalServerError

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
    ai_client = AIClient()
    
    # Mocking openai client
    mock_create = MagicMock()
    mock_create.return_value.choices = [
        MagicMock(message=MagicMock(content='{"success": true}'))
    ]
    ai_client.client.chat.completions.create = mock_create
    
    response = ai_client.generate("test prompt", "test-model")
    
    assert response == {"success": True}
    mock_create.assert_called_once()

def test_transient_failure_causes_retry():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 2
    ai_client = AIClient()
    
    # Mocking openai client to raise transient error then succeed
    mock_create = MagicMock()
    mock_create.side_effect = [
        APITimeoutError(request=MagicMock()),
        MagicMock(choices=[MagicMock(message=MagicMock(content='{"recovered": true}'))])
    ]
    ai_client.client.chat.completions.create = mock_create
    
    response = ai_client.generate("test prompt", "test-model")
    
    assert response == {"recovered": True}
    assert mock_create.call_count == 2

def test_retry_exhaustion_raises_error():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 2
    ai_client = AIClient()
    
    mock_create = MagicMock()
    mock_create.side_effect = [
        InternalServerError("Server Error", response=MagicMock(), body=None),
        InternalServerError("Server Error", response=MagicMock(), body=None)
    ]
    ai_client.client.chat.completions.create = mock_create
    
    with pytest.raises(AIServiceError, match="AI generation failed after retries"):
        ai_client.generate("test prompt", "test-model")
        
    assert mock_create.call_count == 2

def test_timeout_handled_as_error():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 1
    ai_client = AIClient()
    
    mock_create = MagicMock()
    mock_create.side_effect = APITimeoutError(request=MagicMock())
    ai_client.client.chat.completions.create = mock_create
    
    with pytest.raises(AIServiceError):
        ai_client.generate("test prompt", "test-model")

def test_non_transient_errors_not_retried():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 3
    ai_client = AIClient()
    
    mock_create = MagicMock()
    # OpenAIError is the base exception; typically used for generic/fatal errors
    mock_create.side_effect = OpenAIError("Fatal Error")
    ai_client.client.chat.completions.create = mock_create
    
    with pytest.raises(AIServiceError, match="AI generation failed$"):
        ai_client.generate("test prompt", "test-model")
        
    # Should fail on first attempt, no retries
    mock_create.assert_called_once()

def test_json_decode_error_not_retried():
    settings.AI_MOCK_MODE = False
    settings.AI_MAX_RETRIES = 3
    ai_client = AIClient()
    
    mock_create = MagicMock()
    mock_create.return_value.choices = [
        MagicMock(message=MagicMock(content='invalid json output'))
    ]
    ai_client.client.chat.completions.create = mock_create
    
    with pytest.raises(AIServiceError, match="AI returned invalid JSON"):
        ai_client.generate("test prompt", "test-model")
        
    # Should fail on first attempt, no retries
    mock_create.assert_called_once()

def test_missing_api_key_raises_error():
    settings.AI_MOCK_MODE = False
    orig_openai = settings.OPENAI_API_KEY
    orig_gemini = settings.GEMINI_API_KEY
    orig_google = settings.GOOGLE_API_KEY
    try:
        settings.OPENAI_API_KEY = ""
        settings.GEMINI_API_KEY = ""
        settings.GOOGLE_API_KEY = ""
        with pytest.raises(AIServiceError, match="OpenAI API key is missing"):
            AIClient()
    finally:
        settings.OPENAI_API_KEY = orig_openai
        settings.GEMINI_API_KEY = orig_gemini
        settings.GOOGLE_API_KEY = orig_google