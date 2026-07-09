import os
import threading
import time
import pandas as pd
from uuid import uuid4
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from rest_framework import status
# from .models import ProductPrice, Product  # example models


from django.db import connections




UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, "validated_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Map logical field names to real DB table names
TABLE_MAP = {
    "rural item price": "rural_item_price",
    "urban item price": "urban_item_price",
    "rural house rent": "rural_house_rent",
    "urban house rent": "urban_house_rent",
}


import pandas as pd
import os
import time
from django.db import connection
from django.core.cache import cache

def get_table_name(field_name):
    mapping = {
        "rural item price": "rural_item_price",
        "urban item price": "urban_item_price",
        "rural house rent": "rural_house_rent",
        "urban house rent": "urban_house_rent",
    }
    return mapping.get(field_name.strip().lower())

class FileUploadView(APIView):
    """
    Handles Steps 1–3:
      1. Header Validation
      2. Data Validation
      3. File Saving
    """

    parser_classes = [MultiPartParser]

    def post(self, request):
        session_id = str(uuid4())
        uploaded_files = request.FILES.getlist("files")

        if not uploaded_files:
            return Response({"status": "error", "message": "No files provided."},
                            status=status.HTTP_400_BAD_REQUEST)

        validation_summary = []
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        for file in uploaded_files:
            file_name = file.name
            field_name = request.data.get(f"field_name_{file_name}", "")
            ext = file_name.split(".")[-1].lower()

            # Step 1: Read headers
            try:
                df = pd.read_csv(file) if ext == "csv" else pd.read_excel(file)
            except Exception as e:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": f"Failed to read file: {e}"
                })
                continue

            headers = list(df.columns)
            expected = self.get_expected_headers(field_name)
            print("Expected Headers:", expected)
            print("Actual Headers:", headers)
            missing = [h for h in expected if h not in headers]
            extra = [h for h in headers if h not in expected]

            if missing or extra:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": f"Header mismatch. Missing: {missing}, Extra: {extra}"
                })
                continue

            # Step 2: Data validation
            data_errors, invalid_rows = self.validate_data(df)
            if data_errors:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": "; ".join(data_errors),
                    "invalid_rows": invalid_rows
                })
                continue

            # Step 3: Save validated file
            file_path = os.path.join(UPLOAD_DIR, file_name)
            df.to_csv(file_path, index=False)

            validation_summary.append({
                "file_name": file_name,
                "field_name": field_name,
                "status": "success",
                "message": "Validation passed and file saved.",
                "file_path": file_path
            })

        return Response({
            "session_id": session_id,
            "results": validation_summary
        })

    def get_expected_headers(self, field_name: str) -> list:
        """
        Return expected headers for each upload type.
        Handles casing, underscores, spaces, and trims safely.
        """
        expected_headers_map = {
            "rural item price": ["Item Code", "Item Name", "Price", "Month", "Year"],
            "urban item price": ["Item Code", "Item Name", "Price", "Month", "Year"],
            "rural house rent": ["City", "House ID", "Rent Amount", "Month", "Year"],
            "urban house rent": ["City", "House ID", "Rent Amount", "Month", "Year"],
        }

        # Clean and normalize the input string
        if not field_name:
            print("⚠️ Field name is empty or missing in request.data")
            return []

        normalized_name = (
            field_name.strip()
            .lower()
            .replace("_", " ")
            .replace("-", " ")
        )

        # Optional debug info to confirm what's happening
        print(f"🧩 Raw field_name received: {repr(field_name)}")
        print(f"🔍 Normalized lookup key: '{normalized_name}'")
        print(f"🗺️ Available keys: {list(expected_headers_map.keys())}")

        headers = expected_headers_map.get(normalized_name)

        if headers is None:
            print(f"❌ No match found for normalized key: '{normalized_name}'")
            return []

        print(f"✅ Expected headers found for '{normalized_name}': {headers}")
        return headers

    def validate_data(self, df):
        # """Check datatypes and DB reference values"""
        # errors = []
        # invalid_rows = 0

        # # Example: numeric price check
        # for col in df.columns:
        #     if "price" in col.lower():
        #         if not pd.api.types.is_numeric_dtype(df[col]):
        #             errors.append(f"{col} should be numeric.")
        #             invalid_rows += df[col].apply(
        #                 lambda x: not str(x).replace(".", "", 1).isdigit()
        #             ).sum()

        # # Example: check if Item Code exists in DB
        # if "Item Code" in df.columns:
        #     invalid_codes = []
        #     for code in df["Item Code"].dropna().unique():
        #         if not Product.objects.filter(code=code).exists():
        #             invalid_codes.append(code)
        #     if invalid_codes:
        #         errors.append(f"Invalid Item Codes: {', '.join(map(str, invalid_codes[:5]))}")
        #         invalid_rows += len(invalid_codes)

        # return errors, invalid_rows
        return [], 0  # Placeholder: assume all data is valid
    
    
# ---------------------------------------------
# 1️⃣ Background worker — inserts using raw SQL
# ---------------------------------------------
def _update_file_progress(session_id, file_name, progress, status, message=""):
    cache_data = cache.get(f"progress_{session_id}", {})

    if not cache_data:
        cache_data = {"file_progress": []}

    file_progress_list = cache_data.get("file_progress", [])
    updated = False

    for f in file_progress_list:
        if f["file_name"] == file_name:
            f["progress"] = progress
            f["status"] = status
            f["message"] = message
            updated = True
            break

    if not updated:
        file_progress_list.append({
            "file_name": file_name,
            "progress": progress,
            "status": status,
            "message": message,
        })

    cache_data["file_progress"] = file_progress_list
    cache_data["status"] = "running" if status != "error" else "error"
    cache.set(f"progress_{session_id}", cache_data, timeout=3600)
    
COLUMN_MAPPINGS = {
    "rural_item_price": {
        "Item Code": "item_code",
        "Item Name": "item_name",
        "Price": "price",
        "Month": "month",
        "Year": "year",
    },
    "urban_item_price": {
        "Item Code": "item_code",
        "Item Name": "item_name",
        "Price": "price",
        "Month": "month",
        "Year": "year",
    },
    "rural_house_rent": {
        "City": "city",
        "House ID": "house_id",
        "Rent Amount": "rent_amount",
        "Month": "month",
        "Year": "year",
    },
    "urban_house_rent": {
        "City": "city",
        "House ID": "house_id",
        "Rent Amount": "rent_amount",
        "Month": "month",
        "Year": "year",
    },
}



def upload_worker(session_id, files):
    """
    Background worker:
      - Uploads each file to its respective table.
      - Tracks per-file and overall progress in cache.
    """
    total_files = len(files)
    completed_files = 0

    # Initialize cache state
    cache.set(
        f"progress_{session_id}",
        {
            "status": "running",
            "progress": 0,
            "file_progress": [
                {"file_name": f.get("file_name"), "progress": 0, "status": "pending", "message": ""}
                for f in files
            ],
        },
        timeout=3600,
    )

    for f in files:
        file_name = f.get("file_name")
        field_name = f.get("field_name")
        file_path = f.get("file_path")

        try:
            df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
        except Exception as e:
            _update_file_progress(session_id, file_name, 0, "error", str(e))
            continue

        table_name = get_table_name(field_name)
        if not table_name:
            _update_file_progress(session_id, file_name, 0, "error", "Unknown upload type.")
            continue

        total_rows = len(df)
        inserted_rows = 0

        try:
            with connection.cursor() as cursor:
                mapping = COLUMN_MAPPINGS.get(table_name, {})
                db_columns = []
                csv_columns = []

                # Map CSV columns to DB columns
                for col in df.columns:
                    db_col = mapping.get(col)
                    if db_col:
                        db_columns.append(f'"{db_col}"')
                        csv_columns.append(col)

                if not db_columns:
                    _update_file_progress(session_id, file_name, 0, "error", "No matching columns found.")
                    continue

                total_rows = len(df)
                inserted_rows = 0

                for _, row in df.iterrows():
                    placeholders = ", ".join(["%s"] * len(db_columns))
                    columns_str = ", ".join(db_columns)
                    values = [row[c] for c in csv_columns]

                    query = f'INSERT INTO "{table_name}" ({columns_str}) VALUES ({placeholders})'
                    cursor.execute(query, values)

                    inserted_rows += 1
                    file_progress = int((inserted_rows / total_rows) * 100)
                    _update_file_progress(session_id, file_name, file_progress, "running")

                    time.sleep(0.02)

            completed_files += 1
            _update_file_progress(session_id, file_name, 100, "completed")

        except Exception as e:
            _update_file_progress(session_id, file_name, 0, "error", str(e))
            continue

        # Update overall progress after each file completes
        overall_progress = int((completed_files / total_files) * 100)
        cache_data = cache.get(f"progress_{session_id}", {})
        if cache_data:
            cache_data["progress"] = overall_progress
            cache_data["status"] = "running" if overall_progress < 100 else "completed"
            cache.set(f"progress_{session_id}", cache_data, timeout=3600)

    # Mark session as complete
    final = cache.get(f"progress_{session_id}", {})
    if final:
        final["status"] = "completed"
        final["progress"] = 100
        cache.set(f"progress_{session_id}", final, timeout=3600)


# ---------------------------------------------
# 2️⃣ Start Upload to DB (spawns background thread)
# ---------------------------------------------
class UploadToDBView(APIView):
    """
    Handles Steps 4–5:
      4. Insert validated files to DB (in background)
      5. Track per-file progress
    """

    def post(self, request):
        files = request.data.get("files", [])
        session_id = request.data.get("session_id", str(uuid4()))

        print(f"🔥 UploadToDBView: Session {session_id}, {len(files)} files")

        if not files:
            return Response(
                {"status": "error", "message": "No files to upload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Initialize cache with per-file progress list
        cache.set(
            f"progress_{session_id}",
            {
                "status": "running",
                "progress": 0,
                "file_progress": [
                    {"file_name": f["file_name"], "progress": 0, "status": "pending"}
                    for f in files
                ],
            },
            timeout=3600,
        )

        # Run upload in background
        threading.Thread(
            target=upload_worker,
            args=(session_id, files),
            daemon=True,
        ).start()

        return Response({
            "status": "started",
            "session_id": session_id,
            "message": "Database upload initiated.",
        })


# ---------------------------------------------
# 3️⃣ Check Upload Progress
# ---------------------------------------------

class UploadProgressView(APIView):
    def get(self, request, session_id):
        data = cache.get(f"progress_{session_id}")
        print("📊 Progress API:", session_id, data)
        if not data:
            return Response({"status": "error", "message": "Invalid session or expired."}, status=404)
        return Response(data)