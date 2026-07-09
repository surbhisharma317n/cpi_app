import logging
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.db import DatabaseError, connection
from datetime import datetime


import re
import rest_framework
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .custom_jwt_auth import RawJWTAuthentication
from .role_decorator import role_required
from django.db import IntegrityError
from api.schema.user_db import add_user_query, delete_user_query, get_all_user_by_credentials, partial_update_user_query, update__User_account_status, update_user_query

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"
PHONE_REGEX = r"^[6-9]\d{9}$"


logger = logging.getLogger(__name__)

# @api_view(["GET", "POST", "PUT","PATCH", "DELETE"])
# @authentication_classes([RawJWTAuthentication])
# @role_required("admin", "approver")
# def user_list_create(request, pk=None):

#     if request.method == "GET":
#         try:
#             all_user = get_all_user_by_credentials(pk)

#             if pk is not None:
#                 if all_user is None:
#                     return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

#                 keys = [
#                     "id", "first_name", "middle_name", "last_name", "email",
#                     "phone", "role", "is_active", "created_at", "updated_at"
#                 ]
#                 user_dict = dict(zip(keys, all_user))
#                 # user_dict.pop("password", None)  # Don't expose password
#                 return Response(user_dict, status=status.HTTP_200_OK)

#             else:

#                 keys = [
#                     "id", "first_name", "middle_name", "last_name", "email",
#                     "phone", "role", "is_active", "created_at", "updated_at"
#                 ]
#                 result = []
#                 for user in all_user:
#                     user_dict = dict(zip(keys, user))
#                     # user_dict.pop("password", None)
#                     name_parts = [
#                         user_dict.get("first_name", ""),
#                         user_dict.get("middle_name", ""),
#                         user_dict.get("last_name", "")
#                     ]
#                     user_dict["full_name"] = " ".join(part for part in name_parts if part)
#                     result.append(user_dict)
#                 return Response(result, status=status.HTTP_200_OK)

#         except DatabaseError as e:
#             return Response({"error": f"Database error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
#         except Exception as e:
#             return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     elif request.method == "POST":
#         first_name = request.data.get("first_name")
#         middle_name = request.data.get("middle_name") or None
#         last_name = request.data.get("last_name") or None
#         email = request.data.get("email")
#         password = request.data.get("password")
#         phone = request.data.get("phone")
#         role = request.data.get("role")

#         # Basic required field check
#         if not all([first_name, email, password, phone, role]):
#             return Response(
#                 {"error": "Required fields: first_name, email, password, phone, role"},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         # Email validation
#         if not re.match(EMAIL_REGEX, email):
#             return Response({"error": "Invalid email format."}, status=status.HTTP_400_BAD_REQUEST)

#         # Phone validation
#         if not re.match(PHONE_REGEX, phone):
#             return Response({"error": "Invalid phone number format."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             user = add_user_query(first_name, middle_name, last_name, email, password, phone, role)

#             keys = [
#                 "id", "first_name", "middle_name", "last_name", "email",
#                 "phone", "role", "is_active", "created_at", "updated_at"
#             ]
#             data = dict(zip(keys, user))

#             return Response(data, status=status.HTTP_201_CREATED)

#         except IntegrityError as e:
#             if "unique_email" in str(e):
#                 return Response({"error": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)
#             elif "unique_phone" in str(e):
#                 return Response({"error": "Phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
#             return Response({"error": "Duplicate entry."}, status=status.HTTP_400_BAD_REQUEST)

#         except Exception as e:
#             return Response({"error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#     elif request.method == "PUT":

#         try:
#             first_name = request.data.get("first_name")
#             middle_name = request.data.get("middle_name") or None
#             last_name = request.data.get("last_name") or None
#             email = request.data.get("email")
#             password = request.data.get("password")
#             phone = request.data.get("phone")
#             role = request.data.get("role")

#             if not all([first_name, email, password, phone, role]):
#                 return Response(
#                     {"error": "Required fields: first_name, email, password, phone, role"},
#                     status=status.HTTP_400_BAD_REQUEST
#                 )

#             updated_user = update_user_query(
#                 id=pk, first_name=first_name, middle_name=middle_name,
#                 last_name=last_name, email=email, password=password,
#                 phone=phone, role=role
#             )
#             if updated_user is None:
#                 return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

#             keys = [
#                 "id", "first_name", "middle_name", "last_name", "email",
#                 "phone", "role", "is_active", "created_at", "updated_at"
#             ]
#             data = dict(zip(keys, updated_user))
#             data.pop("password", None)

#             return Response(data, status=status.HTTP_200_OK)


#         except IntegrityError as e:
#             if "unique_email" in str(e):
#                 return Response({"error": "Email already exists."}, status=status.HTTP_400_BAD_REQUEST)
#             elif "unique_phone" in str(e):
#                 return Response({"error": "Phone number already exists."}, status=status.HTTP_400_BAD_REQUEST)
#             return Response({"error": "Duplicate entry."}, status=status.HTTP_400_BAD_REQUEST)

#         except Exception as e:
#             return Response({"error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#     elif request.method == "PATCH":
#         try:
#             data = request.data
#             fields = {
#                 "first_name": data.get("first_name"),
#                 "middle_name": data.get("middle_name"),
#                 "last_name": data.get("last_name"),
#                 "email": data.get("email"),
#                 "phone": data.get("phone"),
#                 "role": data.get("role"),
#                 "is_active": data.get("is_active")
#             }

#             # Handle is_active update separately if provided
#             if fields["is_active"] is not None:
#                 updated_user = update__User_account_status(id=pk, is_active=fields["is_active"])
#             else:
#                 # Check if any other field is provided for update
#                 if not any(fields.values()):
#                     return Response(
#                         {"error": "At least one field must be provided for update"},
#                         status=status.HTTP_400_BAD_REQUEST
#                     )
#                 updated_user = partial_update_user_query(id=pk, **fields)

#             if not updated_user:
#                 return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

#             # Prepare response data
#             response_keys = [
#                 "id", "first_name", "middle_name", "last_name", "email",
#                 "phone", "role", "is_active", "created_at", "updated_at"
#             ]
#             response_data = {
#                 k: v for k, v in zip(response_keys, updated_user)
#                 if k != "password" and v is not None
#             }

#             return Response(response_data, status=status.HTTP_200_OK)

#         except IntegrityError as e:
#             error_messages = {
#                 "unique_email": "Email already exists.",
#                 "unique_phone": "Phone number already exists."
#             }
#             for key, message in error_messages.items():
#                 if key in str(e):
#                     return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
#             raise  # Re-raise unexpected IntegrityError

#     elif request.method == "DELETE":
#         try:
#             is_active = request.data.get("is_active")

#             if is_active is None:
#                 return Response({"error": "Missing 'is_active' field in request"}, status=status.HTTP_400_BAD_REQUEST)

#             # Convert string/JSON boolean to proper Python boolean
#             is_active = str(is_active).lower() in ["true", "1"]

#             result = delete_user_query(pk, is_active)

#             if not result:
#                 return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

#             return Response({"status": f"User is_active set to {is_active}"}, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response({"error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
@authentication_classes([RawJWTAuthentication])
@permission_classes([IsAuthenticated])
@role_required("admin", "approver")
def user_list_create(request, pk=None):

    # ---------------- GET (OPTIMIZED) ----------------
    if request.method == "GET":
        try:
            # ✅ Pagination
            page = int(request.GET.get("page", 1))
            limit = int(request.GET.get("limit", 20))
            offset = (page - 1) * limit

            users = get_all_user_by_credentials(pk, limit=limit, offset=offset)

            keys = [
                "id", "first_name", "middle_name", "last_name", "email",
                "phone", "role", "is_active", "created_at", "updated_at"
            ]

            # 👉 Single user
            if pk:
                if not users:
                    return Response({"error": "User not found"}, status=404)

                return Response(dict(zip(keys, users)), status=200)

            # 👉 Multiple users (FAST list comprehension)
            result = [
                {
                    **dict(zip(keys, user)),
                    "full_name": " ".join(filter(None, user[1:4]))
                }
                for user in users or []
            ]

            return Response({
                "page": page,
                "limit": limit,
                "count": len(result),
                "data": result
            }, status=200)

        except DatabaseError as e:
            logger.error(f"DB Error: {e}")
            return Response({"error": "Database error"}, status=500)

        except Exception as e:
            logger.error(f"GET error: {e}")
            return Response({"error": "Unexpected error"}, status=500)

    # ---------------- POST ----------------
    elif request.method == "POST":
        data = request.data

        required = ["first_name", "email", "password", "phone", "role"]
        if not all(data.get(f) for f in required):
            return Response({"error": "Missing required fields"}, status=400)

        if not re.match(EMAIL_REGEX, data["email"]):
            return Response({"error": "Invalid email"}, status=400)

        if not re.match(PHONE_REGEX, data["phone"]):
            return Response({"error": "Invalid phone"}, status=400)

        try:
            user = add_user_query(
                data["first_name"],
                data.get("middle_name"),
                data.get("last_name"),
                data["email"],
                data["password"],
                data["phone"],
                data["role"],
            )

            keys = [
                "id", "first_name", "middle_name", "last_name", "email",
                "phone", "role", "is_active", "created_at", "updated_at"
            ]

            return Response(dict(zip(keys, user)), status=201)

        except IntegrityError as e:
            msg = str(e)
            if "unique_email" in msg:
                return Response({"error": "Email exists"}, status=400)
            if "unique_phone" in msg:
                return Response({"error": "Phone exists"}, status=400)
            return Response({"error": "Duplicate entry"}, status=400)

        except Exception as e:
            logger.error(f"POST error: {e}")
            return Response({"error": "Server error"}, status=500)

    # ---------------- PUT ----------------
    elif request.method == "PUT":
        data = request.data

        required = ["first_name", "email", "password", "phone", "role"]
        if not all(data.get(f) for f in required):
            return Response({"error": "Missing required fields"}, status=400)

        try:
            updated = update_user_query(
                id=pk,
                first_name=data["first_name"],
                middle_name=data.get("middle_name"),
                last_name=data.get("last_name"),
                email=data["email"],
                password=data["password"],
                phone=data["phone"],
                role=data["role"],
            )

            if not updated:
                return Response({"error": "User not found"}, status=404)

            keys = [
                "id", "first_name", "middle_name", "last_name", "email",
                "phone", "role", "is_active", "created_at", "updated_at"
            ]

            return Response(dict(zip(keys, updated)), status=200)

        except IntegrityError:
            return Response({"error": "Duplicate entry"}, status=400)

        except Exception as e:
            logger.error(f"PUT error: {e}")
            return Response({"error": "Server error"}, status=500)

    # ---------------- PATCH ----------------
    elif request.method == "PATCH":
        try:
            data = request.data

            is_active = data.get("is_active")

            if is_active is not None:
                is_active = str(is_active).lower() in ["true", "1"]
                updated = update__User_account_status(pk, is_active)
            else:
                update_fields = {
                    k: v for k, v in data.items()
                    if k in ["first_name", "middle_name", "last_name", "email", "phone", "role"]
                    and v is not None
                }

                if not update_fields:
                    return Response({"error": "No fields to update"}, status=400)

                updated = partial_update_user_query(pk, **update_fields)

            if not updated:
                return Response({"error": "User not found"}, status=404)

            keys = [
                "id", "first_name", "middle_name", "last_name", "email",
                "phone", "role", "is_active", "created_at", "updated_at"
            ]

            return Response(dict(zip(keys, updated)), status=200)

        except IntegrityError:
            return Response({"error": "Duplicate entry"}, status=400)

        except Exception as e:
            logger.error(f"PATCH error: {e}")
            return Response({"error": "Server error"}, status=500)

    # ---------------- DELETE ----------------
    elif request.method == "DELETE":
        try:
            is_active = request.data.get("is_active")

            if is_active is None:
                return Response({"error": "is_active required"}, status=400)

            is_active = str(is_active).lower() in ["true", "1"]

            result = delete_user_query(pk, is_active)

            if not result:
                return Response({"error": "User not found"}, status=404)

            return Response(
                {"message": f"User status updated to {is_active}"},
                status=200
            )

        except Exception as e:
            logger.error(f"DELETE error: {e}")
            return Response({"error": "Server error"}, status=500)
