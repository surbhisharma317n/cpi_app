import logging
from functools import wraps
from django.core.cache import cache
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

ENABLE_CAPTCHA = False

# 🔑 OTP endpoints that do NOT require email/password
OTP_ENDPOINTS = [
    "/api/verify-otp/",
]

def secure_login(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        request_path = request.path
        client_ip = request.META.get("REMOTE_ADDR", "unknown")

        # ============================
        # ✅ OTP FLOW (verify-otp)
        # ============================
        if request_path in OTP_ENDPOINTS:
            login_token = request.data.get("login_token")
            otp = request.data.get("otp")

            if not login_token or not otp:
                logger.warning(
                    f"Secure OTP failed | missing token/otp | "
                    f"path={request_path} | ip={client_ip}"
                )
                return Response(
                    {"error": "login_token and otp are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            logger.info(
                f"Secure OTP attempt | path={request_path} | ip={client_ip}"
            )

            return view_func(request, *args, **kwargs)

        # ============================
        # 🔐 PASSWORD FLOW (login)
        # ============================
        email = request.data.get("email")
        password = request.data.get("password")
        captcha_input = request.data.get("captcha")
        captcha_session = request.session.get("captcha_code")

        if not email or not password:
            logger.warning(
                f"Secure login failed | missing email/password | "
                f"path={request_path} | ip={client_ip}"
            )
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # CAPTCHA (optional)
        if ENABLE_CAPTCHA:
            if not captcha_input:
                return Response(
                    {"error": "Captcha is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if captcha_input != captcha_session:
                return Response(
                    {"error": "Invalid captcha."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ============================
        # 🚦 Rate limiting (IP-based)
        # ============================
        key = f"login_attempts:{email}:{client_ip}"
        attempts = cache.get(key, 0)

        if attempts >= 10:
            logger.error(
                f"Secure login blocked | too many attempts | "
                f"email={email} | attempts={attempts} | "
                f"path={request_path} | ip={client_ip}"
            )
            return Response(
                {"error": "Too many login attempts. Try again later."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        cache.set(key, attempts + 1, timeout=600)

        logger.info(
            f"Secure login attempt | email={email} | "
            f"attempt={attempts + 1} | path={request_path} | ip={client_ip}"
        )

        return view_func(request, *args, **kwargs)

    return wrapped_view