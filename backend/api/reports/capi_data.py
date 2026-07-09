from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder

from api.schema.capi_db import fetch_capi_input_data
from api.utils import convert_json



@api_view(["GET"])
def capi_report(request):

    month_year = request.query_params.get('month_year')
    iteration = request.query_params.get('iteration')
    tab_name= request .query_params.get('tab')

    if not all([tab_name, month_year, iteration]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

    params = ( month_year, iteration)

    try:
        data = fetch_capi_input_data(params,tab_name)
        json_data = json.dumps({"data": data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)