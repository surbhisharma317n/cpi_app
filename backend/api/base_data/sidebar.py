from django.db import connections
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from rest_framework import status

# @api_view(['GET'])
# # @permission_classes([IsAuthenticated])
# def sidebar_menu(request):
#     with connections['default'].cursor() as cursor:
#         cursor.execute("""
#             SELECT id, parent_id, path, name, icon, roles
#             FROM sidebar_menu
#             ORDER BY id
#         """)
#         rows = cursor.fetchall()

#     menu_dict = {}
#     menu = []

#     for row in rows:
#         id, parent_id, path, name, icon, roles = row
#         item = {
#             "id": id,
#             "path": path,
#             "name": name,
#             "icon": icon,
#             "roles": roles.split(',') if roles else [],
#             "children": []
#         }
#         menu_dict[id] = item

#         if parent_id is None:
#             menu.append(item)
#         else:
#             menu_dict[parent_id]["children"].append(item)

#     return Response(menu)
@api_view(['GET', 'PUT'])
# @permission_classes([IsAuthenticated]) # Requires valid JWT / Token / Session
def sidebar_menu(request, item_id=None):
    auth_header = request.headers.get('Authorization', None)
    print(auth_header, "=================auth_header===================")
    print("Request method-=========:", request.__dict__)
    if request.method == 'GET':
        # Fetch all menu items
        with connections['default'].cursor() as cursor:
            cursor.execute("""
                SELECT id, parent_id, path, name, icon, roles
                FROM sidebar_menu
                ORDER BY id
            """)
            rows = cursor.fetchall()

        menu_dict = {}
        menu = []

        for row in rows:
            id, parent_id, path, name, icon, roles = row
            item = {
                "id": id,
                "path": path,
                "name": name,
                "icon": icon,
                "roles": roles.split(',') if roles else [],
                "children": []
            }
            menu_dict[id] = item

            if parent_id is None:
                menu.append(item)
            else:
                menu_dict[parent_id]["children"].append(item)
        print("Sidebar menu fetched:", menu)

        return Response(menu)

    elif request.method == 'PUT':
    # Case 1: Single update (item_id provided in URL)
        if item_id is not None:
            roles = request.data.get("roles", [])
            print("Roles received for update:", roles)
            if not isinstance(roles, list):
                return Response(
                    {"error": "roles must be a list of strings"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            roles_str = ",".join(roles)

            try:
                with connections['default'].cursor() as cursor:
                    cursor.execute(
                        "UPDATE sidebar_menu SET roles = %s WHERE id = %s",
                        [roles_str, item_id]
                    )
                return Response({"id": item_id, "roles": roles}, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Case 2: Bulk update (nested items)
        else:
            items = request.data if isinstance(request.data, list) else request.data.get("items", [])

        if not isinstance(items, list):
            return Response(
                {"error": "items must be a list of {id, roles, children} objects"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            def update_item_recursive(item, cursor):
                roles = item.get("roles", [])
                if isinstance(roles, list):
                    roles_str = ",".join(roles)
                    cursor.execute(
                        "UPDATE sidebar_menu SET roles = %s WHERE id = %s",
                        [roles_str, item["id"]]
                    )
                # ✅ Recursively update children
                for child in item.get("children", []):
                    update_item_recursive(child, cursor)

            with connections['default'].cursor() as cursor:
                for item in items:
                    update_item_recursive(item, cursor)

            return Response({"updated": len(items)}, status=status.HTTP_200_OK)

        except Exception as e:  
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # only authenticated users can access
def sidebar_menu_access(request):
    """
    Return sidebar items allowed for the authenticated user.
    Protected via JWT / Token / Session authentication.
    """
    user = request.user  

    # ---------------- STEP 1: Get user roles ----------------
    # Adjust this based on your custom User model structure:

    # Example 1: Comma-separated roles in user.roles
    user_roles = set([r.strip() for r in getattr(user, "roles", "").split(",") if r.strip()])

    # Example 2: Single role field
    # user_roles = {getattr(user, "role", "")} if getattr(user, "role", None) else set()

    # Example 3: ManyToMany relationship
    # user_roles = set(user.roles.values_list("name", flat=True))

    if not user_roles:
        user_roles = set()

    # ---------------- STEP 2: Fetch sidebar items from DB ----------------
    with connections['default'].cursor() as cursor:
        cursor.execute("""
            SELECT id, parent_id, path, name, icon, roles
            FROM sidebar_menu
            ORDER BY id
        """)
        rows = cursor.fetchall()

    menu_dict = {}
    roots = []

    # ---------------- STEP 3: Build menu items with visibility ----------------
    for row in rows:
        id, parent_id, path, name, icon, roles = row
        allowed_roles = set([r.strip() for r in roles.split(",") if r.strip()]) if roles else set()

        item = {
            "id": id,
            "path": path,
            "name": name,
            "icon": icon,
            "roles": list(allowed_roles),
            "children": [],
            "parent_id": parent_id,
            "visible": (not allowed_roles) or (user_roles.intersection(allowed_roles))
        }
        menu_dict[id] = item

    # ---------------- STEP 4: Build hierarchy ----------------
    for item in menu_dict.values():
        if item["parent_id"] is None:
            roots.append(item)
        else:
            parent = menu_dict.get(item["parent_id"])
            if parent:
                parent["children"].append(item)

    # ---------------- STEP 5: Recursive filter ----------------
    def filter_menu(item):
        # Filter children first
        item["children"] = [filter_menu(child) for child in item["children"]]
        item["children"] = [c for c in item["children"] if c is not None]

        # Keep if visible or has visible children
        if item["visible"] or item["children"]:
            return {
                "id": item["id"],
                "path": item["path"],
                "name": item["name"],
                "icon": item["icon"],
                "roles": item["roles"],
                "children": item["children"],
            }
        return None

    filtered_menu = [filter_menu(root) for root in roots]
    filtered_menu = [item for item in filtered_menu if item is not None]

    return Response(filtered_menu)