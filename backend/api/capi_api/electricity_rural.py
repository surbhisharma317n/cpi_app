
from rest_framework.decorators import api_view
from django.http import JsonResponse
from psycopg2.extras import execute_values
from ..config import  API_ELECTRICITY_URBAN_DATA_URL, RURAL_ELECTRICITY_TABLE_NAME
from api.capi_api.capi_utils import airfare_data_exists, login_and_get_token, fetch_capi_data, save_to_table
# Configuration
# RURAL_ELECTRICITY_TABLE_NAME = "rural_electricity"
rural_electricity_column_mapping = {
        "user_id": "user_id",
        "user_timestamp": "user_timestamp",
        "state_code": "state_code",
        "state_name": "state_name",
        "ro_code": "ro_code",
        "ro_name": "ro_name",
        "sro_code": "sro_code",
        "sro_name": "sro_name",
        "district_code": "district_code",
        "district_name": "district_name",
        "village_code": "village_code",
        "village_name": "village_name",
        "discom_code": "discom_code",
        "discom_name": "discom_name",
        "item_code": "item_code",
        "item_name": "item_name",
        "price_year": "price_year",
        "price_month": "price_month",
        "item_price": "item_price",
        "price_remark": "remarks",
        "price_date": "price_date"
    }



@api_view(['GET'])
def fetch_and_insert_rural_electricity_prices(request):
    print("Fetching and inserting rural electricity prices...")
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({"error": "Authorization token missing or invalid"}, status=401)
        token = login_and_get_token()
        survey_date = request.query_params.get('survey_date', '2025-04-01')
        user_id = request.query_params.get('user_id')
        if survey_date is None or user_id is None:
            return JsonResponse({"error": "survey_date and user_id are required parameters"}, status=400)
        data = fetch_capi_data(token, survey_date, API_ELECTRICITY_URBAN_DATA_URL)
      
        if airfare_data_exists(survey_date, RURAL_ELECTRICITY_TABLE_NAME):
            return JsonResponse({
                "status": "success",
                "message": f"Data for {survey_date} already exists in database",
                "existing": True
            })
        # Add extra fields to each row
        for row in data:
            row['user_id'] = user_id
            row['user_timestamp'] = f"{user_id}_{survey_date}"
        inserted_rows = save_to_table(data, rural_electricity_column_mapping, RURAL_ELECTRICITY_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
