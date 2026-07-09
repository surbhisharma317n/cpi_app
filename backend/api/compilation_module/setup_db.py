from django.core.management.base import BaseCommand
from django.db import connection
import os


class Command(BaseCommand):
    help = 'Setup database with raw SQL for COPY operations'
    
    def handle(self, *args, **options):
        self.stdout.write('Setting up database for COPY operations...')
        
        with connection.cursor() as cursor:
            # Ensure pgcrypto extension for UUID generation
            cursor.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
            
            # Set optimal COPY parameters
            cursor.execute('SET maintenance_work_mem = "1GB";')
            cursor.execute('SET work_mem = "256MB";')
            
            self.stdout.write(self.style.SUCCESS('Database setup complete'))