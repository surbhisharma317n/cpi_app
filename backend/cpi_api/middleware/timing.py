import time
import logging

logger = logging.getLogger("approval")

class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start = time.time()
        response = self.get_response(request)
        duration = round((time.time() - start) * 1000, 2)

        logger.info(
            "Request completed path=%s method=%s status=%s duration_ms=%s",
            request.path,
            request.method,
            response.status_code,
            duration,
        )

        return response
# ---------------- CORS CONFIG (JWT ONLY) ----------------