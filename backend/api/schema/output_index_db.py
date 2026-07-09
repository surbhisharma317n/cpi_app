from django.db import connections
import math
from contextlib import closing

def clean_value(val):
    """Efficient value cleaning with early returns"""
    if isinstance(val, float):
        if math.isnan(val) or math.isinf(val):
            return None
    return val

def get_filtered_columns( table_name, exclude_cols):
    with closing(connections['input_data_db'].cursor()) as cursor:
        cursor.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = %s", (table_name,))
        all_columns = [row[0] for row in cursor.fetchall()]
        selected_columns = [col for col in all_columns if col not in exclude_cols]
        # Reorder: bring prioritized_columns to the front (if they exist)
       
        final_columns = selected_columns
        return final_columns

# Usage



def execute_query(query):
    """Optimized query execution with bulk operations"""
    with closing(connections['input_data_db'].cursor()) as cursor:
        cursor.execute(query)
        columns = [col[0] for col in cursor.description]
        return [
            {columns[i]: clean_value(val) for i, val in enumerate(row)}
            for row in cursor.fetchall()
        ]

def fetch_base_item( table_name):
    # Make this a list of tuples to be unpacked
    
    exclude_columns = ['id', 'created_by', 'updated_by','created_at', 'updated_at', 'iteration']
    # table = table_name.replace(" ", "_").lower()
    # prioritized_columns = ['item_code','item_name', 'state_code', 'district_code']
    
    columns = get_filtered_columns( table_name, exclude_columns)
    column_str = ', '.join(columns)
    queries = [
        ( f"SELECT {column_str} FROM {table_name} Where month=1 AND year=2023 ")
    ]

    data = {}
    for  query in queries:
        data= list(execute_query(query))
    return {
        "columns": columns,
        "data": data
    }
    
    
def fetchInptPriceItem( table_name,month,year,iteration):
    # Make this a list of tuples to be unpacked
    
    exclude_columns = ['id', 'created_at']
    # table = table_name.replace(" ", "_").lower()
    # prioritized_columns = ['item_code','item_name', 'state_code', 'district_code']
    
    columns = get_filtered_columns( table_name, exclude_columns)
    column_str = ', '.join(columns)
    queries = [
        ( f"SELECT {column_str} FROM {table_name} WHERE month='{month}' AND year={year}  " )
    ]

    data = {}
    for  query in queries:
        data= list(execute_query(query))
    return {
        "columns": columns,
        "data": data
    }

