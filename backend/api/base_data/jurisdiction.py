from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import connection

import math
import json
from django.core.serializers.json import DjangoJSONEncoder

from api.schema.master_item import fetch_base_item
from api.utils import convert_json
from datetime import datetime  # import only the datetime class



@api_view(["GET"])
def base_master_items(request):
    print('base_master_items====',request.query_params)

   
    iteration = request.query_params.get('iteration')
    tab_name= request .query_params.get('tab')
    tab_mapping = {
    "groups": "group_master",
    "subgroups": "subgroup_master",
    "category": "category_master",
    "market": "market_master",
    "section": "section_master",
    "weighted_item": "weighted_item_master",
    "gs": "gs_master",
    "price_item": "price_item_master"
}

    # Default to original tab if not in mapping
    final_tab = tab_mapping.get(tab_name, tab_name)
    print('final_tab====',final_tab)
        
 
                 



    if not all([final_tab]):
        return Response({"error": "Missing required parameters."}, status=status.HTTP_400_BAD_REQUEST)


    try:
        data = fetch_base_item(final_tab)
        json_data = json.dumps({ 'data':data}, cls=convert_json.SafeFloatEncoder)
        return Response(json.loads(json_data), status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)