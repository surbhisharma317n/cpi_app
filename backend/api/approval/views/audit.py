from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from approval.utils.db import dictfetchall

class AuditTimelineAPIView(APIView):
    """
    Full audit timeline for a compilation / approval request
    """

    def get(self, request, compilation_id, request_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    'COMPILATION' AS event_type,
                    c.compiler_name AS actor,
                    c.compiled_by AS username,
                    c.status AS action,
                    NULL AS comment,
                    c.compiled_at AS event_time
                FROM compilation_table c
                WHERE c.id = %s

                UNION ALL

                SELECT
                    'APPROVAL_REQUEST' AS event_type,
                    ar.compiler_name AS actor,
                    ar.compiled_by AS username,
                    ar.approval_status AS action,
                    NULL AS comment,
                    ar.created_at AS event_time
                FROM approver_request_table ar
                WHERE ar.compilation_id = %s

                UNION ALL

                SELECT
                    'APPROVAL_ACTION' AS event_type,
                    COALESCE(u.name, 'Approver') AS actor,
                    h.action_by::TEXT AS username,
                    h.action AS action,
                    h.comment AS comment,
                    h.action_at AS event_time
                FROM approval_history_table h
                LEFT JOIN users u ON u.id = h.action_by
                WHERE h.approver_request_id = %s

                ORDER BY event_time
            """, [
                compilation_id,
                compilation_id,
                request_id
            ])

            timeline = dictfetchall(cursor)

        return Response({
            "compilation_id": compilation_id,
            "request_id": request_id,
            "timeline": timeline
        })
