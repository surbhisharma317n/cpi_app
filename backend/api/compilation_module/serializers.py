import uuid
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import (
    Dataset, UploadSession, UploadFileStatus, 
    CompilationTask, CompilationStage, FileValidationResult,
    ProcessStats, AggregatedResult
)

User = get_user_model()


# ==================== USER SERIALIZERS ====================

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'full_name']
        read_only_fields = ['id']
    
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ==================== DATASET SERIALIZERS ====================

class DatasetSerializer(serializers.ModelSerializer):
    """Serializer for Dataset model"""
    created_by_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    upload_session_count = serializers.SerializerMethodField()
    compilation_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Dataset
        fields = [
            'id', 'zip_hash', 'status', 'validated_path', 'compiled_path',
            'db_saved', 'metadata', 'created_by', 'created_by_name',
            'created_by_username', 'upload_session_count', 'compilation_count',
            'created_at', 'modified_at'
        ]
        read_only_fields = ['id', 'created_at', 'modified_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None
    
    def get_created_by_username(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return None
    
    def get_upload_session_count(self, obj):
        return obj.upload_sessions.count()
    
    def get_compilation_count(self, obj):
        return obj.compilations.count()


class DatasetDetailSerializer(DatasetSerializer):
    """Detailed Dataset serializer with related data"""
    upload_sessions = serializers.SerializerMethodField()
    compilations = serializers.SerializerMethodField()
    aggregated_results_count = serializers.SerializerMethodField()
    
    class Meta(DatasetSerializer.Meta):
        fields = DatasetSerializer.Meta.fields + [
            'upload_sessions', 'compilations', 'aggregated_results_count'
        ]
    
    def get_upload_sessions(self, obj):
        sessions = obj.upload_sessions.all()[:10]  # Limit to 10 most recent
        return UploadSessionListSerializer(sessions, many=True).data
    
    def get_compilations(self, obj):
        compilations = obj.compilations.all()[:10]  # Limit to 10 most recent
        return CompilationTaskListSerializer(compilations, many=True).data
    
    def get_aggregated_results_count(self, obj):
        return obj.aggregated_results.count()


class DatasetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new Dataset"""
    
    class Meta:
        model = Dataset
        fields = ['zip_hash', 'metadata']


# ==================== UPLOAD SESSION SERIALIZERS ====================

class UploadFileStatusSerializer(serializers.ModelSerializer):
    """Serializer for UploadFileStatus model"""
    status_display = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadFileStatus
        fields = [
            'id', 'session', 'file_id', 'file_name', 'file_path',
            'status', 'status_display', 'progress', 'progress_percent',
            'size', 'size_bytes', 'message', 'timestamp',
            'validation_results', 'error_details'
        ]
        read_only_fields = ['id', 'timestamp']
    
    def get_status_display(self, obj):
        return dict(UploadFileStatus.STATUS_CHOICES).get(obj.status, obj.status)
    
    def get_progress_percent(self, obj):
        return obj.progress


class UploadSessionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    user_name = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    status_icon = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadSession
        fields = [
            'id', 'user_name', 'month', 'year', 'compile_type',
            'status', 'status_color', 'status_icon', 'progress',
            'total_files', 'processed_files', 'failed_files',
            'is_duplicate', 'created_at'
        ]
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.username
        return None
    
    def get_status_color(self, obj):
        colors = {
            'PENDING': 'bg-amber-50 text-amber-700 border-amber-200',
            'UPLOADING': 'bg-sky-50 text-sky-700 border-sky-200',
            'VALIDATING': 'bg-sky-50 text-sky-700 border-sky-200',
            'VALIDATED': 'bg-emerald-50 text-emerald-700 border-emerald-200',
            'FAILED': 'bg-rose-50 text-rose-700 border-rose-200',
        }
        return colors.get(obj.status, 'bg-gray-50 text-gray-700 border-gray-200')
    
    def get_status_icon(self, obj):
        icons = {
            'PENDING': 'FiClock',
            'UPLOADING': 'FiLoader',
            'VALIDATING': 'FiLoader',
            'VALIDATED': 'FiCheckCircle',
            'FAILED': 'FiXCircle',
        }
        return icons.get(obj.status, 'FiClock')
    
    def get_progress(self, obj):
        return obj.progress_percent


class UploadSessionSerializer(serializers.ModelSerializer):
    """Full serializer for UploadSession model"""
    user_details = UserSerializer(source='user', read_only=True)
    dataset_info = DatasetSerializer(source='dataset', read_only=True)
    file_statuses = UploadFileStatusSerializer(many=True, read_only=True)
    stats = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    missing_files_count = serializers.SerializerMethodField()
    is_ready_for_compilation = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadSession
        fields = [
            'id', 'user', 'user_details', 'dataset', 'dataset_info',
            'month', 'year', 'compile_type', 'status', 'current_step',
            'progress_percent', 'total_files', 'processed_files', 'failed_files',
            'validation_summary', 'zip_hash', 'zip_file', 'zip_size',
            'is_duplicate', 'file_statuses', 'stats', 'duration',
            'missing_files_count', 'is_ready_for_compilation',
            'created_at', 'modified_at'
        ]
        read_only_fields = ['id', 'created_at', 'modified_at']
        extra_kwargs = {
            'user': {'write_only': True},
            'zip_file': {'write_only': True}
        }
    
    def get_stats(self, obj):
        try:
            stats = obj.stats
            return ProcessStatsSerializer(stats).data
        except ProcessStats.DoesNotExist:
            return None
    
    def get_duration(self, obj):
        if not obj.created_at:
            return None
        
        end_time = obj.modified_at or timezone.now()
        duration = (end_time - obj.created_at).total_seconds()
        
        if duration < 60:
            return f"{duration:.1f}s"
        elif duration < 3600:
            return f"{duration/60:.1f}m"
        else:
            return f"{duration/3600:.1f}h"
    
    def get_missing_files_count(self, obj):
        from django.conf import settings
        return max(0, settings.REQUIRED_FILES_COUNT - obj.total_files)
    
    def get_is_ready_for_compilation(self, obj):
        from django.conf import settings
        return (
            obj.status == 'VALIDATED' and 
            obj.total_files == settings.REQUIRED_FILES_COUNT and
            obj.failed_files == 0
        )


class UploadSessionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new UploadSession"""
    
    class Meta:
        model = UploadSession
        fields = ['month', 'year', 'compile_type', 'zip_hash']
    
    def validate_month(self, value):
        valid_months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        if value.upper() not in valid_months:
            raise serializers.ValidationError(f"Month must be one of {valid_months}")
        return value.upper()
    
    def validate_year(self, value):
        current_year = timezone.now().year
        if value < 2000 or value > current_year + 1:
            raise serializers.ValidationError(f"Year must be between 2000 and {current_year + 1}")
        return value


# ==================== COMPILATION SERIALIZERS ====================

class CompilationStageSerializer(serializers.ModelSerializer):
    """Serializer for CompilationStage model"""
    duration_formatted = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = CompilationStage
        fields = [
            'id', 'name', 'status', 'status_display', 'started_at',
            'completed_at', 'duration', 'duration_formatted', 'details',
            'progress', 'current_file', 'files_processed', 'total_files'
        ]
    
    def get_duration_formatted(self, obj):
        if obj.duration:
            if obj.duration < 60:
                return f"{obj.duration:.1f}s"
            elif obj.duration < 3600:
                return f"{obj.duration/60:.1f}m"
            else:
                return f"{obj.duration/3600:.1f}h"
        return None
    
    def get_status_display(self, obj):
        return dict(CompilationTask.STATUS_CHOICES).get(obj.status, obj.status)


class CompilationTaskListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for compilation task lists"""
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    dataset_id = serializers.UUIDField(source='dataset.id', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = CompilationTask
        fields = [
            'id', 'task_id', 'session_id', 'dataset_id', 'status',
            'progress', 'current_stage', 'duration', 'started_at',
            'completed_at', 'created_at'
        ]
    
    def get_duration(self, obj):
        if obj.completed_at and obj.started_at:
            duration = (obj.completed_at - obj.started_at).total_seconds()
            if duration < 60:
                return f"{duration:.1f}s"
            elif duration < 3600:
                return f"{duration/60:.1f}m"
            else:
                return f"{duration/3600:.1f}h"
        return None


class CompilationTaskSerializer(serializers.ModelSerializer):
    """Full serializer for CompilationTask model"""
    session_info = UploadSessionListSerializer(source='session', read_only=True)
    dataset_info = DatasetSerializer(source='dataset', read_only=True)
    stages = serializers.SerializerMethodField()
    metrics_display = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = CompilationTask
        fields = [
            'id', 'task_id', 'session', 'session_info', 'dataset', 'dataset_info',
            'status', 'progress', 'progress_percent', 'current_stage',
            'stage_details', 'result_url', 'error_message', 'started_at',
            'completed_at', 'stages', 'metrics', 'metrics_display',
            'created_at', 'modified_at'
        ]
        read_only_fields = ['id', 'created_at', 'modified_at']
    
    def get_stages(self, obj):
        stages = obj.stage_objects.all().order_by('started_at')
        return CompilationStageSerializer(stages, many=True).data
    
    def get_metrics_display(self, obj):
        metrics = obj.metrics
        if not metrics:
            return {}
        
        return {
            'total_records': f"{metrics.get('total_records', 0):,}",
            'processed_records': f"{metrics.get('processed_records', 0):,}",
            'success_rate': f"{metrics.get('success_rate', 0):.1f}%",
            'processing_time': self._format_duration(metrics.get('processing_time', 0)),
            'records_per_second': f"{metrics.get('records_per_second', 0):,.0f}",
            'memory_usage': f"{metrics.get('memory_usage_mb', 0):.1f} MB",
            'disk_usage': f"{metrics.get('disk_usage_mb', 0):.1f} MB"
        }
    
    def get_progress_percent(self, obj):
        return obj.progress
    
    def _format_duration(self, seconds):
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            return f"{seconds/60:.1f}m"
        else:
            return f"{seconds/3600:.1f}h"


class CompilationTaskCreateSerializer(serializers.Serializer):
    """Serializer for creating a new compilation task"""
    session_id = serializers.UUIDField()
    month = serializers.CharField(max_length=3)
    year = serializers.IntegerField()
    compile_type = serializers.ChoiceField(choices=['PROVISIONAL', 'FINAL'], default='PROVISIONAL')
    
    def validate_session_id(self, value):
        try:
            session = UploadSession.objects.get(id=value)
            if session.status != 'VALIDATED':
                raise serializers.ValidationError("Session must be validated before compilation")
            
            from django.conf import settings
            if session.total_files != settings.REQUIRED_FILES_COUNT:
                raise serializers.ValidationError(
                    f"Expected {settings.REQUIRED_FILES_COUNT} files, found {session.total_files}"
                )
            
        except UploadSession.DoesNotExist:
            raise serializers.ValidationError("Session not found")
        
        return value


# ==================== PROCESS STATS SERIALIZERS ====================

class ProcessStatsSerializer(serializers.ModelSerializer):
    """Serializer for ProcessStats model"""
    upload_duration_formatted = serializers.SerializerMethodField()
    compile_duration_formatted = serializers.SerializerMethodField()
    total_file_size_formatted = serializers.SerializerMethodField()
    records_per_second = serializers.SerializerMethodField()
    
    class Meta:
        model = ProcessStats
        fields = [
            'id', 'session', 'upload_start_time', 'upload_end_time',
            'compile_start_time', 'compile_end_time',
            'upload_duration_ms', 'upload_duration_formatted',
            'compile_duration_ms', 'compile_duration_formatted',
            'zip_hash', 'is_duplicate', 'total_records_processed',
            'total_file_size_mb', 'total_file_size_formatted',
            'peak_memory_mb', 'records_per_second'
        ]
    
    def get_upload_duration_formatted(self, obj):
        if obj.upload_duration_ms:
            return self._format_ms(obj.upload_duration_ms)
        return None
    
    def get_compile_duration_formatted(self, obj):
        if obj.compile_duration_ms:
            return self._format_ms(obj.compile_duration_ms)
        return None
    
    def get_total_file_size_formatted(self, obj):
        if obj.total_file_size_mb:
            if obj.total_file_size_mb < 1024:
                return f"{obj.total_file_size_mb:.1f} MB"
            else:
                return f"{obj.total_file_size_mb/1024:.1f} GB"
        return None
    
    def get_records_per_second(self, obj):
        if obj.total_records_processed and obj.compile_duration_ms:
            return obj.total_records_processed / (obj.compile_duration_ms / 1000)
        return None
    
    def _format_ms(self, ms):
        if ms < 1000:
            return f"{ms}ms"
        elif ms < 60000:
            return f"{ms/1000:.1f}s"
        elif ms < 3600000:
            return f"{ms/60000:.1f}m"
        else:
            return f"{ms/3600000:.1f}h"


# ==================== AGGREGATED RESULTS SERIALIZERS ====================

class AggregatedResultSerializer(serializers.ModelSerializer):
    """Serializer for AggregatedResult model"""
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    dataset_id = serializers.UUIDField(source='dataset.id', read_only=True)
    
    class Meta:
        model = AggregatedResult
        fields = [
            'id', 'session_id', 'dataset_id', 'category', 'sub_category',
            'value_sum', 'value_avg', 'value_count', 'value_min', 'value_max',
            'compilation_month', 'compilation_year', 'compile_type', 'created_at'
        ]


class AggregatedResultListSerializer(serializers.Serializer):
    """Serializer for aggregated results list with summary"""
    results = AggregatedResultSerializer(many=True)
    summary = serializers.SerializerMethodField()
    
    def get_summary(self, obj):
        results = obj.get('results', [])
        if not results:
            return {}
        
        return {
            'total_records': len(results),
            'total_value_sum': sum(r.value_sum for r in results),
            'average_value': sum(r.value_avg for r in results) / len(results),
            'categories': list(set(r.category for r in results))
        }


# ==================== VALIDATION SERIALIZERS ====================

class FileValidationResultSerializer(serializers.ModelSerializer):
    """Serializer for FileValidationResult model"""
    file_name = serializers.SerializerMethodField()
    
    class Meta:
        model = FileValidationResult
        fields = [
            'id', 'file_status', 'file_name', 'schema_valid', 'data_valid',
            'required_columns', 'missing_columns', 'data_type_errors',
            'null_constraint_violations', 'business_rule_violations'
        ]
    
    def get_file_name(self, obj):
        if obj.file_status:
            return obj.file_status.file_name
        return None


class ValidationSummarySerializer(serializers.Serializer):
    """Serializer for validation summary (matches frontend type)"""
    missing_files = serializers.ListField(child=serializers.CharField(), default=list)
    schema_errors = serializers.ListField(child=serializers.DictField(), default=list)
    data_errors = serializers.ListField(child=serializers.DictField(), default=list)
    total_errors = serializers.IntegerField(default=0)
    total_warnings = serializers.IntegerField(default=0)


# ==================== DUPLICATE CHECK SERIALIZERS ====================

class DuplicateCheckSerializer(serializers.Serializer):
    """Serializer for checking duplicate datasets"""
    zip_hash = serializers.CharField(max_length=64, required=True)
    file_size = serializers.IntegerField(min_value=0, required=True)
    
    def validate_zip_hash(self, value):
        if len(value) != 64:
            raise serializers.ValidationError("Invalid hash length. Expected 64 characters.")
        return value


class DuplicateCheckResponseSerializer(serializers.Serializer):
    """Serializer for duplicate check response"""
    exists = serializers.BooleanField()
    dataset = DatasetSerializer(required=False, allow_null=True)
    message = serializers.CharField()


# ==================== REUSE DATASET SERIALIZERS ====================

class ReuseDatasetSerializer(serializers.Serializer):
    """Serializer for reusing an existing dataset"""
    month = serializers.CharField(max_length=3, required=True)
    year = serializers.IntegerField(required=True)
    compile_type = serializers.ChoiceField(
        choices=['PROVISIONAL', 'FINAL'], 
        default='PROVISIONAL'
    )
    
    def validate_month(self, value):
        valid_months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
        if value.upper() not in valid_months:
            raise serializers.ValidationError(f"Month must be one of {valid_months}")
        return value.upper()
    
    def validate_year(self, value):
        current_year = timezone.now().year
        if value < 2000 or value > current_year + 1:
            raise serializers.ValidationError(f"Year must be between 2000 and {current_year + 1}")
        return value


# ==================== PAGINATED RESPONSE SERIALIZER ====================

class PaginatedResponseSerializer(serializers.Serializer):
    """Serializer for paginated responses matching frontend type"""
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = serializers.ListField(child=serializers.DictField())


# ==================== DASHBOARD SERIALIZERS ====================

class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_datasets = serializers.IntegerField()
    total_uploads = serializers.IntegerField()
    total_compilations = serializers.IntegerField()
    success_rate = serializers.FloatField()
    total_records_processed = serializers.IntegerField()
    total_storage_used_mb = serializers.FloatField()
    active_sessions = serializers.IntegerField()
    recent_activity = serializers.ListField(child=serializers.DictField())


class RecentActivitySerializer(serializers.Serializer):
    """Serializer for recent activity items"""
    id = serializers.UUIDField()
    type = serializers.CharField()  # 'upload', 'compilation', 'dataset'
    status = serializers.CharField()
    message = serializers.CharField()
    timestamp = serializers.DateTimeField()
    user = serializers.CharField()
    link = serializers.CharField(allow_null=True)


# ==================== ERROR RESPONSE SERIALIZER ====================

class ErrorResponseSerializer(serializers.Serializer):
    """Standard error response serializer"""
    error = serializers.CharField()
    detail = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)
    fields = serializers.DictField(required=False, child=serializers.ListField(child=serializers.CharField()))


# ==================== FILE UPLOAD SERIALIZERS ====================

class FileUploadSerializer(serializers.Serializer):
    """Serializer for file upload"""
    file = serializers.FileField()
    
    def validate_file(self, value):
        # Check file extension
        if not (value.name.endswith('.zip') or value.name.endswith('.parquet.zip')):
            raise serializers.ValidationError("File must be a ZIP file containing Parquet files")
        
        # Check file size (1GB max)
        max_size = 1024 * 1024 * 1024  # 1GB
        if value.size > max_size:
            raise serializers.ValidationError(f"File too large. Max size is {max_size} bytes")
        
        return value


# ==================== STATUS SERIALIZERS ====================

class UploadStatusSerializer(serializers.Serializer):
    """Serializer for upload status matching frontend type"""
    id = serializers.UUIDField()
    status = serializers.CharField()
    current_step = serializers.CharField()
    progress_percent = serializers.IntegerField()
    total_files = serializers.IntegerField()
    processed_files = serializers.IntegerField()
    failed_files = serializers.IntegerField()
    file_statuses = UploadFileStatusSerializer(many=True)
    validation_summary = ValidationSummarySerializer(required=False, allow_null=True)


class CompilationStatusSerializer(serializers.Serializer):
    """Serializer for compilation status matching frontend type"""
    id = serializers.UUIDField()
    task_id = serializers.CharField()
    status = serializers.CharField()
    progress = serializers.IntegerField()
    current_stage = serializers.CharField()
    stage_details = serializers.CharField(allow_blank=True)
    result_url = serializers.CharField(allow_null=True)
    error_message = serializers.CharField(allow_blank=True)
    started_at = serializers.DateTimeField(allow_null=True)
    completed_at = serializers.DateTimeField(allow_null=True)
    stages = CompilationStageSerializer(many=True)
    metrics = serializers.JSONField()
    dataset_id = serializers.UUIDField(allow_null=True)


# ==================== BULK OPERATION SERIALIZERS ====================

class BulkActionSerializer(serializers.Serializer):
    """Serializer for bulk actions"""
    ids = serializers.ListField(child=serializers.UUIDField())
    action = serializers.ChoiceField(choices=['delete', 'retry', 'archive'])
    
    def validate_ids(self, value):
        if not value:
            raise serializers.ValidationError("At least one ID is required")
        if len(value) > 100:
            raise serializers.ValidationError("Cannot process more than 100 items at once")
        return value


# ==================== EXPORT SERIALIZERS ====================

class ExportDataSerializer(serializers.Serializer):
    """Serializer for data export requests"""
    format = serializers.ChoiceField(choices=['csv', 'json', 'parquet'], default='json')
    fields = serializers.ListField(child=serializers.CharField(), required=False)
    filters = serializers.JSONField(required=False, default=dict)
    include_metadata = serializers.BooleanField(default=True)