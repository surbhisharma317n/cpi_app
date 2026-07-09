from functools import wraps
from rest_framework.response import Response
from rest_framework import status
from functools import wraps
from rest_framework.response import Response
from rest_framework import status

import logging

logger = logging.getLogger(__name__)

def role_required(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = getattr(request, "user", None)
            print("Role decorator user:", user)
            print("Role decorator allowed_roles:", allowed_roles)

            if not user or not getattr(user, "is_authenticated", False):
                logger.warning("Access denied | unauthenticated user")
                return Response(
                    {"error": "Authentication required"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if user.role not in allowed_roles:
                logger.warning(
                    f"Access denied | role={user.role} | allowed={allowed_roles}"
                )
                return Response(
                    {"error": "Forbidden"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            logger.info(
                f"Role authorized | user_id={user.id} | role={user.role}"
            )
            return view_func(request, *args, **kwargs)

        return _wrapped_view
    return decorator


# from functools import wraps
# from rest_framework.response import Response
# from rest_framework import status
# import logging

# logger = logging.getLogger(__name__)

# def role_required(*allowed_roles):
#     def decorator(view_func):
#         @wraps(view_func)
#         def _wrapped_view(request, *args, **kwargs):
#             user = request.user

#             print(user,"check user before user================================")

#             if not user or not user.is_authenticated:

#                 print("user not authenticated=============================")
#                 return Response(
#                     {"error": "Authentication required"},
#                     status=status.HTTP_401_UNAUTHORIZED,
#                 )

#             if user.role not in allowed_roles:
#                 return Response(
#                     {"error": "Forbidden"},
#                     status=status.HTTP_403_FORBIDDEN,
#                 )

#             logger.info(
#                 f"Role authorized | user_id={user.id} | role={user.role}"
#             )

#             return view_func(request, *args, **kwargs)

#         return _wrapped_view
#     return decorator

