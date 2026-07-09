
from django.db import connection
import math
from contextlib import closing
from rest_framework.response import Response
from rest_framework import status
import json

def clean_value(val):
    """Efficient value cleaning with early returns"""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    return val

def execute_query(query, params):
    """Optimized query execution with bulk operations"""
    with closing(connection.cursor()) as cursor:
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        return [
            {columns[i]: clean_value(val) for i, val in enumerate(row)}
            for row in cursor.fetchall()
        ]
        
def fetch_comparison_report_data(params):
    queries = (
        ("rural_data", "SELECT * FROM output_rural_priced_item_index WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("urban_data", "SELECT * FROM output_urban_priced_item_index WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("weighted_data", "SELECT * FROM weighted_index_output WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("food_data", "SELECT * FROM food_price_index WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("indices_data", "SELECT * FROM indices WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("ruc_data", "SELECT * FROM all_india_ruc_item_index WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("comparison_data", "SELECT * FROM comparison_inflation WHERE release_type = %s AND month_year = %s AND iteration = %s"),
        ("item_inflation_data", "SELECT * FROM item_inflation_data WHERE release_type = %s AND month_year = %s AND iteration = %s"),
    )

    data = {}
    for key, query in queries:
        data[key] = list(execute_query(query, params))
    return data


import logging

logger = logging.getLogger(__name__)


from collections import defaultdict



# def fetch_Weighted_output(month_year):

#     """
#     Fetch weighted index data from PostgreSQL and convert nested JSON to a flat list of dicts.
#     """
#     query = """
#     WITH subgroup_data AS (
#         SELECT 
#             st_code,
#             group_code,
#             subgroup_code,
#             AVG(index_value) AS avg_index,
#             SUM(weight) AS total_weight
#         FROM public.weighted_index_output
#         WHERE month_year = %s
#         GROUP BY st_code, group_code, subgroup_code
#     )
#     SELECT jsonb_object_agg(st_code, groups) AS result
#     FROM (
#         SELECT st_code, jsonb_object_agg(group_code, subgroups) AS groups
#         FROM (
#             SELECT st_code, group_code,
#                    jsonb_object_agg(
#                        subgroup_code,
#                        jsonb_build_object(
#                            'index', avg_index,
#                            'weight', total_weight
#                        )
#                    ) AS subgroups
#             FROM subgroup_data
#             GROUP BY st_code, group_code
#         ) g
#         GROUP BY st_code
#     ) s;
#     """
#     query="""WITH subgroup_data AS (
#     SELECT 
#         st_code,
#         group_code,
#         subgroup_code,
#         AVG(index_value) AS avg_index,
#         SUM(weight) AS total_weight
#     FROM public.weighted_index_output
#     WHERE month_year = %s
#     GROUP BY st_code, group_code, subgroup_code
# )
# SELECT jsonb_agg(
#     jsonb_build_object(
#         'state', st_code,
#         'children', groups
#     )
# ) AS result
# FROM (
#     SELECT 
#         st_code,
#         jsonb_agg(
#             jsonb_build_object(
#                 'group', group_code,
#                 'children', subgroups
#             )
#         ) AS groups
#     FROM (
#         SELECT 
#             st_code, 
#             group_code,
#             jsonb_agg(
#                 jsonb_build_object(
#                     'subgroup', subgroup_code,
#                     'weight', total_weight,
#                     'index', avg_index,
#                     'children', '[]'::jsonb
#                 ) ORDER BY subgroup_code
#             ) AS subgroups
#         FROM subgroup_data
#         GROUP BY st_code, group_code
#         ORDER BY group_code
#     ) g
#     GROUP BY st_code
#     ORDER BY st_code
# ) s;
# """

#     try:
#         rows = execute_query(query, (month_year,))
   
#         if not rows or 'result' not in rows[0]:
#             logger.warning("⚠️ No data found for month_year: %s", month_year)
#             return []
        
        

#         nested_json = rows[0]['result']
#         if isinstance(nested_json, str):
#             nested_json = json.loads(nested_json)
#         # print("nested_json====",nested_json )
       

#         # Convert nested JSON to flat list of dicts
#         flat_list = []
#         # nested_json is your JSON object
#         # for st_code, groups in nested_json.items():
#         #     if not isinstance(groups, dict):
#         #         continue  # skip if groups is not a dict
#         #     for group_code, subgroups in groups.items():
#         #         if not isinstance(subgroups, dict):
#         #             continue  # skip if subgroups is not a dict
#         #         for subgroup_code, values in subgroups.items():
#         #             if not isinstance(values, dict):
#         #                 continue  # skip if values is not a dict
#         #             flat_list.append({
#         #                 "st_code": st_code,
#         #                 "group_code": group_code,
#         #                 "subgroup_code": subgroup_code,
#         #                 "index": values.get("index"),
#         #                 "weight": values.get("weight")
#         #             })

#         print("flat_list ====", nested_json)
#         return [nested_json]

#     except Exception as e:
#         logger.error("❌ Failed to fetch weighted output for %s: %s", month_year, str(e))
#         return []



# def fetch_Weighted_output(month_year):

   
#     query="""WITH subgroup_data AS (
#     SELECT 
#         st_code,
#         group_code,
#         subgroup_code,
#         AVG(index_value) AS avg_index,
#         SUM(weight) AS total_weight
#     FROM public.weighted_index_output
#     WHERE month_year = %s
#     GROUP BY st_code, group_code, subgroup_code
# )
# SELECT jsonb_agg(
#     jsonb_build_object(
#         'state', st_code,
#         'children', groups
#     )
# ) AS result
# FROM (
#     SELECT 
#         st_code,
#         jsonb_agg(
#             jsonb_build_object(
#                 'group', group_code,
#                 'children', subgroups
#             )
#         ) AS groups
#     FROM (
#         SELECT 
#             st_code, 
#             group_code,
#             jsonb_agg(
#                 jsonb_build_object(
#                     'subgroup', subgroup_code,
#                     'weight', total_weight,
#                     'index', avg_index,
#                     'children', '[]'::jsonb
#                 ) ORDER BY subgroup_code
#             ) AS subgroups
#         FROM subgroup_data
#         GROUP BY st_code, group_code
#         ORDER BY group_code
#     ) g
#     GROUP BY st_code
#     ORDER BY st_code
# ) s;
# """

#     try:
#         rows = execute_query(query, (month_year,))
   
#         if not rows or 'result' not in rows[0]:
#             logger.warning("⚠️ No data found for month_year: %s", month_year)
#             return []
        
        

#         nested_json = rows[0]['result']
#         if isinstance(nested_json, str):
#             nested_json = json.loads(nested_json)
        

#         print("flat_list ====", nested_json)
#         return [nested_json]

#     except Exception as e:
#         logger.error("❌ Failed to fetch weighted output for %s: %s", month_year, str(e))
#         return []



def fetch_Weighted_output(month_year):
    query = """
    WITH subgroup_data AS (
        SELECT 
            st_code,
            group_code,
            subgroup_code,
            AVG(index_value) AS avg_index,
            SUM(weight) AS total_weight
        FROM public.weighted_index_output
        WHERE month_year = %s
        GROUP BY st_code, group_code, subgroup_code
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'state', st_code,
            'children', groups
        )
    ) AS result
    FROM (
        SELECT 
            st_code,
            jsonb_agg(
                jsonb_build_object(
                    'group', group_code,
                    'children', subgroups
                )
            ) AS groups
        FROM (
            SELECT 
                st_code, 
                group_code,
                jsonb_agg(
                    jsonb_build_object(
                        'subgroup', subgroup_code,
                        'weight', total_weight,
                        'index', avg_index,
                        'children', '[]'::jsonb
                    ) ORDER BY subgroup_code
                ) AS subgroups
            FROM subgroup_data
            GROUP BY st_code, group_code
            ORDER BY group_code
        ) g
        GROUP BY st_code
        ORDER BY st_code
    ) s;
    """

    try:
        rows = execute_query(query, (month_year,))
        
        if not rows or 'result' not in rows[0] or rows[0]['result'] is None:
            logger.warning("⚠️ No data found for month_year: %s", month_year)
            return []

        nested_json = rows[0]['result']

        # If DB driver returns string, parse JSON
        if isinstance(nested_json, str):
            nested_json = json.loads(nested_json)

        # print("nested_list ====", nested_json)
        return nested_json  # return directly, no extra wrapping

    except Exception as e:
        logger.error("❌ Failed to fetch weighted output for %s: %s", month_year, str(e))
        return []



