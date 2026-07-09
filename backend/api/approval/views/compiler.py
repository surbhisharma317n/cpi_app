from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import connection, transaction
import logging
import pandas as pd
import psycopg2.extras

import hashlib




def generate_iteration(month, year, compile_type):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) + 1
            FROM compilation_table
            WHERE month = %s AND year = %s AND compile_type = %s;
            """,
            [month, year, compile_type],
        )
        count = cursor.fetchone()[0]

    return f"v{count}"

class CompileSuccessAPIView(APIView):
    """
    Compiler submits compiled data
    """

    @transaction.atomic
    def post(self, request):
        data = request.data

        with connection.cursor() as cursor:
            # 1. Insert compilation
            cursor.execute("""
                INSERT INTO compilation_table (
                    compiler_id,
                    compiler_name,
                    compiled_by,
                    month,
                    year,
                    compile_type,

                    status
                )
                VALUES (%s,%s,%s,%s,%s,%s,'SUCCESS')
                RETURNING id
            """, [
                data['compiler_id'],
                data['compiler_name'],
                data['compiled_by'],
                data['month'],
                data['year'],
                data['compile_type'],

            ])

            compilation_id = cursor.fetchone()[0]

            # 2. Insert approver request snapshot
            cursor.execute("""
                INSERT INTO approver_request_table (
                    compilation_id,
                    compiler_name,
                    compiled_by,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    filter_snapshot,
                    compiled_data_snapshot
                )
                SELECT
                    id,
                    compiler_name,
                    compiled_by,
                    compiled_at,
                    month,
                    year,
                    compile_type,
                    %s::jsonb,
                    compiled_data
                FROM compilation_table
                WHERE id = %s
            """, [
                data['filters'],
                compilation_id
            ])

        return Response({
            "message": "Compilation submitted for approval",
            "compilation_id": compilation_id
        })


from django.db import connection, transaction
import json

@transaction.atomic
def insert_compilation_raw(payload):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO compilation_table (
                compiler_id,
                compiler_name,
                compiled_by,
                month,
                year,
                compile_type,
                iteration,
                compiled_data,
                status,
                compiled_at,
                created_at,
                updated_at
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s,
                %s::jsonb, %s,
                NOW(), NOW(), NOW()
            )
            RETURNING id;
            """,
            [
                payload["compiler_id"],
                payload["compiler_name"],
                payload["compiled_by"],
                payload["month"],
                payload["year"],
                payload["compile_type"],
                payload["iteration"],
                json.dumps(payload["compiled_data"]),  # JSONB safe
                payload["status"],
            ],
        )

        compilation_id = cursor.fetchone()[0]

    return compilation_id


logger = logging.getLogger(__name__)



def normalize_dataframe_for_json(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convert non-JSON-serializable values into safe formats
    """

    # Convert datetime / timestamp columns to ISO strings
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime("%Y-%m-%d %H:%M:%S")

    # Replace NaN / NaT with None
    df = df.where(pd.notnull(df), None)

    return df


def save_parquet_and_compilation(
    df,
    parquet_path,
    payload
):
    logger.info(
        "Compilation started | compiler_id=%s | month=%s | year=%s | iteration=%s",
        payload.get("compiler_id"),
        payload.get("month"),
        payload.get("year"),
        payload.get("iteration"),
    )

    # -------------------------------------------------
    # 1️⃣ SAVE PARQUET (OPTIONAL)
    # -------------------------------------------------
    try:
        # df.to_parquet(parquet_path, index=False)
        logger.info("Parquet save skipped | path=%s", parquet_path)
    except Exception:
        logger.exception("Parquet save failed | path=%s", parquet_path)
        raise

    # -------------------------------------------------
    # 2️⃣ NORMALIZE DATAFRAME
    # -------------------------------------------------
    df = normalize_dataframe_for_json(df)

    json_data = df.to_dict(orient="records")
    row_count = len(df)

    row_count = len(df)
    column_list = list(df.columns)

    json_data = json.dumps(
                df.to_dict(orient="records"),
                default=str
            )

    data_hash = hashlib.sha256(json_data.encode("utf-8")).hexdigest()

    # -------------------------------------------------
    # 3️⃣ SAVE METADATA + DATA (ATOMIC)
    # -------------------------------------------------
    try:
        with transaction.atomic(), connection.cursor() as cursor:

            # ---- Insert metadata
            cursor.execute(
                """
                INSERT INTO compilation_table (
                    compiler_id,
                    compiler_name,
                    compiled_by,
                    month,
                    year,
                    compile_type,
                    iteration,
                    status,
                    compiled_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s,%s,%s,%s,%s,%s,%s,%s,
                    NOW(), NOW(), NOW()
                )
                RETURNING id;
                """,
                [
                    payload["compiler_id"],
                    payload["compiler_name"],
                    payload["compiled_by"],
                    payload["month"],
                    payload["year"],
                    payload["compile_type"],
                    payload["iteration"],
                    payload["status"],
                ]
            )

            compilation_id = cursor.fetchone()[0]

            logger.info(
                "Compilation metadata saved | compilation_id=%s",
                compilation_id,
            )

            # ---- Insert compiled data (SAFE JSON)


            cursor.execute(
                """
                INSERT INTO compiled_data_table (
                    compilation_id,
                    iteration,
                    data,
                    row_count,
                    column_list,
                    data_hash,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (
                    %s, %s, %s::jsonb, %s, %s, %s, %s, NOW(), NOW()
                );
                """,
                [
                    compilation_id,
                    payload["iteration"],
                    json_data,
                    row_count,
                    column_list,
                    data_hash,
                    "DRAFT",
                ]
            )


    except Exception:
        logger.exception(
            "Compilation transaction failed | compiler_id=%s | iteration=%s",
            payload.get("compiler_id"),
            payload.get("iteration"),
        )
        raise

    logger.info(
        "Compilation completed successfully | compilation_id=%s",
        compilation_id,
    )

    return compilation_id



