# permissions.py
from rest_framework.permissions import BasePermission

# class CanEditSidebar(BasePermission):
#     """
#     Allow only psdAdmin, admin, psdhead groups to edit sidebar.
#     GET is allowed for any authenticated user.
#     """

#     allowed_groups = {"PSDAdmin", "admin", "PSDHead"}

class CanEditSidebar(BasePermission):
    allowed_groups = {"PSDAdmin", "admin", "PSDHead"}

    def has_permission(self, request, view):
        # ✅ Allow GET for everyone (authenticated or not)
        if request.method == "GET":
            return True  

        # ✅ Allow PUT only if user is authenticated and in allowed groups
        if request.method == "PUT":
            if not request.user or not request.user.is_authenticated:
                return False
            user_groups = set(g.lower() for g in request.user.groups.values_list("name", flat=True))
            allowed = {g.lower() for g in self.__class__.allowed_groups}
            return bool(user_groups & allowed)

        # ❌ Block other methods
        return False