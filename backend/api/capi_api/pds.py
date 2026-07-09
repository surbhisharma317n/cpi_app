
from rest_framework.decorators import api_view
from django.http import JsonResponse

from api.capi_api.capi_utils import airfare_data_exists, fetch_capi_data_from_post_api, login_and_get_token, fetch_capi_data, save_to_table
from ..config import API_PRICE_LIST_DATA_URL, PDS_PRICE_TABLE_NAME

# Configuration
# PDS_PRICE_TABLE_NAME = "urban_pds_price"

pds_price_column_mapping = {
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
    "town_code": "town_code",
    "town_name": "town_name",
    "quotation": "quot_code",
    "item_code": "item_code",
    "item_name": "item_name",
    "unit_name": "unit",
    "quantity": "quantity",
    "is_distributed": "is_distributed",
    "item_price": "item_price",
    "price_year": "price_year",
    "price_month": "price_month",
    "price_remark": "remarks",
    # "price_date": "price_date"
}


@api_view(['GET'])
def fetch_and_insert_pds_prices(request):
    print("Fetching and inserting rural electricity prices...")
    try:
        token = login_and_get_token()
        survey_date = request.query_params.get('survey_date', '2025-04-01')
        
        print("Survey Date:", survey_date)
        user_id = request.query_params.get('user_id')
        print("User ID:", user_id)
        # if survey_date is None or user_id is None:
        #     return JsonResponse({"error": "survey_date and user_id are required parameters"}, status=400)
        data = fetch_capi_data(token, survey_date, API_PRICE_LIST_DATA_URL)
        # print(f"Fetched  records from API.:{data}")
      
        if airfare_data_exists(survey_date, PDS_PRICE_TABLE_NAME):
            return JsonResponse({
                "status": "success",
                "message": f"Data for {survey_date} already exists in database",
                "existing": True
            })
        # Add extra fields to each row
        for row in data:
            row['user_id'] = user_id
            row['user_timestamp'] = f"{user_id}_{survey_date}"
        inserted_rows = save_to_table(data, pds_price_column_mapping, PDS_PRICE_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
