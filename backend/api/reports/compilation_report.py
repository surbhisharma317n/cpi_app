from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder

from api.schema.report_db import fetch_comparison_report_data,fetch_Weighted_output
from api.utils import convert_json



@api_view(["GET"])
def comp_report(request):
    release_type = request.query_params.get('release_type')
    month_year = request.query_params.get('month_year')
    iteration = request.query_params.get('iteration')

    if not all([release_type, month_year, iteration]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

    params = (release_type, month_year, iteration)

    try:
        data = fetch_comparison_report_data(params)
        json_data = json.dumps({"data": data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(["GET"])    
def Weight_reports(request):
    release_type = request.query_params.get('release_type')
    month_year = request.query_params.get('month_year')
    iteration = request.query_params.get('iteration')

    # if not ([ month_year]):
    #     return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

    params = ( month_year)

    try:
        data = fetch_Weighted_output(month_year)
        json_data = json.dumps({"data": data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)