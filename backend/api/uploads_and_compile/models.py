from django.db import models,migrations
import uuid

class Migration(migrations.Migration):
    dependencies = [
        ('uploads_and_compile', 'previous_migration'),
    ]

    operations = [
        # Add fields to upload_sessions
        migrations.AddField(
            model_name='uploadsession',
            name='file_hash',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
        migrations.AddField(
            model_name='uploadsession',
            name='chunks_received',
            field=models.JSONField(default=list),
        ),
        migrations.AddField(
            model_name='uploadsession',
            name='uploaded_size',
            field=models.BigIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='uploadsession',
            name='created_by',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='uploadsession',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        
        # Add fields to compilation_tasks
        migrations.AddField(
            model_name='compilationtask',
            name='created_by',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='compilationtask',
            name='message',
            field=models.TextField(blank=True),
        ),
        
        # Add fields to database_import_tasks
        migrations.AddField(
            model_name='databaseimporttask',
            name='created_by',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]

class UploadSession(models.Model):
    STATUS_CHOICES = [
        ('UPLOADING', 'Uploading'),
        ('VALIDATING', 'Validating'),
        ('VALIDATED', 'Validated'),
        ('FAILED', 'Failed'),
    ]
    
    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_hash = models.CharField(max_length=64, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPLOADING')
    total_files = models.IntegerField(default=0)
    processed_files = models.IntegerField(default=0)
    failed_files = models.IntegerField(default=0)
    validation_summary = models.JSONField(default=dict)
    chunks_received = models.JSONField(default=list)
    uploaded_size = models.BigIntegerField(default=0)
    created_by = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'upload_sessions'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
class UploadedFile(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('uploading', 'Uploading'),
        ('validating', 'Validating'),
        ('success', 'Success'),
        ('error', 'Error'),
    ]
    
    file_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(UploadSession, on_delete=models.CASCADE, related_name='files')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField()
    file_data = models.BinaryField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progress = models.IntegerField(default=0)
    message = models.TextField(blank=True)
    error_details = models.JSONField(null=True, blank=True)
    row_count = models.IntegerField(null=True, blank=True)
    columns = models.JSONField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'uploaded_files'
        indexes = [
            models.Index(fields=['session', 'status']),
        ]

class CompilationTask(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROGRESS', 'In Progress'),
        ('SUCCESS', 'Success'),
        ('FAILURE', 'Failed'),
    ]
    
    task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(UploadSession, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    progress = models.IntegerField(default=0)
    current_stage = models.CharField(max_length=100)
    stage_details = models.TextField(blank=True)
    result_url = models.CharField(max_length=500, blank=True)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    month = models.CharField(max_length=3)
    year = models.IntegerField()
    compile_type = models.CharField(max_length=20)
    total_records = models.IntegerField(default=0)
    processed_records = models.IntegerField(default=0)
    success_rate = models.FloatField(default=0)
    processing_time = models.FloatField(default=0)
    
    class Meta:
        db_table = 'compilation_tasks'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['session', 'status']),
        ]

class CompilationStage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    stage_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(CompilationTask, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration = models.FloatField(default=0)
    details = models.TextField(blank=True)
    
    class Meta:
        db_table = 'compilation_stages'
        ordering = ['started_at']

class CompiledOutput(models.Model):
    output_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compilation_task = models.ForeignKey(CompilationTask, on_delete=models.CASCADE, related_name='outputs')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=50)
    file_size = models.BigIntegerField()
    file_data = models.BinaryField()
    row_count = models.IntegerField(default=0)
    columns = models.JSONField(default=list)
    summary_stats = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'compiled_outputs'
        indexes = [
            models.Index(fields=['compilation_task']),
            models.Index(fields=['created_at']),
        ]

class DatabaseImportTask(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    
    task_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    compilation_task = models.ForeignKey(CompilationTask, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    progress = models.IntegerField(default=0)
    imported_tables = models.JSONField(default=list)
    failed_tables = models.JSONField(default=list)
    total_records = models.IntegerField(default=0)
    imported_records = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    table_prefix = models.CharField(max_length=100, default='compiled_')
    create_backup = models.BooleanField(default=True)
    import_mode = models.CharField(max_length=20, default='append')
    
    class Meta:
        db_table = 'database_import_tasks'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['compilation_task', 'status']),
        ]

class ImportedData(models.Model):
    import_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    database_task = models.ForeignKey(DatabaseImportTask, on_delete=models.CASCADE, related_name='imported_data')
    table_name = models.CharField(max_length=255)
    record_count = models.IntegerField(default=0)
    import_query = models.TextField()
    imported_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'imported_data'
        indexes = [
            models.Index(fields=['database_task']),
            models.Index(fields=['table_name']),
        ]  