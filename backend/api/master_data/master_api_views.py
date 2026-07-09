from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings as setting
from pathlib import Path
from django.db import connections
import os
import re
import pandas as pd
from django.http import JsonResponse

import math
import json
from django.core.serializers.json import DjangoJSONEncoder
from .masters_methods import find_master_matching_file,master_process_file


from api.utils import convert_json

# def get_coicop_items(request):
#     if request.method != "GET":
#         return JsonResponse(
#             {"error": "Only GET method is allowed"},
#             status=405
#         )

#     module_name = "get_coicop_data"

#     # Base key should be explicitly defined for COICOP
#     base_key = "coicop_master"   # 🔁 change if needed
#     month_year = ""                 # or request.GET.get("month_year")

#     # --- Search for matching file ---
#     filepath = find_master_matching_file(
#         base_key=base_key,
#         month_year=month_year,
#         module_name=module_name
#     )

#     if not filepath:
#         return JsonResponse(
#             {
#                 "error": "COICOP data file not found",
#                 "base_key": base_key,
#                 "month_year": month_year
#             },
#             status=404
#         )

#     # --- Process file ---
#     try:
#         result = master_process_file(filepath, module_name)
#     except Exception as e:
#         return JsonResponse(
#             {
#                 "error": "Failed to process COICOP data",
#                 "details": str(e)
#             },
#             status=500
#         )

#     # --- Success response ---
#     return JsonResponse(result, safe=False, status=200)



# def get_master_details_items(request):
#     if request.method != "GET":
#         return JsonResponse(
#             {"error": "Only GET method is allowed"},
#             status=405
#         )

#     module_name = "get_market_data"

#     # Base key should be explicitly defined for COICOP
#     base_key = "market_master"   # 🔁 change if needed
#     month_year = ""                 # or request.GET.get("month_year")

#     # --- Search for matching file ---
#     filepath = find_master_matching_file(
#         base_key=base_key,
#         month_year=month_year,
#         module_name=module_name
#     )

#     if not filepath:
#         return JsonResponse(
#             {
#                 "error": "market data file not found",
#                 "base_key": base_key,
#                 "month_year": month_year
#             },
#             status=404
#         )

#     # --- Process file ---
#     try:
#         result = master_process_file(filepath, module_name)
#     except Exception as e:
#         return JsonResponse(
#             {
#                 "error": "Failed to process market data",
#                 "details": str(e)
#             },
#             status=500
#         )

#     # --- Success response ---
#     return JsonResponse(result, safe=False, status=200)




# def get_item_weights_details(request):
#     tab_name  = request.GET.get('tab')  
#     sub_name  = request.GET.get('subtab')  
#     if request.method != "GET":
#         return JsonResponse(
#             {"error": "Only GET method is allowed"},
#             status=405
#         )

#     module_name = "get_weights_data"

#     # Base key should be explicitly defined for COICOP
#     base_key = "weights_master"   # 🔁 change if needed
#     month_year = ""                 # or request.GET.get("month_year")

#     # --- Search for matching file ---
#     filepath = find_master_matching_file(
#         base_key=base_key,
#         month_year=month_year,
#         module_name=module_name,
#         tab_name=tab_name,
#         sub_name=sub_name
#     )
    
#     print("FILEPATH RETURNED =>", filepath)

#     if not filepath:
#         return JsonResponse(
#             {
#                 "error": "market data file not found",
#                 "base_key": base_key,
#                 "month_year": month_year
#             },
#             status=404
#         )

#     # --- Process file ---
#     try:
#         result = master_process_file(filepath, module_name)
#     except Exception as e:
#         return JsonResponse(
#             {
#                 "error": "Failed to process market data",
#                 "details": str(e)
#             },
#             status=500
#         )

#     # --- Success response ---
#     return JsonResponse(result, safe=False, status=200)


MODULE_DB_MAPPING = {
    "get_coicop_data": {
        "coicop_master": "coicop.vw_coicop_mapping",
        # "coicop_master": "mapping.coicop_mapping",
    },
    "get_market_data": {
        "market_master": "mapping.vw_market_master",
    },
    "get_weights_data": {
        "weights_master": "weights",  # dynamic via subtab
    }
}


def get_master_data( module_name,
    base_key,
    filters=None,
    limit=50,
    offset=0,
    page=None,
    pageSize=None,
    sub_name=None,
    cursor_value=None,
):
    try:
        # -------------------------
        # Resolve table
        # -------------------------
        if module_name == "get_weights_data":
            if not sub_name:
                return {"error": "subtab is required"}

            if not sub_name.replace("_", "").isalnum():
                return {"error": "Invalid subtab"}

            table_name = f"weights.{sub_name}"
        else:
            table_name = MODULE_DB_MAPPING.get(module_name, {}).get(base_key)

        if not table_name:
            return {"error": "Invalid module/base_key"}

        filters = filters or {}
        EXCLUDED_COLUMNS = {"created_at", "updated_at"}

        # -------------------------
        # Auto-detect columns
        # -------------------------
        with connections["final_db"].cursor() as cursor:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
            columns = [col[0] for col in cursor.description if col[0] not in EXCLUDED_COLUMNS]

        if not columns:
            return {"error": "No columns found in table"}

        DEFAULT_SORT_COLUMN = columns[0]

        where_clauses = []
        params = []
        ignore_keys = {"limit", "offset", "page", "pageSize", "tab", "subtab", "sort", "search", "cursor"}

        # -------------------------
        # Column Filters (SAFE)
        # -------------------------
        for key, value in filters.items():
            if key in ignore_keys or key not in columns:
                continue

            if isinstance(value, list):
                value = value[0]

            if value:
                where_clauses.append(f"{key} ILIKE %s")
                params.append(f"%{value.strip()}%")

        # -------------------------
        # Global Search
        # -------------------------
        search = filters.get("search")
        if search:
            search_conditions = [f"{col}::text ILIKE %s" for col in columns[:5]]  # limit for perf
            where_clauses.append(f"({' OR '.join(search_conditions)})")
            for _ in columns[:5]:
                params.append(f"%{search.strip()}%")

        # -------------------------
        # Cursor Pagination
        # -------------------------
        if cursor_value:
            where_clauses.append(f"{DEFAULT_SORT_COLUMN} > %s")
            params.append(cursor_value)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # -------------------------
        # Sorting
        # -------------------------
        sort_param = filters.get("sort", "")
        order_clauses = []

        if sort_param:
            for field in sort_param.split(","):
                field = field.strip()
                direction = "ASC"
                if field.startswith("-"):
                    field = field[1:]
                    direction = "DESC"
                if field in columns:
                    order_clauses.append(f"{field} {direction}")

        order_sql = f"ORDER BY {', '.join(order_clauses)}" if order_clauses else f"ORDER BY {DEFAULT_SORT_COLUMN} ASC"

        # -------------------------
        # Page -> Offset conversion
        # -------------------------
        if page is not None and pageSize is not None:
            offset = (page - 1) * pageSize
            limit = pageSize

        # -------------------------
        # Main query
        # -------------------------
        query = f"""
            SELECT *
            FROM {table_name}
            {where_sql}
            {order_sql}
            LIMIT %s OFFSET %s
        """
        final_params = params + [limit, offset]

        count_query = f"""
            SELECT COUNT(*)
            FROM {table_name}
            {where_sql}
        """

        with connections["final_db"].cursor() as cursor:
            cursor.execute(query, final_params)
            rows = cursor.fetchall()

            cursor.execute(count_query, params)
            total_records = cursor.fetchone()[0]

        data = [dict(zip(columns, row)) for row in rows]

        # -------------------------
        # Pagination meta
        # -------------------------
        total_pages = math.ceil(total_records / limit) if limit else 1
        current_page = (offset // limit) + 1 if not cursor_value else None
        next_cursor = data[-1][DEFAULT_SORT_COLUMN] if data else None

        return {
            "data": data,
            "columns": columns,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": current_page,
            "next_cursor": next_cursor,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        return {"error": str(e)}




@api_view(["GET"])
def get_coicop_items(request):
    filters = request.GET.dict()

    def safe_int(value, default):
        try:
            return int(value)
        except:
            return default

    limit = min(safe_int(filters.get("limit", 50), 50), 500)
    offset = safe_int(filters.get("offset", 0), 0)

    result = get_master_data(
        module_name="get_coicop_data",
        base_key="coicop_master",
        filters=filters,
        limit=limit,
        offset=offset
    )

    if "error" in result:
        print("ERROR =>", result["error"])  # 🔥 check terminal
        return Response(result, status=400)

    return Response(result, status=200)

@api_view(["GET"])
def get_master_details_items(request):
    result = get_master_data(
        module_name="get_market_data",
        base_key="market_master",
        filters=request.GET,
        limit=int(request.GET.get("limit", 50)),
        offset=int(request.GET.get("offset", 0))
    )

    if "error" in result:
        return Response(result, status=400)

    return Response(result, status=200)

@api_view(["GET"])
def get_item_weights_details(request):
    sub_name = request.GET.get("subtab")

    result = get_master_data(
        module_name="get_weights_data",
        base_key="weights_master",
        filters=request.GET,
        limit=int(request.GET.get("limit", 50)),
        offset=int(request.GET.get("offset", 0)),
        sub_name=sub_name
    )
   

    if "error" in result:
        return Response(result, status=400)

    return Response(result, status=200)