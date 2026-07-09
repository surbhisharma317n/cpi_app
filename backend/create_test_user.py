import os
import django
from django.contrib.auth.hashers import make_password

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cpi_api.settings')
django.setup()

from django.db import connection

# Create test user
email = "test@example.com"
password = "Test@123"
hashed_password = make_password(password)

with connection.cursor() as cursor:
    # Check if user already exists
    cursor.execute("SELECT id FROM auth_user WHERE email = %s;", [email])
    existing = cursor.fetchone()

    if existing:
        print(f"User {email} already exists with ID: {existing[0]}")
    else:
        cursor.execute("""
            INSERT INTO auth_user (first_name, last_name, email, password, phone, role, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW());
        """, ["Test", "User", email, hashed_password, "+91-9999999999", "admin", True])
        print("Test user created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")
