import asyncio
import asyncpg
import pandas as pd
import io
from pathlib import Path
from datetime import datetime
from django.db import connection
import logging

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
],
   "output" : [
    ('hr_category_index', ['house', 'rent', 'category'], 'index_month', 'index_year'),
    ('hr_ownership_index', ['house', 'rent', 'ownership'], 'index_month', 'index_year'),
    
    ('elect_dslab_price_index', ['electricity', 'dslab', 'index'], 'index_month', 'index_year'),
    
    ('pds_pidx', ['pds', 'index'], 'index_month', 'index_year'),
    
    ('telecom_operator_pidx', ['telecom', 'operator', 'index'], 'index_month', 'index_year'),
    
    ('railfare_pidx', ['rail', 'fare', 'index'], 'index_month', 'index_year'),
    
    ('elementary_idx', ['market', 'elementary', 'index'], 'index_month', 'index_year'),
    
    ('all_idx', ['all', 'india', 'index'], 'index_month', 'index_year'),
]
}


# -------------------------
# HELPERS
# -------------------------

def get_matching_files(table_type, keywords):
    folder = VALIDATED_DIR if table_type == "validated" else COMPILED_DIR
    return [f for f in folder.glob("*.parquet") if any(k in f.name.lower() for k in keywords)]

def clean_column_names(df):
    df.columns = [c.strip().lower().replace(' ', '_').replace('-', '_') for c in df.columns]
    return df

async def get_table_columns(conn, table_name):
    rows = await conn.fetch(
        "SELECT column_name FROM information_schema.columns WHERE table_name=$1",
        table_name.lower()
    )
    return [r['column_name'] for r in rows]

# -------------------------
# DELETE EXISTING DATA
# -------------------------

async def delete_existing_data(conn, table_name, month_col, year_col, month, year, import_mode):
    if import_mode != "replace":
        return

    if not (month and year):
        raise ValueError("Month and Year required for replace mode")

    await conn.execute(
        f"DELETE FROM {table_name} WHERE {month_col}=$1 AND {year_col}=$2",
        month, year
    )

    logger.info(f"🧹 Deleted old data from {table_name} for {month}-{year}")

# -------------------------
# INSERT (COPY)
# -------------------------

async def insert_batch(conn, table_name, df, allowed_cols,
                       month_col=None, year_col=None,
                       month=None, year=None, task_id=None):

    if df.empty:
        return 0

    df = clean_column_names(df)

    if month_col:
        df[month_col] = month
    if year_col:
        df[year_col] = year

    now = datetime.now()

    for col in ['created_at', 'updated_at', 'created_by', 'updated_by']:
        if col not in df.columns:
            df[col] = now if 'at' in col else DEFAULT_USER

    allowed_cols = [c for c in allowed_cols if c in df.columns] + \
                   ['created_at', 'updated_at', 'created_by', 'updated_by']

    df = df[allowed_cols]

    total = 0

    for start in range(0, len(df), CHUNK_SIZE):
        chunk = df.iloc[start:start + CHUNK_SIZE]

        buffer = io.StringIO()
        chunk.to_csv(buffer, index=False, header=False)
        buffer.seek(0)

        await conn.copy_to_table(
            table_name,
            source=buffer,
            columns=chunk.columns
        )

        inserted = len(chunk)
        total += inserted

        if task_id:
            await conn.execute("""
                UPDATE database_import_tasks
                SET imported_records = COALESCE(imported_records,0) + $1
                WHERE task_id = $2
            """, inserted, task_id)

    return total

# -------------------------
# PROCESS FILE
# -------------------------

async def process_file(conn, file, table_name, cols,
                       month_col, year_col, month, year, task_id):

    loop = asyncio.get_running_loop()
    df = await loop.run_in_executor(None, pd.read_parquet, file)

    return await insert_batch(
        conn, table_name, df, cols,
        month_col, year_col, month, year, task_id
    )

# -------------------------
# PROCESS TABLE (FIXED)
# -------------------------

async def process_table(pool, table_tuple, table_type, month, year, task_id, import_mode):
    async with SEMAPHORE:
        table_name, keywords, month_col, year_col = table_tuple

        try:
            files = get_matching_files(table_type, keywords)
            if not files:
                return

            # ✅ Get columns + delete (single connection)
            async with pool.acquire() as conn:
                cols = await get_table_columns(conn, table_name)

                await delete_existing_data(
                    conn,
                    table_name,
                    month_col,
                    year_col,
                    month,
                    year,
                    import_mode
                )

            # ✅ Parallel file processing (separate connections)
            async def process_with_conn(file):
                async with pool.acquire() as conn:
                    return await process_file(
                        conn,
                        file,
                        table_name,
                        cols,
                        month_col,
                        year_col,
                        month,
                        year,
                        task_id
                    )

            await asyncio.gather(*[
                process_with_conn(f) for f in files
            ])

        except Exception as e:
            logger.error(f"{table_name} failed: {str(e)}", exc_info=True)

# -------------------------
# MAIN RUNNER
# -------------------------

async def InsertAllFilesIntoDB(month=None, year=None, task_id=None, import_mode="append"):
    pool = await asyncpg.create_pool(
        **DB_CONFIG,
        min_size=POOL_MIN,
        max_size=POOL_MAX
    )

    try:
        async with pool.acquire() as conn:
            await conn.execute("SET synchronous_commit TO OFF;")

        tasks = []

        for t in TABLE_CONFIGS['validated']:
            tasks.append(
                process_table(pool, t, "validated", month, year, task_id, import_mode)
            )

        for t in TABLE_CONFIGS['output']:
            tasks.append(
                process_table(pool, t, "output", month, year, task_id, import_mode)
            )

        await asyncio.gather(*tasks)

        async with pool.acquire() as conn:
            await conn.execute("""
                UPDATE database_import_tasks
                SET status='COMPLETED',
                    progress=100,
                    completed_at=NOW()
                WHERE task_id=$1
            """, task_id)

    finally:
        await pool.close()

# -------------------------
# DJANGO WRAPPER
# -------------------------

def run_insert_all_files(import_task_id, month, year, import_mode):
    try:
        asyncio.run(
            InsertAllFilesIntoDB(
                month=month,
                year=year,
                task_id=import_task_id,
                import_mode=import_mode
            )
        )
    except Exception as e:
        logger.error(f"Import failed: {str(e)}", exc_info=True)

        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE database_import_tasks
                SET status='FAILED',
                    error_message=%s,
                    completed_at=NOW()
                WHERE task_id=%s
            """, [str(e), import_task_id])