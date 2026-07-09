import os
import zipfile
import logging
import pandas as pd
import pyarrow.parquet as pq
from datetime import datetime
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files import File

from .models import (
    UploadSession, UploadFileStatus, CompilationTask, 
    CompilationStage, Dataset, ProcessStats, AggregatedResult
)
from .db_utils import copy_from_dataframe

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def validate_zip_structure_task(self, session_id, file_path):
    """Validate ZIP file structure and contents"""
    try:
        logger.info(f"Starting ZIP validation for session {session_id}")
        
        # Get session using ORM
        session = UploadSession.objects.get(id=session_id)
        
        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Update session status
        session.status = 'VALIDATING'
        session.current_step = 'Extracting and validating files'
        session.save()
        
        # Validate ZIP structure
        is_valid, files, errors = validate_zip_structure(full_path)
        
        if not is_valid:
            session.status = 'FAILED'
            session.current_step = 'ZIP validation failed'
            session.validation_summary = {'errors': errors}
            session.save()
            
            # Update file status
            UploadFileStatus.objects.filter(session=session).update(
                status='error',
                progress=100,
                message='ZIP validation failed'
            )
            
            logger.error(f"ZIP validation failed for session {session_id}: {errors}")
            return {'status': 'failed', 'errors': errors}
        
        # Create file status records for each extracted file
        total_files = len(files)
        processed = 0
        failed = 0
        
        for file_info in files:
            try:
                # Create file status
                file_status = UploadFileStatus.objects.create(
                    session=session,
                    file_id=f"file_{datetime.now().timestamp()}",
                    file_name=file_info['name'],
                    file_path=file_info['path'],
                    size_bytes=file_info['size'],
                    size=format_file_size(file_info['size']),
                    status='validating'
                )
                
                # Validate schema
                schema_valid, schema_errors = validate_schema(file_info['path'])
                
                if not schema_valid:
                    failed += 1
                    file_status.status = 'error'
                    file_status.validation_results = {'schema_valid': False}
                    file_status.error_details = {'schema_errors': schema_errors}
                    file_status.save()
                    continue
                
                # Validate data
                data_valid, data_errors = validate_data(file_info['path'])
                
                if not data_valid:
                    failed += 1
                    file_status.status = 'error'
                    file_status.validation_results = {'schema_valid': True, 'data_valid': False}
                    file_status.error_details = {'data_errors': data_errors}
                    file_status.save()
                    continue
                
                # Success
                processed += 1
                file_status.status = 'success'
                file_status.progress = 100
                file_status.validation_results = {
                    'schema_valid': True,
                    'data_valid': True,
                    'required_columns': file_info.get('required_columns', [])
                }
                file_status.save()
                
            except Exception as e:
                logger.error(f"Error processing file {file_info['name']}: {str(e)}")
                failed += 1
        
        # Update session progress
        session.total_files = total_files
        session.processed_files = processed
        session.failed_files = failed
        session.progress_percent = int((processed + failed) / total_files * 100) if total_files > 0 else 0
        
        # Determine final status
        if processed == total_files:
            session.status = 'VALIDATED'
            session.current_step = 'Validation complete'
        else:
            session.status = 'FAILED'
            session.current_step = 'Validation failed'
        
        session.validation_summary = {
            'missing_files': [],
            'schema_errors': [],
            'data_errors': [],
            'total_errors': failed,
            'total_warnings': 0
        }
        session.save()
        
        # Update process stats
        stats, _ = ProcessStats.objects.get_or_create(session=session)
        stats.upload_end_time = timezone.now()
        stats.upload_duration_ms = int((stats.upload_end_time - stats.upload_start_time).total_seconds() * 1000)
        stats.total_file_size_mb = os.path.getsize(full_path) / (1024 * 1024)
        stats.save()
        
        logger.info(f"Validation complete for session {session_id}. Processed: {processed}, Failed: {failed}")
        
        return {
            'status': session.status,
            'processed': processed,
            'failed': failed,
            'total': total_files
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in validation task: {str(e)}")
        
        # Update session as failed
        UploadSession.objects.filter(id=session_id).update(
            status='FAILED',
            current_step=f'Validation error: {str(e)}'
        )
        
        self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=3)
def start_compilation_task(self, session_id, task_id, month, year, compile_type):
    """Start the compilation process with COPY for bulk insert"""
    try:
        logger.info(f"Starting compilation for session {session_id}, task {task_id}")
        
        # Get session
        session = UploadSession.objects.get(id=session_id)
        
        # Create or get compilation task
        compilation, created = CompilationTask.objects.get_or_create(
            task_id=task_id,
            defaults={
                'session': session,
                'status': 'PROGRESS',
                'started_at': timezone.now()
            }
        )
        
        if not created:
            compilation.status = 'PROGRESS'
            compilation.started_at = timezone.now()
            compilation.save()
        
        # Define compilation stages
        stages = [
            {'name': 'Data Extraction', 'total_files': session.total_files},
            {'name': 'Schema Validation', 'total_files': session.total_files},
            {'name': 'Data Transformation', 'total_files': session.total_files},
            {'name': 'Aggregation', 'total_files': 1},
            {'name': 'Database Insert (COPY)', 'total_files': 1}
        ]
        
        # Save stages
        compilation.stages = stages
        compilation.save()
        
        # Create stage objects
        stage_objects = []
        for stage in stages:
            stage_obj = CompilationStage.objects.create(
                task=compilation,
                name=stage['name'],
                status='PROGRESS',
                started_at=timezone.now(),
                total_files=stage['total_files']
            )
            stage_objects.append(stage_obj)
        
        # Stage 1: Data Extraction
        compilation.current_stage = 'Data Extraction'
        compilation.stage_details = 'Extracting files...'
        compilation.progress = 10
        compilation.save()
        
        extracted_files, extract_errors = extract_parquet_files(session.zip_file.path)
        
        if extract_errors:
            stage_objects[0].status = 'FAILURE'
            stage_objects[0].completed_at = timezone.now()
            stage_objects[0].details = str(extract_errors)
            stage_objects[0].save()
            raise Exception(f"Extraction failed: {extract_errors}")
        
        stage_objects[0].status = 'SUCCESS'
        stage_objects[0].completed_at = timezone.now()
        stage_objects[0].duration = (stage_objects[0].completed_at - stage_objects[0].started_at).total_seconds()
        stage_objects[0].files_processed = len(extracted_files)
        stage_objects[0].save()
        
        # Stage 2: Schema Validation
        compilation.current_stage = 'Schema Validation'
        compilation.stage_details = 'Validating schemas...'
        compilation.progress = 25
        compilation.save()
        
        stage_objects[1].started_at = timezone.now()
        stage_objects[1].save()
        
        schema_valid, schema_errors = validate_all_schemas(extracted_files)
        
        if not schema_valid:
            stage_objects[1].status = 'FAILURE'
            stage_objects[1].completed_at = timezone.now()
            stage_objects[1].details = str(schema_errors)
            stage_objects[1].save()
            raise Exception(f"Schema validation failed: {schema_errors}")
        
        stage_objects[1].status = 'SUCCESS'
        stage_objects[1].completed_at = timezone.now()
        stage_objects[1].duration = (stage_objects[1].completed_at - stage_objects[1].started_at).total_seconds()
        stage_objects[1].save()
        
        # Stage 3: Data Transformation
        compilation.current_stage = 'Data Transformation'
        compilation.stage_details = 'Transforming data...'
        compilation.progress = 40
        compilation.save()
        
        stage_objects[2].started_at = timezone.now()
        stage_objects[2].save()
        
        transformed_files, transform_errors = transform_data(extracted_files, month, year, compile_type)
        
        if transform_errors:
            stage_objects[2].status = 'FAILURE'
            stage_objects[2].completed_at = timezone.now()
            stage_objects[2].details = str(transform_errors)
            stage_objects[2].save()
            raise Exception(f"Transformation failed: {transform_errors}")
        
        stage_objects[2].status = 'SUCCESS'
        stage_objects[2].completed_at = timezone.now()
        stage_objects[2].duration = (stage_objects[2].completed_at - stage_objects[2].started_at).total_seconds()
        stage_objects[2].files_processed = len(transformed_files)
        stage_objects[2].save()
        
        # Stage 4: Aggregation
        compilation.current_stage = 'Aggregation'
        compilation.stage_details = 'Aggregating data...'
        compilation.progress = 60
        compilation.save()
        
        stage_objects[3].started_at = timezone.now()
        stage_objects[3].save()
        
        aggregated_file, agg_metrics = aggregate_data(transformed_files)
        
        stage_objects[3].status = 'SUCCESS'
        stage_objects[3].completed_at = timezone.now()
        stage_objects[3].duration = (stage_objects[3].completed_at - stage_objects[3].started_at).total_seconds()
        stage_objects[3].details = f'Aggregation complete. Records: {agg_metrics["total_records"]}'
        stage_objects[3].save()
        
        # Stage 5: Database Insert using COPY
        compilation.current_stage = 'Database Insert (COPY)'
        compilation.stage_details = 'Inserting with PostgreSQL COPY...'
        compilation.progress = 80
        compilation.save()
        
        stage_objects[4].started_at = timezone.now()
        stage_objects[4].save()
        
        # Create dataset record
        dataset = Dataset.objects.create(
            zip_hash=session.zip_hash,
            status='COMPLETED',
            compiled_path=aggregated_file.replace(settings.MEDIA_ROOT, '').lstrip('/'),
            created_by=session.user
        )
        
        # Bulk insert using COPY
        rows_inserted = bulk_insert_aggregated_results(aggregated_file, session, dataset)
        
        stage_objects[4].status = 'SUCCESS'
        stage_objects[4].completed_at = timezone.now()
        stage_objects[4].duration = (stage_objects[4].completed_at - stage_objects[4].started_at).total_seconds()
        stage_objects[4].files_processed = rows_inserted
        stage_objects[4].details = f'Inserted {rows_inserted} rows using COPY'
        stage_objects[4].save()
        
        # Update metrics
        metrics = {
            'total_records': agg_metrics['total_records'],
            'processed_records': agg_metrics['total_records'],
            'inserted_rows': rows_inserted,
            'success_rate': 100.0,
            'processing_time': agg_metrics.get('processing_time', 0),
            'records_per_second': agg_metrics.get('records_per_second', 0),
            'memory_usage_mb': agg_metrics.get('memory_usage_mb', 0),
            'disk_usage_mb': agg_metrics.get('disk_usage_mb', 0)
        }
        
        compilation.metrics = metrics
        compilation.status = 'SUCCESS'
        compilation.progress = 100
        compilation.current_stage = 'Complete'
        compilation.completed_at = timezone.now()
        compilation.result_url = f'/media/{dataset.compiled_path}'
        compilation.dataset = dataset
        compilation.save()
        
        # Update session
        session.dataset = dataset
        session.save()
        
        # Update process stats
        stats, _ = ProcessStats.objects.get_or_create(session=session)
        stats.compile_end_time = timezone.now()
        stats.compile_duration_ms = int((stats.compile_end_time - stats.compile_start_time).total_seconds() * 1000)
        stats.total_records_processed = rows_inserted
        stats.save()
        
        logger.info(f"Compilation complete for session {session_id}. Inserted {rows_inserted} rows via COPY")
        
        return {
            'status': 'SUCCESS',
            'dataset_id': str(dataset.id),
            'rows_inserted': rows_inserted,
            'metrics': metrics
        }
        
    except Exception as e:
        logger.error(f"Compilation failed: {str(e)}")
        
        # Update task as failed
        CompilationTask.objects.filter(task_id=task_id).update(
            status='FAILURE',
            error_message=str(e),
            completed_at=timezone.now()
        )
        
        self.retry(exc=e, countdown=120)


def bulk_insert_aggregated_results(aggregated_file, session, dataset):
    """
    Bulk insert aggregated results using COPY
    
    This is where the magic happens - raw SQL COPY for maximum performance
    """
    try:
        # Read the aggregated parquet file
        df = pd.read_parquet(aggregated_file)
        
        logger.info(f"Read {len(df)} rows from {aggregated_file}")
        
        # Prepare data for insertion
        df['session_id'] = str(session.id)
        df['dataset_id'] = str(dataset.id)
        df['compilation_month'] = session.month
        df['compilation_year'] = session.year
        df['compile_type'] = session.compile_type
        
        # Use the COPY utility to bulk insert
        rows_inserted = copy_from_dataframe(
            model=AggregatedResult,
            df=df,
            exclude_columns=['id', 'created_at']  # These are auto-generated
        )
        
        logger.info(f"Successfully inserted {rows_inserted} rows using COPY")
        return rows_inserted
        
    except Exception as e:
        logger.error(f"Error in bulk insert: {str(e)}")
        raise


def copy_from_dataframe(model, df, exclude_columns=None, batch_size=10000):
    """
    Generic function to COPY from DataFrame to any model
    """
    if df.empty:
        return 0
        
    from django.db import connection
    import io
    import csv
    
    table_name = model._meta.db_table
    
    # Get columns
    all_columns = [field.column for field in model._meta.fields]
    if exclude_columns:
        columns = [col for col in all_columns if col not in exclude_columns]
    else:
        columns = [col for col in all_columns 
                  if col != 'id' or not model._meta.pk.auto_created]
    
    # Create CSV buffer
    buffer = io.StringIO()
    writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
    
    total_rows = 0
    for start_idx in range(0, len(df), batch_size):
        batch = df.iloc[start_idx:start_idx + batch_size]
        
        buffer.seek(0)
        buffer.truncate(0)
        
        # Write batch to buffer
        for _, row in batch.iterrows():
            row_values = []
            for col in columns:
                val = row.get(col)
                # Handle special types
                if pd.isna(val):
                    row_values.append('')
                elif isinstance(val, (datetime, pd.Timestamp)):
                    row_values.append(val.isoformat())
                else:
                    row_values.append(str(val) if val is not None else '')
            writer.writerow(row_values)
        
        buffer.seek(0)
        
        # Execute COPY
        with connection.cursor() as cursor:
            cursor.copy_expert(
                f"COPY {table_name} ({','.join(columns)}) FROM STDIN WITH CSV",
                buffer
            )
        
        total_rows += len(batch)
        logger.info(f"COPY inserted batch of {len(batch)} rows. Total: {total_rows}")
    
    return total_rows


# Keep your existing utility functions
def validate_zip_structure(zip_path):
    """Validate ZIP file structure"""
    # ... (same as before)
    pass

def extract_parquet_files(zip_path):
    """Extract Parquet files"""
    # ... (same as before)
    pass

def validate_schema(file_path):
    """Validate Parquet schema"""
    # ... (same as before)
    pass

def validate_data(file_path):
    """Validate Parquet data"""
    # ... (same as before)
    pass

def validate_all_schemas(files):
    """Validate all schemas"""
    # ... (same as before)
    pass

def transform_data(files, month, year, compile_type):
    """Transform data"""
    # ... (same as before)
    pass

def aggregate_data(files):
    """Aggregate data"""
    # ... (same as before)
    pass

def format_file_size(bytes):
    """Format file size"""
    for unit in ['Bytes', 'KB', 'MB', 'GB']:
        if bytes < 1024.0:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024.0
    return f"{bytes:.1f} TB"