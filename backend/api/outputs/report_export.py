from io import BytesIO
import io
from django.http import FileResponse, HttpResponse
from rest_framework.decorators import api_view
import pandas as pd

from api.outputs.All_India_index_item import fetch_AllIndiaLevel_parquet_data
from api.outputs.fetch_index import fetch_AllIndiaLevel_parquet_data_export
from rest_framework.response import Response

from rest_framework.decorators import api_view
from rest_framework import status


# Your level mapping
LEVEL_MAP = {
    "all": "all",
    "general": "all",
    "division": "division",
    "group": "group",
    "class": "class",
    "subclass": "subclass",
    "witem": "witem",
}

# Example main tabs you want to export
MAIN_TABS = ["state_wise", "all_india"]

@api_view(["GET"])
def download_all_india_excel_respective_tabs(request):
    """
    API to export all India data in respective tabs/sheets.
    Each main tab + subtab combination will be a sheet in Excel.
    """
    iteration = request.query_params.get("iteration")
    month = request.query_params.get("month")
    year = request.query_params.get("year")

    all_data = {}

    # Loop through all main tabs
    for tab_name in MAIN_TABS:
        for subtab_name in LEVEL_MAP.keys():
            sheet_name = f"{tab_name}_{subtab_name}"[:31]  # max 31 chars for Excel
            try:
                # Fetch data
                data = fetch_AllIndiaLevel_parquet_data(tab_name, subtab_name, month, year, iteration)
                all_data[sheet_name] = data.get("data", [])
            except Exception as e:
                # Put error info if fetching fails
                all_data[sheet_name] = [{"error": str(e)}]

    # Create in-memory Excel
    output = BytesIO()
    with pd.ExcelWriter(output, engine="xlsxwriter") as writer:
        for sheet_name, records in all_data.items():
            if not records:
                continue
            df = pd.DataFrame(records)
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    output.seek(0)

    # Build downloadable response
    response = HttpResponse(
        output,
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename="all_india_index.xlsx"'
    return response



    
   
@api_view(["POST"])
def export_all_india_index(request):
    try:
        tab = request.data.get("tab")
        sub_tab = request.data.get("subTab")
        month = request.data.get("month")
        year = request.data.get("year")
        compile_type = request.data.get("compile_type")

        data = fetch_AllIndiaLevel_parquet_data_export(
            tab_name=tab,
            subtab_name=sub_tab,
            month=month,
            year=year,
            compile_type=compile_type
        )

        return Response({
            "data": data
        })

    except Exception as e:
        return Response(
            {"error": str(e)},
            status=500
        )
        
@api_view(["POST"])
def export_all_india_index3(request):
    try:
        tab = request.data.get("tab")
        sub_tab = request.data.get("subTab")
        month = request.data.get("month")
        year = request.data.get("year")
        compile_type = request.data.get("compile_type")

        # Fetch export data
        data = fetch_AllIndiaLevel_parquet_data_export(
            tab_name=tab,
            subtab_name=sub_tab,
            month=month,
            year=year,
            compile_type=compile_type,
        )

        if not data:
            return FileResponse(
                io.BytesIO(),
                as_attachment=True,
                filename="empty.xlsx",
            )

        # Convert to DataFrame
        df = pd.DataFrame(data)

        # Create Excel in memory
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine="xlsxwriter") as writer:
            df.to_excel(writer, index=False, sheet_name="Data")

        buffer.seek(0)

        filename = f"{tab}_{sub_tab}_{month}_{year}.xlsx"

        return FileResponse(
            buffer,
            as_attachment=True,
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    except Exception as e:
        return FileResponse(
            io.BytesIO(str(e).encode()),
            as_attachment=True,
            filename="error.txt",
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
