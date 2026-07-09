from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from api.approval.utils.db import dictfetchall
from django.db import transaction
from rest_framework import status

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from api.authentication.role_decorator import role_required



import logging

logger = logging.getLogger("approval")


def dictfetchone(cursor):
    row = cursor.fetchone()
    if not row:
        return None
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, row))





class PendingApprovalListAPIView(APIView):

    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id,
                    compiler_name,
                    compiled_by,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    approval_status
                FROM approver_request_table
                WHERE approval_status = 'PENDING'
                ORDER BY created_at DESC
            """)
            data = dictfetchall(cursor)

        return Response(data)


class ApproveRejectAPIView(APIView):

    @transaction.atomic
    def post(self, request, request_id):
        action = request.data['action']  # APPROVED / REJECTED
        comment = request.data['comment']
        approver_id = request.data['approver_id']

        with connection.cursor() as cursor:
            # Update request
            cursor.execute("""
                UPDATE approver_request_table
                SET
                    approval_status = %s,
                    approver_id = %s,
                    approver_comment = %s,
                    approved_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
            """, [
                action,
                approver_id,
                comment,
                request_id
            ])

            # Insert history
            cursor.execute("""
                INSERT INTO approval_history_table (
                    approver_request_id,
                    action,
                    comment,
                    action_by
                )
                VALUES (%s,%s,%s,%s)
            """, [
                request_id,
                action,
                comment,
                approver_id
            ])

        return Response(
            {"message": f"Request {action.lower()} successfully"},
            status=status.HTTP_200_OK
        )



@api_view(["POST"])
@permission_classes([IsAuthenticated])
@role_required("admin", "compiler","approver")  # 🔥 compiler allowed
def create_approval_request(request):
    user = request.user
    data = request.data

    compilation_id = data.get("compilation_id")
    filter_snapshot = data.get("filter_snapshot", {})

    if not compilation_id:
        return Response(
            {"error": "compilation_id is required"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        with transaction.atomic():
            with connection.cursor() as cursor:

                # 🔐 Pass user context for audit trigger
                cursor.execute(
                    "SET LOCAL app.current_user_id = %s",
                    [user.id]
                )
                cursor.execute(
                    "SET LOCAL app.current_user_role = %s",
                    [getattr(user, "role", None)]
                )

                # 🔍 Fetch compilation details
                cursor.execute("""
                    SELECT
                        compiler_name,
                        compiled_by,
                        compiled_at,
                        month,
                        year,
                        compile_type,
                        iteration
                    FROM compilation_table
                    WHERE id = %s
                """, [compilation_id])

                row = cursor.fetchone()
                if not row:
                    return Response(
                        {"error": "Invalid compilation_id"},
                        status=status.HTTP_404_NOT_FOUND
                    )

                (
                    compiler_name,
                    compiled_by,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    iteration
                ) = row

                # 🧾 Insert approval request
                cursor.execute("""
                    INSERT INTO approver_request_table (
                        compilation_id,
                        compiler_name,
                        compiled_by,
                        compiled_at,
                        month,
                        year,
                        compile_type,
                        iteration,
                        filter_snapshot,
                        approval_status,
                        created_at,
                        updated_at
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'PENDING',NOW(),NOW())
                    RETURNING id
                """, [
                    compilation_id,
                    compiler_name,
                    compiled_by,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    iteration,
                    filter_snapshot
                ])

                approver_request_id = cursor.fetchone()[0]

                # 🕘 Insert approval history (initial)
                cursor.execute("""
                    INSERT INTO approval_history_table (
                        approver_request_id,
                        iteration,
                        action,
                        comment,
                        action_by,
                        action_at,
                        created_at,
                        updated_at
                    )
                    VALUES (%s,%s,NULL,'Approval request created',%s,NOW(),NOW(),NOW())
                """, [
                    approver_request_id,
                    iteration,
                    user.id
                ])

        return Response(
            {
                "message": "Approval request created successfully",
                "approver_request_id": approver_request_id
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
 
# =====================================================
# 🔹 GET ALL APPROVAL REQUESTS (admin, approver only)
# =====================================================
# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# @role_required("admin", "approver")
# def get_all_approval_requests(request):
#     try:
#         month = request.GET.get("month")
#         year = request.GET.get("year")
#         iteration = request.GET.get("iteration")
#         compile_type = request.GET.get("compile_type")
#         search = request.GET.get("search")

#         query = """
#             SELECT
#                 id,
#                 compilation_id,
#                 compiler_name,
#                 compiled_by,
#                 compiled_at,
#                 month,
#                 year,
#                 compile_type,
#                 iteration,
#                 approval_status,
#                 approver_id,
#                 approver_comment,
#                 approved_at,
#                 created_at,
#                 updated_at
#             FROM approver_request_table
#             WHERE 1=1
#         """

#         params = []

#         if month:
#             query += " AND month = %s"
#             params.append(month)

#         if year:
#             query += " AND year = %s"
#             params.append(year)

#         if iteration:
#             query += " AND iteration = %s"
#             params.append(iteration)

#         if compile_type:
#             query += " AND compile_type = %s"
#             params.append(compile_type)

#         if search:
#             query += """
#                 AND (
#                     compiler_name ILIKE %s OR
#                     approval_status ILIKE %s OR
#                     compile_type ILIKE %s
#                 )
#             """
#             search_value = f"%{search}%"
#             params.extend([search_value, search_value, search_value])

#         query += " ORDER BY created_at DESC"

#         with connection.cursor() as cursor:
#             cursor.execute(query, params)
#             data = dictfetchall(cursor)

#         return Response(
#             {
#                 "count": len(data),
#                 "results": data
#             },
#             status=status.HTTP_200_OK
#         )

#     except Exception as e:
#         return Response(
#             {"error": str(e)},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
@role_required("admin", "approver")
def get_all_approval_requests(request):
    try:
        logger.info(
            "Approval list request | user=%s | params=%s",
            request.user.id,
            dict(request.GET),
        )

        # ===============================
        # Query Params (safe parsing)
        # ===============================
        month = request.GET.get("month")
        year = request.GET.get("year")
        iteration = request.GET.get("iteration")
        compile_type = request.GET.get("compile_type")
        status_filter = request.GET.get("status")
        search = request.GET.get("search")

        # Pagination
        page = max(int(request.GET.get("page", 1)), 1)
        page_size = min(int(request.GET.get("page_size", 10)), 100)
        offset = (page - 1) * page_size

        # ===============================
        # Dynamic WHERE clause
        # ===============================
        where_clauses = []
        params = []

        # if month:
        #     where_clauses.append("month = %s")
        #     params.append(month)

        # if year and year.isdigit():
        #     where_clauses.append("year = %s")
        #     params.append(int(year))

        # if iteration and iteration.isdigit():
        #     where_clauses.append("iteration = %s")
        #     params.append(int(iteration))

        # if compile_type:
        #     where_clauses.append("compile_type = %s")
        #     params.append(compile_type)

        # if status_filter:
        #     where_clauses.append("approval_status = %s")
        #     params.append(status_filter)

        if search:
            where_clauses.append("""
                (
                    compiler_name ILIKE %s OR
                    approval_status ILIKE %s OR
                    compile_type ILIKE %s
                )
            """)
            search_value = f"%{search}%"
            params.extend([search_value, search_value, search_value])

        where_sql = " AND ".join(where_clauses)
        where_sql = f"WHERE {where_sql}" if where_sql else ""

        # ===============================
        # SQL Execution
        # ===============================
        with connection.cursor() as cursor:
            # Total Count
            cursor.execute(
                f"SELECT COUNT(*) FROM approver_request_table {where_sql}",
                params,
            )
            total = cursor.fetchone()[0]

            # Paginated Data
            cursor.execute(
                f"""
                SELECT
                    id,
                    compilation_id,
                    compiler_name,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    iteration,
                    approval_status,
                    approver_id,
                    approver_comment,
                    approved_at,
                    created_at
                FROM approver_request_table
                {where_sql}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                params + [page_size, offset],
            )

            data = dictfetchall(cursor)

        logger.info(
            "Approval list success | user=%s | page=%s | returned=%s | total=%s",
            request.user.id,
            page,
            len(data),
            total,
        )

        return Response(
            {
                "count": total,
                "page": page,
                "page_size": page_size,
                "results": data,
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception(
            "Approval list FAILED | user=%s | error=%s",
            request.user.id,
            str(e),
        )
        return Response(
            {"error": "Internal server error"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) 

# =====================================================
# 🔹 GET SINGLE APPROVAL REQUEST + HISTORY
# =====================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
@role_required("admin", "approver")

def get_approval_request_details(request, request_id):
    try:
        with connection.cursor() as cursor:
            # 🔹 Request details
            cursor.execute("""
                SELECT
                    id, compilation_id, compiler_name, compiled_by,
                    compiled_at, month, year, compile_type, iteration,
                    filter_snapshot, approval_status, approver_id,
                    approver_comment, approved_at, created_at, updated_at
                FROM approver_request_table
                WHERE id = %s
            """, [request_id])

            request_data = dictfetchone(cursor)
            if not request_data:
                return Response(
                    {"detail": "Approval request not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 🔹 Approval history
            cursor.execute("""
                SELECT
                    id, approver_request_id, iteration, action,
                    comment, action_by, action_at, created_at, updated_at
                FROM approval_history_table
                WHERE approver_request_id = %s
                ORDER BY action_at DESC
            """, [request_id])

            history_data = dictfetchall(cursor)

        return Response(
            {
                "request_details": request_data,
                "approval_history": history_data
            },
            status=status.HTTP_200_OK
        )

    except DatabaseError:
        return Response(
            {"detail": "Database error occurred"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@role_required("admin", "approver")
def approval_action(request, request_id):
    action = request.data.get("action")
    comment = request.data.get("comment", "")

    if action not in ["APPROVED", "REJECTED"]:
        return Response({"error": "Invalid action"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE approver_request_table
            SET approval_status=%s, approver_id=%s, approver_comment=%s, approved_at=NOW()
            WHERE id=%s
        """, [action, request.user.id, comment, request_id])

        cursor.execute("""
            INSERT INTO approval_history_table
            (approver_request_id, action, comment, action_by, action_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, [request_id, action, comment, request.user.id])

    return Response({"message": "Action completed"}, status=200)
        

# @api_view(["GET"])
# @permission_classes([IsAuthenticated])
# @role_required("admin", "compiler", "approver")
# def get_approval_request_details(request, request_id):
#     user = request.user

#     try:
#         with connection.cursor() as cursor:

#             # 🔐 Set user context for DB audit trigger
#             cursor.execute(
#                 "SET LOCAL app.current_user_id = %s",
#                 [user.id]
#             )
#             cursor.execute(
#                 "SET LOCAL app.current_user_role = %s",
#                 [getattr(user, "role", None)]
#             )

#             # -------------------------------
#             # Fetch approval request details
#             # -------------------------------
#             cursor.execute("""
#                 SELECT
#                     id,
#                     compilation_id,
#                     compiler_name,
#                     compiled_by,
#                     compiled_at,
#                     month,
#                     year,
#                     compile_type,
#                     iteration,
#                     filter_snapshot,
#                     approval_status,
#                     approver_id,
#                     approver_comment,
#                     approved_at,
#                     created_at,
#                     updated_at
#                 FROM approver_request_table
#                 WHERE id = %s
#             """, [request_id])

#             request_data = dictfetchall(cursor)

#             if not request_data:
#                 # ❌ Log NOT FOUND event
#                 cursor.execute("""
#                     INSERT INTO system_event_log (
#                         event_type,
#                         event_name,
#                         entity_name,
#                         entity_id,
#                         actor_id,
#                         actor_role,
#                         source,
#                         metadata,
#                         success,
#                         created_at
#                     )
#                     VALUES (
#                         'BUSINESS',
#                         'VIEW_APPROVAL_REQUEST',
#                         'approver_request_table',
#                         %s,
#                         %s,
#                         %s,
#                         'API',
#                         jsonb_build_object('reason', 'not_found'),
#                         FALSE,
#                         NOW()
#                     )
#                 """, [
#                     request_id,
#                     user.id,
#                     getattr(user, "role", None)
#                 ])

#                 return Response(
#                     {"error": "Approval request not found"},
#                     status=status.HTTP_404_NOT_FOUND
#                 )

#             request_data = request_data[0]

#             # -------------------------------
#             # Fetch approval history
#             # -------------------------------
#             cursor.execute("""
#                 SELECT
#                     id,
#                     approver_request_id,
#                     iteration,
#                     action,
#                     comment,
#                     action_by,
#                     action_at,
#                     created_at,
#                     updated_at
#                 FROM approval_history_table
#                 WHERE approver_request_id = %s
#                 ORDER BY action_at DESC
#             """, [request_id])

#             history_data = dictfetchall(cursor)

#             # ✅ Log SUCCESS view event
#             cursor.execute("""
#                 INSERT INTO system_event_log (
#                     event_type,
#                     event_name,
#                     entity_name,
#                     entity_id,
#                     actor_id,
#                     actor_role,
#                     source,
#                     metadata,
#                     success,
#                     created_at
#                 )
#                 VALUES (
#                     'BUSINESS',
#                     'VIEW_APPROVAL_REQUEST',
#                     'approver_request_table',
#                     %s,
#                     %s,
#                     %s,
#                     'API',
#                     jsonb_build_object(
#                         'history_count', %s,
#                         'approval_status', %s
#                     ),
#                     TRUE,
#                     NOW()
#                 )
#             """, [
#                 request_id,
#                 user.id,
#                 getattr(user, "role", None),
#                 len(history_data),
#                 request_data["approval_status"]
#             ])

#         return Response(
#             {
#                 "request_details": request_data,
#                 "approval_history": history_data
#             },
#             status=status.HTTP_200_OK
#         )

#     except Exception as e:
#         # ❌ Log ERROR event
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO system_event_log (
#                     event_type,
#                     event_name,
#                     entity_name,
#                     entity_id,
#                     actor_id,
#                     actor_role,
#                     source,
#                     metadata,
#                     success,
#                     error_message,
#                     created_at
#                 )
#                 VALUES (
#                     'ERROR',
#                     'VIEW_APPROVAL_REQUEST_FAILED',
#                     'approver_request_table',
#                     %s,
#                     %s,
#                     %s,
#                     'API',
#                     jsonb_build_object('exception', %s),
#                     FALSE,
#                     %s,
#                     NOW()
#                 )
#             """, [
#                 request_id,
#                 user.id,
#                 getattr(user, "role", None),
#                 str(e),
#                 str(e)
#             ])

#         return Response(
#             {"error": str(e)},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR
#         )