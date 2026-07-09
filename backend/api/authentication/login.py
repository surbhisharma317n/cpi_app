from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from api.utils.jwt_utils import create_jwt_token
from ..utils.captcha import generate_captcha
from api.schema.auth_db import get_user_by_credentials

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.db import connection
import uuid
import random




from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
from datetime import timedelta
import random



from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from django.db import connection
import random
import logging

from .constant import ROLE_PERMISSIONS
from .security import secure_login
from .email_otp import send_login_otp
from rest_framework_simplejwt.tokens import RefreshToken


logger = logging.getLogger(__name__)


from django.core.cache import cache

cache.delete("login_attempts:127.0.0.1")


@csrf_exempt
def login_api_simple(request):
    """Simple login without decorators to ensure CORS works"""
    import json

    origin = request.META.get('HTTP_ORIGIN', '*')

    # Handle CORS preflight
    if request.method == "OPTIONS":
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '3600'
        return response

    # Handle POST
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')
            captcha = data.get('captcha')
            captcha_id = data.get('captcha_id')

            # Validate captcha
            cached_captcha = cache.get(f"captcha:{captcha_id}")
            if not cached_captcha or captcha != cached_captcha:
                response = HttpResponse(json.dumps({"error": "Invalid captcha"}), content_type='application/json', status=400)
                response['Access-Control-Allow-Origin'] = origin
                return response

            # Get user
            user = get_user_by_credentials(email, password)
            if not user:
                response = HttpResponse(json.dumps({"error": "Invalid credentials"}), content_type='application/json', status=401)
                response['Access-Control-Allow-Origin'] = origin
                return response

            # Create tokens
            refresh = RefreshToken()
            refresh["user_id"] = user.id
            refresh["email"] = user.email
            refresh["role"] = user.role
            refresh["first_name"] = user.first_name
            refresh["last_name"] = user.last_name

            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            result = {
                "message": "Login successful",
                "token": access_token,
                "refresh": refresh_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "role": user.role,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            }

            response = HttpResponse(json.dumps(result), content_type='application/json', status=200)
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response

        except Exception as e:
            response = HttpResponse(json.dumps({"error": str(e)}), content_type='application/json', status=500)
            response['Access-Control-Allow-Origin'] = origin
            return response

    return HttpResponse(json.dumps({"error": "Method not allowed"}), status=405)


@csrf_exempt
@api_view(["POST", "OPTIONS"])
@permission_classes([AllowAny])
@secure_login
def login_api(request):
    # Handle CORS preflight
    origin = request.META.get('HTTP_ORIGIN', '*')

    if request.method == "OPTIONS":
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS, GET'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '3600'
        response.status_code = 200
        return response

    if True:  # else block
        email = request.data.get("email")
        password = request.data.get("password")
        captcha = request.data.get("captcha")
        captcha_id = request.data.get("captcha_id")

        print(f"DEBUG: Login attempt - email={email}, password={password}")

        if not email or not password or not captcha or not captcha_id:
            response = Response(
                {"error": "Email, password, captcha and captcha_id are required"},
                status=400,
            )
        else:
            # CAPTCHA validation
            cached_captcha = cache.get(f"captcha:{captcha_id}")
            print(f"DEBUG: Captcha check - stored={cached_captcha}, provided={captcha}")
            if not cached_captcha or captcha != cached_captcha:
                response = Response({"error": "Invalid captcha"}, status=400)
            else:
                print(f"DEBUG: Checking credentials for {email}")
                user = get_user_by_credentials(email, password)
                print(f"DEBUG: get_user_by_credentials returned: {user}")

                if not user:
                    response = Response({"error": "Invalid credentials"}, status=401)
                else:
                    # ✅ CONCURRENT SESSION FIX
                    # Blacklist old refresh token if exists
                    old_refresh_token = cache.get(f"user_refresh:{user.id}")
                    if old_refresh_token:
                        # blacklist the old token
                        cache.set(f"blacklist:{old_refresh_token}", True, timeout=86400)
                        cache.delete(f"user_refresh:{user.id}")

                    # 🔥 CREATE TOKEN WITHOUT Django User
                    refresh = RefreshToken()

                    refresh["user_id"] = user.id
                    refresh["email"] = user.email
                    refresh["role"] = user.role
                    refresh["first_name"] = user.first_name
                    refresh["last_name"] = user.last_name

                    access_token = str(refresh.access_token)
                    refresh_token = str(refresh)

                    # ✅ Store new refresh token for this user
                    cache.set(f"user_refresh:{user.id}", refresh_token, timeout=86400)  # 24 hours

                    response = Response({
                        "message": "Login successful",
                        "token": access_token,
                        "refresh": refresh_token,
                        "user": {
                            "id": user.id,
                            "email": user.email,
                            "role": user.role,
                            "first_name": user.first_name,
                            "last_name": user.last_name,
                        },
                    })

    # Add CORS headers to response
    response['Access-Control-Allow-Origin'] = origin
    response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response['Access-Control-Allow-Credentials'] = 'true'

    return response


# @api_view(["GET"])
# @permission_classes([AllowAny])
# def get_captcha_api(request):
#     captcha_code = generate_captcha()
#     request.session["captcha_code"] = captcha_code
#     return Response({"captcha": captcha_code})

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def get_captcha_api(request):
#     captcha_code = generate_captcha()
#     captcha_id = uuid.uuid4().hex

#     cache.set(f"captcha:{captcha_id}", captcha_code, timeout=300)

#     return Response({
#         "captcha_id": captcha_id,
#         "captcha": captcha_code  # ⚠️ hide in production
#     })


@api_view(["GET", "OPTIONS"])
@permission_classes([AllowAny])
def get_captcha_api(request):
    # Handle CORS preflight
    if request.method == "OPTIONS":
        response = Response()
    else:
        captcha_code = generate_captcha()
        print("Generated CAPTCHA:", captcha_code)  # Debug log
        captcha_id = uuid.uuid4().hex

        # ⚡ Non-blocking cache (fail-safe)
        try:
            cache.set(f"captcha:{captcha_id}", captcha_code, timeout=300)
        except Exception as e:
            print("Cache issue:", e)

        response = Response({
            "captcha_id": captcha_id,
            "captcha": captcha_code # ⚠️ hide in production
        })

    # Add CORS headers
    origin = request.META.get('HTTP_ORIGIN', '*')
    response['Access-Control-Allow-Origin'] = origin
    response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response['Access-Control-Allow-Credentials'] = 'true'

    return response

