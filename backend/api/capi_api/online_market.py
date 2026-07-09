
from rest_framework.decorators import api_view
from django.http import JsonResponse

from api.capi_api.capi_utils import airfare_data_exists, fetch_capi_data_from_post_api, login_and_get_token, fetch_capi_data, save_to_table
from ..config import API_ECOMMERCE_PRICES_DATA_URL, URBAN_ONLINE_PRICE_TABLE_NAME

# Configuration
# URBAN_ONLINE_PRICE_TABLE_NAME = "urban_online"

ecommerce_prices_column_mapping = {
    "user_id": "user_id",
    "user_timestamp": "user_timestamp",

    "sector_code": "sector_code",      # if missing in API, you may pass default/null
    "sector_name": "sector_name",      # same here

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
    "group_code": "item_group_code",
    "group_name": "item_group_name",
    "subgroup_code": "item_subgroup_code",
    "subgroup_name": "item_subgroup_name",
    "item_code": "item_code",
    "item_name": "item_name",
    "item_spec": "item_spec",
    "unit": "unit",
    "quantity": "quantity",
    "spcl_code": "spcl_code",
    "website_type": "shop_type",   # API gives website_type → DB expects shop_type
    "item_price": "item_price",
    "price_week": "week",
    "price_year": "price_year",
    "price_month": "price_month",
    "price_remark": "remarks",
}


@api_view(['POST'])
def fetch_online_ecommerce_data_view(request):
    try:
        # auth_header = request.headers.get('Authorization')
        # if not auth_header or not auth_header.startswith('Bearer '):
        #     return JsonResponse({"error": "Authorization token missing or invalid"}, status=401)
        token = login_and_get_token()
        survey_date = request.query_params.get('survey_date', '2025-04-01')
        user_id = request.query_params.get('user_id')
        if survey_date is None or user_id is None:
            return JsonResponse({"error": "survey_date and user_id are required parameters"}, status=400)
        # page_number = request.query_params.get('pageNumber', 0)
        page_size = request.query_params.get('pageSize', 100)
        # data = fetch_capi_data_from_post_api(token, survey_date, API_HOUSERENT_URBAN_DATA_URL, page_number, page_size)
        if airfare_data_exists(survey_date, URBAN_ONLINE_PRICE_TABLE_NAME):
            return JsonResponse({
                "status": "success",
                "message": f"Data for {survey_date} already exists in database",
                "existing": True
            })
            
        all_data = []
        page_number = 1

        while True:
            # Fetch one page
            page_data = fetch_capi_data_from_post_api(
                token,
                survey_date,
                API_ECOMMERCE_PRICES_DATA_URL,
                page_number,
                page_size
            )
            # If no data, stop looping
            if not page_data or len(page_data) == 0:
                break
            all_data.extend(page_data)
            page_number += 1  # move to next page
        
         # Add extra fields to each row
        for row in all_data:
            row['user_id'] = user_id
            row['user_timestamp'] = f"{user_id}_{survey_date}"
            
        inserted_rows = save_to_table(all_data, ecommerce_prices_column_mapping, URBAN_ONLINE_PRICE_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
