
from rest_framework.decorators import api_view
from django.http import JsonResponse

from api.capi_api.capi_utils import airfare_data_exists, fetch_capi_data_from_post_api, login_and_get_token,save_to_table
from ..config import API_MARKET_URBAN_PRICES_DATA_URL, URBAN_ITEM_PRICE_TABLE_NAME

# Configuration
# URBAN_ITEM_PRICE_TABLE_NAME = "urban_item_price"
urban_item_prices_column_mapping = {
    "user_timestamp": "user_timestamp",
    "user_id": "user_id",

    "zone": "zone_id",
    "state_code": "state_code",
    "state_name": "state_name",
    "ro_code": "ro_code",
    "ro_name": "ro_name",
    "srO_Code": "sro_code",      # API key has capital O
    "srO_Name": "sro_name",
    "district_code": "district_code",
    "district_name": "district_name",
    "town_code": "town_code",
    "town_name": "town_name",
    "quotation": "quot_code",    # ✅ fix

    "price_week": "week",
    "group_code": "item_group_code",
    "group_name": "item_group_name",
    "sub_group_code": "item_subgroup_code",
    "sub_group_name": "item_subgroup_name",
    "item_code": "item_code",
    "item_name": "item_name",
    "brand": "brand",
    "quality": "quality",
    "size": "size",
    "packaging": "packaging",
    "composition": "composition",
    "unit": "unit",
    "quantity": "quantity",
    "market_name": "market_name",   # ✅ exists in API
    "spcl_code": "spcl_code",
    "shop_type": "shop_type",
    "shop_name": "shop_name",
    "price_year": "price_year",
    "price_month": "price_month",
    "item_price": "item_price",
    "price_remark": "remarks",     # ✅ fix

    # Extra DB fields
    "variety": "variety",          # keep None if missing
    "item_spec": "item_spec",      # keep None if missing
}




@api_view(['POST'])
def fetch_urban_item_price_data_view(request):
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
        if airfare_data_exists(survey_date, URBAN_ITEM_PRICE_TABLE_NAME):
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
                API_MARKET_URBAN_PRICES_DATA_URL,
                page_number,
                page_size
            )
            # If no data, stop looping
            if not page_data or len(page_data) == 0:
                break
            all_data.extend(page_data)
            page_number += 1  # move to next page
            break
        
         # Add extra fields to each row
        for row in all_data:
            row['user_id'] = user_id
            row['user_timestamp'] = f"{user_id}_{survey_date}"
            
        inserted_rows = save_to_table(all_data, urban_item_prices_column_mapping, URBAN_ITEM_PRICE_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
