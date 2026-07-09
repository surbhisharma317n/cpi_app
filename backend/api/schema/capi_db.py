from django.db import connections
import math
from contextlib import closing

def clean_value(val):
    """Efficient value cleaning with early returns"""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    return val

def execute_query(query, params):
    """Optimized query execution with bulk operations"""
    with closing(connections['capi_input'].cursor()) as cursor:
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        return [
            {columns[i]: clean_value(val) for i, val in enumerate(row)}
            for row in cursor.fetchall()
        ]

def fetch_capi_input_data(params, table_name):
    # Make this a list of tuples to be unpacked
    queries = [
        ( f"SELECT * FROM {table_name} WHERE month_year = %s AND iteration = %s")
    ]

    data = {}
    for  query in queries:
        data= list(execute_query(query, params))
    return data


    # queries = (
    #     ("rural_electricity", "SELECT * FROM rural_electricity WHERE  month_year = %s AND iteration = %s"),
    #     ("rural_houserent", "SELECT * FROM rural_houserent WHERE  month_year = %s AND iteration = %s"),
    #     # ("rural_item_price", "SELECT * FROM rural_item_price WHERE  month_year = %s AND iteration = %s"),
    #     # ("urban_electricity", "SELECT * FROM urban_electricity WHERE  month_year = %s AND iteration = %s"),
    #     # ("urban_houserent", "SELECT * FROM urban_houserent WHERE  month_year = %s AND iteration = %s"),
    #     # ("urban_item_price", "SELECT * FROM urban_item_price WHERE  month_year = %s AND iteration = %s"),
    #     # ("urban_online_market", "SELECT * FROM urban_online_market WHERE  month_year = %s AND iteration = %s"),
    #     # ("urban_pds_price_data", "SELECT * FROM urban_pds_price_data WHERE  month_year = %s AND iteration = %s"),
    # )