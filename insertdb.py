import csv
import os
import psycopg2
from datetime import datetime

# --- PostgreSQL connection config ---
# Set DB_PASSWORD as an environment variable before running this script.
DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': os.environ.get('DB_PORT', '5432'),
    'dbname': os.environ.get('DB_NAME', 'master_db'),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', ''),
}

CSV_FILE = 'C:/Users/MOSPI/Desktop/item_master/vill_master.csv'
def import_category_data():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        with open(CSV_FILE, mode="r",  encoding="latin1", errors="replace") as file:
            reader = csv.DictReader(file)
            rows = []

            for row in reader:
                rows.append((
                  row.get('village_id'),
                    row.get('nss_village_code'),
                    row.get('nss_village_name'),
                    row.get('lgd_village_code'),
                    row.get('lgd_village_name'),
                    row.get('subdistrict_id'),
                    row.get('district_id'),
                    row.get('valid_from'),  # ✅ fallback
                    row.get('valid_to'),  # ✅ NULL if empty
                    row.get('is_active') or 'true',
                    row.get('created_at') or datetime.now(),
                    row.get('updated_at') or datetime.now(),
                ))

        insert_query = """
           INSERT INTO vill_master (
                village_id,
                nss_village_code,
                nss_village_name,
                lgd_village_code,
                lgd_village_name,
                subdistrict_id,
                district_id,
                valid_from,
                valid_to,
                is_active,
                created_at,
                updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cursor.executemany(insert_query, rows)
        conn.commit()
        print(f"✅ Inserted {len(rows)} records into district_master.")

    except Exception as e:
        print("❌ Error:", e)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


if __name__ == "__main__":
    import_category_data()