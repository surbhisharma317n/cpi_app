from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection
import uuid
import os

User = get_user_model()


class UploadSession(models.Model):
    """Represents an upload session with multiple files."""
    
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        UPLOADING = 'UPLOADING', 'Uploading'
        VALIDATING = 'VALIDATING', 'Validating'
        VALIDATED = 'VALIDATED', 'Validated'
        FAILED = 'FAILED', 'Failed'
        READY = 'READY', 'Ready for Compilation'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='upload_sessions')
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Upload stats
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)
    
    # Compilation parameters
    month = models.CharField(max_length=10)
    year = models.IntegerField()
    compile_type = models.CharField(max_length=20, choices=[
        ('PROVISIONAL', 'Provisional'),
        ('FINAL', 'Final')
    ])
    
    # Validation results
    validation_summary = models.JSONField(null=True, blank=True)
    
    # Performance metrics
    total_records = models.BigIntegerField(default=0)
    total_size_bytes = models.BigIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', 'created_at']),
            models.Index(fields=['session_id']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.session_id} - {self.status}"
    
    @classmethod
    def bulk_update_status(cls, session_ids, new_status):
        """Bulk update session status using raw SQL for performance."""
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE uploads_uploadsession 
                SET status = %s, updated_at = NOW()
                WHERE session_id = ANY(%s)
            """, [new_status, session_ids])
    
    def update_stats_bulk(self, total_files=None, processed_files=None, failed_files=None):
        """Update stats using raw SQL for performance."""
        updates = []
        params = []
        
        if total_files is not None:
            updates.append("total_files = total_files + %s")
            params.append(total_files)
        
        if processed_files is not None:
            updates.append("processed_files = processed_files + %s")
            params.append(processed_files)
        
        if failed_files is not None:
            updates.append("failed_files = failed_files + %s")
            params.append(failed_files)
        
        if updates:
            params.append(str(self.id))
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    UPDATE uploads_uploadsession 
                    SET {', '.join(updates)}, updated_at = NOW()
                    WHERE id = %s
                """, params)


class FileStatus(models.Model):
    """Tracks status of individual uploaded files."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        UPLOADING = 'uploading', 'Uploading'
        VALIDATING = 'validating', 'Validating'
        SUCCESS = 'success', 'Success'
        ERROR = 'error', 'Error'
        WARNING = 'warning', 'Warning'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload_session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, related_name='file_statuses')
    file_id = models.CharField(max_length=100, db_index=True)
    file_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress = models.IntegerField(default=0)  # 0-100 percentage
    size = models.CharField(max_length=50, blank=True, null=True)
    
    # Status messages
    message = models.TextField(blank=True, null=True)
    validation_result = models.JSONField(null=True, blank=True)
    error_details = models.JSONField(null=True, blank=True)
    
    # Performance metrics
    record_count = models.BigIntegerField(default=0)
    file_size_bytes = models.BigIntegerField(default=0)
    processing_time = models.FloatField(default=0.0)  # in seconds
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['upload_session', 'status'], name='idx_file_session_status'),
            models.Index(fields=['file_id'], name='idx_file_id'),
            models.Index(fields=['status', 'created_at'], name='idx_status_created'),
        ]
        unique_together = ['upload_session', 'file_id']
    
    def __str__(self):
        return f"{self.file_name} - {self.status}"
    
    @classmethod
    def bulk_create_statuses(cls, statuses_data):
        """Bulk create file statuses using raw SQL for performance."""
        if not statuses_data:
            return
        
        values = []
        params = []
        
        for data in statuses_data:
            values.append("(%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())")
            params.extend([
                data['upload_session_id'],
                data['file_id'],
                data['file_name'],
                data['status'],
                data.get('progress', 0),
                data.get('size', ''),
                data.get('message', '')
            ])
        
        with connection.cursor() as cursor:
            cursor.execute(f"""
                INSERT INTO uploads_filestatus 
                (upload_session_id, file_id, file_name, status, progress, size, message, created_at, updated_at)
                VALUES {', '.join(values)}
            """, params)


class UploadedFile(models.Model):
    """Stores actual uploaded file data with performance optimizations."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload_session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, related_name='uploaded_files')
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.BigIntegerField()
    checksum = models.CharField(max_length=64, blank=True, null=True)
    
    # Processing info
    is_processed = models.BooleanField(default=False)
    is_valid = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Data metrics
    record_count = models.BigIntegerField(default=0)
    column_count = models.IntegerField(default=0)
    schema_hash = models.CharField(max_length=64, blank=True, null=True)
    
    # Metadata
    metadata = models.JSONField(null=True, blank=True)
    
    # Partition info for large files
    partition_key = models.CharField(max_length=100, blank=True, null=True)
    is_partitioned = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['upload_session', 'is_processed'], name='idx_session_processed'),
            models.Index(fields=['is_valid', 'is_processed'], name='idx_valid_processed'),
            models.Index(fields=['partition_key'], name='idx_partition_key'),
            models.Index(fields=['created_at'], name='idx_created_at'),
        ]
    
    def __str__(self):
        return self.original_filename
    
    @classmethod
    def bulk_update_processing(cls, file_ids, is_processed=True, is_valid=None, record_count=None):
        """Bulk update file processing status using raw SQL."""
        updates = ["is_processed = %s"]
        params = [is_processed]
        
        if is_valid is not None:
            updates.append("is_valid = %s")
            params.append(is_valid)
        
        if record_count is not None:
            updates.append("record_count = %s")
            params.append(record_count)
        
        updates.append("processed_at = NOW()")
        
        params.append(list(file_ids))
        
        with connection.cursor() as cursor:
            cursor.execute(f"""
                UPDATE uploads_uploadedfile 
                SET {', '.join(updates)}
                WHERE id = ANY(%s)
            """, params)