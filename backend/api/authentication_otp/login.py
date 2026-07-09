from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

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

# @api_view(["POST"])
# def login_api(request):  
#     email = request.data.get("email")
#     password = request.data.get("password")
#     captcha_input = request.data.get("captcha")
#     captcha_session = request.session.get("captcha_code")

#     # if not all([email, password, captcha_input]):
#     #     return Response({"error": "Username, password, and captcha are required."}, status=status.HTTP_400_BAD_REQUEST)

#     # Uncomment to enable CAPTCHA verification
#     # if captcha_input != captcha_session:
#     #     return Response({"error": "Invalid captcha."}, status=status.HTTP_400_BAD_REQUEST)
    
#     print("Received email:", email, "password:", password, "captcha_input:", captcha_input, "captcha_session:", captcha_session)

#     user = get_user_by_credentials(email, password)
#     print("User fetched from DB:", user)

#     if user:
#         user_id = user[0]
#         userDetails={user_id: user[0], 'email': user[3], 'role': user[4], 'username': user[1], 'first_name': user[5], 'last_name': user[6], 'last_login': user[8], 'created_at': user[9], 'updated_at': user[10]}
#         print("User details:", userDetails)
#         token = create_jwt_token(user_id, email,user[1],user[2], user[7],user[12])  # Assuming user[1] is the username or similar identifier

#         # Save session info
#         request.session.set_expiry(0)
#         request.session['logged_in'] = True
#         request.session['email'] = email
#         request.session['user_id'] = user_id
#         request.session.modified = True

#         # Generate and send OTP
#         otp = str(random.randint(100000, 999999))
#         subject = "Your OTP Code"
#         message = f"Your OTP code is {otp}. It will expire in 5 minutes."
#         from_email = settings.EMAIL_HOST_USER

#         updated_at = timezone.now()
#         expires_at = updated_at + timedelta(minutes=5)

#         try:
#             with connection.cursor() as cursor:
#                 # Update OTP for this user
#                 cursor.execute('''
#                     UPDATE "auth_user"
#                     SET otp = %s,
#                         updated_at = %s,
#                         expires_at = %s
#                     WHERE email = %s
#                 ''', [otp, updated_at, expires_at, email])

#             # send_mail(subject, message, from_email, [email])

#         except Exception as e:
#             return Response({"error": f"Login succeeded but failed to send OTP: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#         return Response({
#             "message": "Login successful. OTP sent to email.",
#             "user_id": user_id,
#             "token": token
#         }, status=status.HTTP_200_OK)
    
#     else:
#         return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)




from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.utils import timezone
from datetime import timedelta
import random

# @api_view(["POST"])
# @permission_classes([AllowAny])
# @authentication_classes([])  # 🔥 disable auth completely
# def login_api(request):
#     email = request.data.get("email")
#     password = request.data.get("password")

#     if not email or not password:
#         return Response(
#             {"error": "Email and password are required"},
#             status=status.HTTP_400_BAD_REQUEST
#         )

#     # 🔹 RAW USER FETCH
#     user = get_user_by_credentials(email, password)

#     if not user:
#         return Response(
#             {"error": "Invalid credentials"},
#             status=status.HTTP_401_UNAUTHORIZED
#         )

#     user_id = user[0]

#     # 🔹 CREATE JWT (YOUR FUNCTION)
#     token = create_jwt_token(
#         user_id,
#         email,
#         user[1],   # username
#         user[2],   # phone?
#         user[7],   # role?
#         user[12],  # permissions?
#     )

#     # 🔹 OTP GENERATION (OPTIONAL)
#     otp = str(random.randint(100000, 999999))
#     updated_at = timezone.now()
#     expires_at = updated_at + timedelta(minutes=5)

#     try:
#         with connection.cursor() as cursor:
#             cursor.execute(
#                 """
#                 UPDATE auth_user
#                 SET otp = %s,
#                     updated_at = %s,
#                     expires_at = %s
#                 WHERE email = %s
#                 """,
#                 [otp, updated_at, expires_at, email],
#             )
#     except Exception as e:
#         return Response(
#             {"error": f"OTP update failed: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )

#     # ❌ DO NOT SET SESSION
#     # ❌ DO NOT CALL login()
#     # ❌ DO NOT TOUCH request.session

#     return Response(
#         {
#             "message": "Login successful",
#             "token": token,
#             "user": {
#                 "id": user_id,
#                 "email": email,
#                 "username": user[1],
#                 "role": user[4],
#             },
#         },
#         status=status.HTTP_200_OK,
#     )

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


logger = logging.getLogger(__name__)


from django.core.cache import cache

cache.delete("login_attempts:127.0.0.1")


# @api_view(["POST"])
# @permission_classes([AllowAny])  # 🔥 THIS IS ENOUGH

# @secure_login
# def login_api(request):
#     email = request.data.get("email")
#     password = request.data.get("password")

#     client_ip = request.META.get("REMOTE_ADDR")

#     # ⚠️ Missing credentials
#     if not email or not password:
#         logger.warning(
#             f"Login failed | missing credentials | ip={client_ip}"
#         )
#         return Response(
#             {"error": "Email and password are required"},
#             status=status.HTTP_400_BAD_REQUEST,
#         )

#     user = get_user_by_credentials(email, password)

#     # ❌ Invalid credentials
#     if not user:
#         logger.warning(
#             f"Login failed | invalid credentials | email={email} | ip={client_ip}"
#         )
#         return Response(
#             {"error": "Invalid credentials"},
#             status=status.HTTP_401_UNAUTHORIZED,
#         )

#     role = user.get("role", "user")
#     permissions = ROLE_PERMISSIONS.get(role, [])

#     token = create_jwt_token(
#         user_id=user["id"],
#         email=user["email"],
#         first_name=user.get("first_name", ""),
#         last_name=user.get("last_name", ""),
#         role=role,
#         permissions=permissions,
#     )

#     # ✅ SUCCESS LOG
#     logger.info(
#         f"Login successful | user_id={user['id']} | email={user['email']} "
#         f"| role={role} | ip={client_ip}"
#     )

#     return Response(
#         {
#             "message": "Login successful",
#             "token": token,
#             "user": {
#                 "id": user["id"],
#                 "email": user["email"],
#                 "role": role,
#                 "permissions": permissions,
#             },
#         },
#         status=status.HTTP_200_OK,
#     )
@api_view(["POST"])
@permission_classes([AllowAny])
@secure_login
def login_api(request):
    email = request.data.get("email")
    password = request.data.get("password")
    captcha = request.data.get("captcha")
    captcha_id = request.data.get("captcha_id")
    client_ip = request.META.get("REMOTE_ADDR")

    if not email or not password or not captcha or not captcha_id:
        return Response(
            {"error": "Email, password, captcha and captcha_id are required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    cached_captcha = cache.get(f"captcha:{captcha_id}")
    if not cached_captcha or captcha != cached_captcha:
        return Response({"error": "Invalid or expired captcha"}, status=status.HTTP_400_BAD_REQUEST)

    # Remove captcha after validation
    cache.delete(f"captcha:{captcha_id}")

    # Validate credentials
    user = get_user_by_credentials(email, password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    # Send OTP
    login_token = send_login_otp(user)

    return Response(
        {
            "message": "OTP sent successfully",
            "otpstatus": "success",
            
            "login_token": login_token,
        },
        status=status.HTTP_200_OK,
    )

# @api_view(["GET"])
# @permission_classes([AllowAny])
# def get_captcha_api(request):
#     captcha_code = generate_captcha()
#     request.session["captcha_code"] = captcha_code
#     return Response({"captcha": captcha_code})

@api_view(["GET"])
@permission_classes([AllowAny])
def get_captcha_api(request):
    captcha_code = generate_captcha()
    captcha_id = uuid.uuid4().hex

    cache.set(f"captcha:{captcha_id}", captcha_code, timeout=300)

    return Response({
        "captcha_id": captcha_id,
        "captcha": captcha_code  # ⚠️ hide in production
    })

