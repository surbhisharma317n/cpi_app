from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection
from approval.utils.db import dictfetchall

class CompilerTrackingAPIView(APIView):

    def get(self, request, compiler_name):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    ar.id AS request_id,
                    ar.approval_status,
                    ar.approver_comment,
                    ar.approved_at,
                    ar.compiled_at,
                    ar.month,
                    ar.year,
                    ar.compile_type,
                    ar.filter_snapshot,
                    ar.compiled_data_snapshot
                FROM approver_request_table ar
                WHERE ar.compiler_name = %s
                ORDER BY ar.created_at DESC
            """, [compiler_name])

            data = dictfetchall(cursor)

        return Response(data)
