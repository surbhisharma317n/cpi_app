import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'cpi_api.settings')
django.setup()

from django.contrib.auth.models import User

users = User.objects.all()
print(f"Total users: {users.count()}")
for user in users:
    print(f"Username: {user.username}, Email: {user.email}, is_staff: {user.is_staff}")
