import os
import time
import traceback
import importlib
from datetime import datetime
from rest_framework.decorators import api_view 
from rest_framework.response import Response
from rest_framework import status
from .master_data_paths import (mkt_offline_rural_uploaded_data_path, mkt_offline_urban_uploaded_data_path, mkt_online_urban_uploaded_data_path,
                                airfare_urban_uploaded_data_path, hr_rural_price_uploaded_data_path, hr_urban_price_uploaded_data_path)
@api_view(['GET'])
def upload_all_price_data(request):

    """
    Upload market price data (rural, urban, airfare, etc.), validate, and load to DB.
    """

    # === 1. Collect uploaded files ===
    files = {
        "rural_market_data": request.FILES.getlist("rural_market_data"),
        "urban_market_data": request.FILES.getlist("rural_market_data"),
        "airfare_data": request.FILES.getlist("airfare_data"),
        "online_market_data": request.FILES.getlist("online_market_data"),
        "rural_housing_rent_data": request.FILES.getlist("rural_housing_rent_data"),
        "urban_housing_rent_data": request.FILES.getlist("urban_housing_rent_data"),
        # "pds_price_data": request.FILES.getlist("pds_price_data"),
        # "rural_electricity_data": request.FILES.getlist("rural_electricity_data"),
        # "urban_electricity_data": request.FILES.getlist("urban_electricity_data"),
    }

    # === 2. Check at least one file uploaded ===
    if not any(f for file_list in files.values() for f in file_list):
        return Response(
            {"status": "error", "message": "No files uploaded. Please upload at least one file."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # === 3. Save uploaded files ===
    save_paths = {
        "rural_market_data": mkt_offline_rural_uploaded_data_path,
        "urban_market_data": mkt_offline_urban_uploaded_data_path,
        "online_market_data": mkt_online_urban_uploaded_data_path,
        # # "rural_electricity_data": elec_rural_uploaded_data_path,
        # # "urban_electricity_data": elec_urban_uploaded_data_path,
        "airfare_data": airfare_urban_uploaded_data_path,
        # "pds_price_data": pds_price_uploaded_data_path,
        "rural_housing_rent_data": hr_rural_price_uploaded_data_path,
        "urban_housing_rent_data": hr_urban_price_uploaded_data_path,
    }

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
                print(f"[{datetime.now().isoformat()}] Saved: {file.name} → {save_path}")

    # === 4. Run validation ===
    print(f"[{datetime.now().isoformat(sep=' ', timespec='seconds')}] Starting validation...")
    try:
        from .read_validate_price_data import read_validate
        from .load_price_data_db import upload_to_db, get_prev_month_prices
        # importlib.reload(rvpd)
        # importlib.reload(lpdb)

        t0 = time.time()
        success = read_validate()
        t1 = time.time()
        print(f"read_validate() completed in {t1 - t0:.2f}s")

        if not success:
            return Response(
                {"status": "error", "message": "Validation failed. Aborting upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Validation error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # === 5. Upload validated data to DB ===
    print(f"[{datetime.now().isoformat(sep=' ', timespec='seconds')}] Starting DB upload...")
    try:
        prev_month_records = get_prev_month_prices(data_type=3).shape[0]
        if prev_month_records > 0:
            t2 = time.time()
            upload_to_db()
            t3 = time.time()
            print(f"upload_to_db() completed in {t3 - t2:.2f}s")
        else:
            return Response(
                {"status": "error", "message": "Finalize previous month release before uploading."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Database upload error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    total_time = time.time() - t0
    return Response(
        {
            "status": "success",
            "message": "Files validated and uploaded successfully.",
            "validation_time": f"{t1 - t0:.2f}s",
            "upload_time": f"{t3 - t2:.2f}s",
            "total_time": f"{total_time:.2f}s",
        },
        status=status.HTTP_200_OK,
    )
