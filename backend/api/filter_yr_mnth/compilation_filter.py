from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.http import JsonResponse
from django.db import connections

def execute_query(sql, params=None, fetch_one=False):
    """Execute SQL query from final_db"""
    with connections['final_db'].cursor() as cursor:
        cursor.execute(sql, params or [])

        if fetch_one:
            row = cursor.fetchone()
            if row:
                columns = [col[0] for col in cursor.description]
                return dict(zip(columns, row))
            return None

        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


@api_view(["GET"])
# @authentication_classes([])
@permission_classes([AllowAny])
def get_compilation_filters(request):
    try:
        latest = execute_query("""
            SELECT price_month, price_year, price_data_status
            FROM prices.cng_prices
            ORDER BY price_year DESC, price_month DESC
            LIMIT 1;
        """, fetch_one=True)
      
        
        if not latest:
            return Response({"options": []})

        month = int(latest["price_month"])
        year = int(latest["price_year"])
        status = latest["price_data_status"]

        options = []

        if status == "P":
            options = [
                {"month": month, "year": year, "type": "PROVISIONAL"},
                {"month": month, "year": year, "type": "FINAL"}
            ]

        elif status == "F":
            next_month = month + 1
            next_year = year

            if next_month > 12:
                next_month = 1
                next_year += 1

            options = [
                {"month": month, "year": year, "type": "FINAL"},
                {"month": next_month, "year": next_year, "type": "PROVISIONAL"}
            ]

        else:
            options = []

        return Response({"options": options})

    except Exception as e:
        return Response({"error": str(e)}, status=500)