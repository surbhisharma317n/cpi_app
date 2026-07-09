from django.contrib import admin
from .models import (
    Dataset, UploadSession, UploadFileStatus, 
    CompilationTask, CompilationStage, FileValidationResult,
    ProcessStats, AggregatedResult
)

# from .models import Dataset, UploadSession, UploadFileStatus, CompilationTask, CompilationStage, ProcessStats, AggregatedResult


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ['id', 'zip_hash', 'status', 'db_saved', 'created_at']
    list_filter = ['status', 'db_saved', 'created_at']
    search_fields = ['zip_hash']
    readonly_fields = ['id', 'created_at', 'modified_at']


@admin.register(UploadSession)
class UploadSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'month', 'year', 'status', 'progress_percent', 'created_at']
    list_filter = ['status', 'compile_type', 'month', 'year', 'is_duplicate']
    search_fields = ['user__username', 'zip_hash']
    readonly_fields = ['id', 'created_at', 'modified_at']


@admin.register(UploadFileStatus)
class UploadFileStatusAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'session', 'status', 'progress', 'timestamp']
    list_filter = ['status']
    search_fields = ['file_name']


@admin.register(CompilationTask)
class CompilationTaskAdmin(admin.ModelAdmin):
    list_display = ['task_id', 'session', 'status', 'progress', 'started_at', 'completed_at']
    list_filter = ['status']
    search_fields = ['task_id']


@admin.register(CompilationStage)
class CompilationStageAdmin(admin.ModelAdmin):
    list_display = ['name', 'task', 'status', 'duration']
    list_filter = ['status']


@admin.register(ProcessStats)
class ProcessStatsAdmin(admin.ModelAdmin):
    list_display = ['session', 'upload_duration_ms', 'compile_duration_ms', 'total_records_processed']
    list_filter = ['is_duplicate']


@admin.register(AggregatedResult)
class AggregatedResultAdmin(admin.ModelAdmin):
    list_display = ['category', 'compilation_month', 'compilation_year', 'value_count', 'created_at']
    list_filter = ['category', 'compilation_month', 'compilation_year', 'compile_type']
    search_fields = ['category']