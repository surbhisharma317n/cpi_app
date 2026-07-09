from django.core.mail import send_mail
from django.conf import settings
import pytz
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import random
from datetime import timedelta
from django.utils import timezone
from django.db import connection
from api.utils.jwt_utils import create_jwt_token

from .constant import ROLE_PERMISSIONS
from .security import secure_login
import logging
from django.core.cache import cache
import uuid



logger = logging.getLogger(__name__)



def send_login_otp(user):
    """
    Generate OTP, store in DB, cache login_token, send email
    """
    otp = str(random.randint(100000, 999999))
    updated_at = timezone.now()
    expires_at = updated_at + timedelta(minutes=5)
    login_token = uuid.uuid4().hex

    # Save OTP in DB
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE auth_user
            SET otp = %s,
                updated_at = %s,
                expires_at = %s
            WHERE id = %s
        """, [otp, updated_at, expires_at, user["id"]])

    # Save OTP in cache with login_token
    cache.set(f"login_otp:{login_token}", {
        "otp": otp,
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"]
    }, timeout=300)  # 5 minutes

    # Send OTP email
    send_mail(
        subject="Your Login OTP",
        message=f"Your OTP is {otp}. It expires in 5 minutes.",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user["email"]],
        fail_silently=False,
    )

    return login_token



@api_view(["POST"])
def send_otp_email(request):
    email = request.data.get("email")

    if not email:
        return Response(
            {"error": "Email is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    otp = str(random.randint(100000, 999999))
    updated_at = timezone.now()
    expires_at = updated_at + timedelta(minutes=5)

    try:
        with connection.cursor() as cursor:
            # ✅ Ensure user exists (single table)
            cursor.execute(
                'SELECT id FROM auth_user WHERE email = %s',
                [email]
            )
            row = cursor.fetchone()

            if not row:
                return Response(
                    {"error": "Email not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            user_id = row[0]

            # ✅ Update OTP (overwrite old one)
            cursor.execute("""
                UPDATE auth_user
                SET otp = %s,
                    updated_at = %s,
                    expires_at = %s
                WHERE email = %s
            """, [otp, updated_at, expires_at, email])

        # ✅ Send OTP email
        send_mail(
            subject="Your OTP Code",
            message=f"CPI Compilation System: Your One-Time Password (OTP) is {otp}. This OTP is valid for 5 minutes. Please do not share it with anyone.",
            from_email=settings.EMAIL_HOST_USER,
            recipient_list=[email],
        )
        
        

        return Response(
            {
                "message": "OTP sent successfully",
                "user_id": user_id
            },
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.exception("OTP send failed")
        return Response(
            {"error": "Failed to send OTP"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
        


@api_view(["POST"])
@permission_classes([AllowAny])
@secure_login
def verify_otp(request):
    login_token = request.data.get("login_token")
    otp = request.data.get("otp")

    if not login_token or not otp:
        return Response(
            {"error": "OTP and login_token are required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    cached = cache.get(f"login_otp:{login_token}")
    if not cached:
        return Response(
            {"error": "OTP expired or invalid"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if otp != cached["otp"]:
        return Response(
            {"error": "Invalid OTP"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------- Validate OTP in DB ----------
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id,first_name,last_name,CONCAT_WS(' ', first_name, last_name) AS full_name, email, role, otp, expires_at
            FROM auth_user
            WHERE id = %s
        """, [cached["user_id"]])
        row = cursor.fetchone()

    if not row:
        return Response(
            {"error": "User not found"},
            status=status.HTTP_400_BAD_REQUEST
        )

  
    db_id,first_name,last_name,full_name,db_email,db_role, db_otp,db_expires_at= row


    # ✅ FIX: make expires_at timezone-aware
    if timezone.is_naive(db_expires_at):
        db_expires_at = timezone.make_aware(
            db_expires_at,
            timezone.get_current_timezone()
        )

    now = timezone.now()

    if db_otp != otp or db_expires_at < now:
        return Response(
            {"error": "OTP expired or invalid"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ---------- Cleanup ----------
    cache.delete(f"login_otp:{login_token}")
    permissions = ROLE_PERMISSIONS.get(db_role, [])

    # ---------- Generate JWT ----------
    token = create_jwt_token(
        user_id=db_id,
        email=db_email,
        role=db_role,
        first_name=first_name,
        last_name=last_name,
        full_name=full_name,
        permissions=permissions,
        
    )

    return Response(
        {
            "message": "Login successful",
            "otpstatus": "success",
            "email": db_email,
            "role": db_role,
            "token": token,
        },
        status=status.HTTP_200_OK
    )
        
