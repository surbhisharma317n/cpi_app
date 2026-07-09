
from rest_framework.decorators import api_view
from django.http import JsonResponse

from api.capi_api.capi_utils import airfare_data_exists, fetch_capi_data_from_post_api, login_and_get_token, fetch_capi_data, save_to_table
from ..config import API_HOUSERENT_URBAN_DATA_URL, URBAN_HOUSE_RENT_TABLE_NAME

# Configuration
# URBAN_HOUSE_RENT_TABLE_NAME = "urban_housing_rent"

urban_house_rent_column_mapping = {
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
    
    "dwelling_serial_no": "dwelling_serial_no",
    "month": "price_month",
    "year": "price_year",
    "dwelling_code": "dwelling_code",
    "informant_name": "informant_name",
    "tenant_name": "tenant_name",
    "informant_relation": "informant_relation",
    "dwelling_status": "dwelling_status",
    "segment_population": "segment_population",
    "dwelling_type": "dwelling_type",
    "dwelling_category": "dwelling_category",
    "flat_bunglow_house_no": "flat_bunglow_house_no",
    "floor_no": "floor_no",
    "premises_name": "premises_name",
    "street_Road_Lane": "street_road_lane",
    "mohalla_area": "mohalla_area",
    "pin_code": "pincode",
    "number_of_living_room": "no_living_room",
    "area_of_living_room": "area_living_room_sq_m",
    "number_of_kitchen": "no_kitchen",
    "number_of_store_rooms": "no_storeroom",
    "number_of_bathroom": "no_bathroom",
    "number_of_latrines": "no_latrines",
    "court_yard": "courtyard",
    "varandah": "varandah",
    "total_rent_payable": "total_rent_payable",
    "total_rent_six_month_ago": "total_rent_six_month_ago",
    "rent_change_reason": "reason_for_change",
    "grp_House_Rent_Inclusive_Maintain": "grp_house_rent_inclusive_maintain",
    "aver_Month_Society_Charge_payable": "aver_month_society_charge_payable",
    "dwelling_Furnished": "dwelling_furnished",
    "residence_Duration": "residence_duration",
    "rent_Inclusive_Electric": "rent_inclusive_electric",
    "aver_Month_Electric_Charge": "aver_month_electric_charge",
    "rent_Inclusive_Water": "rent_inclusive_water",
    "aver_Month_Water_Charge": "aver_month_water_charge",
    "municipal_Tax": "municipal_tax",
    "aver_Municipal_Tax_Payable": "aver_municipal_tax_payable",
    "advance_Amt": "advance_amt",
    "advance_Paid_Adjustable_Monthly": "advance_paid_adjustable_monthly",
    "aver_Advance_Adjust_Amt": "aver_advance_adjust_amt",
    "repairing_Cost": "repairing_cost",
    "repairing_Cost_Six_month": "repairing_cost_six_month",
    "remarks": "remarks"
}


@api_view(['POST'])
def fetch_urban_house_rent_data_view(request):
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
        if airfare_data_exists(survey_date, URBAN_HOUSE_RENT_TABLE_NAME):
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
                API_HOUSERENT_URBAN_DATA_URL,
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
            
        inserted_rows = save_to_table(all_data, urban_house_rent_column_mapping, URBAN_HOUSE_RENT_TABLE_NAME)
        return JsonResponse({
            "status": "success",
            "inserted": inserted_rows,
            "existing": False,
            "message": f"Successfully inserted {inserted_rows} records"
        })
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=500)
