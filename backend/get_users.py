import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cpi_api.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT id, username, email FROM auth_user LIMIT 20;")
    users = cursor.fetchall()
    print("Available Users:")
    print("=" * 60)
    for user_id, username, email in users:
        print(f"ID: {user_id:3} | Username: {username:20} | Email: {email}")
