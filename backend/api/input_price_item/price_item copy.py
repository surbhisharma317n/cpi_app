
from rest_framework.decorators import api_view
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

from api.schema.input_price_db import fetchInptPriceItem  # import only the datetime class



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


# def find_matching_file(base_key: str, month_year: str):
#     """
#     Fetch first matching file in the mapped folder:
#       <filename_prefix>_<month_year>v<number>.<ext>
#     Example filename prefix (from mapping):
#       p_rural_mkt_prices_012025v1.parquet

#     Params
#     - base_key: frontend key, e.g. "rural_item_price"
#     - month_year: "MMYYYY" e.g. "012025"
#     - directory_root: optional root path; defaults to "data/comp_db/capi_item_prices"
#     Returns: full path to first matching file or None
#     """

#     directory_root = r"D:/cpi_base_revision_new/cpi_base/backend/data/comp_db/capi_item_prices"





#     # Map frontend key -> folder + filename prefix
#     tab_mapping = {
#         "rural_item_price": "rural/validated_data/p_rural_mkt_prices",
#         "urban_item_price": "urban/validated_data/p_urban_mkt_prices",
#         "rural_house_rent": "rural/validated_data/rural_house_rent",
#         "urban_house_rent": "urban/validated_data/urban_house_rent",
#         "rural_electricity": "rural/validated_data/rural_electricity",
#         "urban_electricity": "urban/validated_data/urban_electricity",
#         "pds_price": "urban/validated_data/p_urban_pds_prices",
#         "airfare": "urban/validated_data/p_airfare_prices",
#         "online_shopping": "urban/validated_data/p_urban_online_mkt_prices",
#     }

#     # get mapped folder + prefix
#     file_path_key = tab_mapping.get(base_key)
#     if not file_path_key:
#         # invalid key
#         return None

#     # filename prefix is the last path component from mapping


#     # allowed extensions
#     extensions = "csv|xlsx|xls|parquet"

#     # build search pattern
#     pattern =f"_{month_year}_v1.parquet"


#     # build real directory to search: directory_root/<mapped subpath>
#     # directory = os.path.join(directory_root, f"{file_path_key}{pattern}")
#     directory = f"{directory_root}/{file_path_key}{pattern}"
#     print('======================directory====',directory)

#     # ensure directory exists
#     if not os.path.isdir(directory):
#         return None

#     try:
#         for filename in os.listdir(directory):

#             print('matched filename====',filename)
#             return os.path.join(directory, filename)
#     except OSError:
#         return None

#     return None

# def find_matching_file(base_key: str, month_year: str):


#     # Project root directory


#     BASE_DIR = Path(__file__).resolve().parent.parent
#     UPLOAD_DIR = os.path.join(setting.SECOND_MEDIA_ROOT, "comp_db", "capi_item_prices")
#     print('BASE_DIR========',UPLOAD_DIR)


#     # Map frontend key -> folder + filename prefix
#     tab_mapping = {
#         "rural_item_price": os.path.join("rural","validated_data","p_rural_mkt_prices"),
#         "urban_item_price": os.path.join("urban","validated_data","p_urban_mkt_prices"),
#         "rural_house_rent": os.path.join("rural","validated_data","rural_house_rent"),
#         "urban_house_rent": os.path.join("urban","validated_data","urban_house_rent"),
#         "rural_electricity": os.path.join("rural","validated_data","rural_electricity"),
#         "urban_electricity": os.path.join("urban","validated_data","urban_electricity"),
#         "pds_price":os.path.join("urban","validated_data","p_urban_pds_prices"),
#         "airfare": os.path.join("urban","validated_data","p_airfare_prices"),
#         "online_shopping": os.path.join("urban","validated_data","p_urban_online_mkt_prices"),
#     }

#     # Get mapped folder + prefix
#     file_path_key = tab_mapping.get(base_key)
#     print('file_path_key====',file_path_key)


#     # Separate folder and filename prefix

#     folder_path = os.path.join(UPLOAD_DIR, file_path_key)
#     pattern = f"_{month_year}_v1.parquet"

#     check_path = f"{UPLOAD_DIR}\{file_path_key}{pattern}"
#     print('check_path====',check_path)

#     if not os.path.isdir(check_path):
#         return None

#     # Regex pattern: <prefix>_<month_year>v<number>.<ext>

#     return check_path  # full path


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

    return None




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



def get_uploaded_data(request):
    # --- Read query params ---
    
    tab_name = request.GET.get("tab")
    month = request.GET.get("month")
    year = request.GET.get("year")

    if not tab_name or not month or not year:
        return Response(
            {"error": "Missing required parameters: tab, month, year"},
            status=status.HTTP_400_BAD_REQUEST
        )

    month_year = f"{month}{year}"
    logging.info(f"Checking data for {tab_name} - {month_year}")

    filepath = find_matching_file(tab_name, month_year)

    # 🔴 File not uploaded
    if not filepath:
        logging.warning(f"No file uploaded for {tab_name} - {month_year}")
        return Response(
            {"message": "Data is not uploaded for the selected month"},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        result = process_file(filepath)
    except Exception as e:
        logging.exception("File processing failed")
        return Response(
            {"error": "Failed to process uploaded file"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # 🔴 File exists but empty
    if not result or len(result) == 0:
        logging.info(f"File exists but empty: {filepath}")
        return Response(
            {"message": "Data is not available for the selected month"},
            status=status.HTTP_200_OK
        )

    # ✅ Success
    logging.info(f"Data returned for {tab_name} - {month_year}")
    return Response(result, status=status.HTTP_200_OK)


# def process_file(filepath, page=1, page_size=20):
#     print('process_file filepath====', filepath)

#     # Read file
#     ext = filepath.split(".")[-1].lower()

#     if ext == "csv":
#         df = pd.read_csv(filepath)
#     elif ext == "parquet":
#         df = pd.read_parquet(filepath)
#     else:
#         raise ValueError("Unsupported file format")

#     total_records = len(df)
#     total_pages = math.ceil(total_records / page_size)

#     # Pagination calculation
#     start = (page - 1) * page_size
#     end = start + page_size

#     paginated_df = df.iloc[start:end]

#     return {
#         "data": paginated_df.to_dict(orient="records"),
#         "columns": list(df.columns),
#         "pagination": {
#             "page": page,
#             "page_size": page_size,
#             "total_records": total_records,
#             "total_pages": total_pages,
#             "has_next": page < total_pages,
#             "has_previous": page > 1
#         }
#     }

# def get_uploaded_data(request):
#     # --- Read query params ---
#     iteration = request.GET.get('iteration')   # optional
#     tab_name  = request.GET.get('tab')         # required
#     month     = request.GET.get('month')       # required
#     year      = request.GET.get('year')        # required

#     # Pagination params
#     try:
#         page = int(request.GET.get('page', 1))
#         page_size = int(request.GET.get('page_size', 20))
#     except ValueError:
#         return JsonResponse(
#             {"error": "page and page_size must be integers"},
#             status=400
#         )

#     # Safety limits
#     if page < 1:
#         page = 1
#     if page_size < 1 or page_size > 100:
#         page_size = 20

#     print('tab_name, month, year, page, page_size ====',
#           tab_name, month, year, page, page_size)

#     # --- Validate required params ---
#     if not tab_name or not month or not year:
#         return JsonResponse(
#             {"error": "Missing required parameters: tab, month, year"},
#             status=400
#         )

#     # --- Build month_year ---
#     month_year = f"{month}{year}"

#     # --- Find matching file ---
#     filepath = find_matching_file(tab_name, month_year)

#     if not filepath:
#         return JsonResponse({
#             "error": "File not found",
#             "searched_pattern": f"{tab_name}_{month_year}v*.parquet/csv"
#         }, status=404)

#     # --- Process file with pagination ---
#     try:
#         result = process_file(
#             filepath=filepath,
#             page=page,
#             page_size=page_size
#         )
#     except Exception as e:
#         return JsonResponse(
#             {"error": "Failed to process file", "details": str(e)},
#             status=500
#         )

#     # --- Success ---
#     return JsonResponse(result, safe=False)


# def get_uploaded_data(request):
#     # --- Read query params ---
#     iteration = request.GET.get('iteration')   # optional
#     tab_name  = request.GET.get('tab')         # required
#     month     = request.GET.get('month')       # required
#     year      = request.GET.get('year')        # required

#     # Pagination params
#     try:
#         page = int(request.GET.get('page', 1))
#         page_size = int(request.GET.get('page_size', 20))
#     except ValueError:
#         return JsonResponse(
#             {"error": "page and page_size must be integers"},
#             status=400
#         )

#     # Safety limits
#     if page < 1:
#         page = 1
#     if page_size < 1 or page_size > 100:
#         page_size = 20

#     print('tab_name, month, year, page, page_size ====',
#           tab_name, month, year, page, page_size)

#     # --- Validate required params ---
#     if not tab_name or not month or not year:
#         return JsonResponse(
#             {"error": "Missing required parameters: tab, month, year"},
#             status=400
#         )

#     # --- Build month_year ---
#     month_year = f"{month}{year}"

#     # --- Find matching file ---
#     filepath = find_matching_file(tab_name, month_year)

#     if not filepath:
#         return JsonResponse({
#             "error": "File not found",
#             "searched_pattern": f"{tab_name}_{month_year}v*.parquet/csv"
#         }, status=404)

#     # --- Process file with pagination ---
#     try:
#         result = process_file(
#             filepath=filepath,
#             page=page,
#             page_size=page_size
#         )
#     except Exception as e:
#         return JsonResponse(
#             {"error": "Failed to process file", "details": str(e)},
#             status=500
#         )

#     # --- Success ---
#     return JsonResponse(result, safe=False)


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

    return None

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
    # --- Read query params safely ---
    iteration = request.GET.get('iteration')   # optional
    tab_name  = request.GET.get('tab')         # e.g. "rural_item_price"
    month     = request.GET.get('month')       # e.g. "01"
    year      = request.GET.get('year')        # e.g. "2025"
    print('tab_name,month,year====',tab_name,month,year)

    # --- Validate required params ---
    if not tab_name or not month or not year:
        return JsonResponse(
            {"error": "Missing required parameters: tab, month, year"},
            status=400
        )

    # month_year format → "012025"
    month_year = f"{month}{year}"

    # --- Directory path (use os.path.join for safety) ---
    # Windows-friendly path


    # --- Search for matching file ---
    filepath = find_matching_file(tab_name, month_year)

    if not filepath:
        return JsonResponse({
            "error": "File not found",
            "searched_pattern": f"{tab_name}_{month_year}v*.parquet/csv/xlsx"
        }, status=404)

    # --- Process (read) file ---
    try:
        result = final_input_item_process_file(filepath)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

    # --- Success response ---
    return JsonResponse(result, safe=False)