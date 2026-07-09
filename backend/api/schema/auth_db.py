from django.db import connection
from django.contrib.auth.hashers import check_password
from django.db import connection
from django.contrib.auth.hashers import check_password

import logging

logger = logging.getLogger(__name__)
from django.contrib.auth.hashers import make_password
# def get_user_by_credentials(email, password):
#     with connection.cursor() as cursor:
#         cursor.execute(
#             """
#             SELECT id, email,  first_name, last_name, password, role
#             FROM auth_user
#             WHERE email = %s
#             """,
#             [email],
#         )
#         row = cursor.fetchone()
        
        
#         print(row, email, password,"==================user credentials==================")

#     if not row:
#         return None

#     user_id, email,  first_name, last_name, hashed_password, role = row
    
#     print(hashed_password, "==================hashed password==================")

#     if not check_password(password, hashed_password):
#         return None

#     return {
#         "id": user_id,
#         "email": email,
       
#         "first_name": first_name or "",
#         "last_name": last_name or "",
#         "role": role or "user",
#     }



# def get_user_by_credentials(email, password):
#     with connection.cursor() as cursor:
#         cursor.execute(
#             """
#             SELECT id, email, first_name, last_name, password, role
#             FROM auth_user
#             WHERE email = %s
#             """,
#             [email],
#         )
#         row = cursor.fetchone()

#     if not row:
#         logger.warning(f"Login failed | user not found | email={email}")
#         return None

#     user_id, email, first_name, last_name, stored_password, role = row

#     # 🔹 CASE 1: Password is HASHED (pbkdf2_...)
#     if stored_password.startswith("pbkdf2_"):
#         if not check_password(password, stored_password):
#             logger.warning(f"Login failed | invalid password (hashed) | email={email}")
#             return None

#     # 🔹 CASE 2: Password is PLAIN TEXT (your current situation)
#     else:
#         if password != stored_password:
#             logger.warning(f"Login failed | invalid password (plain) | email={email}")
#             return None

#         # 🔥 AUTO-UPGRADE: hash password after successful login
#         new_hashed_password = make_password(password)
#         with connection.cursor() as cursor:
#             cursor.execute(
#                 "UPDATE auth_user SET password = %s WHERE id = %s",
#                 [new_hashed_password, user_id],
#             )
#         logger.info(f"Password upgraded to hashed | email={email}")

#     # ✅ SUCCESS
#     logger.info(f"Login successful | user_id={user_id} | email={email}")

#     return {
#         "id": user_id,
#         "email": email,
#         "first_name": first_name or "",
#         "last_name": last_name or "",
#         "role": role or "user",
#     }
class SimpleUser:
    """
    Minimal user class for JWT token generation without full Django model.
    """
    def __init__(self, id: int, email: str, role: str, first_name="", last_name=""):
        self.id = id
        self.email = email
        self.role = role
        self.first_name = first_name
        self.last_name = last_name

    @property
    def is_active(self):
        return True

    @property
    def is_staff(self):
        return self.role.lower() in ["admin", "staff"]

    @property
    def is_superuser(self):
        return self.role.lower() == "admin"

def get_user_by_credentials(email, password):
    try:
        import sqlite3
        import os

        # Use SQLite directly
        db_path = os.path.join(os.path.dirname(__file__), '../../db.sqlite3')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, email, first_name, last_name, password FROM auth_user WHERE email = ?",
            (email,),
        )
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not row:
            logger.warning(f"User not found: {email}")
            return None

        user_id, email_db, first_name, last_name, stored_password = row
        role = "user"  # Default role since column doesn't exist

        logger.info(f"Found user: {email_db}")

        # Password validation
        if stored_password and stored_password.startswith("pbkdf2_"):
            if not check_password(password, stored_password):
                logger.warning(f"Invalid password for {email}")
                return None
        elif stored_password == password:
            logger.info(f"Plaintext password matched for {email}")
        else:
            logger.warning(f"Password mismatch for {email}")
            return None

        # Return SimpleUser
        return SimpleUser(
            id=user_id,
            email=email_db,
            role=role or "user",
            first_name=first_name or "",
            last_name=last_name or "",
        )
    except Exception as e:
        logger.error(f"Error in get_user_by_credentials: {e}", exc_info=True)
        return None