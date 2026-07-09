from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import DatabaseError, connection
from datetime import datetime
import re
from django.db import IntegrityError
from api.schema.user_db import add_user_query, delete_user_query, get_all_user_by_credentials, partial_update_user_query, update__User_account_status, update_user_query
from .permission_utils import check_permission
from .permissions_map import METHOD_PERMISSION_MAP

from .permision import HasAPIPermission
EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"
PHONE_REGEX = r"^[6-9]\d{9}$"

class user_list_create(APIView):

    """
    User CRUD with Role & Permission based access
    """
    permission_classes = [HasAPIPermission]

    def permission_denied(self, request, message=None, code=None):
        return getattr(
            self,
            "permission_error",
            Response({"detail": "Permission denied"}, status=403),
        )
        
        
     

    # ===================== GET =====================
    def get(self, request, pk=None):
        try:
            users = get_all_user_by_credentials(pk)

            keys = [
                "id", "first_name", "middle_name", "last_name",
                "email", "phone", "role", "is_active",
                "created_at", "updated_at"
            ]

            if pk:
                if not users:
                    return Response({"error": "User not found"}, status=404)
                return Response(dict(zip(keys, users)))

            result = []
            for user in users:
                u = dict(zip(keys, user))
                u["full_name"] = " ".join(
                    filter(None, [u["first_name"], u["middle_name"], u["last_name"]])
                )
                result.append(u)

            return Response(result)

        except DatabaseError as e:
            return Response({"error": str(e)}, status=500)

    # ===================== POST =====================
    def post(self, request):
        data = request.data

        if not all([data.get("first_name"), data.get("email"),
                    data.get("password"), data.get("phone"), data.get("role")]):
            return Response(
                {"error": "Required fields missing"},
                status=400
            )

        if not re.match(EMAIL_REGEX, data["email"]):
            return Response({"error": "Invalid email"}, status=400)

        if not re.match(PHONE_REGEX, data["phone"]):
            return Response({"error": "Invalid phone"}, status=400)

        try:
            user = add_user_query(**data)
            keys = [
                "id", "first_name", "middle_name", "last_name",
                "email", "phone", "role", "is_active",
                "created_at", "updated_at"
            ]
            return Response(dict(zip(keys, user)), status=201)

        except IntegrityError as e:
            if "email" in str(e):
                return Response({"error": "Email already exists"}, status=400)
            if "phone" in str(e):
                return Response({"error": "Phone already exists"}, status=400)
            return Response({"error": "Duplicate entry"}, status=400)

    # ===================== PUT =====================
    def put(self, request, pk):
        updated = update_user_query(id=pk, **request.data)
        if not updated:
            return Response({"error": "User not found"}, status=404)

        return Response({"status": "User updated"})

    # ===================== PATCH =====================
    def patch(self, request, pk):
        if "is_active" in request.data:
            updated = update__User_account_status(pk, request.data["is_active"])
        else:
            updated = partial_update_user_query(pk, **request.data)

        if not updated:
            return Response({"error": "User not found"}, status=404)

        return Response({"status": "User updated"})

    # ===================== DELETE =====================
    def delete(self, request, pk):
        is_active = request.data.get("is_active")
        if is_active is None:
            return Response({"error": "is_active required"}, status=400)

        is_active = str(is_active).lower() in ["true", "1"]
        deleted = delete_user_query(pk, is_active)

        if not deleted:
            return Response({"error": "User not found"}, status=404)

        return Response({"status": "User status updated"})