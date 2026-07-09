# authentication/custom_jwt_raw.py

import logging
from tokenize import TokenError
from django.conf import settings
from django.db import connection
from rest_framework.authentication import BaseAuthentication
from rest_framework import exceptions

from rest_framework_simplejwt.tokens import AccessToken

logger = logging.getLogger(__name__)


# ✅ Clean & Safe SimpleUser
class SimpleUser:
    def __init__(
        self,
        id=None,
        email=None,
        role="user",
        first_name="",
        last_name="",
        permissions=None
    ):
        self.id = id
        self.email = email
        self.role = role or "user"
        self.first_name = first_name or ""
        self.last_name = last_name or ""
        self.permissions = permissions or []

    @classmethod
    def from_payload(cls, payload):
        return cls(
            id=payload.get("user_id"),
            email=payload.get("email"),
            role=payload.get("role", "user"),
            permissions=payload.get("permissions", []),
        )

    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    @property
    def is_anonymous(self):
        return False


# # ✅ Authentication Class
# class RawJWTAuthentication(BaseAuthentication):

#     def authenticate(self, request):

#         # 🔹 Ignore preflight requests (CORS)
#         if request.method == "OPTIONS":
#             return None

#         # 🔹 Skip auth for login endpoint
#         if request.path in ["/api/login/", "/api/login"]:
#             return None

#         auth_header = request.headers.get("Authorization")

#         if not auth_header:
#             return None

#         parts = auth_header.split()

#         if len(parts) != 2 or parts[0].lower() != "bearer":
#             raise exceptions.AuthenticationFailed("Invalid Authorization header format")

#         token = parts[1]

#         try:
#             # ✅ USE SimpleJWT AccessToken (IMPORTANT FIX)
#             access = AccessToken(token)
#             payload = access.payload

#             logger.debug(f"JWT payload: {payload}")

#         except Exception as e:
#             logger.warning(f"JWT error: {str(e)}")
#             raise exceptions.AuthenticationFailed("Invalid or expired token")

#         # ✅ CREATE USER FROM TOKEN
#         user = SimpleUser.from_payload(payload)

#         # ❗ Critical validation
#         if not user.id:
#             raise exceptions.AuthenticationFailed("Invalid token: missing user_id")

#         # 🔥 FALLBACK: If email/role missing (after refresh)
#         if not user.email or not user.role:
#             try:
#                 with connection.cursor() as cursor:
#                     cursor.execute(
#                         "SELECT email, role FROM auth_user WHERE id = %s",
#                         [user.id],
#                     )
#                     row = cursor.fetchone()

#                 if row:
#                     user.email, user.role = row

#             except Exception as e:
#                 logger.error(f"DB fallback failed: {str(e)}")

#         logger.info(
#             f"JWT Auth success | user_id={user.id} | email={user.email} | role={user.role}"
#         )

#         return (user, token)


class RawJWTAuthentication(BaseAuthentication):

    def authenticate(self, request):

        # ✅ Allow preflight (CORS)
        if request.method == "OPTIONS":
            return None

        # ✅ Public endpoints (NO AUTH REQUIRED)
        PUBLIC_PATHS = [
            "/api/login/",
            "/api/login",
            "/api/captcha/",
            "/api/captcha",
        ]

        if request.path in PUBLIC_PATHS:
            return None

        # 🔹 Get Authorization header
        auth_header = request.headers.get("Authorization")

        # ✅ IMPORTANT: Do NOT raise error if missing
        # Let permission classes handle it
        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise exceptions.AuthenticationFailed("Invalid Authorization header")

        token = parts[1]

        # 🔹 Validate token
        try:
            access = AccessToken(token)
            payload = access.payload

        except TokenError as e:
            logger.warning(f"JWT TokenError: {str(e)}")
            raise exceptions.AuthenticationFailed("Token expired or invalid")

        except Exception as e:
            logger.error(f"JWT error: {str(e)}")
            raise exceptions.AuthenticationFailed("Authentication failed")

        # 🔹 Build user from payload
        user = SimpleUser.from_payload(payload)

        # 🔹 Validate user data
        if not user.id:
            raise exceptions.AuthenticationFailed("Invalid token: missing user_id")

        if not user.email or not user.role:
            raise exceptions.AuthenticationFailed("Invalid token: incomplete user data")

        logger.info(
            f"JWT Auth success | user_id={user.id} | email={user.email} | role={user.role}"
        )

        return (user, token)
