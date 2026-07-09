from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder

from api.schema.capi_input import fetch_capi_input_data
from api.utils import convert_json
from datetime import datetime  # import only the datetime class



@api_view(["GET"])
def capi_new_report(request):

    month_year = request.query_params.get('month_year')
    iteration = request.query_params.get('iteration')
    tab_name= request .query_params.get('tab')
    
    print(month_year,'month_yearmonth_year====')
    date_obj = datetime.strptime(month_year, "%b_%Y")
    month =int(date_obj.strftime("%m"))
    year= int(date_obj.strftime("%Y"))


    if not all([tab_name, month_year]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)

    params = ( month,year)
    print(month,year)

    try:
        data = fetch_capi_input_data(params,tab_name)
        json_data = json.dumps({"data": data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)