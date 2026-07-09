import asyncio
import asyncpg
import pandas as pd
import io
from pathlib import Path
from datetime import datetime
from django.db import connection
import logging

import os
import psycopg2
import pandas as pd
from io import StringIO
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import uuid


logger = logging.getLogger(__name__)

# -------------------------
# CONFIG
# -------------------------

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "user": "postgres",
    "password": "1234",
    "database": "comp_db_final_21_apr",
}

VALIDATED_DIR = Path("data/input/validated")
COMPILED_DIR = Path("data/output")

CHUNK_SIZE = 200_000
SEMAPHORE = asyncio.Semaphore(6)   # ✅ safer concurrency
POOL_MIN = 3
POOL_MAX = 10

DEFAULT_USER = "system"

# -------------------------
# TABLE CONFIG
# -------------------------
PRICE_MONTH = 3
PRICE_YEAR = 2026
INDEX_MONTH = 3
INDEX_YEAR = 2026


TABLE_CONFIGS = {
    "validated": [
        ('rural_elect_prices', [], 'price_month', 'price_year'),
        ('urban_elect_prices', [], 'price_month', 'price_year'),
        ('rural_hr_prices', [], 'price_month', 'price_year'),
        ('urban_hr_prices', [], 'price_month', 'price_year'),
        ('pds_prices', [], 'price_month', 'price_year'),
        ('ott_prices', [], 'price_month', 'price_year'),
        ('postal_prices', [], 'price_month', 'price_year'),
        ('petrol_prices', [], 'price_month', 'price_year'),
        ('diesel_prices', [], 'price_month', 'price_year'),
        ('lpg_prices', [], 'price_month', 'price_year'),
        ('cng_prices', [], 'price_month', 'price_year'),
        ('png_prices', [], 'price_month', 'price_year'),
        ('telecom_prices', [], 'price_month', 'price_year'),
        ('rural_mkt_prices', [], 'price_month', 'price_year'),
        ('urban_mkt_prices', [], 'price_month', 'price_year'),
        ('urban_airfare_prices', [], 'price_month', 'price_year'),
        ('urban_mkt_online_prices', [], 'price_month', 'price_year'),
        ('railfare_prices', [], 'price_month', 'price_year'),
        ('metro_prices', [], 'price_month', 'price_year'),
    ],
    "output": [
        ('hr_category_index', [], 'index_month', 'index_year'),
        ('hr_ownership_index', [], 'index_month', 'index_year'),
        ('elect_dslab_price_index', [], 'index_month', 'index_year'),
        ('pds_pidx', [], 'index_month', 'index_year'),
        ('telecom_operator_pidx', [], 'index_month', 'index_year'),
        ('railfare_pidx', [], 'index_month', 'index_year'),
        ('elementary_idx', [], 'index_month', 'index_year'),
        ('all_idx', [], 'index_month', 'index_year'),
    ]
}


# -------------------------------
# 🔍 Detect table
# -------------------------------
# ---------------- DETECT TABLE ----------------
# ---------------- TABLE DETECTION ----------------
# ---------------- TABLE MATCH ----------------
# ---------------- NORMALIZE ----------------
# ---------------- NORMALIZE ----------------
def normalize_columns(df):
    df.columns = df.columns.str.strip().str.lower()
    return df


# ---------------- FILL SECTOR ID ----------------
def fill_sector_id(df, table_name):
    if "sector_id" not in df.columns:
        df["sector_id"] = None

    if "rural" in table_name:
        df["sector_id"] = df["sector_id"].fillna(1)
    elif "urban" in table_name:
        df["sector_id"] = df["sector_id"].fillna(2)

    return df


# # ---------------- GET TABLE CONFIG ----------------
# def get_table_config(filename, config_list):
#     filename = filename.lower().replace(".parquet", "")

#     for table_name, keywords, month_col, year_col in config_list:
#         if table_name in filename:
#             return table_name, month_col, year_col

#         if any(k in filename for k in keywords):
#             return table_name, month_col, year_col

#     return None, None, None


def get_table_config(filename, config_list):
    filename = filename.lower().replace(".parquet", "")

    for table_name, _, month_col, year_col in config_list:
        if table_name == filename:
            return table_name, month_col, year_col

    return None, None, None


# ---------------- GET DB COLUMNS ----------------
def get_table_columns(conn, schema, table):
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        ORDER BY ordinal_position
    """, (schema, table))
    cols = [row[0] for row in cur.fetchall()]
    cur.close()
    return cols


# ---------------- ALIGN DATAFRAME ----------------
def align_dataframe(df, table_columns):
    df = df[[col for col in df.columns if col in table_columns]]

    for col in table_columns:
        if col not in df.columns:
            df[col] = None

    # 🔥 critical fix (column order)
    df = df.reindex(columns=table_columns)

    return df


# ---------------- CLEAN ----------------
def basic_clean(df):
    df = df.replace({pd.NA: None, "None": None, "nan": None})

    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].replace({"True": True, "False": False})

    return df


# ---------------- DELETE ONCE (NO DEADLOCK) ----------------
def delete_all_tables(schema, config_list):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    for table_name, _, month_col, year_col in config_list:
        try:
            if "index" in table_name or "idx" in table_name:
                month, year = INDEX_MONTH, INDEX_YEAR
            else:
                month, year = PRICE_MONTH, PRICE_YEAR

            cur.execute(
                f"DELETE FROM {schema}.{table_name} WHERE {month_col}=%s AND {year_col}=%s",
                (month, year),
            )

            print(f"🗑️ Deleted {schema}.{table_name}")

        except Exception as e:
            print(f"❌ Delete failed ({schema}.{table_name}): {e}")

    conn.commit()
    cur.close()
    conn.close()


# ---------------- COPY INSERT ----------------
def copy_data(conn, schema, df, table_name, columns):
    if df.empty:
        print(f"⚠️ No data for {schema}.{table_name}")
        return

    # remove auto/default columns
    for col in ["id", "created_at", "updated_at", "is_active"]:
        if col in df.columns:
            df = df.drop(columns=[col])

    buffer = StringIO()
    df.to_csv(buffer, index=False, header=False, na_rep="\\N")
    buffer.seek(0)

    cur = conn.cursor()

    try:
        cur.copy_expert(
            f"COPY {schema}.{table_name} ({','.join(columns)}) FROM STDIN WITH CSV NULL '\\N'",
            buffer
        )
        conn.commit()
        print(f"✅ Inserted {len(df)} rows into {schema}.{table_name}")
    except Exception as e:
        conn.rollback()
        print(f"❌ COPY failed ({schema}.{table_name}): {e}")

    cur.close()


# ---------------- PROCESS FILE ----------------
def process_file(filepath, config_list, schema):
    filename = os.path.basename(filepath)

    table_name, month_col, year_col = get_table_config(filename, config_list)

    if not table_name:
        print(f"⚠️ No match: {filename}")
        return

    print(f"📂 Processing {filename} → {schema}.{table_name}")

    try:
        df = pd.read_parquet(filepath)

        if df.empty:
            return

        # normalize + fix
        df = normalize_columns(df)
        df = fill_sector_id(df, table_name)

        # set month/year
        if "index" in table_name or "idx" in table_name:
            df[month_col] = INDEX_MONTH
            df[year_col] = INDEX_YEAR
        else:
            df[month_col] = PRICE_MONTH
            df[year_col] = PRICE_YEAR

        conn = psycopg2.connect(**DB_CONFIG)

        table_columns = get_table_columns(conn, schema, table_name)

        # remove auto columns
        AUTO_COLUMNS = ["id", "created_at", "updated_at", "is_active"]
        table_columns = [col for col in table_columns if col not in AUTO_COLUMNS]

        df = align_dataframe(df, table_columns)
        df = basic_clean(df)

        # ❌ NO DELETE HERE (important)
        copy_data(conn, schema, df, table_name, table_columns)

        conn.close()

    except Exception as e:
        print(f"❌ Error processing {filename}: {e}")


# ---------------- PROCESS DIRECTORY ----------------
def process_directory(directory, config_list, schema):
    files = [
        os.path.join(directory, f)
        for f in os.listdir(directory)
        if f.endswith(".parquet")
    ]

    print(f"🚀 Found {len(files)} files in {directory}")

    with ThreadPoolExecutor(max_workers=4) as executor:
        for file in files:
            executor.submit(process_file, file, config_list, schema)
            




# # ---------------- MAIN ----------------
# if __name__ == "__main__":
#     print("🔥 CLEANING VALIDATED TABLES")
#     delete_all_tables("prices", TABLE_CONFIGS["validated"])

#     print("🔥 VALIDATED → prices")
#     process_directory(VALIDATED_DIR, TABLE_CONFIGS["validated"], "prices")

#     print("🔥 CLEANING OUTPUT TABLES")
#     delete_all_tables("price_idx", TABLE_CONFIGS["output"])

#     print("🔥 OUTPUT → price_idx")
#     process_directory(COMPILED_DIR, TABLE_CONFIGS["output"], "price_idx")