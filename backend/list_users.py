import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cpi_api.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT id, first_name, last_name, email, phone, role, is_active
        FROM auth_user
        LIMIT 20;
    """)
    users = cursor.fetchall()
    print("Available Users in Database:")
    print("=" * 100)
    for user_id, first_name, last_name, email, phone, role, is_active in users:
        status = "ACTIVE" if is_active else "INACTIVE"
        print(f"ID: {user_id:3} | {first_name} {last_name} | Email: {email} | Role: {role:15} | {status}")
