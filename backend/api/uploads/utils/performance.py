import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import zipfile
import os
import io
import hashlib
import concurrent.futures
from typing import Dict, List, Tuple, Optional, Generator
import numpy as np
from datetime import datetime
import logging
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger(__name__)


class ParquetStreamProcessor:
    """Streaming processor for large parquet files."""
    
    def __init__(self, batch_size: int = 100000):
        self.batch_size = batch_size
        self.cache_ttl = 3600  # 1 hour cache
    
    def process_large_parquet(self, file_path: str) -> Dict:
        """
        Process large parquet file in streaming mode.
        Memory-efficient processing for 2M+ records.
        """
        start_time = datetime.now()
        
        try:
            # Open parquet file
            parquet_file = pq.ParquetFile(file_path)
            
            # Get metadata without loading data
            metadata = {
                'num_rows': parquet_file.metadata.num_rows,
                'num_row_groups': parquet_file.metadata.num_row_groups,
                'schema': str(parquet_file.schema.to_arrow_schema()),
                'created_by': parquet_file.metadata.created_by,
                'format_version': parquet_file.metadata.format_version,
            }
            
            # Process in batches
            stats = {
                'total_rows': 0,
                'valid_rows': 0,
                'column_stats': {},
                'data_types': {},
                'null_counts': {},
                'unique_counts': {},
                'memory_usage': 0
            }
            
            # Get column names
            column_names = parquet_file.schema.names
            
            # Initialize stats for each column
            for col in column_names:
                stats['column_stats'][col] = {
                    'min': None,
                    'max': None,
                    'mean': None,
                    'null_count': 0,
                    'unique_count': set()
                }
            
            # Process row groups in parallel
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                futures = []
                for i in range(parquet_file.num_row_groups):
                    future = executor.submit(
                        self._process_row_group,
                        parquet_file,
                        i,
                        column_names
                    )
                    futures.append(future)
                
                # Collect results
                for future in concurrent.futures.as_completed(futures):
                    row_group_stats = future.result()
                    self._merge_stats(stats, row_group_stats)
            
            # Calculate final stats
            stats['total_rows'] = metadata['num_rows']
            stats['processing_time'] = (datetime.now() - start_time).total_seconds()
            
            # Convert sets to counts
            for col in stats['column_stats']:
                if 'unique_count' in stats['column_stats'][col]:
                    stats['column_stats'][col]['unique_count'] = len(
                        stats['column_stats'][col]['unique_count']
                    )
            
            return {
                'is_valid': True,
                'metadata': metadata,
                'stats': stats,
                'file_size': os.path.getsize(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error processing parquet file {file_path}: {e}")
            return {
                'is_valid': False,
                'error': str(e),
                'file_size': os.path.getsize(file_path)
            }
    
    def _process_row_group(self, parquet_file, row_group_idx, column_names):
        """Process a single row group."""
        try:
            # Read only specific columns if needed
            table = parquet_file.read_row_group(row_group_idx, columns=column_names)
            df = table.to_pandas()
            
            stats = {
                'valid_rows': len(df),
                'column_stats': {}
            }
            
            # Calculate column statistics
            for col in df.columns:
                col_stats = {
                    'null_count': int(df[col].isna().sum()),
                    'unique_count': set(df[col].dropna().unique()) if df[col].dtype == 'object' else None
                }
                
                # Numeric column stats
                if pd.api.types.is_numeric_dtype(df[col]):
                    col_stats['min'] = float(df[col].min())
                    col_stats['max'] = float(df[col].max())
                    col_stats['mean'] = float(df[col].mean())
                
                stats['column_stats'][col] = col_stats
            
            return stats
            
        except Exception as e:
            logger.error(f"Error processing row group {row_group_idx}: {e}")
            return {'valid_rows': 0, 'column_stats': {}}
    
    def _merge_stats(self, main_stats, new_stats):
        """Merge statistics from row groups."""
        main_stats['valid_rows'] += new_stats['valid_rows']
        
        for col, col_stats in new_stats['column_stats'].items():
            if col not in main_stats['column_stats']:
                main_stats['column_stats'][col] = col_stats
            else:
                # Merge stats
                main_col_stats = main_stats['column_stats'][col]
                
                # Update min/max for numeric columns
                if 'min' in col_stats and col_stats['min'] is not None:
                    if main_col_stats['min'] is None or col_stats['min'] < main_col_stats['min']:
                        main_col_stats['min'] = col_stats['min']
                
                if 'max' in col_stats and col_stats['max'] is not None:
                    if main_col_stats['max'] is None or col_stats['max'] > main_col_stats['max']:
                        main_col_stats['max'] = col_stats['max']
                
                # Update mean (weighted average)
                if 'mean' in col_stats and col_stats['mean'] is not None:
                    if main_col_stats['mean'] is None:
                        main_col_stats['mean'] = col_stats['mean']
                    else:
                        # Simple average for now
                        main_col_stats['mean'] = (main_col_stats['mean'] + col_stats['mean']) / 2
                
                # Update null count
                main_col_stats['null_count'] += col_stats.get('null_count', 0)
                
                # Merge unique values
                if 'unique_count' in col_stats and col_stats['unique_count']:
                    if main_col_stats['unique_count'] is None:
                        main_col_stats['unique_count'] = set()
                    main_col_stats['unique_count'].update(col_stats['unique_count'])


class ZipFileProcessor:
    """High-performance ZIP file processor."""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.parquet_processor = ParquetStreamProcessor()
    
    def process_large_zip(self, zip_path: str) -> Dict:
        """
        Process ZIP file containing multiple parquet files.
        Uses parallel processing for performance.
        """
        start_time = datetime.now()
        
        if not zipfile.is_zipfile(zip_path):
            return {
                'is_valid': False,
                'error': 'Not a valid ZIP file'
            }
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                # List all files
                file_list = zip_ref.namelist()
                parquet_files = [f for f in file_list if f.lower().endswith('.parquet')]
                
                if not parquet_files:
                    return {
                        'is_valid': False,
                        'error': 'No parquet files found in ZIP'
                    }
                
                # Extract and process in parallel
                results = []
                with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                    futures = []
                    for parquet_file in parquet_files:
                        future = executor.submit(
                            self._process_parquet_in_zip,
                            zip_ref,
                            parquet_file
                        )
                        futures.append(future)
                    
                    # Collect results
                    for future in concurrent.futures.as_completed(futures):
                        result = future.result()
                        if result:
                            results.append(result)
                
                # Aggregate results
                total_files = len(results)
                total_rows = sum(r.get('stats', {}).get('total_rows', 0) for r in results)
                valid_files = sum(1 for r in results if r.get('is_valid', False))
                
                # Schema validation (check if all files have same schema)
                schemas = [r.get('metadata', {}).get('schema') for r in results if r.get('is_valid', False)]
                schema_consistent = len(set(schemas)) == 1 if schemas else True
                
                # Calculate total size
                total_size = sum(r.get('file_size', 0) for r in results)
                
                processing_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    'is_valid': valid_files == total_files and schema_consistent,
                    'total_files': total_files,
                    'valid_files': valid_files,
                    'total_rows': total_rows,
                    'total_size_bytes': total_size,
                    'schema_consistent': schema_consistent,
                    'processing_time': processing_time,
                    'file_details': results,
                    'parquet_files': parquet_files
                }
                
        except Exception as e:
            logger.error(f"Error processing ZIP file {zip_path}: {e}")
            return {
                'is_valid': False,
                'error': str(e)
            }
    
    def _process_parquet_in_zip(self, zip_ref, parquet_file):
        """Extract and process a single parquet file from ZIP."""
        try:
            # Extract to memory
            with zip_ref.open(parquet_file) as file:
                # Write to temporary file
                temp_dir = '/tmp/parquet_processing'
                os.makedirs(temp_dir, exist_ok=True)
                
                temp_file = os.path.join(temp_dir, f"temp_{hashlib.md5(parquet_file.encode()).hexdigest()}.parquet")
                
                with open(temp_file, 'wb') as f:
                    f.write(file.read())
                
                # Process parquet file
                result = self.parquet_processor.process_large_parquet(temp_file)
                result['filename'] = parquet_file
                
                # Clean up
                os.remove(temp_file)
                
                return result
                
        except Exception as e:
            logger.error(f"Error processing {parquet_file}: {e}")
            return {
                'filename': parquet_file,
                'is_valid': False,
                'error': str(e)
            }


class DatabaseBulkOperations:
    """High-performance database bulk operations."""
    
    @staticmethod
    def bulk_insert_file_statuses(session_id, file_data_list):
        """Bulk insert file statuses using COPY command."""
        from apps.uploads.models import UploadSession, FileStatus
        
        # Get session
        session = UploadSession.objects.get(session_id=session_id)
        
        # Prepare data for bulk insert
        records = []
        for file_data in file_data_list:
            records.append((
                str(session.id),
                file_data['file_id'],
                file_data['file_name'],
                'pending',
                0,
                file_data['size'],
                'Pending validation',
                datetime.now(),
                datetime.now()
            ))
        
        # Use PostgreSQL COPY for maximum performance
        with connection.cursor() as cursor:
            # Create temp table
            cursor.execute("""
                CREATE TEMP TABLE temp_filestatus (
                    upload_session_id UUID,
                    file_id VARCHAR(100),
                    file_name VARCHAR(255),
                    status VARCHAR(20),
                    progress INTEGER,
                    size VARCHAR(50),
                    message TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                ) ON COMMIT DROP
            """)
            
            # Copy data to temp table
            copy_query = """
                COPY temp_filestatus (upload_session_id, file_id, file_name, status, 
                                     progress, size, message, created_at, updated_at)
                FROM STDIN WITH (FORMAT CSV, DELIMITER ',', QUOTE '"')
            """
            
            # Convert records to CSV format
            import csv
            import io
            
            output = io.StringIO()
            writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
            writer.writerows(records)
            output.seek(0)
            
            cursor.copy_expert(copy_query, output)
            
            # Insert from temp table to actual table
            cursor.execute("""
                INSERT INTO uploads_filestatus 
                (id, upload_session_id, file_id, file_name, status, progress, 
                 size, message, created_at, updated_at)
                SELECT 
                    gen_random_uuid(),
                    upload_session_id,
                    file_id,
                    file_name,
                    status,
                    progress,
                    size,
                    message,
                    created_at,
                    updated_at
                FROM temp_filestatus
            """)
    
    @staticmethod
    def bulk_update_session_stats(session_id, stats_updates):
        """Bulk update session statistics."""
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE uploads_uploadsession 
                SET 
                    total_files = total_files + %s,
                    processed_files = processed_files + %s,
                    failed_files = failed_files + %s,
                    total_records = total_records + %s,
                    total_size_bytes = total_size_bytes + %s,
                    updated_at = NOW()
                WHERE session_id = %s
            """, [
                stats_updates.get('total_files', 0),
                stats_updates.get('processed_files', 0),
                stats_updates.get('failed_files', 0),
                stats_updates.get('total_records', 0),
                stats_updates.get('total_size_bytes', 0),
                session_id
            ])