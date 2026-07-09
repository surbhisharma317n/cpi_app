import os
import zipfile
import json
import pandas as pd
import pyarrow.parquet as pq
from datetime import datetime
from celery import shared_task
from django.db import connection
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, name='uploads.process_zip_file')
def process_zip_file(self, session_id, file_path, file_id, user_id):
    """
    Process ZIP file with 18 parquet files (2M+ records).
    Optimized with streaming and batch processing.
    """
    task_id = self.request.id
    
    try:
        logger.info(f"[{task_id}] Starting ZIP processing: {file_path}")
        
        # Update initial status
        _update_file_status(file_id, 'validating', 10, 'Extracting ZIP file...')
        
        # Validate ZIP
        if not zipfile.is_zipfile(file_path):
            raise ValueError("Invalid ZIP file")
        
        # Process ZIP contents
        total_records = 0
        valid_files = 0
        file_details = []
        
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            parquet_files = [f for f in zip_ref.namelist() if f.endswith('.parquet')]
            total_files = len(parquet_files)
            
            logger.info(f"[{task_id}] Found {total_files} parquet files")
            
            # Update progress
            _update_file_status(file_id, 'validating', 30, f'Found {total_files} parquet files')
            
            # Process each parquet file
            for idx, parquet_file in enumerate(parquet_files):
                try:
                    # Read parquet metadata (not full data)
                    with zip_ref.open(parquet_file) as f:
                        parquet_reader = pq.ParquetFile(f)
                        row_count = parquet_reader.metadata.num_rows
                        column_count = len(parquet_reader.schema.names)
                        
                        total_records += row_count
                        valid_files += 1
                        
                        file_details.append({
                            'name': parquet_file,
                            'rows': row_count,
                            'columns': column_count
                        })
                        
                        # Update progress every 5 files
                        if (idx + 1) % 5 == 0:
                            progress = 30 + int((idx + 1) / total_files * 40)
                            _update_file_status(
                                file_id, 
                                'validating', 
                                progress, 
                                f'Processed {idx + 1}/{total_files} files'
                            )
                            
                except Exception as e:
                    logger.warning(f"[{task_id}] Error processing {parquet_file}: {e}")
                    file_details.append({
                        'name': parquet_file,
                        'error': str(e),
                        'rows': 0
                    })
        
        # Validate all files
        is_valid = valid_files == total_files
        file_size = os.path.getsize(file_path)
        
        # Update final status
        if is_valid:
            _update_file_status(
                file_id, 
                'success', 
                100, 
                f'Validated {valid_files}/{total_files} files, {total_records:,} records',
                validation_result={
                    'total_files': total_files,
                    'valid_files': valid_files,
                    'total_records': total_records,
                    'total_size_bytes': file_size,
                    'file_details': file_details[:10],  # First 10 files
                    'processing_time': self.request.timer if hasattr(self.request, 'timer') else 0
                }
            )
            
            # Update session stats
            _update_session_stats(session_id, {
                'processed_files': 1,
                'total_records': total_records,
                'total_size_bytes': file_size,
                'is_success': True
            })
            
            logger.info(f"[{task_id}] ✓ Completed: {valid_files}/{total_files} files, {total_records:,} records")
            
        else:
            error_msg = f"Only {valid_files}/{total_files} files are valid"
            _update_file_status(
                file_id, 
                'error', 
                100, 
                error_msg,
                error_details={
                    'valid_files': valid_files,
                    'total_files': total_files,
                    'errors': [f for f in file_details if 'error' in f]
                }
            )
            
            _update_session_stats(session_id, {
                'failed_files': 1,
                'is_success': False
            })
            
            raise ValueError(error_msg)
        
        return {
            'session_id': session_id,
            'file_id': file_id,
            'valid_files': valid_files,
            'total_files': total_files,
            'total_records': total_records,
            'processing_time': self.request.timer if hasattr(self.request, 'timer') else 0
        }
        
    except Exception as e:
        logger.error(f"[{task_id}] ✗ Failed: {e}")
        
        _update_file_status(
            file_id, 
            'error', 
            100, 
            str(e),
            error_details={'error': str(e), 'traceback': self.request.stacktrace}
        )
        
        _update_session_stats(session_id, {
            'failed_files': 1,
            'is_success': False
        })
        
        raise self.retry(exc=e, countdown=60, max_retries=2)


@shared_task(bind=True, name='uploads.process_parquet_file')
def process_parquet_file(self, session_id, file_path, file_id, user_id):
    """Process single parquet file (optimized for 2M+ records)."""
    
    try:
        logger.info(f"Processing parquet: {file_path}")
        
        _update_file_status(file_id, 'validating', 20, 'Reading parquet metadata...')
        
        # Read metadata only (fast)
        parquet_file = pq.ParquetFile(file_path)
        row_count = parquet_file.metadata.num_rows
        column_count = len(parquet_file.schema.names)
        file_size = os.path.getsize(file_path)
        
        # Sample first 100 rows for preview
        _update_file_status(file_id, 'validating', 60, 'Sampling data...')
        
        sample_df = None
        if row_count > 0:
            sample = parquet_file.read_row_group(0, columns=parquet_file.schema.names[:5])
            sample_df = sample.to_pandas().head(5).to_dict('records')
        
        _update_file_status(
            file_id, 
            'success', 
            100, 
            f'Validated: {row_count:,} rows, {column_count} columns',
            validation_result={
                'total_records': row_count,
                'columns': column_count,
                'column_names': parquet_file.schema.names[:20],
                'file_size_bytes': file_size,
                'sample_data': sample_df
            }
        )
        
        _update_session_stats(session_id, {
            'processed_files': 1,
            'total_records': row_count,
            'total_size_bytes': file_size,
            'is_success': True
        })
        
        return {
            'session_id': session_id,
            'file_id': file_id,
            'records': row_count,
            'columns': column_count
        }
        
    except Exception as e:
        logger.error(f"Parquet processing failed: {e}")
        
        _update_file_status(
            file_id, 
            'error', 
            100, 
            str(e),
            error_details={'error': str(e)}
        )
        
        _update_session_stats(session_id, {
            'failed_files': 1,
            'is_success': False
        })
        
        raise


@shared_task(bind=True, name='uploads.bulk_process_session')
def bulk_process_session(self, session_id, user_id):
    """Process all files in a session with parallel tasks."""
    
    logger.info(f"Starting bulk processing for session: {session_id}")
    
    with connection.cursor() as cursor:
        # Get all unprocessed files
        cursor.execute("""
            SELECT 
                uf.id,
                uf.file,
                uf.original_filename,
                uf.file_type
            FROM uploads_uploadedfile uf
            JOIN uploads_uploadsession us ON uf.upload_session_id = us.id
            WHERE us.session_id = %s AND uf.is_processed = FALSE
        """, [session_id])
        
        files = cursor.fetchall()
    
    if not files:
        return {'message': 'No files to process', 'session_id': session_id}
    
    logger.info(f"Found {len(files)} files to process")
    
    # Create task group for parallel processing
    from celery import group
    
    tasks = []
    for file_id, file_path, filename, file_type in files:
        if filename.endswith('.zip'):
            task = process_zip_file.s(session_id, file_path, str(file_id), user_id)
        else:
            task = process_parquet_file.s(session_id, file_path, str(file_id), user_id)
        tasks.append(task)
    
    # Execute tasks in parallel (up to 4 at a time)
    job = group(tasks)
    result = job.apply_async()
    
    # Wait for completion (non-blocking in production)
    # For simplicity, we'll just return the job ID
    
    return {
        'session_id': session_id,
        'job_id': self.request.id,
        'files_queued': len(files),
        'task_ids': [task.id for task in result.results] if hasattr(result, 'results') else []
    }


# Helper functions with raw SQL for performance

def _update_file_status(file_id, status, progress, message, validation_result=None, error_details=None):
    """Update file status using raw SQL."""
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE uploads_filestatus 
            SET 
                status = %s,
                progress = %s,
                message = %s,
                validation_result = COALESCE(%s, validation_result),
                error_details = COALESCE(%s, error_details),
                updated_at = NOW()
            WHERE file_id = %s
        """, [status, progress, message, 
              json.dumps(validation_result) if validation_result else None,
              json.dumps(error_details) if error_details else None,
              file_id])


def _update_session_stats(session_id, stats):
    """Update session statistics using raw SQL."""
    with connection.cursor() as cursor:
        # Get session DB ID
        cursor.execute("""
            SELECT id FROM uploads_uploadsession WHERE session_id = %s
        """, [session_id])
        session_db_id = cursor.fetchone()[0]
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'processed_files' in stats:
            updates.append("processed_files = processed_files + %s")
            params.append(stats['processed_files'])
        
        if 'failed_files' in stats:
            updates.append("failed_files = failed_files + %s")
            params.append(stats['failed_files'])
        
        if 'total_records' in stats:
            updates.append("total_records = total_records + %s")
            params.append(stats['total_records'])
        
        if 'total_size_bytes' in stats:
            updates.append("total_size_bytes = total_size_bytes + %s")
            params.append(stats['total_size_bytes'])
        
        if stats.get('is_success'):
            # Check if all files are processed
            cursor.execute("""
                SELECT total_files, processed_files, failed_files 
                FROM uploads_uploadsession WHERE id = %s
            """, [session_db_id])
            
            total, processed, failed = cursor.fetchone()
            
            if processed + 1 == total:
                updates.append("status = 'VALIDATED'")
            else:
                updates.append("status = 'PROCESSING'")
        else:
            updates.append("status = 'FAILED'")
        
        if updates:
            cursor.execute(f"""
                UPDATE uploads_uploadsession 
                SET {', '.join(updates)}, updated_at = NOW()
                WHERE id = %s
            """, params + [session_db_id])