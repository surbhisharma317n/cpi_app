
from ..config import API_LOGIN_URL, API_USERNAME, API_PASSWORD, DB_CONFIG, API_AIRFARE_DATA_URL, MASTER_DB_CONFIG
import requests
import json
import psycopg2
from psycopg2.extras import execute_values, execute_batch

# 1. Get token
def login_and_get_token():
    payload = {"username": API_USERNAME, "password": API_PASSWORD}
    headers = {'accept': '*/*', 'Content-Type': 'application/json'}

    response = requests.post(API_LOGIN_URL, headers=headers, data=json.dumps(payload))
    response.raise_for_status()
    token = response.json().get('token')
    if not token:
        raise ValueError("No token in login response.")
    return token

# 2. Fetch data
def fetch_capi_data(token, survey_date, api_url):
    headers = {'accept': '*/*', 'Authorization': f'Bearer {token}'}
    url = f"{api_url}?surveyDate={survey_date}"
    print("Fetching data from URL:", url)

    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()

def fetch_capi_data_from_post_api(token, survey_date, api_url, page_number, page_size):
    headers = {'accept': '*/*', 'Authorization': f'Bearer {token}'}
    payload = {
        "surveyDate": survey_date,
        "pageNumber": page_number,
        "pageSize": page_size
    }
    response = requests.post(api_url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()


def airfare_data_exists(survey_date, AIRFARE_TABLE_NAME):
    """Check if airfare data for the given year and month already exists"""
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    year, month, day = survey_date.split("-")
    year = int(year)
    month = int(month)
    
    try:
        # Check if any records exist for this year and month
        query = f"""
            SELECT EXISTS(
                SELECT 1 FROM {AIRFARE_TABLE_NAME} 
                WHERE price_month = %s AND price_year = %s
                LIMIT 1
            )
        """
        cursor.execute(query, (month,year))
        exists = cursor.fetchone()[0]
        return exists
    finally:
        cursor.close()
        conn.close()

# 3. Insert to DB
def save_to_table(data, column_mapping, table_name):
    if not isinstance(data, list) or not data:
        raise ValueError("No valid data to insert.")

    db_columns = list(column_mapping.values())
    records = []

    for record in data:
        row = [record.get(api_col, None) for api_col in column_mapping]
        records.append(row)

    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor()
    insert_query = f"""
        INSERT INTO {table_name} ({', '.join(db_columns)})
        VALUES %s
    """
    execute_values(cursor, insert_query, records)
    conn.commit()
    rowcount = cursor.rowcount

    cursor.close()
    conn.close()
    return len(records)   

# 3. Insert to DB
def master_data_save_to_table(data, column_mapping, table_name):
    if not isinstance(data, list) or not data:
        raise ValueError("No valid data to insert.")

    db_columns = list(column_mapping.values())
    records = []

    for record in data:
        row = [record.get(api_col, None) for api_col in column_mapping]
        records.append(row)

    conn = psycopg2.connect(**MASTER_DB_CONFIG)
    cursor = conn.cursor()
    insert_query = f"""
        INSERT INTO {table_name} ({', '.join(db_columns)})
        VALUES %s
    """
    execute_values(cursor, insert_query, records)
    conn.commit()
    rowcount = cursor.rowcount

    cursor.close()
    conn.close()
    return len(records)  

