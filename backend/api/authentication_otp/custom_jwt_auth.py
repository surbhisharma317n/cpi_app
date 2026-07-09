# authentication/custom_jwt_raw.py
import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from rest_framework.authentication import BaseAuthentication

from rest_framework import authentication, exceptions
from django.conf import settings
import jwt
import logging

logger = logging.getLogger(__name__)

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
import jwt
import logging
from django.conf import settings
from rest_framework.authentication import BaseAuthentication

logger = logging.getLogger(__name__)


# class RawJWTAuthentication(BaseAuthentication):
#     def authenticate(self, request):

#         # 🔥 Ignore CORS preflight
#         if request.method == "OPTIONS":
#             return None

#         # 🔥 Allow login without token
#         if request.path in ["/api/login/", "/api/login"]:
#             return None

#         auth = request.headers.get("Authorization")
#         if not auth:
#             logger.warning(
#                 f"Auth skipped | missing Authorization header | "
#                 f"path={request.path} | ip={request.META.get('REMOTE_ADDR')}"
#             )
#             return None

#         parts = auth.split(" ")
#         if len(parts) != 2 or parts[0].lower() != "bearer":
#             logger.warning("Invalid Authorization header format")
#             return None

#         token = parts[1]

#         try:
#             payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
#         except jwt.ExpiredSignatureError:
#             logger.warning("JWT expired")
#             return None
#         except jwt.InvalidTokenError as e:
#             logger.error(f"Invalid JWT token: {e}")
#             return None

#         class SimpleUser:
#             is_authenticated = True

#             def __init__(self, data):
#                 self.id = data["user_id"]
#                 self.email = data["email"]
#                 self.role = data.get("role", "user")
#                 self.is_authenticated = True
#                 self.permissions = data.get("permissions", [])

#         user = SimpleUser(payload)

#         logger.info(
#             f"Authentication successful | user_id={user.id} | "
#             f"email={user.email} | role={user.role}"
#         )
#         userData = {
#             "user_id": user.id,
#             "email": user.email,
#             "full_name": payload.get("full_name", ""),
#             "role": user.role,
#             "is_authenticated": user.is_authenticated,
#             "permissions": user.permissions,
#         }

#         print("Authenticated user:", user,token)

#         return (user, token)



# authentication/custom_jwt_raw.py

# import jwt
# import logging
# from django.conf import settings
# from rest_framework.authentication import BaseAuthentication
# from rest_framework import exceptions

# logger = logging.getLogger(__name__)


class SimpleUser:
    def __init__(self, payload):
        self.id = payload["user_id"]
        self.email = payload["email"]
        self.role = payload.get("role", "user")
        self.permissions = payload.get("permissions", [])

    @property
    def is_authenticated(self):
        return True


    def __str__(self):
        return f"SimpleUser(id={self.id}, email={self.email}, role={self.role})"

    def __repr__(self):
        return self.__str__()


class RawJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):

        # Ignore preflight
        if request.method == "OPTIONS":
            return None

        # Allow login
        if request.path in ["/api/login/", "/api/login"]:
            return None

        auth = request.headers.get("Authorization")
        if not auth:
            return None

        parts = auth.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None

        token = parts[1]

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
            )
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid token")

        user = SimpleUser(payload)

        logger.info(
            f"JWT Auth success | user_id={user.id} | email={user.email} | role={user.role}"
        )

        # ✅ RETURN USER OBJECT, NOT DICT
        return (user, token)
