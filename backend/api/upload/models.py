# models.py
from django.db import models
from django.contrib.auth.models import User
import uuid
import json

class UploadSession(models.Model):
    """Session for tracking upload process"""
    STATUS_CHOICES = [
        ('uploaded', 'Uploaded'),
        ('extracting', 'Extracting'),
        ('validating', 'Validating'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='upload_sessions')
    zip_file_name = models.CharField(max_length=255)
    zip_file_path = models.CharField(max_length=500)
    
    month = models.CharField(max_length=10)
    year = models.IntegerField()
    compile_type = models.CharField(max_length=20)
    
    total_files = models.IntegerField(default=0)
    total_records = models.IntegerField(default=0)
    inserted_records = models.IntegerField(default=0)
    failed_records = models.IntegerField(default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    validation_errors = models.JSONField(default=dict, blank=True)
    processing_errors = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'upload_sessions'
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['session_id']),
        ]

class ParquetFile(models.Model):
    """Individual Parquet file status"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('validating', 'Validating'),
        ('validated', 'Validated'),
        ('failed', 'Failed'),
        ('processing', 'Processing'),
        ('uploaded', 'Uploaded'),
    ]
    
    session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, related_name='parquet_files')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    table_name = models.CharField(max_length=255)  # Corresponding database table
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    record_count = models.IntegerField(default=0)
    inserted_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    
    # Validation info
    validation_errors = models.JSONField(default=dict, blank=True)
    missing_columns = models.JSONField(default=list, blank=True)
    extra_columns = models.JSONField(default=list, blank=True)
    column_mismatches = models.JSONField(default=list, blank=True)
    data_type_errors = models.JSONField(default=list, blank=True)
    
    # Schema info
    expected_schema = models.JSONField(default=list, blank=True)
    actual_schema = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    validated_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'parquet_files'
        indexes = [
            models.Index(fields=['session', 'status']),
            models.Index(fields=['file_name']),
        ]
        unique_together = ['session', 'file_name']

class ProcessingLog(models.Model):
    """Log for processing steps"""
    LOG_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('debug', 'Debug'),
    ]
    
    session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, related_name='logs')
    parquet_file = models.ForeignKey(ParquetFile, on_delete=models.CASCADE, null=True, blank=True)
    level = models.CharField(max_length=10, choices=LOG_LEVELS)
    message = models.TextField()
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'processing_logs'
        indexes = [
            models.Index(fields=['session', 'created_at']),
            models.Index(fields=['level']),
        ]

# Target tables for data insertion (you should have these in your database)
"""
CREATE TABLE rural_market_data (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    month VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    region VARCHAR(50),
    unit VARCHAR(20),
    market VARCHAR(100),
    upload_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_status VARCHAR(20) DEFAULT 'pending'
);

-- Similar tables for other file types:
-- urban_market_data
-- rural_housing_rent_data
-- urban_housing_rent_data
-- rural_elect_data
-- urban_elect_data
-- online_market_data
-- airfare_data
-- urban_pds_data
"""