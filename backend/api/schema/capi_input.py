from django.db import connections
import math
from contextlib import closing

def clean_value(val):
    """Efficient value cleaning with early returns"""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    return val

def get_filtered_columns( table_name, exclude_cols,prioritized_columns):
    with closing(connections['comp_db2'].cursor()) as cursor:
        cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        all_columns = [row[0] for row in cursor.fetchall()]
        selected_columns = [col for col in all_columns if col not in exclude_cols]
        # Reorder: bring prioritized_columns to the front (if they exist)
        prioritized = [col for col in prioritized_columns if col in selected_columns]
        remaining = [col for col in selected_columns if col not in prioritized]
        final_columns = prioritized + remaining
        return final_columns

# Usage



def execute_query(query, params):
    """Optimized query execution with bulk operations"""
    with closing(connections['comp_db2'].cursor()) as cursor:
        cursor.execute(query, params)
        columns = [col[0] for col in cursor.description]
        return [
            {columns[i]: clean_value(val) for i, val in enumerate(row)}
            for row in cursor.fetchall()
        ]

def fetch_capi_input_data(params, table_name):
    # Make this a list of tuples to be unpacked
    
    exclude_columns = ['id', 'user_timestamp', 'user_id','zone_id', 'created_at', 'updated_at', 'iteration']
    # table = table_name.replace(" ", "_").lower()
    prioritized_columns = ['item_code','item_name', 'state_code', 'district_code']
    
    columns = get_filtered_columns( table_name, exclude_columns,prioritized_columns)
    column_str = ', '.join(columns)
    queries = [
        ( f"SELECT {column_str} FROM {table_name} WHERE price_month = %s AND price_year = %s")
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