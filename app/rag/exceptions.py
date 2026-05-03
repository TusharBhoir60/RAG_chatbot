"""Domain errors raised by the RAG pipeline; map to HTTP status in the API layer."""


class RetrievalServiceError(Exception):
    """Qdrant or retrieval subsystem failed (down, unreachable, or unexpected response)."""

    def __init__(self, message: str, cause: BaseException | None = None):
        super().__init__(message)
        self.cause = cause


class OllamaServiceError(Exception):
    """Ollama is unreachable, timed out, or otherwise unavailable for inference."""

    def __init__(self, message: str, cause: BaseException | None = None):
        super().__init__(message)
        self.cause = cause
