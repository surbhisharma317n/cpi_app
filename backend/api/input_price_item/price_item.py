
from rest_framework.decorators import api_view, authentication_classes
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings as setting
from pathlib import Path
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder


from api.utils import convert_json
from datetime import datetime
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from api.schema.input_price_db import fetchInptPriceItem
from ..authentication.role_decorator import role_required
from ..authentication.custom_jwt_auth import RawJWTAuthentication  # import only the datetime class

logger = logging.getLogger(__name__)



@api_view(["GET"])
def inpu_price_item(request):
    print('base_master_items====',request.query_params)




    iteration = request.query_params.get('iteration')
    tab_name= request .query_params.get('tab')
    month= request .query_params.get('month')
    year= request .query_params.get('year')
    tab_mapping = {
    "rural_item_price": "rural_item_price",
    "urban_item_price": "urban_item_price",
    "rural_house_rent": "rural_house_rent",
    "urban_house_rent": "urban_house_rent",
    "rural_electricity": "rural_electricity",
    "urban_electricity": "urban_electricity",
    "pds_price": "pds_price",
    "airfare": "airfare",
    "online_shopping": "online_shopping",

}

    # Default to original tab if not in mapping
    final_tab = tab_mapping.get(tab_name, tab_name)
    print('final_tab====',final_tab,month,year,iteration)






    if not all([final_tab]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)


    try:
        data = fetchInptPriceItem(final_tab,month,year,iteration)
        json_data = json.dumps({ 'data':data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


import os
import re
import pandas as pd
from django.http import JsonResponse




def find_matching_file(base_key: str, month_year: str):
    """
    Returns full parquet file path if exists, else None
    """

    # Base upload directory (SECOND MEDIA ROOT)
    UPLOAD_DIR = Path(setting.SECOND_MEDIA_ROOT) / "comp_db" / "capi_item_prices"

    # Mapping: frontend key -> subfolder + file prefix
    tab_mapping = {
        "rural_item_price": Path("rural/validated_data/p_rural_mkt_prices"),
        "urban_item_price": Path("urban/validated_data/p_urban_mkt_prices"),
        "rural_house_rent": Path("rural/validated_data/p_rural_hr_prices"),
        "urban_house_rent": Path("urban/validated_data/p_urban_hr_prices"),
        "rural_electricity": Path("rural/validated_data/p_rural_elect_prices"),
        "urban_electricity": Path("urban/validated_data/p_urban_elect_prices"),
        "pds_price": Path("urban/validated_data/p_urban_pds_prices"),
        "airfare": Path("urban/validated_data/p_airfare_prices"),
        "online_shopping": Path("urban/validated_data/p_urban_online_mkt_prices"),
    }

    # Get mapped relative path
    relative_path = tab_mapping.get(base_key)
    if not relative_path:
        return None

    # Expected filename
    filename = f"{relative_path.name}_{month_year}_v1.parquet"

    # Full file path
    full_path = UPLOAD_DIR / relative_path.parent / filename

    print("CHECKING PATH =>", full_path)

    # Check file exists
    if full_path.exists() and full_path.is_file():
        return str(full_path)

    return False




def process_file(filepath):
    print('process_file filepath====',filepath)
    ext = filepath.split(".")[-1].lower()

    if ext == "csv":
        df = pd.read_csv(filepath)
    else:
        df = pd.read_parquet(filepath)
        df = df.head(100)
          # Limit to first 100 rows for performance
    res={"data":df.to_dict(orient="records"),"total_records":len(df),"columns":list(df.columns)}
    # print('res====',res)

    return res



from django.http import JsonResponse
from django.db import connections
from rest_framework import status
import logging


# -----------------------------
# TABLE CONFIG (YOUR LOGIC)
# -----------------------------
from django.http import JsonResponse
from django.db import connections
from rest_framework import status
import logging


# -----------------------------
# TABLE CONFIG
# -----------------------------
from django.http import JsonResponse
from django.db import connections
from rest_framework import status
import logging


# -----------------------------
# TABLE CONFIG
# -----------------------------
from django.http import JsonResponse
from django.db import connections
from rest_framework import status
import logging

# -----------------------------
# TABLE CONFIG
# -----------------------------
from django.http import JsonResponse
from django.db import connections
from django.core.cache import cache
from rest_framework import status
import logging

# -----------------------------
# TABLE CONFIG
# -----------------------------
from django.http import JsonResponse
from django.db import connections
from django.core.cache import cache
from rest_framework import status
import logging

# -----------------------------
# TABLE CONFIG
# -----------------------------
TABLE_CONFIGS = {
    "validated": [
        ('rural_elect_prices', ['rural', 'elec'], 'price_month', 'price_year'),
        ('urban_elect_prices', ['urban', 'elec'], 'price_month', 'price_year'),

        ('rural_hr_prices', ['rural', 'rent', 'hr'], 'price_month', 'price_year'),
        ('urban_hr_prices', ['urban', 'rent', 'hr'], 'price_month', 'price_year'),

        ('pds_prices', ['pds'], 'price_month', 'price_year'),
        ('ott_prices', ['ott'], 'price_month', 'price_year'),
        ('postal_prices', ['postal'], 'price_month', 'price_year'),

        ('petrol_prices', ['petrol'], 'price_month', 'price_year'),
        ('diesel_prices', ['diesel'], 'price_month', 'price_year'),
        ('lpg_prices', ['lpg'], 'price_month', 'price_year'),
        ('cng_prices', ['cng'], 'price_month', 'price_year'),
        ('png_prices', ['png'], 'price_month', 'price_year'),

        ('telecom_prices', ['telecom'], 'price_month', 'price_year'),

        ('rural_mkt_prices', ['rural', 'mkt', 'market'], 'price_month', 'price_year'),
        ('urban_mkt_prices', ['urban', 'mkt', 'market'], 'price_month', 'price_year'),

        ('urban_airfare_prices', ['airfare', 'air'], 'price_month', 'price_year'),

        ('urban_mkt_online_prices', ['online', 'shop'], 'price_month', 'price_year'),

        ('railfare_prices', ['rail', 'fare'], 'price_month', 'price_year'),

        ('metro_prices', ['metro'], 'price_month', 'price_year'),
    ]
}

# -----------------------------
# EXCLUDED COLUMNS
# -----------------------------
EXCLUDED_COLUMNS = {
    "id",
    "price_year",
    "price_month",
    "is_active",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
}

# -----------------------------
# SMART MATCHING
# -----------------------------
def find_best_matching_table(tab_name):
    tab = tab_name.lower()

    best_score = 0
    best_match = None

    for table, keywords, month_col, year_col in TABLE_CONFIGS["validated"]:
        score = 0

        for k in keywords:
            if k in tab:
                score += 2

        if "item" in tab and "mkt" in table:
            score += 2
        if "online" in tab and "online" in table:
            score += 3
        if "airfare" in tab and "airfare" in table:
            score += 3
        if ("house" in tab or "rent" in tab) and "hr" in table:
            score += 2

        if score > best_score:
            best_score = score
            best_match = (table, month_col, year_col)

    return best_match if best_score > 0 else (None, None, None)


# -----------------------------
# MAIN API
# -----------------------------
@api_view(["GET"])
@authentication_classes([RawJWTAuthentication])
@role_required('admin', 'compiler')
def get_uploaded_data(request):

    tab_name = request.GET.get("tab")
    month = request.GET.get("month")
    year = request.GET.get("year")
    compile_type = request.GET.get("compile_type")

    # ✅ REQUIRED VALIDATION
    if not tab_name or not month or not year:
        return JsonResponse({"error": "Missing required parameters"}, status=400)

    # =============================
    # ✅ FIXED TABLE MAPPING (MAIN FIX)
    # =============================
    #new code 22-052026
    TABLE_MAP = {}

    # Legacy tables for 2024–2025
    if str(year) in ["2024", "2025"]:

     if tab_name == "rural_item_price":
         TABLE_MAP = {
            "rural_item_price": "rural_mkt_prices_legacy",
        }

     elif tab_name == "urban_item_price":
        TABLE_MAP = {
            "urban_item_price": "urban_mkt_prices_legacy",
        }

     else:
        TABLE_MAP = {}

        # New tables for 2026+
    else:
        TABLE_MAP = {
        "rural_item_price": "rural_mkt_prices",
        "urban_item_price": "urban_mkt_prices",
        "rural_house_rent": "rural_hr_prices",
        "urban_house_rent": "urban_hr_prices",
        "rural_electricity": "rural_elect_prices",
        "urban_electricity": "urban_elect_prices",
        "rural_pds_price": "pds_prices",   # ✅ FIX
        "urban_pds_price": "pds_prices",   # ✅ FIX
        "airfare": "urban_airfare_prices",
        "online_shopping": "urban_mkt_online_prices",

    # Fuel
       "petrol": "petrol_prices",
       "diesel": "diesel_prices",
       "lpg": "lpg_prices",
       "cng": "cng_prices",
       "png": "png_prices",

    # Transport
       "railfare": "railfare_prices",
       "metro": "metro_prices",

    # Others
       "telecom": "telecom_prices",
       "postal": "postal_prices",
       "ott": "ott_prices",
    }

    table = TABLE_MAP.get(tab_name)
    print("TAB NAME =", tab_name)
    print("YEAR =", year)
    if not table:
        return JsonResponse({"error": f"No table mapping for {tab_name}"}, status=400)

    # fixed columns
    month_col = "price_month"
    year_col = "price_year"

    # =============================
    # ✅ SECTOR FILTER (PDS ONLY)
    # =============================
    sector_map = {
        "rural_pds_price": 1,
        "urban_pds_price": 2,
    }
    sector_id = sector_map.get(tab_name)

    # =============================
    # PAGINATION
    # =============================
    page_size = min(int(request.GET.get("page_size", 50)), 200)
    page = max(int(request.GET.get("page", 1)), 1)
    offset = (page - 1) * page_size

    # =============================
    # SORTING
    # =============================
    sort_col = request.GET.get("sort")
    order = "ASC" if request.GET.get("order", "desc").lower() == "asc" else "DESC"

    try:
        with connections["final_db"].cursor() as cursor:

            # =============================
            # GET COLUMNS
            # =============================
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'prices'
                  AND table_name = %s
            """, [table])

            valid_columns = [row[0] for row in cursor.fetchall()]

            selected_columns = [
                c for c in valid_columns if c not in EXCLUDED_COLUMNS
            ]

            if not selected_columns:
                return JsonResponse({"error": "No valid columns"}, status=400)

            if not sort_col or sort_col not in selected_columns:
                sort_col = selected_columns[0]

            col_sql = ", ".join(f'"{c}"' for c in selected_columns)

            # =============================
            # MAIN QUERY
            # =============================
            sql = f"""
                SELECT {col_sql}
                FROM prices."{table}"
                WHERE {month_col} = %s
                  AND {year_col} = %s
                  AND price_data_status = %s
                  {'AND sector_id = %s' if sector_id else ''}
                ORDER BY "{sort_col}" {order}
                LIMIT %s OFFSET %s
            """

            params = [month, year, compile_type]

            if sector_id:
                params.append(sector_id)

            params.extend([page_size, offset])

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            # =============================
            # COUNT QUERY
            # =============================
            count_sql = f"""
                SELECT COUNT(*)
                FROM prices."{table}"
                WHERE {month_col} = %s
                  AND {year_col} = %s
                  AND price_data_status = %s
                  {'AND sector_id = %s' if sector_id else ''}
            """

            count_params = [month, year, compile_type]

            if sector_id:
                count_params.append(sector_id)

            cursor.execute(count_sql, count_params)
            total_records = cursor.fetchone()[0]
            total_pages = (total_records + page_size - 1) // page_size

        # =============================
        # RESPONSE
        # =============================
        if not rows:
            return JsonResponse({"data": [], "message": "No data found"})

        data = [dict(zip(selected_columns, row)) for row in rows]

        return JsonResponse({
            "data": data,
            "columns": selected_columns,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
        })

    except Exception as e:
        logging.exception("DB fetch failed")
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def inpu_price_item_data(request):
    print('base_master_items====',request.query_params)




    iteration = request.query_params.get('iteration')
    tab_name= request .query_params.get('tab')
    month= request .query_params.get('month')
    year= request .query_params.get('year')
    tab_mapping = {
    "rural_item_price": "rural_item_price",
    "urban_item_price": "urban_item_price",
    "rural_house_rent": "rural_house_rent",
    "urban_house_rent": "urban_house_rent",
    "rural_electricity": "rural_electricity",
    "urban_electricity": "urban_electricity",
    "pds_price": "pds_price",
    "airfare": "airfare",
    "online_shopping": "online_shopping",

}
    tab_mapping = {
    "rural_item_price": "rural_item_price",
    "urban_item_price": "urban_item_price",
    "rural_house_rent": "rural_house_rent",
    "urban_house_rent": "urban_house_rent",
    "rural_electricity": "rural_electricity",
    "urban_electricity": "urban_electricity",
    "pds_price": "pds_price",
    "airfare": "airfare",
    "online_shopping": "online_shopping",

}

    # Default to original tab if not in mapping
    final_tab = tab_mapping.get(tab_name, tab_name)
    print('final_tab====',final_tab,month,year,iteration)






    if not all([final_tab]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)


    try:
        data = fetchInptPriceItem(final_tab,month,year,iteration)
        json_data = json.dumps({ 'data':data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ==================================Final input price Item Data
def find_final_matching_file(base_key: str, month_year: str):
    """
    Returns full parquet file path if exists, else None
    """

    # Base upload directory (SECOND MEDIA ROOT)
    UPLOAD_DIR = Path(setting.SECOND_MEDIA_ROOT) / "comp_db_final" / "capi_item_prices"

    # Mapping: frontend key -> subfolder + file prefix
    tab_mapping = {
        "rural_item_price": Path("rural/p_rural_mkt_prices"),
        "urban_item_price": Path("urban/p_urban_mkt_prices"),
        "rural_house_rent": Path("rural/p_rural_hr_prices"),
        "urban_house_rent": Path("urban/p_urban_hr_prices"),
        "rural_electricity": Path("rural/p_rural_elect_prices"),
        "urban_electricity": Path("urban/p_urban_elect_prices"),
        "pds_price": Path("urban/p_urban_pds_prices"),
        "airfare": Path("urban/p_airfare_prices"),
        "online_shopping": Path("urban/p_urban_online_mkt_prices"),
    }

    # Get mapped relative path
    relative_path = tab_mapping.get(base_key)
    if not relative_path:
        return None

    # Expected filename
    filename = f"{relative_path.name}.parquet"

    # Full file path
    full_path = UPLOAD_DIR / relative_path.parent / filename

    print("CHECKING PATH =>", full_path)

    # Check file exists
    if full_path.exists() and full_path.is_file():
        return str(full_path)

    return False

def final_input_item_process_file(filepath):
    print('process_file filepath====',filepath)
    ext = filepath.split(".")[-1].lower()

    if ext == "csv":
        df = pd.read_csv(filepath)
    else:
        df = pd.read_parquet(filepath)
        df = df.head(100)
          # Limit to first 100 rows for performance
    res={"data":df.to_dict(orient="records"),"total_records":len(df),"columns":list(df.columns)}
    # print('res====',res)

    return res





def get_final_input_price_item(request):
    try:
        # --- Read query params ---
        iteration = request.GET.get('iteration')   # optional
        tab_name  = request.GET.get('tab')
        month     = request.GET.get('month')
        year      = request.GET.get('year')

        logger.info(
            "Request received | tab=%s | month=%s | year=%s | iteration=%s",
            tab_name, month, year, iteration
        )

        # --- Validate required params ---
        if not tab_name or not month or not year:
            logger.warning("Missing required query parameters")
            return JsonResponse(
                {"error": "Missing required parameters: tab, month, year"},
                status=400
            )

        # month_year format → "012025"
        month_year = f"{month}{year}"

        logger.debug("Generated month_year: %s", month_year)

        # --- Find matching file ---
        filepath = find_matching_file(tab_name, month_year)

        # 🔴 File not uploaded
        if not filepath:
            logger.warning(
                "File not found | tab=%s | month_year=%s",
                tab_name, month_year
            )
            return JsonResponse(
                {"message": "Data is not uploaded for the selected month"},
                status=404
            )

        logger.info("File found: %s", filepath)

        # --- Process file ---
        try:
            result = final_input_item_process_file(filepath)
        except FileNotFoundError:
            logger.exception("File disappeared during processing: %s", filepath)
            return JsonResponse(
                {"error": "Uploaded file not accessible"},
                status=500
            )
        except ValueError as ve:
            logger.exception("Data validation error")
            return JsonResponse(
                {"error": f"Invalid data format: {str(ve)}"},
                status=400
            )
        except Exception as e:
            logger.exception("Unexpected error while processing file")
            return JsonResponse(
                {"error": "Internal server error while processing file"},
                status=500
            )

        # 🔴 File exists but NO records
        if not result or (isinstance(result, list) and len(result) == 0):
            logger.info(
                "File processed but no records found | %s",
                filepath
            )
            return JsonResponse(
                {"message": "Data is not available for the selected month"},
                status=200
            )

        # ✅ Success
        logger.info(
            "Final input price item data returned | records=%s",
            len(result) if isinstance(result, list) else "N/A"
        )

        return JsonResponse(result, safe=False, status=200)

    except Exception as e:
        # 🛑 Catch-all safety net
        logger.critical("Unhandled exception in get_final_input_price_item", exc_info=True)
        return JsonResponse(
            {"error": "Unexpected server error"},
            status=500
        )
