from io import BytesIO
import json
import os
from django.http import HttpResponse
import pandas as pd
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.utils import convert_json

# from ..upload_input_data.master_data_paths import all_idx_combined_pds_db
import duckdb

# BASE PARQUET DIRECTORY
# PARQUET_BASE_PATH = "/data/price_index_parquet/"
# PARQUET_BASE_PATH = all_idx_combined_pds_db  # Adjusted for your environment
PARQUET_BASE_PATH = os.path.join("data", "comp_db", "release_output")
PARQUET_MAPPING_ITEM_BASE_PATH  =os.path.join("data", "comp_db_final", "mapping")


# def fetch_parquet_data(final_tab, month, year, iteration):

#     file_path = os.path.join(PARQUET_BASE_PATH, f"{final_tab}.parquet")
#     print("file_path:===================", file_path)

#     if not os.path.exists(file_path):
#         raise FileNotFoundError(f"Parquet file not found: {file_path}")

#     df = pd.read_parquet(file_path)
#     print("Initial DataFrame shape:", df.shape)
    
#     # df.columns = df.columns.str.lower()
#     print("Columns in DataFrame:", df.columns.tolist(),'====================',df.columns)
    
#     # Apply filters safely
#     # if month:
#     #     df = df[df["month"] == int(month)]

#     # if year:
#     #     df = df[df["year"] == int(year)]

#     # if iteration:
#     #     df = df[df["iteration"] == int(iteration)]
    
   
#     return {
#         "columns": df.columns.tolist(),
#         "data": df.to_dict(orient="records")
#     }
    
    
import duckdb
import os
import traceback


def fetch_parquet_data(tab_name, subtab_name, month=None, year=None, iteration=None):
    """
    Fetch paginated data from parquet file using DuckDB.

    Args:
        tab_name (str): 'all_combined_pds_indexes' or 'state_wise'
        subtab_name (str): 'rural', 'urban', 'combine'
        month (int, optional)
        year (int, optional)
        iteration (int, optional)

    Returns:
        dict: Contains total_rows, page, page_size, columns, data OR error
    """
    try:
        # ---------------------------
        # 1. Build full parquet path
        # ---------------------------
        file_name = f"{tab_name}.parquet"
        file_path = os.path.join(PARQUET_BASE_PATH, f"all_combined_pds_indexes.parquet")
        maping_item_path=os.path.join(PARQUET_MAPPING_ITEM_BASE_PATH,"coicop", f"coicop_mapping.parquet")
        print(tab_name, 'sub=', subtab_name, "file_path:===================")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Parquet file not found at: {file_path}")
        print("Mapping file path:===================", maping_item_path)
        if not os.path.exists(maping_item_path):
            raise FileNotFoundError(f"Mapping Parquet file not found at: {maping_item_path}")
        

        # ---------------------------
        # 2. Build filters
        # ---------------------------
        filters = []

        # Optional month/year/iteration filters
        # if month is not None:
        #     filters.append(f"month = {int(month)}")
        # if year is not None:
        #     filters.append(f"year = {int(year)}")
        # if iteration is not None:
        #     filters.append(f"iteration = {int(iteration)}")

        # Tab/subtab filters
        if tab_name == "state_wise":
            filters.append("state_id != '0'")
        else:
            filters.append("state_id = '0'")  # All India

        # Subtab sector mapping
        
        subtab_map = {
    "rural": "1",
    "urban": "2",
    "combine": "3"
}
        sector_key = str(subtab_name).strip().lower()
        print("sector_key:==================", sector_key)
        sector_value = subtab_map.get(sector_key, "3")  # default = combine

        filters.append(f"sector_id = '{sector_value}'")

        where_clause = "WHERE " + " AND ".join(filters) if filters else ""
        print("WHERE clause:==================", where_clause)

        # ---------------------------
        # 3. Count rows (for pagination)
        # ---------------------------
        count_query = f"""
            SELECT COUNT(*) AS total
            FROM parquet_scan('{file_path}')
            {where_clause}
        """
        total_rows = duckdb.sql(count_query).fetchone()[0]

        # ---------------------------
        # 4. Determine pagination
        # ---------------------------
        page = 1
        if total_rows <= 10:
            page_size = total_rows or 1  # handle 0 rows
        else:
            page_size = total_rows // 10

        offset = (page - 1) * page_size

        # ---------------------------
        # 5. Fetch data
        # ---------------------------
        query = f"""
            SELECT *
            FROM parquet_scan('{file_path}')
            {where_clause}
            LIMIT {page_size} OFFSET {offset}
        """
        df = duckdb.sql(query).to_df()

        # ---------------------------
        # 6. Return JSON
        # ---------------------------
        return {
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }

    except FileNotFoundError as fnf:
        print("ERROR: File not found:", fnf)
        return {"error": str(fnf)}

    except ValueError as ve:
        print("ERROR: Invalid input:", ve)
        return {"error": str(ve)}

    except RuntimeError as re:
        print("ERROR: DuckDB failure:", re)
        return {"error": str(re)}

    except Exception as e:
        print("Unexpected Error:", e)
        traceback.print_exc()
        return {"error": f"Unexpected error: {str(e)}"}
    
def fetch_AllIndiaLevel_parquet_data1(tab_name, subtab_name, month=None, year=None, iteration=None):
    """
    Fetch paginated data from parquet file using DuckDB.

    Args:
        tab_name (str): 'all_combined_pds_indexes' or 'state_wise'
        subtab_name (str): 'rural', 'urban', 'combine'
        month (int, optional)
        year (int, optional)
        iteration (int, optional)

    Returns:
        dict: Contains total_rows, page, page_size, columns, data OR error
    """
    try:
        # ---------------------------
        # 1. Build full parquet path
        # ---------------------------
        file_name = f"{tab_name}.parquet"
        file_path = os.path.join(PARQUET_BASE_PATH, f"all_combined_pds_indexes.parquet")
        maping_item_path=os.path.join(PARQUET_MAPPING_ITEM_BASE_PATH,"coicop", f"coicop_mapping.parquet")
        print(tab_name, 'sub=', subtab_name, "file_path:===================")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Parquet file not found at: {file_path}")
        print("Mapping file path:===================", maping_item_path)
        if not os.path.exists(maping_item_path):
            raise FileNotFoundError(f"Mapping Parquet file not found at: {maping_item_path}")
        

        # ---------------------------
        # 2. Build filters
        # ---------------------------
        filters = []

        # Optional month/year/iteration filters
        # if month is not None:
        #     filters.append(f"month = {int(month)}")
        # if year is not None:
        #     filters.append(f"year = {int(year)}")
        # if iteration is not None:
        #     filters.append(f"iteration = {int(iteration)}")

        # Tab/subtab filters
        if tab_name == "state_wise":
            filters.append("state_id != '0'")
        else:
            filters.append("state_id = '0'")  # All India

        # Subtab sector mapping
        
        
        subtab_name = str(subtab_name).strip().lower()
        if subtab_name in ["all", "general"]:
            
            level="all"
        elif subtab_name == "division":
            level="division"
        elif subtab_name == "group":
            level="group"
        elif subtab_name == "class":
            level="class"
        elif subtab_name == "subclass":
            level="subclass"
        else:
            raise ValueError(f"Invalid subtab name: {subtab_name}")
            
        

        filters.append(f"level = '{level}'")

        where_clause = "WHERE " + " AND ".join(filters) if filters else ""
        print("WHERE clause:==================", where_clause)

        # ---------------------------
        # 3. Count rows (for pagination)
        # ---------------------------
        count_query = f"""
            SELECT COUNT(*) AS total
            FROM parquet_scan('{file_path}')
            {where_clause}
        """
        total_rows = duckdb.sql(count_query).fetchone()[0]

        # ---------------------------
        # 4. Determine pagination
        # ---------------------------
        page = 1
        if total_rows <= 10:
            page_size = total_rows or 1  # handle 0 rows
        else:
            page_size = total_rows // 10

        offset = (page - 1) * page_size

        # ---------------------------
        # 5. Fetch data
        # ---------------------------
        query = f"""
            SELECT *
            FROM parquet_scan('{file_path}')
            {where_clause}
            LIMIT {page_size} OFFSET {offset}
        """
        df = duckdb.sql(query).to_df()

        # ---------------------------
        # 6. Return JSON
        # ---------------------------
        return {
            "total_rows": total_rows,
            "page": page,
            "page_size": page_size,
            "columns": df.columns.tolist(),
            "data": df.to_dict(orient="records")
        }

    except FileNotFoundError as fnf:
        print("ERROR: File not found:", fnf)
        return {"error": str(fnf)}

    except ValueError as ve:
        print("ERROR: Invalid input:", ve)
        return {"error": str(ve)}

    except RuntimeError as re:
        print("ERROR: DuckDB failure:", re)
        return {"error": str(re)}

    except Exception as e:
        print("Unexpected Error:", e)
        traceback.print_exc()
        return {"error": f"Unexpected error: {str(e)}"}   
    
import numpy as np

# def fetch_AllIndiaLevel_parquet_data(tab_name, subtab_name, month=None, year=None, iteration=None):
#     try:
#         # --------------------------------------------
#         # 1. Load files
#         # --------------------------------------------
#         file_path = os.path.join(PARQUET_BASE_PATH, "all_combined_pds_indexes.parquet")
#         map_path = os.path.join(PARQUET_MAPPING_ITEM_BASE_PATH, "coicop", "coicop_mapping.parquet")
#         state_map_path = os.path.join(PARQUET_MAPPING_ITEM_BASE_PATH, "market", "vw_market_master.parquet")

#         if not os.path.exists(file_path):
#             raise FileNotFoundError(f"Parquet file not found: {file_path}")

#         if not os.path.exists(map_path):
#             raise FileNotFoundError(f"Mapping file not found: {map_path}")

#         df = pd.read_parquet(file_path)
#         map_df = pd.read_parquet(map_path)
#         state_map_df = pd.read_parquet(state_map_path,columns=["state_id", "lgd_state_name"])
#         state_map_df = state_map_df.drop_duplicates(subset=["state_id"])
#         state_map_df.rename(columns={"lgd_state_name": "state_name"}, inplace=True)

#         # --------------------------------------------
#         # 2. State Filter
#         # --------------------------------------------
#         df = df[df["state_id"] != 0] if tab_name == "state_wise" else df[df["state_id"] == 0]

#         # --------------------------------------------
#         # 3. Level Filter
#         # --------------------------------------------
#         level_map = {
#             "all": "all",
#             "general": "all",
#             "division": "division",
#             "group": "group",
#             "class": "class",
#             "subclass": "subclass",
#             "witem": "witem",
#         }

#         subtab = str(subtab_name).strip().lower()
#         if subtab not in level_map:
#             raise ValueError("Invalid subtab name")

#         df = df[df["level"] == level_map[subtab]]
#         df = df[df["price_month_year"] == "2025-01-01 00:00:00"]

#         # --------------------------------------------
#         # 4. Sector mapping
#         # --------------------------------------------
#         sector_lookup = {1: "rural", 2: "urban", 3: "combined"}

#         # --------------------------------------------
#         # 5. Build row data
#         # --------------------------------------------
#         # --------------------------------------------
#         # 5. Build row data
#         # --------------------------------------------
#         def build_row(g):
#             sector_map = {}

#             for _, row in g.iterrows():
#                 sid = int(row.sector_id)
#                 if sid in sector_lookup:
#                     key = sector_lookup[sid]

#                     # Store main index
#                     sector_map[f"{key}_index"] = float(row["index"])

#                     # Store imputed value if column exists
#                     if "imputed" in g.columns:
#                         sector_map[f"{key}_imputed"] = float(row["imputed"])

#             # Build final row
#             return pd.Series({
#                 "state_id": g["state_id"].iloc[0],
#                 "level": g["level"].iloc[0],
#                 "level_id": g["level_id"].iloc[0],

#                 "rural_index": sector_map.get("rural_index"),
#                 "rural_imputed": sector_map.get("rural_imputed"),

#                 "urban_index": sector_map.get("urban_index"),
#                 "urban_imputed": sector_map.get("urban_imputed"),

#                 "combined_index": sector_map.get("combined_index"),
#                 "combined_imputed": sector_map.get("combined_imputed"),
#             })


#         result_df = (
#             df.groupby(["state_id", "level_id"], sort=False)
#             .apply(build_row)
#             .reset_index(drop=True)
#         )


#         # Clean invalid numerical values
#         result_df.replace({np.nan: None, np.inf: None, -np.inf: None}, inplace=True)

#         # --------------------------------------------
#         # 6. Conditional Merge (only if level != 'all')
#         # --------------------------------------------
#         if (result_df["level"] != "all").any():

#             # dynamic names
#             level_name = result_df["level"].iloc[0]
#             col_id = f"{level_name}_id"      # level_id → division_id / group_id
#             col_name = f"{level_name}_name"  # level_name → division_name

#             # find old id column to rename in result_df
#             old_id_col = "level_id"

#             # rename in result_df
#             result_df.rename(columns={old_id_col: col_id}, inplace=True)

#             # rename mapping DF columns (ID + name)
#             map_df.rename(columns={old_id_col: col_id, "name": col_name}, inplace=True)

#             # keep only relevant columns
#             map_df = map_df[[col_id, col_name]].drop_duplicates(subset=[col_id])

#             # merge
#             result_df = result_df.merge(map_df, on=col_id, how="left")
#             # reorder column: put col_name right after col_id
#             cols = list(result_df.columns)
#             cols.remove(col_name)
#             idx = cols.index(col_id)
#             cols.insert(idx + 1, col_name)
#             result_df = result_df[cols]
#             if (result_df["state_id"] != 0).any():
#                 result_df = result_df.drop(columns=["level", col_id], errors="ignore")
#                 result_df = result_df.merge(state_map_df, on="state_id", how="left")
#             else:
#                 result_df = result_df.drop(columns=["level", col_id], errors="ignore")
            
        
            


#         # ------------------------ --------------------
#         # 7. Output JSON
#         # --------------------------------------------
        
#         if (result_df["state_id"] != 0).any():
#                 result_df = result_df.drop(columns=["level", "level_id"], errors="ignore")
#                 result_df = result_df.merge(state_map_df, on="state_id", how="left")
        
#         result_df = result_df.drop(columns=["state_id","level", "level_id"], errors="ignore")
     
        
#         final_data = result_df.to_dict(orient="records")

#         return {
#             "columns": ["state_id", "rural_index", "urban_index", "combined_index"],
#             "data": final_data
#         }

#     except Exception as e:
#         traceback.print_exc()
#         return {"error": str(e)}

import pandas as pd
from django.db import connection, connections


import calendar

def convert_month_to_int(month):
    """
    Convert month input to integer 1-12.
    Accepts: int (1-12), str numeric ('2', '02'), str abbreviation ('Feb'), str full name ('February')
    """
    if month is None:
        return None

    # If already integer
    if isinstance(month, int):
        if 1 <= month <= 12:
            return month
        else:
            raise ValueError(f"Invalid numeric month: {month}")

    month = str(month).strip()

    # If numeric string
    if month.isdigit():
        month_int = int(month)
        if 1 <= month_int <= 12:
            return month_int
        else:
            raise ValueError(f"Invalid numeric month: {month}")

    # Try month abbreviation, e.g., 'Feb'
    try:
        month_int = list(calendar.month_abbr).index(month[:3].capitalize())
        if month_int == 0:
            raise ValueError
        return month_int
    except ValueError:
        pass

    # Try full month name, e.g., 'February'
    try:
        month_int = list(calendar.month_name).index(month.capitalize())
        if month_int == 0:
            raise ValueError
        return month_int
    except ValueError:
        raise ValueError(f"Invalid month input: {month}")

from django.http import JsonResponse

def fetch_AllIndiaLevel_parquet_data(
    tab_name,
    subtab_name,
    month=None,
    year=None,
    iteration=None,
    page=1,
    page_size=50,
    search=None,
):
    try:
        import calendar
        import math
        from django.db import connections

        # -----------------------------
        # Month conversion
        # -----------------------------
        def convert_month_to_int(month):
            if month is None:
                return None
            if isinstance(month, int):
                return month if 1 <= month <= 12 else None
            month_str = str(month).strip()
            if month_str.isdigit():
                m = int(month_str)
                return m if 1 <= m <= 12 else None
            try:
                return list(calendar.month_abbr).index(month_str[:3].capitalize())
            except:
                pass
            try:
                return list(calendar.month_name).index(month_str.capitalize())
            except:
                raise ValueError(f"Invalid month: {month}")

        month = convert_month_to_int(month)
        year = int(year) if year else None

        # -----------------------------
        # Level mapping
        # -----------------------------
        level_map = {
            "all": "all",
            "general": "all",
            "division": "division",
            "group": "group",
            "class": "class",
            "subclass": "subclass",
            "witem": "witem",
        }
        subtab = str(subtab_name).strip().lower() if subtab_name else "all"
        if subtab not in level_map:
            raise ValueError(f"Invalid subtab: {subtab_name}")
        level_filter = level_map[subtab]

        # -----------------------------
        # Base SQL
        # -----------------------------
        sql = """
            SELECT
                state_id,
                level_id,
                MAX(CASE WHEN sector_id = 1 THEN index END) AS rural_index,
                MAX(CASE WHEN sector_id = 2 THEN index END) AS urban_index,
                MAX(CASE WHEN sector_id = 3 THEN index END) AS combined_index
            FROM price_idx.all_idx
            WHERE level = %s
        """
        params = [level_filter]

        if tab_name == "state_wise":
            sql += " AND state_id != 0"
        else:
            sql += " AND state_id = 0"

        if month and year:
            #sql += " AND index_month = %s AND index_year = %s"
            sql += " AND EXTRACT(MONTH FROM price_month_year) = %s AND  EXTRACT(YEAR FROM price_month_year) = %s"
            params.extend([month, year])

        if iteration:
            sql += " AND iteration_id = %s"
            params.append(iteration)

        # -----------------------------
        # Server-side Search Filter
        # -----------------------------
        search = (search or "").strip()
        if search:
            sql += """
                AND (
                    CAST(state_id AS TEXT) ILIKE %s
                    OR CAST(level_id AS TEXT) ILIKE %s
                )
            """
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        sql += " GROUP BY state_id, level_id ORDER BY state_id, level_id"
        

        # -----------------------------
        # Count total records
        # -----------------------------
        count_sql = f"SELECT COUNT(*) FROM ({sql}) AS subquery"
        with connections["final_db"].cursor() as cursor:
            cursor.execute(count_sql, params)
            total_records = cursor.fetchone()[0]

        total_pages = max(1, math.ceil(total_records / page_size))
        page = max(1, min(page, total_pages))
        offset = (page - 1) * page_size
        sql += f" LIMIT {page_size} OFFSET {offset}"

        # -----------------------------
        # Fetch Data
        # -----------------------------
        with connections["final_db"].cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        if not rows:
            return {
                "data": [],
                "columns": [],
                "total_records": 0,
                "total_pages": 0,
                "current_page": page,
                "page_size": page_size,
            }

        # -----------------------------
        # State Mapping
        # -----------------------------
        state_map = {}
        with connections["final_db"].cursor() as cursor:
            cursor.execute("SELECT nss_state_code, nss_state_name FROM mapping.vw_market_master")
            for sid, name in cursor.fetchall():
                state_map[int(sid)] = name

        # -----------------------------
        # COICOP Mapping
        # -----------------------------
        coicop_map = {}
        coicop_id_name = None
        if level_filter != "all":
            id_col_map = {
                "division": ("division_id", "division_name"),
                "group": ("group_id", "group_name"),
                "class": ("class_id", "class_name"),
                "subclass": ("subclass_id", "subclass_name"),
                "witem": ("witem_id", "witem_name"),
            }
            id_col, name_col = id_col_map[level_filter]
            coicop_id_name = (f"{level_filter}_id", f"{level_filter}_name")
            with connections["final_db"].cursor() as cursor:
                cursor.execute(f"SELECT {id_col}, {name_col} FROM mapping.coicop_mapping")
                for lid, lname in cursor.fetchall():
                    coicop_map[lid] = lname

        # -----------------------------
        # Helper: clean numeric
        # -----------------------------
        def clean_number(x):
            try:
                if x is None:
                    return None
                x = float(x)
                return x if math.isfinite(x) else None
            except:
                return None

        # -----------------------------
        # Build final data
        # -----------------------------
        final_data = []
        for row in rows:
            state_id, level_id, r, u, c = row
            record = {"state_name": "All India" if state_id == 0 else state_map.get(state_id)}
            if coicop_id_name:
                id_key, name_key = coicop_id_name
                record[id_key] = level_id
                record[name_key] = coicop_map.get(level_id)
            record.update({
                "rural_index": clean_number(r),
                "urban_index": clean_number(u),
                "combined_index": clean_number(c),
            })
            final_data.append(record)

        columns = ["state_name"]
        if coicop_id_name:
            id_key, name_key = coicop_id_name
            columns.append(id_key)
            columns.append(name_key)
        columns.extend(["rural_index", "urban_index", "combined_index"])

        # ✅ Return dictionary, not JsonResponse
        return {
            "data": final_data,
            "columns": columns,
            "total_records": total_records,
            "total_pages": total_pages,
            "current_page": page,
            "page_size": page_size,
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    
    
@api_view(["GET"])
def all_india_index_item(request):
    
    iteration = request.query_params.get("iteration")
    tab_name = request.query_params.get("tab")
    subtab_name = request.query_params.get("subtab")
    month = request.query_params.get("month")
    year = request.query_params.get("year")
    # Mapping user tabs → actual parquet files
    if not tab_name:
        return Response({"error": "Missing tab parameter"}, status=400)

    try:
        data = fetch_parquet_data(tab_name,subtab_name, month, year, iteration)
        json_data = json.dumps({ 'data':data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    



@api_view(["GET"])
def all_india_level_index_item(request):
    try:
        iteration = request.query_params.get("iteration")
        tab_name = request.query_params.get("tab")
        subtab_name = request.query_params.get("subtab")
        month = request.query_params.get("month")
        year = request.query_params.get("year")

        if not tab_name:
            return Response({"error": "Missing tab parameter"}, status=400)

        data = fetch_AllIndiaLevel_parquet_data(tab_name, subtab_name, month, year, iteration)
        if "error" in data:
            return Response({"error": data["error"]}, status=500)
        
        return Response(data, status=200)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)
    
    
    
    
    
# export all output data in tabs


# Your level mapping
LEVEL_MAP = {
    "all": "all",
    "general": "all",
    "division": "division",
    "group": "group",
    "class": "class",
    "subclass": "subclass",
    "witem": "witem",
}

# Example main tabs you want to export
MAIN_TABS = ["state_wise", "all_india"]

@api_view(["GET"])
def download_all_india_excel_respective_tabs(request):
    """
    API to export all India data in respective tabs/sheets.
    Each main tab + subtab combination will be a sheet in Excel.
    """
    iteration = request.query_params.get("iteration")
    month = request.query_params.get("month")
    year = request.query_params.get("year")

    all_data = {}

    # Loop through all main tabs
    for tab_name in MAIN_TABS:
        for subtab_name in LEVEL_MAP.keys():
            sheet_name = f"{tab_name}_{subtab_name}"[:31]  # max 31 chars for Excel
            try:
                # Fetch data
                data = fetch_AllIndiaLevel_parquet_data(tab_name, subtab_name, month, year, iteration)
                all_data[sheet_name] = data.get("data", [])
            except Exception as e:
                # Put error info if fetching fails
                all_data[sheet_name] = [{"error": str(e)}]

    # Create in-memory Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        for sheet_name, records in all_data.items():
            if not records:
                continue
            df = pd.DataFrame(records)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    output.seek(0)

    # Build downloadable response
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="all_india_index.xlsx"'
    return response

