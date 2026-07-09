import uuid
import os
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class TimeStampedModel(models.Model):
    """Abstract base model with created and modified timestamps"""
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Dataset(TimeStampedModel):
    """Dataset model representing processed data"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    zip_hash = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    validated_path = models.CharField(max_length=500, null=True, blank=True)
    compiled_path = models.CharField(max_length=500, null=True, blank=True)
    db_saved = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='api_datasets'  # Unique related_name
    )

    class Meta:
        db_table = 'api_datasets'  # Explicit table name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['zip_hash']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Dataset {self.zip_hash[:8]} - {self.status}"


class UploadSession(TimeStampedModel):
    """Upload session model for tracking file uploads"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('UPLOADING', 'Uploading'),
        ('VALIDATING', 'Validating'),
        ('VALIDATED', 'Validated'),
        ('FAILED', 'Failed'),
    ]
    
    COMPILE_TYPE_CHOICES = [
        ('PROVISIONAL', 'Provisional'),
        ('FINAL', 'Final'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='api_upload_sessions'  # Unique related_name
    )
    dataset = models.ForeignKey(
        Dataset, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='api_upload_sessions'  # Unique related_name
    )
    
    month = models.CharField(max_length=3, db_index=True)
    year = models.IntegerField(db_index=True)
    compile_type = models.CharField(max_length=20, choices=COMPILE_TYPE_CHOICES, default='PROVISIONAL')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    current_step = models.CharField(max_length=100, default='Initializing')
    progress_percent = models.IntegerField(default=0)
    
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)
    
    validation_summary = models.JSONField(default=dict, blank=True)
    zip_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    zip_file = models.FileField(upload_to='uploads/%Y/%m/%d/', null=True, blank=True)
    zip_size = models.BigIntegerField(null=True, blank=True)
    
    is_duplicate = models.BooleanField(default=False)

    class Meta:
        db_table = 'api_upload_sessions'  # Explicit table name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status', 'progress_percent']),
        ]

    def __str__(self):
        return f"UploadSession {self.id} - {self.status}"


class UploadFileStatus(TimeStampedModel):
    """Individual file status within an upload session"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('uploading', 'Uploading'),
        ('validating', 'Validating'),
        ('success', 'Success'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        UploadSession, 
        on_delete=models.CASCADE, 
        related_name='api_file_statuses'  # Unique related_name
    )
    
    file_id = models.CharField(max_length=100)
    file_name = models.CharField(max_length=500)
    file_path = models.CharField(max_length=1000, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    progress = models.IntegerField(default=0)
    size = models.CharField(max_length=50, blank=True)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    
    message = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    validation_results = models.JSONField(default=dict, blank=True)
    error_details = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'api_upload_file_statuses'  # Explicit table name
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['session', 'status']),
        ]

    def __str__(self):
        return f"{self.file_name} - {self.status}"


class CompilationTask(TimeStampedModel):
    """Compilation task model for tracking compilation progress"""
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROGRESS', 'In Progress'),
        ('SUCCESS', 'Success'),
        ('FAILURE', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.CharField(max_length=100, unique=True, db_index=True)
    session = models.ForeignKey(
        UploadSession, 
        on_delete=models.CASCADE, 
        related_name='api_compilations'  # Unique related_name
    )
    dataset = models.ForeignKey(
        Dataset, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='api_compilations'  # Unique related_name
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    progress = models.IntegerField(default=0)
    current_stage = models.CharField(max_length=100, default='Initializing')
    stage_details = models.TextField(blank=True)
    
    result_url = models.CharField(max_length=500, null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    stages = models.JSONField(default=list)
    metrics = models.JSONField(default=dict)

    class Meta:
        db_table = 'api_compilation_tasks'  # Explicit table name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['task_id']),
            models.Index(fields=['status', 'progress']),
        ]

    def __str__(self):
        return f"Compilation {self.task_id[:8]} - {self.status}"


class CompilationStage(models.Model):
    """Individual stage within a compilation task"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(
        CompilationTask, 
        on_delete=models.CASCADE, 
        related_name='api_stages'  # Unique related_name
    )
    
    name = models.CharField(max_length=100)
    status = models.CharField(
        max_length=20, 
        choices=CompilationTask.STATUS_CHOICES, 
        default='PENDING'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True)
    details = models.TextField(blank=True)
    progress = models.IntegerField(default=0)
    current_file = models.CharField(max_length=500, blank=True)
    files_processed = models.IntegerField(default=0)
    total_files = models.IntegerField(default=0)

    class Meta:
        db_table = 'api_compilation_stages'  # Explicit table name
        ordering = ['started_at']


class FileValidationResult(models.Model):
    """Detailed validation results for files"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_status = models.OneToOneField(
        UploadFileStatus, 
        on_delete=models.CASCADE, 
        related_name='api_validation_detail'  # Unique related_name
    )
    
    schema_valid = models.BooleanField(default=False)
    data_valid = models.BooleanField(default=False)
    
    required_columns = models.JSONField(default=list)
    missing_columns = models.JSONField(default=list)
    data_type_errors = models.JSONField(default=list)
    null_constraint_violations = models.JSONField(default=list)
    business_rule_violations = models.JSONField(default=list)

    class Meta:
        db_table = 'api_file_validation_results'  # Explicit table name


class ProcessStats(models.Model):
    """Process statistics for analytics"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(
        UploadSession, 
        on_delete=models.CASCADE, 
        related_name='api_stats'  # Unique related_name
    )
    
    upload_start_time = models.DateTimeField(null=True, blank=True)
    upload_end_time = models.DateTimeField(null=True, blank=True)
    compile_start_time = models.DateTimeField(null=True, blank=True)
    compile_end_time = models.DateTimeField(null=True, blank=True)
    
    upload_duration_ms = models.IntegerField(null=True, blank=True)
    compile_duration_ms = models.IntegerField(null=True, blank=True)
    
    zip_hash = models.CharField(max_length=64, blank=True)
    is_duplicate = models.BooleanField(default=False)
    
    total_records_processed = models.BigIntegerField(default=0)
    total_file_size_mb = models.FloatField(default=0)
    peak_memory_mb = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'api_process_stats'  # Explicit table name
        indexes = [
            models.Index(fields=['session']),
        ]


class AggregatedResult(models.Model):
    """Model for storing aggregated compilation results - optimized for COPY"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        UploadSession, 
        on_delete=models.CASCADE, 
        related_name='api_aggregated_results'  # Unique related_name
    )
    dataset = models.ForeignKey(
        Dataset, 
        on_delete=models.CASCADE, 
        related_name='api_aggregated_results'  # Unique related_name
    )
    
    # Data fields - adjust based on your actual data structure
    category = models.CharField(max_length=100, db_index=True)
    sub_category = models.CharField(max_length=100, null=True, blank=True)
    value_sum = models.DecimalField(max_digits=20, decimal_places=4)
    value_avg = models.DecimalField(max_digits=20, decimal_places=4)
    value_count = models.BigIntegerField()
    value_min = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    value_max = models.DecimalField(max_digits=20, decimal_places=4, null=True)
    
    # Time dimensions
    compilation_month = models.CharField(max_length=3)
    compilation_year = models.IntegerField()
    compile_type = models.CharField(max_length=20)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        db_table = 'api_aggregated_results'  # Explicit table name
        indexes = [
            models.Index(fields=['category', 'compilation_month', 'compilation_year']),
            models.Index(fields=['session', 'dataset']),
        ]