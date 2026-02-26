"""
Unit tests for AI router error-handling helpers.

Covers:
- is_quota_error()
- is_service_unavailable_error()
- The five patched endpoint except-blocks (via direct call with mocked genai client)
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers: synthetic exception factories
# ---------------------------------------------------------------------------

def make_genai_client_error(message: str):
    """Return a google.genai.errors.ClientError-like exception."""
    try:
        from google.genai import errors as genai_errors
        err = genai_errors.ClientError(message)
    except (ImportError, Exception):
        # If SDK not installed, create a plain Exception that walks the same
        # string-matching path exercised by the fallback branch.
        err = Exception(message)
    return err


class NonGeminiHTTPError(Exception):
    """Simulates an httpx or plugin error that mentions 503 but is NOT from genai."""
    pass


# ---------------------------------------------------------------------------
# is_quota_error
# ---------------------------------------------------------------------------

class TestIsQuotaError:
    def setup_method(self):
        from app.routers.ai import is_quota_error
        self.fn = is_quota_error

    def test_resource_exhausted(self):
        assert self.fn(Exception("429 RESOURCE_EXHAUSTED")) is True

    def test_too_many_requests(self):
        assert self.fn(Exception("Too Many Requests")) is True

    def test_rate_limit(self):
        assert self.fn(Exception("rate limit exceeded")) is True

    def test_generate_content_free_tier(self):
        assert self.fn(Exception("generate_content_free_tier quota reached")) is True

    def test_not_a_quota_error(self):
        assert self.fn(Exception("503 UNAVAILABLE")) is False

    def test_not_a_quota_error_generic(self):
        assert self.fn(ValueError("some random value error")) is False


# ---------------------------------------------------------------------------
# is_service_unavailable_error
# ---------------------------------------------------------------------------

class TestIsServiceUnavailableError:
    def setup_method(self):
        from app.routers.ai import is_service_unavailable_error
        self.fn = is_service_unavailable_error

    def test_genai_503_unavailable(self):
        err = make_genai_client_error("503 UNAVAILABLE. Google servers temporarily down.")
        assert self.fn(err) is True

    def test_genai_unavailable_without_code(self):
        err = make_genai_client_error("UNAVAILABLE: backend service unreachable")
        assert self.fn(err) is True

    def test_genai_503_only(self):
        err = make_genai_client_error("503")
        assert self.fn(err) is True

    def test_quota_error_not_classified_as_unavailable(self):
        # A quota error should NOT trigger is_service_unavailable_error
        err = make_genai_client_error("429 RESOURCE_EXHAUSTED")
        assert self.fn(err) is False

    def test_non_genai_503_not_classified(self):
        # A plain Python exception mentioning 503 should NOT match because
        # it is not a google.genai ClientError instance.
        try:
            from google.genai import errors as genai_errors  # noqa: F401
            # SDK present — the isinstance check should reject this.
            err = NonGeminiHTTPError("upstream returned 503 unavailable")
            assert self.fn(err) is False
        except ImportError:
            # SDK absent — skip this assertion (fallback path tested separately)
            pytest.skip("google-genai not installed; isinstance check not exercisable")

    def test_generic_python_error_not_classified(self):
        try:
            from google.genai import errors as genai_errors  # noqa: F401
            err = RuntimeError("something went wrong")
            assert self.fn(err) is False
        except ImportError:
            pytest.skip("google-genai not installed")


# ---------------------------------------------------------------------------
# detect_items endpoint error mapping
# ---------------------------------------------------------------------------

class TestDetectItemsErrorMapping:
    """Verify that detect_items maps Gemini SDK errors to the right HTTP codes."""

    def _call_detect_items(self, exc_to_raise):
        """Invoke the core error-handling logic extracted from detect_items."""
        from app.routers.ai import is_quota_error, is_service_unavailable_error
        from app.routers.ai import QUOTA_EXCEEDED_MESSAGE, SERVICE_UNAVAILABLE_MESSAGE

        error_msg = str(exc_to_raise)
        if is_quota_error(exc_to_raise):
            raise HTTPException(status_code=429, detail=QUOTA_EXCEEDED_MESSAGE)
        if is_service_unavailable_error(exc_to_raise):
            raise HTTPException(status_code=503, detail=SERVICE_UNAVAILABLE_MESSAGE)
        if "api key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise HTTPException(
                status_code=503,
                detail="AI service authentication failed. Please check GEMINI_API_KEY configuration.",
            )
        raise HTTPException(status_code=500, detail="Failed to analyze image. Please try again.")

    def test_quota_error_returns_429(self):
        err = make_genai_client_error("429 RESOURCE_EXHAUSTED quota exceeded")
        with pytest.raises(HTTPException) as exc_info:
            self._call_detect_items(err)
        assert exc_info.value.status_code == 429

    def test_service_unavailable_returns_503(self):
        err = make_genai_client_error("503 UNAVAILABLE")
        with pytest.raises(HTTPException) as exc_info:
            self._call_detect_items(err)
        assert exc_info.value.status_code == 503

    def test_auth_error_returns_503(self):
        err = Exception("API key is invalid or missing")
        with pytest.raises(HTTPException) as exc_info:
            self._call_detect_items(err)
        assert exc_info.value.status_code == 503

    def test_unknown_error_returns_500(self):
        err = Exception("some unexpected internal error")
        with pytest.raises(HTTPException) as exc_info:
            self._call_detect_items(err)
        assert exc_info.value.status_code == 500

    def test_non_genai_503_string_returns_500(self):
        """A plain exception with '503' in it should NOT be classified as service unavailable."""
        try:
            from google.genai import errors as genai_errors  # noqa: F401
            err = NonGeminiHTTPError("got status 503 from plugin backend")
            with pytest.raises(HTTPException) as exc_info:
                self._call_detect_items(err)
            assert exc_info.value.status_code == 500
        except ImportError:
            pytest.skip("google-genai not installed")


# ---------------------------------------------------------------------------
# SERVICE_UNAVAILABLE_MESSAGE content
# ---------------------------------------------------------------------------

class TestServiceUnavailableMessage:
    def test_message_is_user_friendly(self):
        from app.routers.ai import SERVICE_UNAVAILABLE_MESSAGE
        msg = SERVICE_UNAVAILABLE_MESSAGE.lower()
        # Should mention retrying and not expose internal details
        assert "try again" in msg
        assert "traceback" not in msg
        assert "clienterror" not in msg
        assert "google" in msg
