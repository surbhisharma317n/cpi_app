from celery import shared_task, group, chain
from celery.utils.log import get_task_logger
from django.utils import timezone
from django.db import connection
from django.core.cache import cache
import pandas as pd
import pyarrow.parquet as pq
import zipfile
import os
import json
import uuid
from typing import Dict, List
import concurrent.futures
import logging
from datetime import datetime

from apps.uploads.models import UploadSession, FileStatus, UploadedFile
from apps.uploads.utils.performance import (
    ZipFileProcessor,
    ParquetStreamProcessor,
    DatabaseBulkOperations
)

logger = get_task_logger(__name__)


@shared_task(bind=True, max_retries=3, time_limit=1800)
def process_uploaded_file_parallel(self, session_id: str, file_path: str, file_id: str, user_id: str):
    """
    Process uploaded file with parallel processing for 2M+ records.
    Optimized for ZIP files with 18 parquet files.
    """
    try:
        start_time = timezone.now()
        
        # Get session
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, status FROM uploads_uploadsession 
                WHERE session_id = %s AND user_id = %s
            """, [session_id, user_id])
            
            result = cursor.fetchone()
            if not result:
                raise ValueError(f"Session {session_id} not found")
            
            session_db_id = result[0]
        
        # Create initial file status
        file_status_id = str(uuid.uuid4())
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO uploads_filestatus 
                (id, upload_session_id, file_id, file_name, status, progress, message, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """, [
                file_status_id,
                session_db_id,
                file_id,
                os.path.basename(file_path),
                'validating',
                10,
                'Starting validation...'
            ])
        
        # Process based on file type
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.zip':
            result = process_zip_file_parallel(file_path, file_status_id, session_db_id)
        elif file_ext == '.parquet':
            result = process_parquet_file_parallel(file_path, file_status_id, session_db_id)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
        
        # Update session stats
        if result['is_valid']:
            update_data = {
                'total_files': 1,
                'processed_files': 1,
                'total_records': result.get('total_rows', 0),
                'total_size_bytes': result.get('total_size_bytes', 0)
            }
            
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE uploads_uploadsession 
                    SET 
                        total_files = total_files + %s,
                        processed_files = processed_files + %s,
                        total_records = total_records + %s,
                        total_size_bytes = total_size_bytes + %s,
                        status = CASE 
                            WHEN processed_files + %s = total_files THEN 'VALIDATED'
                            ELSE status
                        END,
                        updated_at = NOW()
                    WHERE id = %s
                """, [
                    update_data['total_files'],
                    update_data['processed_files'],
                    update_data['total_records'],
                    update_data['total_size_bytes'],
                    update_data['processed_files'],
                    session_db_id
                ])
            
            # Update file status to success
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE uploads_filestatus 
                    SET 
                        status = 'success',
                        progress = 100,
                        message = 'Validation successful',
                        record_count = %s,
                        file_size_bytes = %s,
                        validation_result = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, [
                    result.get('total_rows', 0),
                    result.get('total_size_bytes', 0),
                    json.dumps(result),
                    file_status_id
                ])
        else:
            # Update to error
            with connection.cursor() as cursor:
                cursor.execute("""
                    UPDATE uploads_uploadsession 
                    SET 
                        failed_files = failed_files + 1,
                        status = 'FAILED',
                        updated_at = NOW()
                    WHERE id = %s
                """, [session_db_id])
                
                cursor.execute("""
                    UPDATE uploads_filestatus 
                    SET 
                        status = 'error',
                        progress = 100,
                        message = %s,
                        error_details = %s,
                        updated_at = NOW()
                    WHERE id = %s
                """, [
                    result.get('error', 'Validation failed'),
                    json.dumps(result),
                    file_status_id
                ])
        
        processing_time = (timezone.now() - start_time).total_seconds()
        logger.info(f"File processing completed in {processing_time:.2f} seconds")
        
        return {
            'success': result['is_valid'],
            'file_id': file_id,
            'session_id': session_id,
            'processing_time': processing_time,
            'total_records': result.get('total_rows', 0)
        }
        
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        
        # Update to error
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE uploads_filestatus 
                SET 
                    status = 'error',
                    progress = 100,
                    message = %s,
                    updated_at = NOW()
                WHERE file_id = %s AND upload_session_id IN (
                    SELECT id FROM uploads_uploadsession WHERE session_id = %s
                )
            """, [str(e), file_id, session_id])
        
        self.retry(exc=e, countdown=60)


def process_zip_file_parallel(zip_path: str, file_status_id: str, session_id: str) -> Dict:
    """Process ZIP file with parallel extraction and validation."""
    processor = ZipFileProcessor(max_workers=6)  # 6 parallel workers for 18 files
    
    # Update status
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE uploads_filestatus 
            SET 
                progress = 30,
                message = 'Extracting and validating ZIP contents...',
                updated_at = NOW()
            WHERE id = %s
        """, [file_status_id])
    
    # Process ZIP
    result = processor.process_large_zip(zip_path)
    
    # Update progress
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE uploads_filestatus 
            SET 
                progress = 70,
                message = 'Finalizing validation...',
                updated_at = NOW()
            WHERE id = %s
        """, [file_status_id])
    
    return result


def process_parquet_file_parallel(parquet_path: str, file_status_id: str, session_id: str) -> Dict:
    """Process single parquet file with streaming."""
    processor = ParquetStreamProcessor(batch_size=50000)  # 50K records per batch
    
    # Update status
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE uploads_filestatus 
            SET 
                progress = 40,
                message = 'Stream processing parquet file...',
                updated_at = NOW()
            WHERE id = %s
        """, [file_status_id])
    
    # Process parquet
    result = processor.process_large_parquet(parquet_path)
    
    return result


@shared_task(bind=True, time_limit=3600)
def bulk_process_session(self, session_id: str):
    """
    Bulk process all files in a session with parallel processing.
    For sessions with multiple large files.
    """
    try:
        # Get session and files
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    us.id as session_id,
                    uf.id as file_id,
                    uf.file as file_path,
                    uf.original_filename
                FROM uploads_uploadsession us
                JOIN uploads_uploadedfile uf ON us.id = uf.upload_session_id
                WHERE us.session_id = %s AND uf.is_processed = FALSE
            """, [session_id])
            
            files = cursor.fetchall()
        
        if not files:
            return {'message': 'No files to process', 'session_id': session_id}
        
        # Create tasks for parallel processing
        tasks = []
        for file in files:
            session_db_id, file_id, file_path, filename = file
            
            task = process_uploaded_file_parallel.s(
                session_id=session_id,
                file_path=file_path,
                file_id=str(file_id),
                user_id=''  # Will be looked up in task
            )
            tasks.append(task)
        
        # Execute tasks in parallel with concurrency limit
        job = group(tasks)
        result = job.apply_async()
        
        # Wait for completion with timeout
        result.get(timeout=1800, propagate=True)
        
        # Update session status
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE uploads_uploadsession 
                SET 
                    status = 'VALIDATED',
                    updated_at = NOW()
                WHERE session_id = %s AND id NOT IN (
                    SELECT upload_session_id 
                    FROM uploads_filestatus 
                    WHERE status = 'error'
                )
            """, [session_id])
        
        return {
            'message': 'Bulk processing completed',
            'session_id': session_id,
            'files_processed': len(files)
        }
        
    except Exception as e:
        logger.error(f"Bulk processing failed: {e}")
        
        # Mark session as failed
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE uploads_uploadsession 
                SET 
                    status = 'FAILED',
                    updated_at = NOW()
                WHERE session_id = %s
            """, [session_id])
        
        raise