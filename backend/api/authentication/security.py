import logging
from functools import wraps
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

ENABLE_CAPTCHA = False
MAX_ATTEMPTS = 10
BLOCK_TIME = 600  # seconds (10 min)


def get_client_ip(request):
    """Handle real IP behind proxies"""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def secure_login(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        # Skip validation for CORS preflight OPTIONS requests
        if request.method == "OPTIONS":
            return view_func(request, *args, **kwargs)

        request_path = request.path
        client_ip = get_client_ip(request)

        email = request.data.get("email")
        password = request.data.get("password")
        captcha_input = request.data.get("captcha")

        # ============================
        # ✅ Required fields
        # ============================
        if not email or not password:
            logger.warning(
                f"Login failed | missing credentials | path={request_path} | ip={client_ip}"
            )
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ============================
        # 🔐 CAPTCHA (optional)
        # ============================
        if ENABLE_CAPTCHA:
            captcha_id = request.data.get("captcha_id")
            cached_captcha = cache.get(f"captcha:{captcha_id}")

            if not captcha_input or not captcha_id:
                return Response(
                    {"error": "Captcha is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not cached_captcha or captcha_input != cached_captcha:
                return Response(
                    {"error": "Invalid or expired captcha."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # remove captcha after validation
            cache.delete(f"captcha:{captcha_id}")

        # ============================
        # 🚦 Rate Limiting
        # ============================
        key = f"login_attempts:{email}:{client_ip}"
        attempts = cache.get(key, 0)

        if attempts >= MAX_ATTEMPTS:
            logger.error(
                f"Blocked login | too many attempts | email={email} | ip={client_ip}"
            )
            return Response(
                {"error": "Too many login attempts. Try again after 10 minutes."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # increment attempt
        cache.set(key, attempts + 1, timeout=BLOCK_TIME)

        logger.info(
            f"Login attempt | email={email} | attempt={attempts + 1} | ip={client_ip}"
        )

        # ============================
        # 🚀 Call actual login API
        # ============================
        response = view_func(request, *args, **kwargs)

        # ============================
        # ✅ Reset attempts on success
        # ============================
        if response.status_code == 200:
            cache.delete(key)
            logger.info(
                f"Login success | reset attempts | email={email} | ip={client_ip}"
            )

        return response

    return wrapped_view