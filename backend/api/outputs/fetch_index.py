import os
import traceback
import pandas as pd
import numpy as np



PARQUET_BASE_PATH = os.path.join("data", "comp_db", "release_output")
PARQUET_MAPPING_ITEM_BASE_PATH  =os.path.join("data", "comp_db_final", "mapping")



import os
import pandas as pd
import numpy as np
import traceback
from django.db import connections
from django.core.cache import cache
import calendar
import math


# --------------------------------------------
# 🔹 Dynamic iteration mapping (CACHED)
# --------------------------------------------
def get_iteration_map():
    cache_key = "iteration_map_cache"

    iteration_map = cache.get(cache_key)
    if iteration_map:
        return iteration_map

    iteration_map = {}

    with connections["final_db"].cursor() as cursor:
        cursor.execute("""
            SELECT iteration_id, iteration_name
            FROM mapping.iteration_master
        """)

        for iter_id, iter_name in cursor.fetchall():
            if iter_name:
                iteration_map[iter_name.strip().lower()] = int(iter_id)

    cache.set(cache_key, iteration_map, timeout=3600)  # 1 hour cache
    return iteration_map


# --------------------------------------------
# 🔹 MAIN FUNCTION
# --------------------------------------------
from django.db import connections
import calendar
import math


from django.db import connections
import calendar
import math

from django.db import connections
import calendar
import math


def fetch_AllIndiaLevel_parquet_data_export(
    tab_name,
    subtab_name,
    month=None,
    year=None,
    compile_type=None,   # ✅ accepted but NOT used
    sort_by="combined_index"
):
    try:
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

        subtab = str(subtab_name).strip().lower()
        if subtab not in level_map:
            raise ValueError(f"Invalid subtab: {subtab_name}")

        level_filter = level_map[subtab]

        # -----------------------------
        # Sorting SQL (SAFE)
        # -----------------------------
        sort_sql_map = {
            "rural_index": 'MAX(CASE WHEN sector_id = 1 THEN "index" END)',
            "urban_index": 'MAX(CASE WHEN sector_id = 2 THEN "index" END)',
            "combined_index": 'MAX(CASE WHEN sector_id = 3 THEN "index" END)',
        }

        sort_sql = sort_sql_map.get(sort_by, sort_sql_map["combined_index"])

        # -----------------------------
        # SQL QUERY
        # -----------------------------
        sql = f"""
            SELECT
                state_id,
                level,
                level_id,
                MAX(CASE WHEN sector_id = 1 THEN "index" END) AS rural_index,
                MAX(CASE WHEN sector_id = 2 THEN "index" END) AS urban_index,
                MAX(CASE WHEN sector_id = 3 THEN "index" END) AS combined_index,
                MAX(CASE WHEN sector_id = 1 THEN imputed END) AS rural_imputed,
                MAX(CASE WHEN sector_id = 2 THEN imputed END) AS urban_imputed,
                MAX(CASE WHEN sector_id = 3 THEN imputed END) AS combined_imputed
            FROM price_idx.all_idx
            WHERE level = %s
        """

        params = [level_filter]

        # -----------------------------
        # State filter
        # -----------------------------
        if tab_name == "state_wise":
            sql += " AND state_id != 0"
        else:
            sql += " AND state_id = 0"

        # -----------------------------
        # Time filter
        # -----------------------------
        if month and year:
            sql += " AND index_month = %s AND index_year = %s"
            params.extend([month, year])

        # ❌ compile_type NOT USED

        # -----------------------------
        # GROUP + SORT
        # -----------------------------
        sql += f"""
            GROUP BY state_id, level, level_id
            ORDER BY {sort_sql} DESC NULLS LAST
        """

        # -----------------------------
        # Execute query
        # -----------------------------
        with connections["final_db"].cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()

        if not rows:
            return []

        # -----------------------------
        # State mapping
        # -----------------------------
        state_map = {}
        try:
            with connections["final_db"].cursor() as cursor:
                cursor.execute("""
                    SELECT nss_state_code, nss_state_name
                    FROM mapping.vw_market_master
                """)
                for sid, name in cursor.fetchall():
                    state_map[int(sid)] = name
        except:
            state_map = {}

        # -----------------------------
        # COICOP mapping
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
            coicop_id_name = (id_col, name_col)

            try:
                with connections["final_db"].cursor() as cursor:
                    cursor.execute(f"""
                        SELECT {id_col}, {name_col}
                        FROM mapping.coicop_mapping
                    """)
                    for lid, lname in cursor.fetchall():
                        coicop_map[lid] = lname
            except:
                coicop_map = {}

        # -----------------------------
        # Clean numeric
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
        # Build final data + rank
        # -----------------------------
        final_data = []
        rank = 1

        for row in rows:
            (
                state_id,
                level,
                level_id,
                r, u, c,
                ri, ui, ci
            ) = row

            record = {}

            # Rank
            record["rank"] = rank
            rank += 1

            # State
            if tab_name == "state_wise":
                record["state_name"] = state_map.get(state_id)

            # COICOP
            if coicop_id_name:
                id_key, name_key = coicop_id_name
                record[id_key] = level_id
                record[name_key] = coicop_map.get(level_id)

            # Values
            record.update({
                "rural_index": clean_number(r),
                "urban_index": clean_number(u),
                "combined_index": clean_number(c),
                "rural_imputed": clean_number(ri),
                "urban_imputed": clean_number(ui),
                "combined_imputed": clean_number(ci),
            })

            final_data.append(record)

        return final_data

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise RuntimeError(str(e))