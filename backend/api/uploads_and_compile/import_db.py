import os
import json
from django.db import connection
import psycopg2
import pandas as pd
from io import StringIO
from pathlib import Path
import logging
import gc
from django.utils import timezone



logger = logging.getLogger(__name__)

# -------------------------
# DB CONFIG
# -------------------------
DB_CONFIG = {
    "host": "10.254.167.14",
    "port": 5432,
    "user": "postgres",
    "password": "psd123",
    "database": "comp_db_final_21_apr",
}

VALIDATED_DIR = Path("data/input/validated")
COMPILED_DIR = Path("data/output")

# -------------------------
# CONTEXT (IMPORTANT FIX)
# -------------------------
# class ImportContext:
#     def __init__(self, price_month, price_year, index_month, index_year):
#         self.price_month = price_month
#         self.price_year = price_year
#         self.index_month = index_month
#         self.index_year = index_year

class ImportContext:
    def __init__(self, price_month, price_year, index_month, index_year, compile_type):
        self.price_month = price_month
        self.price_year = price_year
        self.index_month = index_month
        self.index_year = index_year
        self.compile_type = compile_type
        
        
class ImportState:
    def __init__(self):
        self.current_table = ""

        self.total_tables = 0
        self.completed_tables = 0

        self.imported_tables = []
        self.failed_tables = []

        self.total_records = 0
        self.imported_records = 0

        self.validated = {
            "total": 0,
            "completed": 0,
            "current": "",
            "imported": [],
            "failed": []
        }

        self.output = {
            "total": 0,
            "completed": 0,
            "current": "",
            "imported": [],
            "failed": []
        }


# -------------------------
# TABLE CONFIG
# -------------------------
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


# -------------------------
# HELPERS
# -------------------------
def normalize_columns(df):
    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()
    return df


def fill_sector_id(df, table_name):
    df = df.copy()
    if "sector_id" not in df.columns:
        df["sector_id"] = None

    if "rural" in table_name:
        df["sector_id"] = df["sector_id"].fillna(1)
    elif "urban" in table_name:
        df["sector_id"] = df["sector_id"].fillna(2)

    return df


def get_table_config(filename, config_list):
    filename = filename.lower().replace(".parquet", "")
    for table_name, _, month_col, year_col in config_list:
        if table_name == filename:
            return table_name, month_col, year_col
    return None, None, None


def get_table_columns(conn, schema, table):
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema=%s AND table_name=%s
        ORDER BY ordinal_position
    """, (schema, table))
    cols = [r[0] for r in cur.fetchall()]
    cur.close()
    return cols


def align_dataframe(df, table_columns):
    df = df.copy()

    # ensure clean structure (fix NumpyBlock issue)
    df = pd.DataFrame(df)

    # keep only valid columns safely
    df = df.reindex(columns=[c for c in table_columns if c in df.columns])

    # add missing columns
    for col in table_columns:
        if col not in df.columns:
            df[col] = None

    # enforce strict column order
    df = df.reindex(columns=table_columns)

    return df


def basic_clean(df):
    df = df.copy()
    df = df.replace({pd.NA: None, "None": None, "nan": None})
    return df


# -------------------------
# SAFE DELETE (FIXED)
# -------------------------
# def delete_all_tables(schema, config_list, month, year):
#     conn = psycopg2.connect(**DB_CONFIG)
#     cur = conn.cursor()

#     for table_name, _, month_col, year_col in config_list:
#         try:
#             cur.execute(
#                 f"DELETE FROM {schema}.{table_name} "
#                 f"WHERE {month_col}=%s AND {year_col}=%s",
#                 (month, year),
#             )
#             print(f"🗑️ Deleted {schema}.{table_name}")

#         except Exception as e:
#             print(f"❌ Delete failed {table_name}: {e}")

#     conn.commit()
#     cur.close()
#     conn.close()


def delete_all_tables(schema, config_list, month, year, compile_type):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    status_value = "F" if compile_type.upper() == "FINAL" else "P"

    for table_name, _, month_col, year_col in config_list:
        try:
            cur.execute(
                f"""
                DELETE FROM {schema}.{table_name}
                WHERE {month_col}=%s
                AND {year_col}=%s
                AND price_data_status=%s
                """,
                (month, year, status_value),
            )
            print(f"🗑️ Deleted {schema}.{table_name} ({status_value})")

        except Exception as e:
            print(f"❌ Delete failed {table_name}: {e}")

    conn.commit()
    cur.close()
    conn.close()


# -------------------------
# COPY (FAST BULK INSERT)
# -------------------------
def copy_data(conn, schema, df, table_name, columns):
    if df.empty:
        return

    df = df.copy()
    df.columns = list(df.columns)  # force clean index mapping

    # remove auto columns safely
    drop_cols = ["id", "created_at", "updated_at", "is_active"]
    df = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")

    buffer = StringIO()
    df.to_csv(buffer, index=False, header=False, na_rep="\\N")
    buffer.seek(0)

    cur = conn.cursor()
    try:
        cur.copy_expert(
            f"COPY {schema}.{table_name} ({','.join(columns)}) "
            "FROM STDIN WITH CSV NULL '\\N'",
            buffer
        )
        conn.commit()
        print(f"✅ {table_name}: {len(df)} rows inserted")

    except Exception as e:
        conn.rollback()
        print(f"❌ COPY failed {table_name}: {e}")

    cur.close()

# -------------------------
# PROCESS FILE (FIXED CONTEXT)
# -------------------------
import gc
import pandas as pd
import pyarrow.parquet as pq

def execute_update(sql, params=None):
    """Execute SQL update and return row count"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.rowcount


def sync_progress(import_task_id, state, status="IN_PROGRESS", message=""):
    progress = int((state.completed_tables / max(state.total_tables, 1)) * 100)

    execute_update("""
        UPDATE database_import_tasks
        SET status=%s,
            progress=%s,
            imported_tables=%s,
            failed_tables=%s,
            total_records=%s,
            imported_records=%s,
            progress_message=%s,
            updated_at=%s
        WHERE task_id=%s
    """, [
        status,
        progress,
        json.dumps(state.imported_tables),
        json.dumps(state.failed_tables),
        state.total_records,
        state.imported_records,
        message,
        timezone.now(),
        import_task_id
    ])


def process_file(filepath, config_list, schema, ctx, state, import_task_id):
    import gc
    import pyarrow.parquet as pq
    import psycopg2
    import pandas as pd
    from io import StringIO

    filename = os.path.basename(filepath)

    table_name, month_col, year_col = get_table_config(filename, config_list)
    if not table_name:
        return None

    state.current_table = table_name

    try:
        gc.collect()

        table = pq.read_table(filepath)
        df = table.to_pandas(split_blocks=True, self_destruct=True)

        if df.empty:
            return None

        df.columns = [c.lower().strip() for c in df.columns]

        # month/year
        if "index" in table_name or "idx" in table_name:
            df[month_col] = ctx.index_month
            df[year_col] = ctx.index_year
            state.output["current"] = table_name
        else:
            df[month_col] = ctx.price_month
            df[year_col] = ctx.price_year
            state.validated["current"] = table_name

        df["price_data_status"] = "F" if ctx.compile_type.upper() == "FINAL" else "P"

        df = df.astype(object).where(pd.notnull(df), None)

        conn = psycopg2.connect(**DB_CONFIG)
        table_columns = get_table_columns(conn, schema, table_name)

        auto_cols = ["id", "created_at", "updated_at", "is_active"]
        table_columns = [c for c in table_columns if c not in auto_cols]

        df = df[[c for c in table_columns if c in df.columns]].copy()

        for c in table_columns:
            if c not in df.columns:
                df[c] = None

        df = df[table_columns]

        # COPY
        buffer = StringIO()
        df.to_csv(buffer, index=False, header=False, na_rep="\\N")
        buffer.seek(0)

        cur = conn.cursor()
        cur.copy_expert(
            f"COPY {schema}.{table_name} ({','.join(table_columns)}) FROM STDIN WITH CSV NULL '\\N'",
            buffer
        )

        conn.commit()
        cur.close()
        conn.close()

        # SUCCESS UPDATE
        state.completed_tables += 1
        state.imported_tables.append(table_name)
        state.imported_records += len(df)

        if "idx" in table_name or "index" in table_name:
            state.output["imported"].append(table_name)
            state.output["completed"] += 1
        else:
            state.validated["imported"].append(table_name)
            state.validated["completed"] += 1

        sync_progress(import_task_id, state, "IN_PROGRESS", f"Processed {table_name}")

        return table_name

    except Exception as e:
        state.failed_tables.append(table_name)

        if "idx" in table_name or "index" in table_name:
            state.output["failed"].append(table_name)
        else:
            state.validated["failed"].append(table_name)

        sync_progress(import_task_id, state, "IN_PROGRESS", f"Failed {table_name}")

        return None
# -------------------------
# PROCESS DIRECTORY
# -------------------------
def process_directory(directory, config_list, schema, ctx, state, import_task_id):
    files = [f for f in os.listdir(directory) if f.endswith(".parquet")]

    state.total_tables += len(files)

    for f in files:
        process_file(
            os.path.join(directory, f),
            config_list,
            schema,
            ctx,
            state,
            import_task_id
        )


# -------------------------
# MAIN ENTRY
# -------------------------
# def run_import(month, year):
#     ctx = ImportContext(month, year, month, year)
def run_import(month, year, compile_type):
    ctx = ImportContext(month, year, month, year, compile_type)

    print("🔥 CLEAN VALIDATED")
    delete_all_tables("prices", TABLE_CONFIGS["validated"], month, year)

    print("🔥 IMPORT VALIDATED")
    process_directory(VALIDATED_DIR, TABLE_CONFIGS["validated"], "prices", ctx)

    print("🔥 CLEAN OUTPUT")
    delete_all_tables("price_idx", TABLE_CONFIGS["output"], month, year)

    print("🔥 IMPORT OUTPUT")
    process_directory(COMPILED_DIR, TABLE_CONFIGS["output"], "price_idx", ctx)