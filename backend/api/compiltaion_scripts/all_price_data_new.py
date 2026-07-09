import os
import time
import traceback
import importlib
from datetime import datetime
from rest_framework.decorators import api_view 
from rest_framework.response import Response
import json
import uuid
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
# @api_view(['GET', 'POST'])

# --------------------------------------------------------------
# 1️⃣ VALIDATION API
# --------------------------------------------------------------
@api_view(['POST'])
def validate_price_data(request):
    """
    Step 1: Upload all files + run validation.
    Returns detailed results for each file.
    """

    print("Starting validation step...")

    # ---------- 1. Read uploaded files ----------
    files = {
        "rural_item_price": request.FILES.getlist("rural_item_price"),
        "urban_item_price": request.FILES.getlist("urban_item_price"),
        "airfare": request.FILES.getlist("airfare"),
        "online_shopping": request.FILES.getlist("online_shopping"),
        "rural_house_rent": request.FILES.getlist("rural_house_rent"),
        "urban_house_rent": request.FILES.getlist("urban_house_rent"),
        "rural_electricity": request.FILES.getlist("rural_electricity"),
        "urban_electricity": request.FILES.getlist("urban_electricity"),
        "PDS_price": request.FILES.getlist("PDS_price"),
    }

    if not any(f for L in files.values() for f in L):
        return Response({"status": "error", "message": "No files uploaded"}, status=400)

    # ---------- 2. File save paths ----------
    save_paths = {
        "rural_item_price": mkt_offline_rural_uploaded_data_path,
        "urban_item_price": mkt_offline_urban_uploaded_data_path,
        "online_shopping": mkt_online_urban_uploaded_data_path,
        "airfare": airfare_urban_uploaded_data_path,
        "rural_house_rent": hr_rural_price_uploaded_data_path,
        "urban_house_rent": hr_urban_price_uploaded_data_path,
        "rural_electricity": elect_rural_price_uploaded_data_path,
        "urban_electricity": elect_urban_price_uploaded_data_path,
        "PDS_price": pds_urban_price_uploaded_data_path,
    }

    # ---------- 3. Save uploaded files ----------
    for key, file_list in files.items():
        for file in file_list:
            if file:
                save_path = save_paths[key]
                os.makedirs(os.path.dirname(save_path), exist_ok=True)

                with open(save_path, "wb+") as f:
                    for chunk in file.chunks():
                        f.write(chunk)

                print(f"[{datetime.now()}] Saved {file.name} → {save_path}")

    # ---------- 4. Run validation ----------
    try:
        from .read_validate_price_data import read_validate
        t0 = time.time()
        results = read_validate()    # MUST return list of dicts
        t1 = time.time()

        print("Raw validation result →", results)

        # ---------- 5. Normalize results ----------
        normalized_results = []

        for r in results:

            # Case 1 → OK dict format
            if isinstance(r, dict):
                normalized_results.append({
                    "file_name": r.get("file_name", "Unknown"),
                    "status": r.get("status", "failed"),
                    "message": r.get("message", ""),
                    "missing": r.get("missing", []),
                    "extra": r.get("extra", []),
                    "expected": r.get("expected", []),
                })
                continue

            # Case 2 → Validation returned raw string error
            normalized_results.append({
                "file_name": "Unknown File",
                "status": "failed",
                "message": str(r),
                "missing": [],
                "extra": [],
                "expected": []
            })

        # ---------- 6. Detect failures safely ----------
        any_failed = any(row["status"] == "failed" for row in normalized_results)
        session_id = str(uuid.uuid4())
        from django.core.cache import cache
        set_cache = cache.set(f"{session_id}", normalized_results, timeout=3600)  # 1 hour expiry
        
        print(f"Validation session ID: {session_id}")

        return Response({
            "status": "failed" if any_failed else "success",
            "message": "Validation completed" if not any_failed else "Some files failed validation",
            "validation_time": f"{t1 - t0:.2f}s",
            "summary": normalized_results,
            "session_id": session_id   # ✅ new field
        })

    except Exception as e:
        traceback.print_exc()
        return Response({
            "status": "error",
            "message": f"Validation error: {str(e)}",
            "summary": [{
                "file_name": "system",
                "status": "failed",
                "message": str(e),
                "missing": [],
                "extra": [],
                "expected": []
            }]
        }, status=500)



# --------------------------------------------------------------
# 2️⃣ DB UPLOAD WITH PROGRESS
# --------------------------------------------------------------

PROGRESS_FILE = "/tmp/db_upload_progress.json"
# Folder to store per-session progress files
PROGRESS_DIR = "/tmp/db_upload_progress"
os.makedirs(PROGRESS_DIR, exist_ok=True)


def set_session_progress(session_id: str, step: int, total_steps: int, message: str, current_file=None, file_progress=None):
    """
    Save per-session progress in a JSON file.
    """
    percent = int((step / total_steps) * 100)
    data = {
        "status": "running" if step < total_steps else "completed",
        "progress": percent,
        "current_file": current_file,
        "file_progress": file_progress or [],
        "message": message
    }
    progress_file = os.path.join(PROGRESS_DIR, f"{session_id}.json")
    with open(progress_file, "w") as f:
        json.dump(data, f)


@api_view(["POST"])
def upload_price_data_db(request):
    """
    Step 2: Upload validated files to DB and update progress per session.
    """
    data = request.data
    session_id = data.get("session_id")
    files = data.get("files", [])

    if not session_id:
        return Response({"status": "error", "message": "Missing session_id"}, status=400)
    if not files:
        return Response({"status": "error", "message": "No files to upload"}, status=400)

    try:
        from .load_price_data_db import upload_to_db, get_prev_month_prices

        TOTAL_STEPS = 4

        # STEP 1: Check previous month status
        set_session_progress(session_id, 1, TOTAL_STEPS, "Checking previous month status...")
        prev_count = get_prev_month_prices(data_type=3).shape[0]
        if prev_count == 0:
            set_session_progress(session_id, 1, TOTAL_STEPS, "Previous month not finalized.")
            return Response({"status": "error",
                             "message": "Finalize previous month before uploading."}, status=400)

        # STEP 2: Prepare
        set_session_progress(session_id, 2, TOTAL_STEPS, "Preparing data...")
        time.sleep(1)  # simulate preparation time

        # STEP 3: Upload files
        set_session_progress(session_id, 3, TOTAL_STEPS, "Uploading files...")
        total_files = len(files)
        file_progress_list = []

        for idx, file_info in enumerate(files):
            file_name = file_info["file_name"]

            # Here you call your actual DB upload for each file
            # For demo, we simulate progress
            for p in range(0, 101, 20):
                file_progress_list.append({"file_name": file_name, "progress": p})
                set_session_progress(session_id, 3, TOTAL_STEPS,
                                     message=f"Uploading {file_name}...",
                                     current_file=file_name,
                                     file_progress=file_progress_list)
                time.sleep(0.1)

            # Ensure 100% for this file
            for f in file_progress_list:
                if f["file_name"] == file_name:
                    f["progress"] = 100
            set_session_progress(session_id, 3, TOTAL_STEPS,
                                 message=f"{file_name} uploaded.",
                                 file_progress=file_progress_list)

        # STEP 4: Completed
        set_session_progress(session_id, 4, TOTAL_STEPS, "All files uploaded successfully.",
                             current_file=None, file_progress=file_progress_list)

        return Response({"status": "success", "message": "DB upload started"})

    except Exception as e:
        traceback.print_exc()
        set_session_progress(session_id, 0, 100, f"Error: {str(e)}")
        return Response({"status": "error", "message": str(e)}, status=500)


@api_view(["GET"])
def get_db_upload_progress(request, session_id):
    """
    Return per-session DB upload progress.
    """
    progress_file = os.path.join(PROGRESS_DIR, f"{session_id}.json")
    if not os.path.exists(progress_file):
        return Response({"status": "not_started", "progress": 0, "message": "Not started"})

    try:
        with open(progress_file, "r") as f:
            data = json.load(f)
        return Response(data)
    except Exception as e:
        return Response({"status": "error", "progress": 0, "message": f"Error reading progress: {str(e)}"}, status=500)

# @api_view(["GET"])
# def get_db_upload_progress(request, session_id):
#     """
#     Return the DB upload progress for a given session_id.
#     """
#     progress_file = os.path.join(PROGRESS_DIR, f"{session_id}.json")

#     if not os.path.exists(progress_file):
#         return Response({"progress": 0, "message": "Not started"})

#     try:
#         with open(progress_file, "r") as f:
#             data = json.load(f)
#         return Response(data)
#     except Exception as e:
#         return Response({"progress": 0, "message": f"Error reading progress: {str(e)}"}, status=500)