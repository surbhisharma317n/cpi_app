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
from django.db import connection, connections

# -----------------------------------------------------
# CONFIG
# -----------------------------------------------------
UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, "validated_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Map logical field names to real DB table names
# ----------------------------------------
# TABLE MAP
# ----------------------------------------
TABLE_MAP = {
    "rural item price": "rural_item_price",
    "urban item price": "urban_item_price",
    "rural house rent": "rural_house_rent",
    "urban house rent": "urban_house_rent",

    "rural electricity": "rural_electricity",
    "urban electricity": "urban_electricity",
    "online shopping": "online_shopping",
    "airfare": "airfare",
    "pds price": "pds_price",
}


# -----------------------------------------------------
# COLUMN MAPPINGS
# -----------------------------------------------------
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

    # NEW --------------------
    "rural_electricity": {
        "Meter No": "meter_no",
        "Units": "units",
        "Rate": "rate",
        "Month": "month",
        "Year": "year",
    },
    "urban_electricity": {
        "Meter No": "meter_no",
        "Units": "units",
        "Rate": "rate",
        "Month": "month",
        "Year": "year",
    },
    "online_shopping": {
        "Item Code": "item_code",
        "Platform": "platform",
        "Price": "price",
        "Month": "month",
        "Year": "year",
    },
    "airfare": {
        "Flight No": "flight_no",
        "From": "from_city",
        "To": "to_city",
        "Fare": "fare",
        "Month": "month",
    },
    "pds_price": {
        "Commodity": "commodity",
        "Region": "region",
        "Price": "price",
        "Month": "month",
        "Year": "year",
    },
}

# -----------------------------------------------------
# Helper: get table name
# -----------------------------------------------------
def get_table_name(field_name):
    return TABLE_MAP.get(field_name.strip().lower())


# -----------------------------------------------------
# 1️⃣ File Upload + Validation View
# -----------------------------------------------------
class FileUploadView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        session_id = str(uuid4())
        uploaded_files = request.FILES.getlist("files")

        if not uploaded_files:
            return Response(
                {"status": "error", "message": "No files provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validation_summary = []
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        for file in uploaded_files:
            file_name = file.name
            field_name = request.data.get(f"field_name_{file_name}", "")
            ext = file_name.split(".")[-1].lower()

            # Step 1: Read file
            try:
                df = pd.read_csv(file) if ext == "csv" else pd.read_excel(file)
            except Exception as e:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": f"Failed to read file: {e}",
                })
                continue

            # Step 2: Header validation
            expected = self.get_expected_headers(field_name)
            headers = list(df.columns)
            missing = [h for h in expected if h not in headers]
            extra = [h for h in headers if h not in expected]

            if missing or extra:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": f"Header mismatch → Missing: {missing}, Extra: {extra}",
                })
                continue

            # Step 3: Data validation (basic)
            data_errors, invalid_rows = self.validate_data(df)
            if data_errors:
                validation_summary.append({
                    "file_name": file_name,
                    "field_name": field_name,
                    "status": "error",
                    "message": "; ".join(data_errors),
                    "invalid_rows": invalid_rows,
                })
                continue

            # Step 4: Save validated file
            file_path = os.path.join(UPLOAD_DIR, file_name)
            df.to_csv(file_path, index=False)

            validation_summary.append({
                "file_name": file_name,
                "field_name": field_name,
                "status": "success",
                "message": "Validation passed, file saved.",
                "file_path": file_path,
            })

        return Response({
            "session_id": session_id,
            "results": validation_summary,
        })

    def get_expected_headers(self, field_name: str) -> list:
        expected_headers_map = {
    "rural item price": ["Item Code", "Item Name", "Price", "Month", "Year"],
    "urban item price": ["Item Code", "Item Name", "Price", "Month", "Year"],
    "rural house rent": ["City", "House ID", "Rent Amount", "Month", "Year"],
    "urban house rent": ["City", "House ID", "Rent Amount", "Month", "Year"],

    "rural electricity": ["Meter No", "Units", "Rate", "Month", "Year"],
    "urban electricity": ["Meter No", "Units", "Rate", "Month", "Year"],
    "online shopping": ["Item Code", "Platform", "Price", "Month", "Year"],
    "airfare": ["Flight No", "From", "To", "Fare", "Month"],
    "pds price": ["Commodity", "Region", "Price", "Month", "Year"],
}


        normalized = field_name.strip().lower()
        return expected_headers_map.get(normalized, [])

    def validate_data(self, df):
        # Add your actual validation logic here
        return [], 0


# ------- ----------------------------------------------
# 2️⃣ Background Worker (Insert with Validation)
# -----------------------------------------------------
def validate_before_db_upload(df, table_name):
    """Ensure table + columns exist before insert."""
    if df.empty:
        raise ValueError("No data to upload")

    mapping = COLUMN_MAPPINGS.get(table_name)
    if not mapping:
        raise ValueError(f"No column mapping for table '{table_name}'")

    # ✅ Check DB table existence
    with connections['input_data_db'].cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = %s
            )
        """, [table_name])
        if not cursor.fetchone()[0]:
            raise ValueError(f"Table '{table_name}' does not exist")

        # ✅ Fetch DB columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s
        """, [table_name])
        db_columns = [r[0] for r in cursor.fetchall()]

    invalid_cols = [
        mapping[csv_col] for csv_col in df.columns if mapping[csv_col] not in db_columns
    ]
    if invalid_cols:
        raise ValueError(f"Invalid DB columns: {invalid_cols}")


def _update_file_progress(session_id, file_name, progress, status, message=""):
    cache_data = cache.get(f"progress_{session_id}", {"file_progress": []})
    file_list = cache_data["file_progress"]

    found = False
    for f in file_list:
        if f["file_name"] == file_name:
            f["progress"], f["status"], f["message"] = progress, status, message
            found = True
            break

    if not found:
        file_list.append({
            "file_name": file_name,
            "progress": progress,
            "status": status,
            "message": message,
        })

    cache_data["file_progress"] = file_list
    cache_data["progress"] = int(sum(f["progress"] for f in file_list) / len(file_list))
    cache_data["status"] = "running" if cache_data["progress"] < 100 else "completed"
    cache.set(f"progress_{session_id}", cache_data, timeout=3600)
def upload_worker(session_id, files):
    total_files = len(files)
    completed_files = 0

    for f in files:
       
        file_name = f.get("file_name")
        field_name = f.get("field_name")
        file_path = f.get("file_path")

        table_name = get_table_name(field_name)
        if not table_name:
            _update_file_progress(session_id, file_name, 0, "error", "Unknown upload type")
            continue
        try:
            # 1) read file (csv/excel)
            ext = os.path.splitext(file_path)[1].lower()

            if ext == ".csv":
                df = pd.read_csv(file_path)
            else:
                df = pd.read_excel(file_path)

            # 2) validate before db upload
            validate_before_db_upload(df, table_name)  # will raise exception if invalid
            # 3) save as parquet
            UPLOAD_DIR = os.path.join(settings.MEDIA_ROOT, "validated_inputs")
            os.makedirs(UPLOAD_DIR, exist_ok=True)

           # create table folder inside upload directory
            table_folder = os.path.join(UPLOAD_DIR, table_name)
            os.makedirs(table_folder, exist_ok=True)

            # parquet file name
            parquet_file_name = os.path.basename(file_name).replace(ext, ".parquet")

            # exact parquet path to save
            parquet_path = os.path.join(table_folder, parquet_file_name)

            # save parquet
            df.to_parquet(parquet_path, index=False)

            # re-load parquet
            df = pd.read_parquet(parquet_path)

            # # 4) re-read parquet (optional but recommended)
            # df = pd.read_parquet(parquet_path)


        # try:
        #     df = pd.read_csv(file_path) if file_path.endswith(".csv") else pd.read_excel(file_path)
        #     validate_before_db_upload(df, table_name)
        except Exception as e:
            _update_file_progress(session_id, file_name, 0, "error", str(e))
            continue

        mapping = COLUMN_MAPPINGS[table_name]

        # ✅ Ensure DataFrame columns match mapping keys (case-insensitive)
        df.columns = [c.strip() for c in df.columns]

        # ✅ Convert DataFrame to DB column structure
        try:
            db_columns = [mapping[c] for c in df.columns]
        except KeyError as e:
            _update_file_progress(
                session_id, file_name, 0, "error", f"Unmapped column in CSV: {e}"
            )
            continue

        total_rows = len(df)
        inserted = 0

        try:
            with connections['input_data_db'].cursor() as cursor:
                for _, row in df.iterrows():
                    # Build query dynamically using mappings
                    columns_str = ", ".join([f'"{col}"' for col in db_columns])
                    placeholders = ", ".join(["%s"] * len(db_columns))
                    query = f'INSERT INTO "{table_name}" ({columns_str}) VALUES ({placeholders})'

                    # Use mapped order for values
                    values = [row[csv_col] for csv_col in df.columns]
                    cursor.execute(query, values)

                    inserted += 1
                    progress = int((inserted / total_rows) * 100)
                    print(progress, "PROGRESS")
                    test=_update_file_progress(session_id, file_name, progress, "running")
                    print(test, "TEST UPDATE")

                    # Optional delay for UI smoothness
                    time.sleep(5)

            completed_files += 1
            _update_file_progress(session_id, file_name, 100, "completed")

        except Exception as e:
            _update_file_progress(session_id, file_name, 0, "error", f"Insert failed: {e}")
            continue

    # finalize
    cache_data = cache.get(f"progress_{session_id}", {})
    if cache_data:
        
        cache_data["status"] = "completed"
        cache_data["progress"] = 100
        cache.set(f"progress_{session_id}", cache_data, timeout=3600)

# -----------------------------------------------------
# 3️⃣ UploadToDBView — Start Background Upload
# -----------------------------------------------------
class UploadToDBView(APIView):
    def post(self, request):
        files = request.data.get("files", [])
        session_id = request.data.get("session_id", str(uuid4()))

        if not files:
            return Response({"status": "error", "message": "No files provided."}, status=400)

        cache.set(
            f"progress_{session_id}",
            {
                "status": "running",
                "progress": 0,
                "file_progress": [
                    {"file_name": f["file_name"], "progress": 0, "status": "pending", "message": ""}
                    for f in files
                ],
            },
            timeout=3600,
        )

        threading.Thread(target=upload_worker, args=(session_id, files), daemon=True).start()

        return Response({
            "status": "started",
            "session_id": session_id,
            "message": "Database upload started.",
        })


# -----------------------------------------------------
# 4️⃣ UploadProgressView — Check Progress
# -----------------------------------------------------
class UploadProgressView(APIView):
    def get(self, request, session_id):
        data = cache.get(f"progress_{session_id}")
        if not data:
            return Response({"status": "error", "message": "Invalid session or expired."}, status=404)
        return Response(data)
