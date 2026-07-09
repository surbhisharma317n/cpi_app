from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
import logging

logger = logging.getLogger(__name__)

def normalize_permission(p: str) -> str:
    return p.replace("_", ".").lower()


def check_permission(request, permission_code):
    user = request.user
    request_path = request.path
    client_ip = request.META.get("REMOTE_ADDR")

    # ❌ Not authenticated
    if not user or not getattr(user, "is_authenticated", False):
        logger.warning(
            f"Permission denied | unauthenticated | "
            f"permission={permission_code} | path={request_path} | ip={client_ip}"
        )
        raise NotAuthenticated("Authentication required")

    required = normalize_permission(permission_code)
    available = [
        normalize_permission(p)
        for p in getattr(user, "permissions", [])
    ]

    # ❌ Missing permission
    if required not in available:
        logger.warning(
            f"Permission denied | user_id={getattr(user, 'id', None)} | "
            f"email={getattr(user, 'email', None)} | "
            f"required={required} | available={available} | "
            f"path={request_path} | ip={client_ip}"
        )
        raise PermissionDenied(
            f"Permission '{permission_code}' required"
        )

    # ✅ Permission granted
    logger.info(
        f"Permission granted | user_id={getattr(user, 'id', None)} | "
        f"email={getattr(user, 'email', None)} | "
        f"permission={required} | path={request_path} | ip={client_ip}"
    )

    return True



# def check_permission(request, permission_code):
#     """
#     Checks permission from JWT payload
#     """
#     auth = JWTAuthentication()
#     validated = auth.authenticate(request)

#     if not validated:
#         return Response(
#             {"detail": "Authentication required"},
#             status=status.HTTP_401_UNAUTHORIZED
#         )

#     user, token = validated
#     permissions = token.get("permissions", [])

#     permissions = [p.lower() for p in permissions]

#     if permission_code.lower() not in permissions:
#         return Response(
#             {"detail": "Permission denied"},
#             status=status.HTTP_403_FORBIDDEN
#         )

#     return None

# def check_permission(request, permission_code):
#     auth = JWTAuthentication()
#     validated = auth.authenticate(request)

#     if not validated:
#         return Response({"detail": "Authentication required"}, status=401)

#     user, token = validated

#     print("🔐 Permission required:", permission_code)
#     print("🔐 Token payload:", token.payload)  # 👈 ADD THIS

#     permissions = token.payload.get("permissions", [])
#     permissions = [p.lower() for p in permissions]

#     if permission_code.lower() not in permissions:
#         return Response(
#             {
#                 "detail": "Permission denied",
#                 "required": permission_code,
#                 "available": permissions,
#             },
#             status=403,
#         )

#     return None

from rest_framework.permissions import BasePermission
from .permissions_map import METHOD_PERMISSION_MAP
from .permission_utils import check_permission

class HasAPIPermission(BasePermission):
    def has_permission(self, request, view):
        permission_code = METHOD_PERMISSION_MAP.get(request.method)
        if not permission_code:
            return True

        check_permission(request, permission_code)  # raises 401/403
        return True