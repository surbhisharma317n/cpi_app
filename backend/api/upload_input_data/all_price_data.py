import os
import time
import traceback
import importlib
from datetime import datetime
import zipfile
from rest_framework.decorators import api_view 
from rest_framework.response import Response
from rest_framework import status
from .master_data_paths import (mkt_offline_rural_uploaded_data_path, mkt_offline_urban_uploaded_data_path, mkt_online_urban_uploaded_data_path,
                                airfare_urban_uploaded_data_path, hr_rural_price_uploaded_data_path, hr_urban_price_uploaded_data_path,elect_rural_price_uploaded_data_path,
elect_urban_price_uploaded_data_path,
pds_urban_price_uploaded_data_path,)

from .master_data_paths import (
    mkt_offline_rural_uploaded_data_path,
    mkt_offline_urban_uploaded_data_path,
    mkt_online_urban_uploaded_data_path,
    airfare_urban_uploaded_data_path,
    hr_rural_price_uploaded_data_path,
    hr_urban_price_uploaded_data_path,
    elect_rural_price_uploaded_data_path,
    elect_urban_price_uploaded_data_path,
    pds_urban_price_uploaded_data_path,
    
)
@api_view(['GET', 'POST'])
def upload_all_price_data(request):

    """
    Upload market price data (rural, urban, airfare, etc.), validate, and load to DB.
    """

    # === 1. Collect uploaded files ===
    files = {
        "rural_item_price": request.FILES.getlist("rural_item_price"),
        "urban_item_price": request.FILES.getlist("urban_item_price"),
        "airfare": request.FILES.getlist("airfare"),
        "online_shopping": request.FILES.getlist("online_shopping"),
        "rural_house_rent": request.FILES.getlist("rural_house_rent"),
        "urban_house_rent": request.FILES.getlist("urban_house_rent"),
        # electricity and pds files can be added similarly
        "rural_electricity": request.FILES.getlist("rural_electricity"),
        "urban_electricity": request.FILES.getlist("urban_electricity"),
        # pds files can be added similarly
        "PDS_price": request.FILES.getlist("PDS_price"),
    }
    # print(files," Uploaded files collected.===============================")

    # === 2. Check at least one file uploaded ===
    if not any(f for file_list in files.values() for f in file_list):
        return Response(
            {"status": "error", "message": "No files uploaded. Please upload at least one file."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # === 3. Save uploaded files ===
    save_paths = {
        "rural_item_price": mkt_offline_rural_uploaded_data_path,
        "urban_item_price": mkt_offline_urban_uploaded_data_path,
        "online_shopping": mkt_online_urban_uploaded_data_path,
        "rural_electricity": elect_rural_price_uploaded_data_path,
        "urban_electricity": elect_urban_price_uploaded_data_path,
        "airfare": airfare_urban_uploaded_data_path,
        "PDS_price": pds_urban_price_uploaded_data_path,
        "rural_house_rent": hr_rural_price_uploaded_data_path,
        "urban_house_rent": hr_urban_price_uploaded_data_path,
    }
    print(save_paths," Save paths defined.")
    
    print("Saving uploaded files...")

    for key, file_list in files.items():
        for file in file_list:
            print(key,"===" ,file.name,file,"========================checking file===================")
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




#======================== new check ===============
import os
import time
import traceback
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .read_validate_price_data import read_validate
def extract_zip_files(zip_path, extract_to):
    try:
        if not os.path.exists(extract_to):
            os.makedirs(extract_to)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_to)

        print("ZIP extracted successfully")
        return True

    except Exception as e:
        print(f"Error extracting ZIP: {e}")
        return False

@api_view(['POST'])
def validate_price_data(request):
    print("start uploading")
    """
    Upload and validate price data files (rural, urban, airfare, etc.)
    """

    # === Run validation ===
    try:

        # zip_path = r"D:\cpi_base\backend\January_2026_price_data.zip"   # jo upload API ne save ki hai
        # extract_folder = "uploads/extracted_files"

        # # ---------- Extract ZIP ----------
        # if not os.path.exists(extract_folder):
        #     os.makedirs(extract_folder)

        # with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        #     zip_ref.extractall(extract_folder)

        # print("ZIP extracted successfully")

        # ---------- Run Validation ----------
        

        t0 = time.time()
        success = read_validate()
        t1 = time.time()

        if not success:
            return Response(
                {"status": "error", "message": "Validation failed"},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "status": "success",
                "message": "Validation completed successfully",
                "validation_time": f"{t1 - t0:.2f}s"
            },
            status=status.HTTP_200_OK
        )


    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Validation error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
        
        
        
@api_view(['POST'])
def upload_price_data_to_db(request):
    """
    Upload validated price data to the database after successful validation.
    """
    try:
        from .load_price_data_db import upload_to_db, get_prev_month_prices

        prev_month_records = get_prev_month_prices(data_type=3).shape[0]
        if prev_month_records == 0:
            return Response(
                {"status": "error", "message": "Finalize previous month release before uploading."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        t0 = time.time()
        upload_to_db()
        t1 = time.time()

        return Response(
            {
                "status": "success",
                "message": "Validated data uploaded to database successfully.",
                "upload_time": f"{t1 - t0:.2f}s",
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        traceback.print_exc()
        return Response(
            {"status": "error", "message": f"Database upload error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

