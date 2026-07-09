import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cpi_api.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Get all tables
    cursor.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public' AND table_type='BASE TABLE'
        LIMIT 20;
    """)
    tables = cursor.fetchall()
    print("Available tables:")
    for table in tables:
        print(f"  - {table[0]}")

# Check auth_user columns
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name='auth_user';
    """)
    columns = cursor.fetchall()
    print("\nauth_user table columns:")
    for col_name, col_type in columns:
        print(f"  - {col_name}: {col_type}")
