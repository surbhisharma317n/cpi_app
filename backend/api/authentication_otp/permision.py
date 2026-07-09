from rest_framework.permissions import BasePermission
from .permissions_map import METHOD_PERMISSION_MAP
from .permission_utils import check_permission

class HasAPIPermission(BasePermission):
    """
    DRF-safe permission class
    """

    def has_permission(self, request, view):
        permission_code = METHOD_PERMISSION_MAP.get(request.method)

        if not permission_code:
            return True

        error = check_permission(request, permission_code)
        if error:
            view.permission_error = error
            return False

        return True
