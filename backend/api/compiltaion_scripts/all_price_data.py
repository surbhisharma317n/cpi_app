import os
import time
import traceback
import importlib
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from api.compiltaion_scripts.all_india import all_index_script
from api.compiltaion_scripts.electricity import electricity_index_script
from api.compiltaion_scripts.fuel import fuel_price_index_script
from api.compiltaion_scripts.house_rent import house_rent_script
from api.compiltaion_scripts.market_price import market_item_index_script
from api.compiltaion_scripts.pds import pds_item_index_script
from api.compiltaion_scripts.postal_ott_index import postal_ott_index_script
from api.compiltaion_scripts.railfare_index import railfare_index_script
from api.compiltaion_scripts.telecom import telecom_price_index_script
from django.contrib.auth.decorators import login_required
from api.upload_input_data.master_data_paths import *

import os
import time
import traceback
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import logging
from api.upload_input_data.master_data_paths import (
    mkt_offline_rural_uploaded_data_path,
    mkt_offline_urban_uploaded_data_path,
    mkt_online_urban_uploaded_data_path,
    airfare_urban_uploaded_data_path,
    hr_rural_price_uploaded_data_path,
    hr_urban_price_uploaded_data_path,
)


@api_view(['POST'])
def upload_validate_and_save_price_data(request):
    """
    Single API:
    1. Upload files
    2. Validate data
    3. Upload validated data to DB
    """

    print("=== Price Data Upload Started ===")

    files = {
        "rural_market_data": request.FILES.getlist("rural_market_data"),
        "urban_market_data": request.FILES.getlist("urban_market_data"),
        "airfare_data": request.FILES.getlist("airfare_data"),
        "online_market_data": request.FILES.getlist("online_market_data"),
        "rural_housing_rent_data": request.FILES.getlist("rural_housing_rent_data"),
        "urban_housing_rent_data": request.FILES.getlist("urban_housing_rent_data"),
        "rural_elect_data": request.FILES.getlist("rural_elect_data"),
        "urban_elect_data": request.FILES.getlist("urban_elect_data"),
        "urban_pds_data": request.FILES.getlist("urban_pds_data"),
    }

    if not any(f for file_list in files.values() for f in file_list):
        return Response(
            {"status": "error", "message": "No files uploaded."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    save_paths = {
        "rural_market_data": mkt_offline_rural_uploaded_data_path,
        "urban_market_data": mkt_offline_urban_uploaded_data_path,
        "online_market_data": mkt_online_urban_uploaded_data_path,
        "airfare_data": airfare_urban_uploaded_data_path,
        "rural_housing_rent_data": hr_rural_price_uploaded_data_path,
        "urban_housing_rent_data": hr_urban_price_uploaded_data_path,
        "rural_elect_data": elect_rural_price_uploaded_data_path,
        "urban_elect_data": elect_urban_price_uploaded_data_path,
        "urban_pds_data": pds_urban_price_uploaded_data_path,
    }

    # ================================
    # 1️⃣ Save Uploaded Files
    # ================================
    try:
        for key, file_list in files.items():
            for file in file_list:
                if file:
                    save_path = save_paths.get(key)
                    if not save_path:
                        continue
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    with open(save_path, "wb+") as destination:
                        for chunk in file.chunks():
                            destination.write(chunk)

                    print(f"[{datetime.now()}] Saved: {file.name}")

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"File saving error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


    # ================================
    # 2️⃣ Validate Uploaded Data
    # ================================
    try:
        from upload_input_data.read_validate_price_data import read_validate

        t_validate_start = time.time()
        validation_status = read_validate()
        t_validate_end = time.time()

        if not validation_status:
            return Response(
                {"status": "error", "message": "Validation failed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Validation error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ================================
    # 3️⃣ Upload to Database
    # ================================
    try:
        from upload_input_data.load_price_data_db import upload_to_db, get_prev_month_prices

        prev_month_records = get_prev_month_prices(data_type=3).shape[0]
        if prev_month_records == 0:
            return Response(
                {
                    "status": "error",
                    "message": "Finalize previous month release before uploading.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        t_upload_start = time.time()
        upload_to_db()
        t_upload_end = time.time()

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Database upload error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ================================
    # ✅ Final Success Response
    # ================================
    return Response(
        {
            "status": "success",
            "message": "Files uploaded, validated, and saved to database successfully.",
            "validation_time": f"{t_validate_end - t_validate_start:.2f}s",
            "upload_time": f"{t_upload_end - t_upload_start:.2f}s",
        },
        status=status.HTTP_200_OK,
    )


# ---- Logger setup ----
logger = logging.getLogger(__name__)


# @api_view(["POST", "GET"])
# # @permission_classes([IsAuthenticated])
# # @role_required("admin", "compiler")

# @csrf_exempt
# @api_view(["GET"])
# @permission_classes([AllowAny])  # 🔥 JWT handles auth
# @role_required("admin", "compiler")  # 🔥 compiler allowed
def compilation_index(request):
    logger.info("Compilation API started...")
    try:
        house_rent_script()
        logger.info("House rent index compilation completed.")

        electricity_index_script()
        logger.info("Electricity index compilation completed.")
        
        pds_item_index_script()
        logger.info("PDS index compilation completed.")
        
        fuel_price_index_script()
        logger.info("Fuel price index compilation completed.")
        
        telecom_price_index_script()
        logger.info("Telecom price index compilation completed.")
        
        postal_ott_index_script()
        logger.info("Postal and OTT index compilation completed.")
        
        railfare_index_script()
        logger.info("Railfare and Metro fare index compilation completed.")

        market_item_index_script()
        logger.info("Market price index compilation completed.")

        all_index_script()

        logger.info("All India index compilation completed.")

        logger.info("All index compilations executed successfully.")
        return Response(
            {"status": "success", "message": "All index compilations executed successfully"},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        error_msg = f"Compilation failed due to: {str(e)}"
        logger.error(error_msg, exc_info=True)   # exc_info=True prints full stacktrace in logs
        return Response(
            {"status": "failure", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )