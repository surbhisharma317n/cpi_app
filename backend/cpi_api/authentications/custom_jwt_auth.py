# authentication/custom_jwt_raw.py
import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

class RawJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None  # No token → treated as anonymous

        try:
            prefix, token = auth_header.split(" ")
            if prefix.lower() != "bearer":
                raise exceptions.AuthenticationFailed("Invalid token prefix")
        except ValueError:
            raise exceptions.AuthenticationFailed("Invalid Authorization header")

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Token expired")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid token")

        # Create a simple user object from payload
        class SimpleUser:
            def __init__(self, data):
                self.id = data.get("user_id")
                self.username = data.get("username")
                self.first_name = data.get("first_name", "")
                self.last_name = data.get("last_name", "")
                self.role = data.get("role", "user")
                self.is_authenticated = True

        return (SimpleUser(payload), token)
