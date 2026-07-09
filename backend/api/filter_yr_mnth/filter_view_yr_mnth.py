from django.http import JsonResponse
from django.db import connections

def get_filters(request):
    with connections['final_db'].cursor() as cursor:
        cursor.execute("""
          WITH combined AS (
         SELECT DISTINCT
         EXTRACT(YEAR FROM price_month_year)::int AS year,
         EXTRACT(MONTH FROM price_month_year)::int AS month,
         TRIM(TO_CHAR(price_month_year, 'Month')) AS month_name,
         price_data_status AS status
         FROM price_idx.all_idx
         WHERE price_month_year IS NOT NULL
         AND EXTRACT(YEAR FROM price_month_year) >= 2024

         UNION ALL

         SELECT DISTINCT
         EXTRACT(YEAR FROM price_month_year)::int AS price_year,
         EXTRACT(MONTH FROM price_month_year)::int AS price_month,
         TRIM(TO_CHAR(price_month_year, 'Month')) AS month_name,
         price_data_status AS status
         FROM prices.urban_mkt_prices_legacy
         WHERE price_month_year IS NOT NULL
         AND EXTRACT(YEAR FROM price_month_year) >= 2024
         )
         SELECT DISTINCT ON (year, month)
         year, month, month_name, status
         FROM combined
         ORDER BY year DESC, month DESC, status DESC;
        """)
        rows = cursor.fetchall()

    data = [
        {
            "year": str(row[0]),
            "month": str(row[1]).zfill(2),
            "month_name": row[2].strip(),  # Added .strip() to clean whitespace
            "status": row[3]
        }
        for row in rows
    ]
    return JsonResponse(data, safe=False)