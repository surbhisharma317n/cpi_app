import pandas as pd
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import math
from sqlalchemy import create_engine
import numpy as np
import os

from api.utils.comprasion_sheet import add_column_if_not_exists, calculate_inflation, json_serializable
from api.utils.time_formet import get_previous_month, get_previous_year

db_user = os.getenv('DB_USER', 'postgres')
db_password = os.getenv('DB_PASSWORD', 'amit')
db_host = os.getenv('DB_HOST', 'localhost')
db_port = os.getenv('DB_PORT', '5432')
db_name = os.getenv('DB_DEFAULT_NAME', 'base_revision')

engine = create_engine(f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}")

@api_view(["GET"])
def index_comp(request):
    try:
        month_year = request.query_params.get('month_year')
        if not month_year:
            return Response({"error": "Missing month_year parameter."}, status=status.HTTP_400_BAD_REQUEST)

        prev_month = get_previous_month(month_year)
        prev_year = get_previous_year(month_year)

        fixed_columns = ['c_code', 'st_code', 'item_code', 'item_desc', 'weight']
        price_column = f"itemprice_{month_year.replace('-', '_').lower()}"
        month_inflation = f"month_inflation_{month_year.replace('-', '_').lower()}"
        year_inflation = f"year_inflation_{month_year.replace('-', '_').lower()}"
        prev_month_col = f"itemprice_{prev_month.replace('-', '_').lower()}"
        prev_year_col = f"itemprice_{prev_year.replace('-', '_').lower()}"

        # Add price column always
        add_column_if_not_exists("index_compression", price_column)

        # Read current month data
        curr_month = pd.read_sql(
            f"SELECT {', '.join(fixed_columns)}, index_value FROM weighted_index_output WHERE month_year = %s",
            connection,
            params=[month_year]
        )

        if curr_month.empty:
            return Response({"message": "No current month data found."}, status=status.HTTP_404_NOT_FOUND)

        insert_data = curr_month.copy()
        insert_data[price_column] = insert_data["index_value"]

        # Read existing compression table
        existing = pd.read_sql("SELECT * FROM index_compression", connection)

        if not existing.empty and prev_month_col in existing.columns:
            merge_cols = ['c_code', 'st_code', 'item_code']
            all_data = insert_data[merge_cols + [price_column]].merge(
                existing[merge_cols + [prev_month_col]], on=merge_cols, how="left"
            )

            # Monthly inflation
            all_data[month_inflation] = all_data.apply(
                lambda row: calculate_inflation(row[price_column], row[prev_month_col]), axis=1
            )
            has_month_inflation = all_data[month_inflation].notnull().any()

            # Yearly inflation (if prev year col exists)
            has_year_inflation = False
            if prev_year_col in existing.columns:
                all_data = all_data.merge(
                    existing[merge_cols + [prev_year_col]], on=merge_cols, how="left"
                )
                all_data[year_inflation] = all_data.apply(
                    lambda row: calculate_inflation(row[price_column], row[prev_year_col])
                    if pd.notnull(row[prev_year_col]) else None,
                    axis=1
                )
                has_year_inflation = all_data[year_inflation].notnull().any()

            # Add columns only if needed
            if has_month_inflation:
                add_column_if_not_exists("index_compression", month_inflation)
            if has_year_inflation:
                add_column_if_not_exists("index_compression", year_inflation)

            # Write to temp table for bulk update
            temp_table = "temp_index_update"
            update_cols = [price_column]
            if has_month_inflation:
                update_cols.append(month_inflation)
            if has_year_inflation:
                update_cols.append(year_inflation)

            all_data = all_data[merge_cols + update_cols]
            all_data.to_sql(temp_table, engine, if_exists="replace", index=False)

            # Construct dynamic SET clause
            set_clause = ', '.join([f'"{col}" = tmp."{col}"' for col in update_cols])

            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE index_compression AS ic SET
                        {set_clause}
                    FROM {temp_table} AS tmp
                    WHERE ic.c_code = tmp.c_code
                      AND ic.st_code = tmp.st_code
                      AND ic.item_code = tmp.item_code
                """)
                cursor.execute(f"DROP TABLE IF EXISTS {temp_table}")

            # Insert new rows
            new_rows = insert_data.merge(existing, on=merge_cols, how='left', indicator=True)
            new_rows = new_rows[new_rows['_merge'] == 'left_only'].drop(columns=['_merge'])
            if not new_rows.empty:
                new_rows = new_rows[fixed_columns + [price_column]]
                new_rows.to_sql("index_compression", engine, if_exists="append", index=False)

        else:
            # First time insert
            insert_data = insert_data[fixed_columns + [price_column]]
            insert_data.to_sql("index_compression", engine, if_exists="append", index=False)
        
        return Response({
            "message": "Data processed successfully",
            "month_year": month_year,
            "price_column": price_column
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
def get_compression_index(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM index_compression")
            columns = [col[0] for col in cursor.description]  # Get column names
            rows = cursor.fetchall()

        if not rows:
            return Response({"message": "No data found for the specified month."}, status=status.HTTP_404_NOT_FOUND)

        # Map columns to each row
        data = [dict(zip(columns, row)) for row in rows]

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)