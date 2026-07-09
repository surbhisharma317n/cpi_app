from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from api.transcation.merge_market_data import process_market_item_data

rural_market = "rural_item_price"
urban_market = "urban_item_price"


@api_view(['GET'])
def trans_rural_market_price_item(request):
    print("start the insertion")
    result = process_market_item_data(rural_market)
    print("end the insertion")
    if result["status"] == "success":
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def trans_urban_market_price_item(request):
    print("start the insertion")
    result = process_market_item_data(urban_market)
    print("end the insertion")
    if result["status"] == "success":
        return Response(result, status=status.HTTP_200_OK)
    return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)