from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db import connection
import uuid
import os
import json
from typing import Dict, List
import logging

from apps.uploads.models import UploadSession, FileStatus, UploadedFile
from apps.uploads.api.serializers import (
    UploadSessionSerializer,
    FileStatusSerializer,
    UploadSessionCreateSerializer,
    FileUploadSerializer,
)
from apps.uploads.tasks import process_uploaded_file_parallel
from apps.uploads.utils.performance import (
    ZipFileProcessor,
    DatabaseBulkOperations
)
from apps.uploads.utils.validation import validate_file_upload

logger = logging.getLogger(__name__)


class HighPerformanceUploadViewSet(viewsets.ModelViewSet):
    """High-performance upload handling for large files."""
    
    queryset = UploadSession.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UploadSessionCreateSerializer
        return UploadSessionSerializer
    
    def get_queryset(self):
        """Optimized queryset with raw SQL for performance."""
        user_id = str(self.request.user.id)
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    us.id, us.session_id, us.status, us.total_files,
                    us.processed_files, us.failed_files, us.total_records,
                    us.month, us.year, us.compile_type,
                    us.created_at, us.updated_at,
                    COUNT(DISTINCT fs.id) as file_count,
                    COUNT(DISTINCT CASE WHEN fs.status = 'success' THEN fs.id END) as success_files,
                    COUNT(DISTINCT CASE WHEN fs.status = 'error' THEN fs.id END) as error_files
                FROM uploads_uploadsession us
                LEFT JOIN uploads_filestatus fs ON us.id = fs.upload_session_id
                WHERE us.user_id = %s
                GROUP BY us.id
                ORDER BY us.created_at DESC
                LIMIT %s OFFSET %s
            """, [user_id, 50, 0])
            
            columns = [col[0] for col in cursor.description]
            sessions = []
            
            for row in cursor.fetchall():
                session_data = dict(zip(columns, row))
                sessions.append(session_data)
            
            return sessions
    
    def create(self, request, *args, **kwargs):
        """Create upload session with performance optimization."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Generate session ID
            session_id = f"session_{uuid.uuid4().hex[:16]}"
            
            # Use raw SQL for performance
            with connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO uploads_uploadsession 
                    (id, user_id, session_id, status, month, year, compile_type, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    RETURNING id, session_id, status, created_at
                """, [
                    str(uuid.uuid4()),
                    str(request.user.id),
                    session_id,
                    'PENDING',
                    serializer.validated_data['month'],
                    serializer.validated_data['year'],
                    serializer.validated_data['compile_type']
                ])
                
                result = cursor.fetchone()
                columns = [col[0] for col in cursor.description]
                session_data = dict(zip(columns, result))
            
            return Response({
                'session_id': session_data['session_id'],
                'status': session_data['status'],
                'created_at': session_data['created_at']
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating upload session: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='upload-bulk')
    def upload_bulk(self, request, pk=None):
        """Bulk upload endpoint for large ZIP files with 18 parquets."""
        session = self.get_object()
        
        if session.status not in ['PENDING', 'UPLOADING']:
            return Response(
                {'error': 'Session is not accepting new files'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        file = serializer.validated_data['file']
        
        try:
            # Validate file
            validation = validate_file_upload(file)
            if not validation['is_valid']:
                return Response(
                    {'error': validation['error']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Save file with optimized storage
            file_id = str(uuid.uuid4())
            file_path = self._save_uploaded_file(session, file, file_id)
            
            # Update session status using raw SQL
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE uploads_uploadsession 
                    SET status = 'UPLOADING', updated_at = NOW()
                    WHERE id = %s
                """, [str(session.id)])
            
            # Process in background with parallel processing
            process_uploaded_file_parallel.delay(
                session_id=session.session_id,
                file_path=file_path,
                file_id=file_id,
                user_id=str(request.user.id)
            )
            
            return Response({
                'message': 'File uploaded and processing started',
                'file_id': file_id,
                'session_id': session.session_id,
                'estimated_time': 'Processing 2M+ records may take a few minutes'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Bulk upload error: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _save_uploaded_file(self, session, file, file_id):
        """Save uploaded file with performance optimizations."""
        # Create upload directory with date partitioning
        today = timezone.now()
        upload_dir = os.path.join(
            'media', 'uploads',
            str(today.year), str(today.month), str(today.day),
            session.session_id
        )
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, f"{file_id}_{file.name}")
        
        # Use chunked writing for large files
        chunk_size = 1024 * 1024  # 1MB chunks
        with open(file_path, 'wb') as destination:
            for chunk in file.chunks(chunk_size):
                destination.write(chunk)
        
        # Insert file record using raw SQL
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO uploads_uploadedfile 
                (id, upload_session_id, file, original_filename, 
                 file_type, file_size, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, [
                str(uuid.uuid4()),
                str(session.id),
                file_path,
                file.name,
                os.path.splitext(file.name)[1],
                file.size
            ])
        
        return file_path
    
    @action(detail=True, methods=['get'], url_path='status-optimized')
    def status_optimized(self, request, pk=None):
        """Get optimized session status with raw SQL queries."""
        session = self.get_object()
        
        try:
            # Get session stats using raw SQL
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        us.status,
                        us.total_files,
                        us.processed_files,
                        us.failed_files,
                        us.total_records,
                        us.total_size_bytes,
                        us.created_at,
                        us.updated_at,
                        -- File status summary
                        COUNT(fs.id) as total_file_statuses,
                        COUNT(CASE WHEN fs.status = 'success' THEN 1 END) as success_files,
                        COUNT(CASE WHEN fs.status = 'error' THEN 1 END) as error_files,
                        COUNT(CASE WHEN fs.status IN ('pending', 'uploading', 'validating') THEN 1 END) as processing_files,
                        -- Latest files
                        COALESCE(JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'file_id', fs.file_id,
                                'file_name', fs.file_name,
                                'status', fs.status,
                                'progress', fs.progress,
                                'message', fs.message,
                                'updated_at', fs.updated_at
                            ) ORDER BY fs.updated_at DESC
                        ) FILTER (WHERE fs.id IS NOT NULL), '[]') as recent_files
                    FROM uploads_uploadsession us
                    LEFT JOIN uploads_filestatus fs ON us.id = fs.upload_session_id
                    WHERE us.id = %s
                    GROUP BY us.id
                """, [str(session.id)])
                
                result = cursor.fetchone()
                columns = [col[0] for col in cursor.description]
                session_data = dict(zip(columns, result))
            
            # Parse JSON fields
            if session_data.get('recent_files'):
                session_data['recent_files'] = json.loads(session_data['recent_files'])
            
            # Calculate progress
            if session_data['total_files'] > 0:
                session_data['progress_percentage'] = (
                    session_data['processed_files'] / session_data['total_files'] * 100
                )
            else:
                session_data['progress_percentage'] = 0
            
            return Response(session_data)
            
        except Exception as e:
            logger.error(f"Error getting optimized status: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )