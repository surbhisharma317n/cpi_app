import os
import uuid
import logging
from django.conf import settings
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status, viewsets, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import (
    Dataset, UploadSession, UploadFileStatus, 
    CompilationTask, ProcessStats, AggregatedResult
)
from .serializers import (
    DatasetSerializer, UploadSessionSerializer, UploadFileStatusSerializer,
    CompilationTaskSerializer, DuplicateCheckSerializer
)
from .tasks import validate_zip_structure_task, start_compilation_task
from .utils import generate_file_hash, save_uploaded_file

logger = logging.getLogger(__name__)

# Constants
REQUIRED_FILES_COUNT = 19
MAX_FILE_SIZE = 100 * 1024 * 1024 * 10  # 1GB


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 1000


class DatasetViewSet(viewsets.ModelViewSet):
    """ViewSet for Dataset operations"""
    queryset = Dataset.objects.all().order_by('-created_at')
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    lookup_field = 'id'
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by user if needed
        # queryset = queryset.filter(created_by=self.request.user)
        return queryset
    
    @action(detail=False, methods=['post'])
    def check_duplicate(self, request):
        """Check if a dataset with the given hash already exists"""
        serializer = DuplicateCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        zip_hash = serializer.validated_data['zip_hash']
        
        try:
            dataset = Dataset.objects.get(zip_hash=zip_hash)
            return Response({
                'exists': True,
                'dataset': DatasetSerializer(dataset).data,
                'message': 'Dataset already exists'
            })
        except Dataset.DoesNotExist:
            return Response({
                'exists': False,
                'message': 'No duplicate found'
            })
    
    @action(detail=True, methods=['post'])
    def reuse(self, request, id=None):
        """Create a session from an existing dataset"""
        dataset = self.get_object()
        
        # Create new session linked to dataset
        session = UploadSession.objects.create(
            user=request.user,
            month=request.data.get('month', 'JAN'),
            year=request.data.get('year', timezone.now().year),
            compile_type=request.data.get('compile_type', 'PROVISIONAL'),
            zip_hash=dataset.zip_hash,
            dataset=dataset,
            status='VALIDATED',
            is_duplicate=True,
            total_files=REQUIRED_FILES_COUNT,
            processed_files=REQUIRED_FILES_COUNT,
            progress_percent=100
        )
        
        # Create process stats
        ProcessStats.objects.create(
            session=session,
            upload_end_time=timezone.now(),
            upload_duration_ms=1000,  # Simulated
            is_duplicate=True
        )
        
        return Response(UploadSessionSerializer(session).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def download(self, request, id=None):
        """Download compiled result"""
        dataset = self.get_object()
        
        if not dataset.compiled_path:
            return Response(
                {'error': 'No compiled file available'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        file_path = os.path.join(settings.MEDIA_ROOT, dataset.compiled_path)
        if not os.path.exists(file_path):
            return Response(
                {'error': 'File not found on disk'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(file_path, 'rb'),
            as_attachment=True,
            filename=os.path.basename(file_path)
        )
        return response


class UploadSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for UploadSession operations"""
    queryset = UploadSession.objects.all().order_by('-created_at')
    serializer_class = UploadSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        """Upload a file to the session"""
        session = self.get_object()
        
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # Validate file size
        if file.size > MAX_FILE_SIZE:
            return Response(
                {'error': f'File too large. Max size is {MAX_FILE_SIZE} bytes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        if not (file.name.endswith('.zip') or file.name.endswith('.parquet.zip')):
            return Response(
                {'error': 'File must be a ZIP file containing Parquet files'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save file
        session.zip_file.save(file.name, file)
        session.status = 'UPLOADING'
        session.current_step = 'Uploading ZIP file'
        session.save()
        
        # Record upload start
        stats, _ = ProcessStats.objects.get_or_create(session=session)
        stats.upload_start_time = timezone.now()
        stats.save()
        
        # Generate file hash
        file_hash = generate_file_hash(session.zip_file.path)
        session.zip_hash = file_hash
        session.zip_size = file.size
        session.save()
        
        # Create initial file status
        file_status = UploadFileStatus.objects.create(
            session=session,
            file_id=f"zip-{timezone.now().timestamp()}",
            file_name=file.name,
            size_bytes=file.size,
            size=format_file_size(file.size),
            status='uploading'
        )
        
        # Trigger async validation
        validate_zip_structure_task.delay(str(session.id), session.zip_file.path)
        
        return Response({
            'message': 'File uploaded successfully',
            'session_id': str(session.id),
            'file_status': UploadFileStatusSerializer(file_status).data
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get detailed status with file statuses"""
        session = self.get_object()
        file_statuses = session.file_statuses.all()
        
        data = UploadSessionSerializer(session).data
        data['file_statuses'] = UploadFileStatusSerializer(file_statuses, many=True).data
        
        return Response(data)
    
    @action(detail=True, methods=['delete'])
    def clear(self, request, pk=None):
        """Clear/delete the session"""
        session = self.get_object()
        
        # Delete physical files
        if session.zip_file:
            if os.path.exists(session.zip_file.path):
                os.remove(session.zip_file.path)
        
        # Delete session (cascade will delete related records)
        session.delete()
        
        return Response({'message': 'Session cleared successfully'})


class CompilationTaskViewSet(viewsets.ModelViewSet):
    """ViewSet for CompilationTask operations"""
    queryset = CompilationTask.objects.all().order_by('-created_at')
    serializer_class = CompilationTaskSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'task_id'
    
    def create(self, request):
        """Start a new compilation task"""
        serializer = DuplicateCheckSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = serializer.validated_data.get('session_id')
        month = serializer.validated_data.get('month')
        year = serializer.validated_data.get('year')
        compile_type = serializer.validated_data.get('compile_type', 'PROVISIONAL')
        
        try:
            session = UploadSession.objects.get(id=session_id)
        except UploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if session is validated
        if session.status != 'VALIDATED':
            return Response(
                {'error': 'Session must be validated before compilation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check file count
        if session.total_files != REQUIRED_FILES_COUNT:
            return Response(
                {'error': f'Expected {REQUIRED_FILES_COUNT} files, found {session.total_files}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Record compile start
        stats, _ = ProcessStats.objects.get_or_create(session=session)
        stats.compile_start_time = timezone.now()
        stats.save()
        
        # Create task ID
        task_id = str(uuid.uuid4())
        
        # Create compilation task record
        compilation = CompilationTask.objects.create(
            task_id=task_id,
            session=session,
            status='PENDING'
        )
        
        # Start async compilation
        start_compilation_task.delay(
            session_id=str(session.id),
            task_id=task_id,
            month=month,
            year=year,
            compile_type=compile_type
        )
        
        return Response({
            'id': str(compilation.id),
            'task_id': task_id,
            'status': 'PENDING',
            'message': 'Compilation started'
        }, status=status.HTTP_202_ACCEPTED)
    
    @action(detail=True, methods=['get'])
    def status(self, request, task_id=None):
        """Get detailed compilation status with stages"""
        compilation = self.get_object()
        stages = compilation.stage_objects.all().order_by('started_at')
        
        data = CompilationTaskSerializer(compilation).data
        data['stages'] = [{
            'name': stage.name,
            'status': stage.status,
            'started_at': stage.started_at,
            'completed_at': stage.completed_at,
            'duration': stage.duration,
            'details': stage.details,
            'progress': stage.progress,
            'current_file': stage.current_file,
            'files_processed': stage.files_processed,
            'total_files': stage.total_files
        } for stage in stages]
        
        return Response(data)


class AggregatedResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing aggregated results"""
    queryset = AggregatedResult.objects.all().order_by('-created_at')
    serializer_class = None  # You'll need to create this serializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by session
        session_id = self.request.query_params.get('session')
        if session_id:
            queryset = queryset.filter(session_id=session_id)
        
        # Filter by dataset
        dataset_id = self.request.query_params.get('dataset')
        if dataset_id:
            queryset = queryset.filter(dataset_id=dataset_id)
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset


# Helper function
def format_file_size(bytes):
    """Format file size"""
    for unit in ['Bytes', 'KB', 'MB', 'GB']:
        if bytes < 1024.0:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.1f} TB"