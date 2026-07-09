
from rest_framework.decorators import api_view
from django.http import JsonResponse

from api.capi_api.capi_utils import airfare_data_exists, login_and_get_token, fetch_capi_data, save_to_table
from ..config import API_AIRFARE_DATA_URL, AIRFARE_TABLE_NAME

# Configuration
# AIRFARE_TABLE_NAME = "airfare"

airfare_column_mapping = {
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
        "week_no": "week",
        "quotation": "quot_code",
        "route_code": "route_code",
        "route_name": "route_details",
        "time_slot": "timeslot",
        "airline_name": "airlines",
        "spcl_code": "spcl_code",
        "price_year": "price_year",
        "price_month": "price_month",
        "price": "item_price",
        "journey_date": "journey_date",
        "price_date": "price_date",
        "updated_on": "updated_on",
        "price_remark": "remarks"
    }


@api_view(['GET'])
def fetch_airfare_data_view(request):
    try:
        # auth_header = request.headers.get('Authorization')
        # if not auth_header or not auth_header.startswith('Bearer '):
        #     return JsonResponse({"error": "Authorization token missing or invalid"}, status=401)
        token = login_and_get_token()
        survey_date = request.query_params.get('survey_date', '2025-08-01')
        user_id = request.query_params.get('user_id')
        data = fetch_capi_data(token, survey_date, API_AIRFARE_DATA_URL)
        if airfare_data_exists(survey_date, AIRFARE_TABLE_NAME):
            return JsonResponse({
                "status": "success",
                "message": f"Data for {survey_date} already exists in database",
                "existing": True
            })
            
        for row in data:
            row['user_id'] = user_id
            row['user_timestamp'] = f"{user_id}_{survey_date}"
        inserted_rows = save_to_table(data, airfare_column_mapping, AIRFARE_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
