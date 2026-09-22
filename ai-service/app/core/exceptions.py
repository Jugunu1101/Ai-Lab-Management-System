class AIServiceError(Exception):
    """Raised when AI generation fails."""
    pass


class AIResponseError(Exception):
    """Raised when AI returns an invalid response."""
    pass