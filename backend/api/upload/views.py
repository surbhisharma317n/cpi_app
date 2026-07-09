# views.py
import os
import zipfile
import tempfile
import pandas as pd
import pyarrow.parquet as pq
from datetime import datetime
from django.db import connection, transaction
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
import threading
import uuid
import json
import logging

from .models import UploadSession, ParquetFile, ProcessingLog

logger = logging.getLogger(__name__)

# Expected schemas for each file type
EXPECTED_SCHEMAS = {
    'rural_market_data.parquet': {
        'columns': ['Item_Code', 'Item_Name', 'Price', 'Month', 'Year', 'Region', 'Unit', 'Market'],
        'required': ['Item_Code', 'Item_Name', 'Price', 'Month', 'Year'],
        'types': {
            'Item_Code': 'string',
            'Item_Name': 'string',
            'Price': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'rural_market_data'
    },
    'urban_market_data.parquet': {
        'columns': ['Item_Code', 'Item_Name', 'Price', 'Month', 'Year', 'Region', 'Unit', 'Market'],
        'required': ['Item_Code', 'Item_Name', 'Price', 'Month', 'Year'],
        'types': {
            'Item_Code': 'string',
            'Item_Name': 'string',
            'Price': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'urban_market_data'
    },
    'rural_housing_rent_data.parquet': {
        'columns': ['City', 'House_ID', 'Rent_Amount', 'Month', 'Year', 'House_Type', 'Area_sqft'],
        'required': ['City', 'House_ID', 'Rent_Amount', 'Month', 'Year'],
        'types': {
            'City': 'string',
            'House_ID': 'string',
            'Rent_Amount': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'rural_housing_rent_data'
    },
    'urban_housing_rent_data.parquet': {
        'columns': ['City', 'House_ID', 'Rent_Amount', 'Month', 'Year', 'House_Type', 'Area_sqft', 'Furnished'],
        'required': ['City', 'House_ID', 'Rent_Amount', 'Month', 'Year'],
        'types': {
            'City': 'string',
            'House_ID': 'string',
            'Rent_Amount': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'urban_housing_rent_data'
    },
    'rural_elect_data.parquet': {
        'columns': ['Meter_No', 'Units', 'Rate', 'Month', 'Year', 'Consumer_Name', 'Address', 'Bill_Amount'],
        'required': ['Meter_No', 'Units', 'Rate', 'Month', 'Year'],
        'types': {
            'Meter_No': 'string',
            'Units': 'numeric',
            'Rate': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'rural_elect_data'
    },
    'urban_elect_data.parquet': {
        'columns': ['Meter_No', 'Units', 'Rate', 'Month', 'Year', 'Consumer_Name', 'Address', 'Bill_Amount', 'Tariff_Type'],
        'required': ['Meter_No', 'Units', 'Rate', 'Month', 'Year'],
        'types': {
            'Meter_No': 'string',
            'Units': 'numeric',
            'Rate': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'urban_elect_data'
    },
    'online_market_data.parquet': {
        'columns': ['Item_Code', 'Platform', 'Price', 'Month', 'Year', 'Category', 'Brand', 'Discount'],
        'required': ['Item_Code', 'Platform', 'Price', 'Month', 'Year'],
        'types': {
            'Item_Code': 'string',
            'Platform': 'string',
            'Price': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'online_market_data'
    },
    'airfare_data.parquet': {
        'columns': ['Flight_No', 'From', 'To', 'Fare', 'Month', 'Airline', 'Departure_Time', 'Duration_hours'],
        'required': ['Flight_No', 'From', 'To', 'Fare', 'Month'],
        'types': {
            'Flight_No': 'string',
            'From': 'string',
            'To': 'string',
            'Fare': 'numeric',
            'Month': 'string'
        },
        'table_name': 'airfare_data'
    },
    'urban_pds_data.parquet': {
        'columns': ['Commodity', 'Region', 'Price', 'Month', 'Year', 'Subsidy', 'Quantity', 'Unit'],
        'required': ['Commodity', 'Region', 'Price', 'Month', 'Year'],
        'types': {
            'Commodity': 'string',
            'Region': 'string',
            'Price': 'numeric',
            'Month': 'string',
            'Year': 'integer'
        },
        'table_name': 'urban_pds_data'
    }
}

class UploadZipFile(APIView):
    """Upload ZIP file and start validation process"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Validate input
            zip_file = request.FILES.get('zip_file')
            month = request.data.get('month')
            year = request.data.get('year')
            compile_type = request.data.get('compile_type')
            
            if not all([zip_file, month, year, compile_type]):
                return Response(
                    {'error': 'Missing required fields: zip_file, month, year, compile_type'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create upload session
            session_id = uuid.uuid4()
            session = UploadSession.objects.create(
                session_id=session_id,
                user=request.user,
                zip_file_name=zip_file.name,
                zip_file_path=self._save_zip_file(zip_file, session_id),
                month=month,
                year=year,
                compile_type=compile_type,
                status='uploaded'
            )
            
            # Log the upload
            ProcessingLog.objects.create(
                session=session,
                level='info',
                message=f'ZIP file uploaded: {zip_file.name}',
                details={'size': zip_file.size, 'content_type': zip_file.content_type}
            )
            
            # Start background processing
            thread = threading.Thread(
                target=self._process_zip_background,
                args=(session_id,)
            )
            thread.daemon = True
            thread.start()
            
            return Response({
                'session_id': str(session_id),
                'message': 'Upload successful. Validation started.',
                'status': 'uploaded'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            logger.error(f"Upload error: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _save_zip_file(self, zip_file, session_id):
        """Save ZIP file to storage"""
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(session_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, zip_file.name)
        
        with open(file_path, 'wb+') as destination:
            for chunk in zip_file.chunks():
                destination.write(chunk)
        
        return file_path
    
    def _process_zip_background(self, session_id):
        """Background processing of ZIP file"""
        try:
            session = UploadSession.objects.get(session_id=session_id)
            session.status = 'extracting'
            session.started_at = datetime.now()
            session.save()
            
            # Extract ZIP
            extract_dir = self._extract_zip(session)
            
            # Validate files
            self._validate_files(session, extract_dir)
            
            # Update session status
            session.status = 'validated'
            session.save()
            
        except Exception as e:
            logger.error(f"Background processing error: {str(e)}", exc_info=True)
            session = UploadSession.objects.get(session_id=session_id)
            session.status = 'failed'
            session.validation_errors = {'error': str(e)}
            session.save()
    
    def _extract_zip(self, session):
        """Extract ZIP file"""
        extract_dir = os.path.join(settings.MEDIA_ROOT, 'extracted', str(session.session_id))
        os.makedirs(extract_dir, exist_ok=True)
        
        ProcessingLog.objects.create(
            session=session,
            level='info',
            message=f'Extracting ZIP file to {extract_dir}'
        )
        
        with zipfile.ZipFile(session.zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
            
            # Log extracted files
            file_list = zip_ref.namelist()
            ProcessingLog.objects.create(
                session=session,
                level='info',
                message=f'Extracted {len(file_list)} files',
                details={'files': file_list}
            )
        
        return extract_dir
    
    def _validate_files(self, session, extract_dir):
        """Validate all Parquet files"""
        parquet_files = [f for f in os.listdir(extract_dir) if f.endswith('.parquet')]
        session.total_files = len(parquet_files)
        session.save()
        
        ProcessingLog.objects.create(
            session=session,
            level='info',
            message=f'Found {len(parquet_files)} Parquet files for validation'
        )
        
        for file_name in parquet_files:
            try:
                self._validate_single_file(session, extract_dir, file_name)
            except Exception as e:
                logger.error(f"Validation error for {file_name}: {str(e)}", exc_info=True)
                
                # Create failed file record
                ParquetFile.objects.create(
                    session=session,
                    file_name=file_name,
                    file_path=os.path.join(extract_dir, file_name),
                    table_name='unknown',
                    status='failed',
                    validation_errors={'error': str(e)}
                )
                
                ProcessingLog.objects.create(
                    session=session,
                    level='error',
                    message=f'Validation failed for {file_name}',
                    details={'error': str(e)}
                )
    
    def _validate_single_file(self, session, extract_dir, file_name):
        """Validate a single Parquet file"""
        file_path = os.path.join(extract_dir, file_name)
        
        ProcessingLog.objects.create(
            session=session,
            level='info',
            message=f'Validating {file_name}',
            parquet_file=None
        )
        
        # Get expected schema
        expected = EXPECTED_SCHEMAS.get(file_name)
        if not expected:
            raise ValueError(f"File {file_name} not in expected file list")
        
        # Create ParquetFile record
        parquet_file = ParquetFile.objects.create(
            session=session,
            file_name=file_name,
            file_path=file_path,
            table_name=expected['table_name'],
            status='validating',
            expected_schema=expected['columns']
        )
        
        try:
            # Read Parquet file
            parquet_file_obj = pq.ParquetFile(file_path)
            df = pd.read_parquet(file_path)
            
            # Update record count
            parquet_file.record_count = len(df)
            session.total_records += len(df)
            
            # Validate schema
            validation_result = self._validate_schema(df, expected)
            
            if validation_result['is_valid']:
                parquet_file.status = 'validated'
                parquet_file.validated_at = datetime.now()
                parquet_file.actual_schema = list(df.columns)
                
                ProcessingLog.objects.create(
                    session=session,
                    parquet_file=parquet_file,
                    level='info',
                    message=f'Validation passed for {file_name}',
                    details={
                        'records': len(df),
                        'columns': list(df.columns)
                    }
                )
            else:
                parquet_file.status = 'failed'
                parquet_file.validation_errors = validation_result['errors']
                parquet_file.missing_columns = validation_result.get('missing_columns', [])
                parquet_file.extra_columns = validation_result.get('extra_columns', [])
                parquet_file.data_type_errors = validation_result.get('data_type_errors', [])
                
                ProcessingLog.objects.create(
                    session=session,
                    parquet_file=parquet_file,
                    level='error',
                    message=f'Validation failed for {file_name}',
                    details=validation_result['errors']
                )
            
            parquet_file.save()
            session.save()
            
        except Exception as e:
            parquet_file.status = 'failed'
            parquet_file.validation_errors = {'read_error': str(e)}
            parquet_file.save()
            
            ProcessingLog.objects.create(
                session=session,
                parquet_file=parquet_file,
                level='error',
                message=f'Error reading {file_name}',
                details={'error': str(e)}
            )
            raise
    
    def _validate_schema(self, df, expected_schema):
        """Validate DataFrame schema against expected schema"""
        result = {
            'is_valid': True,
            'errors': {},
            'missing_columns': [],
            'extra_columns': [],
            'data_type_errors': []
        }
        
        actual_columns = set(df.columns)
        expected_columns = set(expected_schema['columns'])
        required_columns = set(expected_schema['required'])
        
        # Check missing columns
        missing_columns = required_columns - actual_columns
        if missing_columns:
            result['is_valid'] = False
            result['missing_columns'] = list(missing_columns)
            result['errors']['missing_columns'] = f'Missing required columns: {list(missing_columns)}'
        
        # Check extra columns (optional, can be warnings)
        extra_columns = actual_columns - expected_columns
        if extra_columns:
            result['extra_columns'] = list(extra_columns)
        
        # Check data types
        type_errors = []
        for col, expected_type in expected_schema['types'].items():
            if col in df.columns:
                if expected_type == 'numeric':
                    if not pd.api.types.is_numeric_dtype(df[col]):
                        type_errors.append(f"{col}: expected numeric, got {df[col].dtype}")
                elif expected_type == 'string':
                    if not pd.api.types.is_string_dtype(df[col]):
                        type_errors.append(f"{col}: expected string, got {df[col].dtype}")
                elif expected_type == 'integer':
                    if not pd.api.types.is_integer_dtype(df[col]):
                        type_errors.append(f"{col}: expected integer, got {df[col].dtype}")
        
        if type_errors:
            result['is_valid'] = False
            result['data_type_errors'] = type_errors
            result['errors']['data_type_errors'] = type_errors
        
        return result

class GetUploadStatus(APIView):
    """Get upload and validation status"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        try:
            # Get session
            session = UploadSession.objects.get(
                session_id=session_id,
                user=request.user
            )
            
            # Get parquet files
            parquet_files = ParquetFile.objects.filter(session=session)
            
            # Calculate summary
            summary = self._calculate_summary(session, parquet_files)
            
            # Get file details
            files_detail = []
            for pf in parquet_files:
                files_detail.append({
                    'file_name': pf.file_name,
                    'status': pf.status,
                    'record_count': pf.record_count,
                    'inserted_count': pf.inserted_count,
                    'failed_count': pf.failed_count,
                    'validation_errors': pf.validation_errors,
                    'missing_columns': pf.missing_columns,
                    'extra_columns': pf.extra_columns,
                    'data_type_errors': pf.data_type_errors,
                    'table_name': pf.table_name,
                    'validated_at': pf.validated_at,
                    'processed_at': pf.processed_at
                })
            
            response_data = {
                'session_id': str(session.session_id),
                'status': session.status,
                'metadata': {
                    'month': session.month,
                    'year': session.year,
                    'compile_type': session.compile_type,
                    'zip_file': session.zip_file_name,
                    'created_at': session.created_at,
                    'started_at': session.started_at,
                    'completed_at': session.completed_at
                },
                'summary': summary,
                'files': files_detail,
                'logs': self._get_recent_logs(session)
            }
            
            return Response(response_data)
            
        except UploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Status check error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_summary(self, session, parquet_files):
        """Calculate summary statistics"""
        total_files = parquet_files.count()
        validated_files = parquet_files.filter(status='validated').count()
        failed_files = parquet_files.filter(status='failed').count()
        uploaded_files = parquet_files.filter(status='uploaded').count()
        
        total_records = sum(pf.record_count for pf in parquet_files)
        total_inserted = sum(pf.inserted_count for pf in parquet_files)
        total_failed = sum(pf.failed_count for pf in parquet_files)
        
        return {
            'total_files': total_files,
            'validated_files': validated_files,
            'failed_files': failed_files,
            'uploaded_files': uploaded_files,
            'total_records': total_records,
            'total_inserted': total_inserted,
            'total_failed': total_failed,
            'processing_progress': self._calculate_progress(parquet_files)
        }
    
    def _calculate_progress(self, parquet_files):
        """Calculate processing progress percentage"""
        total_files = parquet_files.count()
        if total_files == 0:
            return 0
        
        uploaded_files = parquet_files.filter(status='uploaded').count()
        return int((uploaded_files / total_files) * 100)
    
    def _get_recent_logs(self, session, limit=20):
        """Get recent logs for the session"""
        logs = ProcessingLog.objects.filter(
            session=session
        ).order_by('-created_at')[:limit]
        
        return [{
            'level': log.level,
            'message': log.message,
            'details': log.details,
            'created_at': log.created_at,
            'file': log.parquet_file.file_name if log.parquet_file else None
        } for log in logs]

class ProcessValidatedFiles(APIView):
    """Process validated files and insert into database"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            session_id = request.data.get('session_id')
            
            if not session_id:
                return Response(
                    {'error': 'session_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get session
            session = UploadSession.objects.get(
                session_id=session_id,
                user=request.user,
                status='validated'
            )
            
            # Start background processing
            thread = threading.Thread(
                target=self._process_files_background,
                args=(session_id,)
            )
            thread.daemon = True
            thread.start()
            
            return Response({
                'message': 'Processing started',
                'session_id': str(session_id)
            }, status=status.HTTP_202_ACCEPTED)
            
        except UploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found, not validated, or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Process start error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _process_files_background(self, session_id):
        """Background processing of validated files"""
        try:
            session = UploadSession.objects.get(session_id=session_id)
            session.status = 'processing'
            session.save()
            
            ProcessingLog.objects.create(
                session=session,
                level='info',
                message='Starting data insertion process'
            )
            
            # Get validated files
            validated_files = ParquetFile.objects.filter(
                session=session,
                status='validated'
            )
            
            total_inserted = 0
            total_failed = 0
            
            for parquet_file in validated_files:
                try:
                    inserted, failed = self._process_single_file(parquet_file, session)
                    total_inserted += inserted
                    total_failed += failed
                    
                    # Update session totals
                    session.inserted_records += inserted
                    session.failed_records += failed
                    session.save()
                    
                except Exception as e:
                    logger.error(f"Processing error for {parquet_file.file_name}: {str(e)}", exc_info=True)
                    
                    parquet_file.status = 'failed'
                    parquet_file.processing_errors = {'error': str(e)}
                    parquet_file.save()
                    
                    ProcessingLog.objects.create(
                        session=session,
                        parquet_file=parquet_file,
                        level='error',
                        message=f'Processing failed for {parquet_file.file_name}',
                        details={'error': str(e)}
                    )
            
            # Update session status
            session.status = 'completed'
            session.completed_at = datetime.now()
            session.save()
            
            ProcessingLog.objects.create(
                session=session,
                level='info',
                message='Processing completed',
                details={
                    'total_inserted': total_inserted,
                    'total_failed': total_failed,
                    'duration': (session.completed_at - session.started_at).total_seconds()
                }
            )
            
        except Exception as e:
            logger.error(f"Background processing error: {str(e)}", exc_info=True)
            session = UploadSession.objects.get(session_id=session_id)
            session.status = 'failed'
            session.processing_errors = {'error': str(e)}
            session.save()
    
    def _process_single_file(self, parquet_file, session):
        """Process single Parquet file and insert into database"""
        parquet_file.status = 'processing'
        parquet_file.save()
        
        ProcessingLog.objects.create(
            session=session,
            parquet_file=parquet_file,
            level='info',
            message=f'Processing {parquet_file.file_name}',
            details={'table': parquet_file.table_name}
        )
        
        try:
            # Read Parquet file
            df = pd.read_parquet(parquet_file.file_path)
            
            # Prepare data for insertion
            data_to_insert = self._prepare_data_for_insertion(
                df, parquet_file.table_name, session
            )
            
            # Insert using raw SQL
            inserted, failed = self._insert_data_raw(
                data_to_insert, parquet_file.table_name, session
            )
            
            # Update parquet file record
            parquet_file.inserted_count = inserted
            parquet_file.failed_count = failed
            parquet_file.status = 'uploaded'
            parquet_file.processed_at = datetime.now()
            parquet_file.save()
            
            ProcessingLog.objects.create(
                session=session,
                parquet_file=parquet_file,
                level='info',
                message=f'Processing completed for {parquet_file.file_name}',
                details={
                    'inserted': inserted,
                    'failed': failed,
                    'total': len(df)
                }
            )
            
            return inserted, failed
            
        except Exception as e:
            parquet_file.status = 'failed'
            parquet_file.processing_errors = {'error': str(e)}
            parquet_file.save()
            raise
    
    def _prepare_data_for_insertion(self, df, table_name, session):
        """Prepare DataFrame data for SQL insertion"""
        # Add session metadata
        df['session_id'] = str(session.session_id)
        df['upload_timestamp'] = datetime.now()
        df['validation_status'] = 'validated'
        
        # Ensure column names match database columns
        column_mapping = {
            'rural_market_data': {
                'Item_Code': 'item_code',
                'Item_Name': 'item_name',
                'Price': 'price',
                'Month': 'month',
                'Year': 'year',
                'Region': 'region',
                'Unit': 'unit',
                'Market': 'market'
            },
            'urban_market_data': {
                'Item_Code': 'item_code',
                'Item_Name': 'item_name',
                'Price': 'price',
                'Month': 'month',
                'Year': 'year',
                'Region': 'region',
                'Unit': 'unit',
                'Market': 'market'
            },
            'rural_housing_rent_data': {
                'City': 'city',
                'House_ID': 'house_id',
                'Rent_Amount': 'rent_amount',
                'Month': 'month',
                'Year': 'year',
                'House_Type': 'house_type',
                'Area_sqft': 'area_sqft'
            },
            'urban_housing_rent_data': {
                'City': 'city',
                'House_ID': 'house_id',
                'Rent_Amount': 'rent_amount',
                'Month': 'month',
                'Year': 'year',
                'House_Type': 'house_type',
                'Area_sqft': 'area_sqft',
                'Furnished': 'furnished'
            },
            'rural_elect_data': {
                'Meter_No': 'meter_no',
                'Units': 'units',
                'Rate': 'rate',
                'Month': 'month',
                'Year': 'year',
                'Consumer_Name': 'consumer_name',
                'Address': 'address',
                'Bill_Amount': 'bill_amount'
            },
            'urban_elect_data': {
                'Meter_No': 'meter_no',
                'Units': 'units',
                'Rate': 'rate',
                'Month': 'month',
                'Year': 'year',
                'Consumer_Name': 'consumer_name',
                'Address': 'address',
                'Bill_Amount': 'bill_amount',
                'Tariff_Type': 'tariff_type'
            },
            'online_market_data': {
                'Item_Code': 'item_code',
                'Platform': 'platform',
                'Price': 'price',
                'Month': 'month',
                'Year': 'year',
                'Category': 'category',
                'Brand': 'brand',
                'Discount': 'discount'
            },
            'airfare_data': {
                'Flight_No': 'flight_no',
                'From': 'from_city',
                'To': 'to_city',
                'Fare': 'fare',
                'Month': 'month',
                'Airline': 'airline',
                'Departure_Time': 'departure_time',
                'Duration_hours': 'duration_hours'
            },
            'urban_pds_data': {
                'Commodity': 'commodity',
                'Region': 'region',
                'Price': 'price',
                'Month': 'month',
                'Year': 'year',
                'Subsidy': 'subsidy',
                'Quantity': 'quantity',
                'Unit': 'unit'
            }
        }
        
        # Rename columns
        if table_name in column_mapping:
            df = df.rename(columns=column_mapping[table_name])
        
        return df
    
    def _insert_data_raw(self, df, table_name, session, batch_size=1000):
        """Insert data using raw SQL with batch processing"""
        if len(df) == 0:
            return 0, 0
        
        inserted = 0
        failed = 0
        
        # Get column names for SQL
        columns = list(df.columns)
        
        # Process in batches
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            
            try:
                with transaction.atomic():
                    # Prepare values for bulk insert
                    values_list = []
                    for _, row in batch.iterrows():
                        values = []
                        for col in columns:
                            val = row[col]
                            
                            # Handle different data types
                            if pd.isna(val):
                                values.append('NULL')
                            elif isinstance(val, str):
                                # Escape single quotes
                                escaped = val.replace("'", "''")
                                values.append(f"'{escaped}'")
                            elif isinstance(val, (int, np.integer)):
                                values.append(str(val))
                            elif isinstance(val, (float, np.floating)):
                                values.append(str(val))
                            elif isinstance(val, datetime):
                                values.append(f"'{val.isoformat()}'")
                            else:
                                values.append(f"'{str(val)}'")
                        
                        values_list.append(f"({', '.join(values)})")
                    
                    # Build SQL query
                    columns_str = ', '.join([f'"{col}"' for col in columns])
                    values_str = ', '.join(values_list)
                    
                    sql = f"""
                    INSERT INTO {table_name} ({columns_str})
                    VALUES {values_str}
                    ON CONFLICT DO NOTHING;
                    """
                    
                    # Execute raw SQL
                    with connection.cursor() as cursor:
                        cursor.execute(sql)
                        inserted += cursor.rowcount
                    
                    # Log batch insertion
                    ProcessingLog.objects.create(
                        session=session,
                        level='debug',
                        message=f'Inserted batch for {table_name}',
                        details={'batch_size': len(batch), 'inserted': len(batch)}
                    )
                    
            except Exception as e:
                failed += len(batch)
                logger.error(f"Batch insert error for {table_name}: {str(e)}", exc_info=True)
                
                # Try inserting row by row to identify problematic rows
                for _, row in batch.iterrows():
                    try:
                        with transaction.atomic():
                            self._insert_single_row(row, table_name, columns)
                            inserted += 1
                    except Exception as row_error:
                        failed += 1
                        ProcessingLog.objects.create(
                            session=session,
                            level='error',
                            message=f'Row insertion failed for {table_name}',
                            details={'error': str(row_error), 'row_data': row.to_dict()}
                        )
        
        return inserted, failed
    
    def _insert_single_row(self, row, table_name, columns):
        """Insert single row with error handling"""
        values = []
        for col in columns:
            val = row[col]
            
            if pd.isna(val):
                values.append('NULL')
            elif isinstance(val, str):
                escaped = val.replace("'", "''")
                values.append(f"'{escaped}'")
            elif isinstance(val, (int, np.integer)):
                values.append(str(val))
            elif isinstance(val, (float, np.floating)):
                values.append(str(val))
            elif isinstance(val, datetime):
                values.append(f"'{val.isoformat()}'")
            else:
                values.append(f"'{str(val)}'")
        
        columns_str = ', '.join([f'"{col}"' for col in columns])
        values_str = ', '.join(values)
        
        sql = f"""
        INSERT INTO {table_name} ({columns_str})
        VALUES ({values_str})
        ON CONFLICT DO NOTHING;
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql)

class ListUploadSessions(APIView):
    """List all upload sessions for the user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            sessions = UploadSession.objects.filter(
                user=request.user
            ).order_by('-created_at')
            
            session_list = []
            for session in sessions:
                # Get summary stats
                parquet_files = ParquetFile.objects.filter(session=session)
                
                session_list.append({
                    'session_id': str(session.session_id),
                    'zip_file': session.zip_file_name,
                    'month': session.month,
                    'year': session.year,
                    'compile_type': session.compile_type,
                    'status': session.status,
                    'total_files': session.total_files,
                    'total_records': session.total_records,
                    'inserted_records': session.inserted_records,
                    'failed_records': session.failed_records,
                    'created_at': session.created_at,
                    'completed_at': session.completed_at,
                    'summary': {
                        'validated_files': parquet_files.filter(status='validated').count(),
                        'failed_files': parquet_files.filter(status='failed').count(),
                        'uploaded_files': parquet_files.filter(status='uploaded').count()
                    }
                })
            
            return Response({'sessions': session_list})
            
        except Exception as e:
            logger.error(f"List sessions error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DeleteUploadSession(APIView):
    """Delete an upload session"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, session_id):
        try:
            session = UploadSession.objects.get(
                session_id=session_id,
                user=request.user
            )
            
            # Delete associated files from storage
            self._cleanup_session_files(session)
            
            # Delete from database
            session.delete()
            
            return Response({
                'message': 'Session deleted successfully',
                'session_id': str(session_id)
            })
            
        except UploadSession.DoesNotExist:
            return Response(
                {'error': 'Session not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Delete session error: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _cleanup_session_files(self, session):
        """Clean up files associated with the session"""
        import shutil
        
        # Delete extracted files
        extract_dir = os.path.join(settings.MEDIA_ROOT, 'extracted', str(session.session_id))
        if os.path.exists(extract_dir):
            shutil.rmtree(extract_dir)
        
        # Delete uploaded ZIP
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', str(session.session_id))
        if os.path.exists(upload_dir):
            shutil.rmtree(upload_dir)