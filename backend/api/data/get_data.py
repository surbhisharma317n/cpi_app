from rest_framework.decorators import api_view
from rest_framework.response import Response
import requests
from django.db import connection


@api_view(["POST"])
def get_data_query(request):
    
    month = request.query_params.get('month', None)
    year = request.query_params.get('year', None)
    
    if not month or not year:
        return Response({"error": "Month and year are required parameters."}, status=400)
    
    url = "https://api.example.com/data"
    
    params = {
        "month": month,
        "year": year
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()  # Raise an error for bad responses
        data = response.json()
        
        if not data:
            return Response({"message": "No data found for the given parameters."}, status=404)
        
        query = """ INSERT INTO data_table (month, year, data)
                    VALUES (%s, %s, %s)
                    RETURNING id, month, year, data;""" 
        with connection.cursor() as cursor:
            cursor.execute(query, (month, year, data))
            inserted_data = cursor.fetchall()
        if not inserted_data:
            return Response({"message": "Data insertion failed."}, status=500)
        data = {"id": inserted_data[0][0],
            "month": inserted_data[0][1],
            "year": inserted_data[0][2],
            "data": inserted_data[0][3]
        }   
        
        return Response({"data": data}, status=200)
    
    except requests.exceptions.RequestException as e:
        return Response({"error": str(e)}, status=500)
    
    
    