import asyncio
import json
import multiprocessing
import uuid
import threading
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import os
import logging
import asyncpg

import time
import traceback

import pandas as pd
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view,permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.conf import settings
import hashlib
from datetime import datetime
from django.db import connections, transaction
from psycopg2.extras import execute_values


# from api.utils.db import execute_query

import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed, ProcessPoolExecutor
from django.db import connection, connections

from .import_db import ImportContext, ImportState, delete_all_tables, process_directory, run_import, sync_progress

from .import_data_indb import COMPILED_DIR, VALIDATED_DIR, InsertAllFilesIntoDB



logger = logging.getLogger(__name__)

# Import your actual functions
from api.upload_input_data.read_validate_price_data import (
    read_validate,
    load_rural_elec_price_data,
    load_urban_elec_price_data,
    load_urban_hr_price_data,
    load_rural_hr_price_data,
    load_uploaded_pds_price_data,
    load_uploaded_ott_price_data,
    load_uploaded_postal_price_data,
    load_uploaded_fuel_price_data,
    load_uploaded_telecom_price_data,
    load_rural_mkt_price_data,
    load_urban_mkt_price_data,
    load_urban_airfare_price_data,
    load_urban_online_price_data,
    load_uploaded_railfare_data,
    load_uploaded_metro_fare_data,
    save_validated_rural_elec_price_data,
    save_validated_urban_elec_price_data,
    save_validated_urban_hr_price_data,
    save_validated_rural_hr_price_data,
    save_all_urban_hr_price_data_db,
    save_all_rural_hr_price_data_db,
    save_validated_pds_price_data,
    save_validated_ott_price_data,
    save_validated_postal_price_data,
    save_validated_fuel_price,
    save_validated_telecom_price_data,
    save_validated_rural_mkt_price_data,
    save_validated_urban_mkt_price_data,
    save_validated_urban_airfare_price_data,
    save_validated_urban_online_price_data,
    save_validated_railfare_price_data,
    save_validated_metro_fare_price_data
)

from api.compiltaion_scripts.all_price_data import (
    compilation_index,
    house_rent_script,
    electricity_index_script,
    pds_item_index_script,
    fuel_price_index_script,
    telecom_price_index_script,
    postal_ott_index_script,
    railfare_index_script,
    market_item_index_script,
    all_index_script
)

from ..authentication.role_decorator import role_required
from ..authentication.custom_jwt_auth import RawJWTAuthentication
from rest_framework.decorators import authentication_classes
from django.views.decorators.csrf import csrf_exempt




# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Simple configuration"""
    
    # Directory paths
    BASE_DIR = Path(settings.MEDIA_ROOT)
    UPLOAD_DIR = BASE_DIR / 'uploads'
    EXTRACT_DIR = Path("data/input/raw")
    VALIDATED_DIR = Path("data/input/validated")
    COMPILED_DIR = Path("data/output")
    
    # File settings
    # Performance settings
    MAX_WORKERS = min(32, multiprocessing.cpu_count() * 4)  # Maximum parallelism
    BATCH_SIZE = 10000  # Optimal batch size for bulk inserts
    TABLE_TIMEOUT = 120  # Seconds per table timeout (2 minutes)
    CHUNK_SIZE = 50000  # Chunk size for large dataframes
    
  
       
    
    # Status constants
    class Status:
        SUCCESS = 'success'
        ERROR = 'error'
        UPLOADED = 'UPLOADED'
        EXTRACTING = 'EXTRACTING'
        VALIDATING = 'VALIDATING'
        IN_PROGRESS = 'IN_PROGRESS'
        VALIDATED = 'VALIDATED'
        COMPILING = 'COMPILING'
        COMPLETED = 'COMPLETED'
        FAILED = 'FAILED'
        PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED'
    
    # Compilation methods
    COMPILATION_METHODS = [
        'house_rent_script',
        'electricity_index_script',
        'pds_item_index_script',
        'fuel_price_index_script',
        'telecom_price_index_script',
        'postal_ott_index_script',
        'railfare_index_script',
        'market_item_index_script',
        'all_index_script'
    ]


# Create directories
for dir_path in [Config.UPLOAD_DIR, Config.EXTRACT_DIR, Config.VALIDATED_DIR, Config.COMPILED_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)


# ============================================================================
# DATABASE HELPERS (SIMPLIFIED)
# ============================================================================

def execute_query(sql, params=None, fetch_one=False):
    """Execute SQL query and return results"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        if fetch_one:
            row = cursor.fetchone()
            if row:
                columns = [col[0] for col in cursor.description]
                return dict(zip(columns, row))
            return None
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

def execute_update(sql, params=None):
    """Execute SQL update and return row count"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.rowcount

def execute_insert(sql, params=None):
    """Execute SQL insert and return inserted record"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, cursor.fetchone()))


# ============================================================================
# FILE UTILITIES (SIMPLIFIED)
# ============================================================================

def format_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 Bytes"
    units = ['Bytes', 'KB', 'MB', 'GB']
    size = float(size_bytes)
    for unit in units:
        if size < 1024.0:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} TB"

def get_file_info(file_path):
    """Get file information"""
    stat = file_path.stat()
    return {
        'size': stat.st_size,
        'size_formatted': format_size(stat.st_size),
        'modified': datetime.fromtimestamp(stat.st_mtime).isoformat()
    }
    
    
    
# ============================================================================
# PROGRESS TRACKING FUNCTIONS
# ============================================================================

def update_validation_progress(session_id, current_step, total_steps, step_name, status="in_progress"):
    """Update validation progress in upload_sessions"""
    try:
        progress = int((current_step / total_steps) * 100)
        
        # Store progress in validation_summary
        session = execute_query(
            "SELECT validation_summary FROM upload_sessions WHERE session_id = %s;",
            [session_id], fetch_one=True
        )
        
        if session and session.get('validation_summary'):
            if isinstance(session['validation_summary'], str):
                summary = json.loads(session['validation_summary'])
            else:
                summary = session['validation_summary']
        else:
            summary = {}
        
        summary['current_step'] = step_name
        summary['progress'] = progress
        summary['status'] = status
        summary['steps_completed'] = current_step
        summary['total_steps'] = total_steps
        
        execute_update("""
            UPDATE upload_sessions 
            SET validation_summary = %s, progress = %s, updated_at = %s
            WHERE session_id = %s;
        """, [json.dumps(summary), progress, timezone.now(), session_id])
        
    except Exception as e:
        logger.error(f"Error updating validation progress: {str(e)}")

def update_compilation_progress(task_id, method_name, progress, total_methods, methods_completed):
    """Update compilation progress in compilation_tasks"""
    try:
        # Get existing methods_executed
        task = execute_query(
            "SELECT methods_executed FROM compilation_tasks WHERE task_id = %s;",
            [task_id], fetch_one=True
        )
        
        if task and task.get('methods_executed'):
            if isinstance(task['methods_executed'], str):
                methods = json.loads(task['methods_executed'])
            else:
                methods = task['methods_executed']
        else:
            methods = []
        
        # Add completed method if not already there
        if method_name not in methods and progress >= 100:
            methods.append(method_name)
        
        # Update task
        execute_update("""
            UPDATE compilation_tasks 
            SET progress = %s, 
                current_method = %s,
                methods_executed = %s,
                updated_at = %s
            WHERE task_id = %s;
        """, [progress, method_name, json.dumps(methods), timezone.now(), task_id])
        
    except Exception as e:
        logger.error(f"Error updating compilation progress: {str(e)}")


# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

def run_all_validations(session_id):
    """
    Run all validation functions and track progress
    Returns: Dict with validation results
    """
    session_id_str = str(session_id)
    results = {
        'status': 'in_progress',
        'methods_executed': [],
        'errors': [],
        'warnings': []
    }
    
    # Define validation steps with their names and progress percentages
    validation_steps = [
        ('rural_electricity', 'Validating rural electricity data...', 5),
        ('urban_electricity', 'Validating urban electricity data...', 10),
        ('urban_house_rent', 'Validating urban house rent data...', 15),
        ('rural_house_rent', 'Validating rural house rent data...', 20),
        ('pds', 'Validating PDS data...', 25),
        ('ott', 'Validating OTT data...', 30),
        ('postal', 'Validating postal data...', 35),
        ('fuel_petrol', 'Validating petrol data...', 40),
        ('fuel_diesel', 'Validating diesel data...', 45),
        ('fuel_lpg', 'Validating LPG data...', 50),
        ('fuel_cng', 'Validating CNG data...', 55),
        ('fuel_png', 'Validating PNG data...', 60),
        ('telecom', 'Validating telecom data...', 65),
        ('rural_market', 'Validating rural market data...', 70),
        ('urban_market', 'Validating urban market data...', 75),
        ('airfare', 'Validating airfare data...', 80),
        ('online_shopping', 'Validating online shopping data...', 85),
        ('railfare', 'Validating railfare data...', 90),
        ('metro', 'Validating metro data...', 95),
        ('main_validation', 'Running main validation...', 100)
    ]
    
    total_steps = len(validation_steps)
    completed_steps = 0
    
    try:
        logger.info(f"Starting validation for session {session_id_str}")
        
        # Update status to validating
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, updated_at = %s
            WHERE session_id = %s;
        """, [Config.Status.VALIDATING, timezone.now(), session_id_str])
        
        # Create validated directory for this session
        validated_dir = Config.VALIDATED_DIR / session_id_str
        validated_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Validated files will be saved to: {validated_dir}")
        
        # 1. Electricity validation
        current_step = 1
        progress = int((current_step / total_steps) * 100)
        execute_update("""
            UPDATE upload_sessions 
            SET progress = %s, current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, [progress, "Electricity Validation", "Validating rural and urban electricity data...", 
              timezone.now(), session_id_str])
        
        logger.info("Validating electricity data...")
        try:
            rural_elec, _, _ = load_rural_elec_price_data()
            if rural_elec is not None:
                save_validated_rural_elec_price_data(rural_elec)
                results['methods_executed'].append('rural_electricity')
                logger.info("Rural electricity validation complete")
        except Exception as e:
            results['errors'].append(f"rural_electricity: {str(e)}")

        try:
            urban_elec, _, _ = load_urban_elec_price_data()
            if urban_elec is not None:
                save_validated_urban_elec_price_data(urban_elec)
                results['methods_executed'].append('urban_electricity')
                logger.info("Urban electricity validation complete")
        except Exception as e:
            results['errors'].append(f"urban_electricity: {str(e)}")
        
        # Update progress after electricity validation
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("""
            UPDATE upload_sessions 
            SET progress = %s, updated_at = %s
            WHERE session_id = %s;
        """, [progress, timezone.now(), session_id_str])
        
        # 2. House rent validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["House Rent Validation", "Validating urban and rural house rent data...", 
              timezone.now(), session_id_str])
        
        logger.info("Validating house rent data...")
        try:
            urban_hr, _, _ = load_urban_hr_price_data()
            if urban_hr is not None:
                save_validated_urban_hr_price_data(urban_hr)
                results['methods_executed'].append('urban_house_rent')
                logger.info("Urban house rent validation complete")
        except Exception as e:
            results['errors'].append(f"urban_house_rent: {str(e)}")

        try:
            rural_hr, _, _ = load_rural_hr_price_data()
            if rural_hr is not None:
                save_validated_rural_hr_price_data(rural_hr)
                results['methods_executed'].append('rural_house_rent')
                logger.info("Rural house rent validation complete")
        except Exception as e:
            results['errors'].append(f"rural_house_rent: {str(e)}")
        
        # Update progress
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("""
            UPDATE upload_sessions 
            SET progress = %s, updated_at = %s
            WHERE session_id = %s;
        """, [progress, timezone.now(), session_id_str])
        
        # 3. PDS validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["PDS Validation", "Validating PDS data...", timezone.now(), session_id_str])
        
        logger.info("Validating PDS data...")
        try:
            pds_data, _, _ = load_uploaded_pds_price_data()
            if pds_data is not None:
                save_validated_pds_price_data(pds_data)
                results['methods_executed'].append('pds')
                logger.info("PDS validation complete")
        except Exception as e:
            results['errors'].append(f"pds: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 4. OTT and Postal validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["OTT & Postal Validation", "Validating OTT and Postal data...", 
              timezone.now(), session_id_str])
        
        logger.info("Validating OTT and Postal data...")
        try:
            ott_data, _, _ = load_uploaded_ott_price_data()
            if ott_data is not None:
                save_validated_ott_price_data(ott_data)
                results['methods_executed'].append('ott')
                logger.info("OTT validation complete")
        except Exception as e:
            results['errors'].append(f"ott: {str(e)}")

        try:
            postal_data, _, _ = load_uploaded_postal_price_data()
            if postal_data is not None:
                save_validated_postal_price_data(postal_data)
                results['methods_executed'].append('postal')
                logger.info("Postal validation complete")
        except Exception as e:
            results['errors'].append(f"postal: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 5. Fuel validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Fuel Validation", "Validating fuel price data...", timezone.now(), session_id_str])
        
        logger.info("Validating fuel data...")
        fuel_types = [(1, 'petrol'), (2, 'diesel'), (3, 'lpg'), (4, 'cng'), (5, 'png')]
        for fuel_id, fuel_name in fuel_types:
            try:
                fuel_data, _, _ = load_uploaded_fuel_price_data(fuel_type_id=fuel_id)
                if fuel_data is not None:
                    save_validated_fuel_price(fuel_data, fuel_type_id=fuel_id)
                    results['methods_executed'].append(f'fuel_{fuel_name}')
                    logger.info(f"Fuel {fuel_name} validation complete")
            except Exception as e:
                results['errors'].append(f"fuel_{fuel_name}: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 6. Telecom validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Telecom Validation", "Validating telecom data...", timezone.now(), session_id_str])
        
        logger.info("Validating telecom data...")
        try:
            telecom_data, _, _ = load_uploaded_telecom_price_data()
            if telecom_data is not None:
                save_validated_telecom_price_data(telecom_data)
                results['methods_executed'].append('telecom')
                logger.info("Telecom validation complete")
        except Exception as e:
            results['errors'].append(f"telecom: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 7. Market data validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Market Validation", "Validating market data...", timezone.now(), session_id_str])
        
        logger.info("Validating market data...")
        try:
            rural_mkt, _, _ = load_rural_mkt_price_data()
            if rural_mkt is not None:
                save_validated_rural_mkt_price_data(rural_mkt)
                results['methods_executed'].append('rural_market')
                logger.info("Rural market validation complete")
        except Exception as e:
            results['errors'].append(f"rural_market: {str(e)}")

        try:
            urban_mkt, _, _ = load_urban_mkt_price_data()
            if urban_mkt is not None:
                save_validated_urban_mkt_price_data(urban_mkt)
                results['methods_executed'].append('urban_market')
                logger.info("Urban market validation complete")
        except Exception as e:
            results['errors'].append(f"urban_market: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 8. Airfare validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Airfare Validation", "Validating airfare data...", timezone.now(), session_id_str])
        
        logger.info("Validating airfare data...")
        try:
            airfare_data, _, _ = load_urban_airfare_price_data()
            if airfare_data is not None:
                save_validated_urban_airfare_price_data(airfare_data)
                results['methods_executed'].append('airfare')
                logger.info("Airfare validation complete")
        except Exception as e:
            results['errors'].append(f"airfare: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 9. Online shopping validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Online Shopping Validation", "Validating online shopping data...", 
              timezone.now(), session_id_str])
        
        logger.info("Validating online shopping data...")
        try:
            online_data, _, _ = load_urban_online_price_data()
            if online_data is not None:
                save_validated_urban_online_price_data(online_data)
                results['methods_executed'].append('online_shopping')
                logger.info("Online shopping validation complete")
        except Exception as e:
            results['errors'].append(f"online_shopping: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # 10. Railfare and Metro validation
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Railfare & Metro Validation", "Validating railfare and metro data...", 
              timezone.now(), session_id_str])
        
        logger.info("Validating railfare and metro data...")
        try:
            railfare_data, _, _ = load_uploaded_railfare_data()
            if railfare_data is not None:
                save_validated_railfare_price_data(railfare_data)
                results['methods_executed'].append('railfare')
                logger.info("Railfare validation complete")
        except Exception as e:
            results['errors'].append(f"railfare: {str(e)}")

        try:
            metro_data, _, _ = load_uploaded_metro_fare_data()
            if metro_data is not None:
                save_validated_metro_fare_price_data(metro_data)
                results['methods_executed'].append('metro')
                logger.info("Metro validation complete")
        except Exception as e:
            results['errors'].append(f"metro: {str(e)}")
        
        completed_steps += 1
        progress = int((completed_steps / total_steps) * 100)
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # Call main validation function
        execute_update("""
            UPDATE upload_sessions 
            SET current_step = %s, step_details = %s, updated_at = %s
            WHERE session_id = %s;
        """, ["Main Validation", "Running main validation function...", 
              timezone.now(), session_id_str])
        
        try:
            read_validate()
            logger.info("Main validation function complete")
            results['methods_executed'].append('main_validation')
        except Exception as e:
            results['warnings'].append(f"main_validation: {str(e)}")
        
        completed_steps += 1
        progress = 100
        execute_update("UPDATE upload_sessions SET progress = %s WHERE session_id = %s;", 
                      [progress, session_id_str])
        
        # Determine overall status
        if len(results['errors']) == 0:
            results['status'] = 'success'
            status = Config.Status.VALIDATED
            current_step = "Complete"
            step_details = "All validations completed successfully"
        elif len(results['methods_executed']) > 0:
            results['status'] = 'partial'
            status = Config.Status.PARTIALLY_VALIDATED
            current_step = "Partial Complete"
            step_details = f"Completed {len(results['methods_executed'])} validations with {len(results['errors'])} errors"
        else:
            results['status'] = 'failed'
            status = Config.Status.FAILED
            current_step = "Failed"
            step_details = "Validation failed"
        
        # Final update
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, progress = %s, current_step = %s, step_details = %s,
                validation_summary = %s, processed_files = %s, failed_files = %s,
                updated_at = %s
            WHERE session_id = %s;
        """, [
            status,
            progress,
            current_step,
            step_details,
            json.dumps(results, default=str),
            len(results['methods_executed']),
            len(results['errors']),
            timezone.now(),
            session_id_str
        ])
        
        results['summary'] = {
            'total': len(results['methods_executed']),
            'methods': results['methods_executed'],
            'errors': len(results['errors'])
        }
        
        logger.info(f"Validation completed. {len(results['methods_executed'])} methods executed, {len(results['errors'])} errors")
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        results['status'] = 'failed'
        results['errors'].append(str(e))
        results['traceback'] = traceback.format_exc()
        
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, error_message = %s, validation_summary = %s, updated_at = %s
            WHERE session_id = %s;
        """, [Config.Status.FAILED, str(e), json.dumps(results, default=str), 
              timezone.now(), session_id_str])
    
    return results
# ============================================================================
# COMPILATION FUNCTIONS
# ============================================================================

def run_all_compilations(task_id, session_id, month, year, compile_type):
    """
    Run all compilation functions and track progress
    Returns: Dict with compilation results
    """
    task_id_str = str(task_id)
    results = {
        'status': 'in_progress',
        'methods_executed': [],
        'errors': []
    }
    
    # List of compilation methods
    methods = [
        ('house_rent_script', house_rent_script, 11),  # 11% each (9 methods = 99%)
        ('electricity_index_script', electricity_index_script, 22),
        ('pds_item_index_script', pds_item_index_script, 33),
        ('fuel_price_index_script', fuel_price_index_script, 44),
        ('telecom_price_index_script', telecom_price_index_script, 55),
        ('postal_ott_index_script', postal_ott_index_script, 66),
        ('railfare_index_script', railfare_index_script, 77),
        ('market_item_index_script', market_item_index_script, 88),
        ('all_index_script', all_index_script, 99)
    ]
    
    total_methods = len(methods)
    methods_completed = 0
    
    try:
        logger.info(f"Starting compilation methods for task {task_id_str}")
        
        for index, (method_name, method_func, progress) in enumerate(methods):
            try:
                # Update progress - method starting
                update_compilation_progress(
                    task_id_str, 
                    method_name, 
                    progress - 10,  # Show 1-10% for this method
                    total_methods,
                    methods_completed
                )
                
                logger.info(f"Running {method_name}... (method {index+1}/{total_methods})")
                
                # Run the actual method
                start_time = time.time()
                method_func()
                elapsed = time.time() - start_time
                
                results['methods_executed'].append(method_name)
                methods_completed += 1
                
                # Update progress - method completed
                update_compilation_progress(
                    task_id_str, 
                    method_name, 
                    progress,
                    total_methods,
                    methods_completed
                )
                
                logger.info(f"Completed {method_name} in {elapsed:.2f} seconds")
                
            except Exception as e:
                error_msg = f"{method_name}: {str(e)}"
                logger.error(f"Error in {method_name}: {str(e)}", exc_info=True)
                results['errors'].append(error_msg)
                methods_completed += 1  # Count failed methods as completed for progress
        
        # Call main compilation function
        try:
            update_compilation_progress(
                task_id_str, 
                "compilation_index", 
                95,
                total_methods,
                methods_completed
            )
            
            logger.info("Running main compilation_index function...")
            start_time = time.time()
            compilation_index(None)
            elapsed = time.time() - start_time
            
            results['methods_executed'].append('compilation_index')
            methods_completed += 1
            
            logger.info(f"Completed compilation_index in {elapsed:.2f} seconds")
        except Exception as e:
            error_msg = f"compilation_index: {str(e)}"
            logger.error(f"Error in compilation_index: {str(e)}", exc_info=True)
            results['errors'].append(error_msg)
            methods_completed += 1
        
        # Find output files
        output_files = []
        try:
            for file_path in Config.COMPILED_DIR.glob('*'):
                if file_path.suffix in ['.csv', '.parquet']:
                    output_files.append({
                        'filename': file_path.name,
                        'path': str(file_path),
                        'size': format_size(file_path.stat().st_size),
                        'modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                    })
            logger.info(f"Found {len(output_files)} output files")
        except Exception as e:
            logger.warning(f"Error finding output files: {str(e)}")
        
        # Determine status
        if len(results['errors']) == 0:
            results['status'] = 'success'
            update_compilation_progress(
                task_id_str, 
                "Complete", 
                100,
                total_methods,
                methods_completed
            )
            logger.info("All methods completed successfully")
        elif len(results['methods_executed']) > 0:
            results['status'] = 'partial'
            update_compilation_progress(
                task_id_str, 
                "Partial Complete", 
                100,
                total_methods,
                methods_completed
            )
            logger.info(f"Partial success: {len(results['methods_executed'])} methods succeeded, {len(results['errors'])} failed")
        else:
            results['status'] = 'failed'
            update_compilation_progress(
                task_id_str, 
                "Failed", 
                100,
                total_methods,
                methods_completed
            )
            logger.error(f"All methods failed: {len(results['errors'])} errors")
        
        results['output_files'] = output_files
        results['summary'] = {
            'total_methods': len(methods) + 1,  # +1 for compilation_index
            'methods_executed': len(results['methods_executed']),
            'methods': results['methods_executed'],
            'errors': len(results['errors']),
            'error_list': results['errors'],
            'output_files': len(output_files)
        }
        
        logger.info(f"Compilation completed with status: {results['status']}")
        logger.info(f"Summary: {json.dumps(results['summary'])}")
        
    except Exception as e:
        logger.error(f"Fatal error in run_all_compilations: {str(e)}", exc_info=True)
        results['status'] = 'failed'
        results['errors'].append(f"Fatal error: {str(e)}")
        results['traceback'] = traceback.format_exc()
        update_compilation_progress(
            task_id_str, 
            "Error", 
            100,
            len(methods),
            methods_completed
        )
    
    return results

@csrf_exempt
@api_view(["POST"])
def check_compilation_status(request, task_id):
    """Simple endpoint to check if compilation is complete"""
    try:
        task = execute_query(
            "SELECT status, progress, completed_at FROM compilation_tasks WHERE task_id = %s;",
            [task_id], fetch_one=True
        )
        
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # If task is completed but still showing progress, force update
        if task['status'] == 'PROGRESS' and task['progress'] >= 100:
            logger.warning(f"Task {task_id} stuck at 100% but status is PROGRESS, fixing...")
            execute_update("""
                UPDATE compilation_tasks 
                SET status = 'COMPLETED', completed_at = %s
                WHERE task_id = %s AND status = 'PROGRESS' AND progress >= 100;
            """, [timezone.now(), task_id])
            
            # Re-fetch
            task = execute_query(
                "SELECT status, progress, completed_at FROM compilation_tasks WHERE task_id = %s;",
                [task_id], fetch_one=True
            )
        
        return Response(task)
        
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# ============================================================================
# UPLOAD API
# ============================================================================

@csrf_exempt
@api_view(["POST"])
@authentication_classes([])   # 🔥 disables JWT here
@permission_classes([AllowAny])  # 🔥 allows public access
def start_upload(request):
    """Start upload process - extracts ZIP and validates files"""
    try:
        user = request.user if hasattr(request, 'user') else None
        file = request.FILES.get('file')
        selected_files = json.loads(request.POST.get('selected_files', '[]'))

         # ✅ ADD HERE (size validation)
        # MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
        
        if not file or not file.name.endswith('.zip'):
            return Response({'error': 'Please provide a valid ZIP file'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Create session
        session_id = str(uuid.uuid4())
        session_dir = Config.UPLOAD_DIR / session_id
        session_dir.mkdir(exist_ok=True)
        
        # Save ZIP
        zip_path = session_dir / file.name
        with open(zip_path, 'wb') as dest:
            for chunk in file.chunks():
                dest.write(chunk)
        
        # Calculate file hash and size
        file_hash = hashlib.sha256()
        with open(zip_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                file_hash.update(chunk)
        file_hash = file_hash.hexdigest()
        file_size = zip_path.stat().st_size
        
        # Save to database - INCLUDING ALL REQUIRED COLUMNS
        execute_insert("""
            INSERT INTO upload_sessions 
            (session_id, file_name, file_path, file_size, file_hash, status, 
             total_files, processed_files, failed_files, validation_summary, 
             created_at, updated_at, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *;
        """, [
            session_id, 
            file.name, 
            str(zip_path), 
            file_size,
            file_hash,
            Config.Status.UPLOADED, 
            len(selected_files),  # total_files
            0,                    # processed_files - FIXED: added default 0
            0,                    # failed_files - FIXED: added default 0
            '{}',                 # validation_summary - empty JSON
            timezone.now(), 
            timezone.now(),
            user.id if user else None
        ])
        
        # Start background processing
        thread = threading.Thread(
            target=process_upload_background,
            args=(session_id, str(zip_path), selected_files)
        )
        thread.daemon = True
        thread.start()
        
        return Response({
            'session_id': session_id,
            'file_name': file.name,
            'file_size': file_size,
            'status': Config.Status.UPLOADED,
            'message': 'Upload started'
        })
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def process_upload_background(session_id, zip_path, selected_files):
    """Background processing: extract ZIP and validate"""
    try:
        session_id_str = str(session_id)
        
        # Update status to extracting
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, updated_at = %s 
            WHERE session_id = %s;
        """, [Config.Status.EXTRACTING, timezone.now(), session_id_str])
        
        # Extract files
        extracted = []
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            for file_name in zip_ref.namelist():
                if file_name in selected_files:
                    # Create subdirectories if needed
                    extract_path = Config.EXTRACT_DIR / file_name
                    extract_path.parent.mkdir(parents=True, exist_ok=True)
                    zip_ref.extract(file_name, Config.EXTRACT_DIR)
                    extracted.append(str(extract_path))
                    logger.info(f"Extracted: {file_name}")
        
        if not extracted:
            raise Exception("No files were extracted")
        
        logger.info(f"Successfully extracted {len(extracted)} files")
        
        # Update total files count
        execute_update("""
            UPDATE upload_sessions 
            SET total_files = %s, updated_at = %s 
            WHERE session_id = %s;
        """, [len(extracted), timezone.now(), session_id_str])
        
        # Run validation
        validation_results = run_all_validations(session_id_str)
        
        # Update final status
        if validation_results['status'] == 'success':
            status = Config.Status.VALIDATED
        elif len(validation_results.get('methods_executed', [])) > 0:
            status = Config.Status.PARTIALLY_VALIDATED
        else:
            status = Config.Status.FAILED
        
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, 
                validation_summary = %s, 
                processed_files = %s,
                failed_files = %s,
                updated_at = %s
            WHERE session_id = %s;
        """, [
            status, 
            json.dumps(validation_results, default=str),
            len(validation_results.get('methods_executed', [])),
            len(validation_results.get('errors', [])),
            timezone.now(), 
            session_id_str
        ])
        
        logger.info(f"Session {session_id_str} completed with status: {status}")
        
    except zipfile.BadZipFile as e:
        logger.error(f"Bad ZIP file: {str(e)}")
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, error_message = %s, updated_at = %s 
            WHERE session_id = %s;
        """, [Config.Status.FAILED, 'Invalid or corrupted ZIP file', timezone.now(), str(session_id)])
    except Exception as e:
        logger.error(f"Background processing error: {str(e)}", exc_info=True)
        execute_update("""
            UPDATE upload_sessions 
            SET status = %s, error_message = %s, updated_at = %s 
            WHERE session_id = %s;
        """, [Config.Status.FAILED, str(e), timezone.now(), str(session_id)])

# ============================================================================
# UPLOAD STATUS API
# ============================================================================

@api_view(["GET"])  # 🔥 FIX HERE
@authentication_classes([])
@permission_classes([AllowAny])
def upload_status(request, session_id):
    """Get upload session status with progress"""
    try:
        session = execute_query(
            "SELECT * FROM upload_sessions WHERE session_id = %s;",
            [session_id], fetch_one=True
        )
        
        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Parse JSON fields
        if session.get('validation_summary') and isinstance(session['validation_summary'], str):
            session['validation_summary'] = json.loads(session['validation_summary'])
        
        # Ensure progress fields exist
        if 'progress' not in session:
            session['progress'] = 0
        if 'current_step' not in session:
            session['current_step'] = ''
        if 'step_details' not in session:
            session['step_details'] = ''
        
        # Add validated files info
        validated_dir = Config.VALIDATED_DIR / str(session_id)
        if validated_dir.exists():
            validated_files = list(validated_dir.glob('*'))
            session['validated_files'] = [
                {'name': f.name, 'size': format_size(f.stat().st_size)} 
                for f in validated_files
            ]
        
        return Response(session)
        
    except Exception as e:
        logger.error(f"Status error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




# ============================================================================
# COMPILATION API
# ============================================================================

@csrf_exempt
@api_view(["POST"])
@authentication_classes([])   # 🔥 disables JWT here
@permission_classes([AllowAny])  # 🔥 allows public access
def start_compilation(request):
    """Start compilation process"""
    try:
        user = request.user if hasattr(request, 'user') else None
        data = request.data
        session_id = data.get('session_id')
        month = data.get('month')
        year = data.get('year')
        compile_type = data.get('compile_type', 'PROVISIONAL')
        
        if not all([session_id, month, year]):
            return Response({'error': 'Missing parameters'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if session is validated
        session = execute_query("""
            SELECT * FROM upload_sessions 
            WHERE session_id = %s AND status = 'VALIDATED';
        """, [session_id], fetch_one=True)
        
        if not session:
            return Response({'error': 'Session not validated'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create compilation task - MATCHING YOUR EXISTING TABLE STRUCTURE
        task_id = str(uuid.uuid4())
        
        # First, check what columns exist in your table
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'compilation_tasks';
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            logger.info(f"Existing columns in compilation_tasks: {existing_columns}")
        
        # Build INSERT statement based on existing columns
        base_columns = ['task_id', 'session_id', 'status', 'progress', 'started_at', 'created_by']
        base_values = [task_id, session_id, Config.Status.COMPILING, 0, timezone.now(), user.id if user else None]
        
        # Add optional columns if they exist
        if 'month' in existing_columns:
            base_columns.append('month')
            base_values.append(month)
        
        if 'year' in existing_columns:
            base_columns.append('year')
            base_values.append(year)
        
        if 'compile_type' in existing_columns:
            base_columns.append('compile_type')
            base_values.append(compile_type)
        
        if 'current_stage' in existing_columns:
            base_columns.append('current_stage')
            base_values.append('Starting')
        
        if 'stage_details' in existing_columns:
            base_columns.append('stage_details')
            base_values.append('Starting compilation...')
        
        if 'methods_executed' in existing_columns:
            base_columns.append('methods_executed')
            base_values.append(json.dumps([]))
        
        # Build and execute the INSERT query
        placeholders = ', '.join(['%s'] * len(base_columns))
        columns_str = ', '.join(base_columns)
        
        insert_sql = f"""
            INSERT INTO compilation_tasks 
            ({columns_str})
            VALUES ({placeholders})
            RETURNING *;
        """
        
        logger.info(f"Insert SQL: {insert_sql}")
        logger.info(f"Values: {base_values}")
        
        execute_insert(insert_sql, base_values)
        
        # Start compilation in background
        thread = threading.Thread(
            target=run_compilation_background,
            args=(task_id, session_id, month, year, compile_type)
        )
        thread.daemon = True
        thread.start()
        
        return Response({
            'task_id': task_id,
            'status': Config.Status.COMPILING,
            'message': 'Compilation started'
        })
        
    except Exception as e:
        logger.error(f"Compilation error: {str(e)}", exc_info=True)
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
def run_compilation_background(task_id, session_id, month, year, compile_type):
    """Background compilation process"""
    try:
        task_id_str = str(task_id)
        logger.info(f"Starting background compilation for task {task_id_str}")
        
        # Check what columns exist
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'compilation_tasks';
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            logger.info(f"Existing columns in compilation_tasks: {existing_columns}")
        
        # Update status to PROGRESS
        try:
            update_fields = ["status = 'PROGRESS'", "progress = 5", "updated_at = %s"]
            update_values = [timezone.now()]
            
            if 'current_method' in existing_columns:
                update_fields.append("current_method = %s")
                update_values.append("Initializing")
            
            if 'method_details' in existing_columns:
                update_fields.append("method_details = %s")
                update_values.append("Starting compilation...")
            
            update_values.append(task_id_str)
            
            execute_update(f"""
                UPDATE compilation_tasks 
                SET {', '.join(update_fields)}
                WHERE task_id = %s;
            """, update_values)
            
            logger.info(f"Updated task {task_id_str} status to PROGRESS")
        except Exception as e:
            logger.error(f"Error updating initial status: {str(e)}")
        
        # Run all compilations
        results = run_all_compilations(task_id_str, session_id, month, year, compile_type)
        logger.info(f"Compilation results: {json.dumps(results, default=str)}")
        
        # Final update based on results
        if results['status'] in ['success', 'partial']:
            # Build update based on existing columns
            update_fields = []
            update_values = []
            
            # Always use 'SUCCESS' as the final status (frontend expects this)
            update_fields.append("status = %s")
            update_values.append('SUCCESS')  # Changed from 'COMPLETED' to 'SUCCESS'
            
            update_fields.append("progress = %s")
            update_values.append(100)
            
            update_fields.append("completed_at = %s")
            update_values.append(timezone.now())
            
            # Add optional fields if they exist
            if 'methods_executed' in existing_columns:
                update_fields.append("methods_executed = %s")
                update_values.append(json.dumps(results.get('methods_executed', [])))
            
            if 'metrics' in existing_columns:
                update_fields.append("metrics = %s")
                update_values.append(json.dumps(results, default=str))
            
            if 'result_url' in existing_columns:
                update_fields.append("result_url = %s")
                update_values.append(f"/api/cpi/compilation/download/{task_id_str}/")
            
            if 'current_method' in existing_columns:
                update_fields.append("current_method = %s")
                update_values.append('Completed')
            
            if 'method_details' in existing_columns:
                update_fields.append("method_details = %s")
                update_values.append(f"Compilation completed with {len(results.get('methods_executed', []))} methods")
            
            # Add task_id at the end
            update_values.append(task_id_str)
            
            update_sql = f"""
                UPDATE compilation_tasks 
                SET {', '.join(update_fields)}
                WHERE task_id = %s;
            """
            
            logger.info(f"Final update SQL: {update_sql}")
            logger.info(f"Final update values: {update_values}")
            
            rows_affected = execute_update(update_sql, update_values)
            logger.info(f"Update affected {rows_affected} rows")
            
            # Verify the update
            verify = execute_query(
                "SELECT status, progress FROM compilation_tasks WHERE task_id = %s;",
                [task_id_str], fetch_one=True
            )
            logger.info(f"Verification - Task status: {verify}")
            
            logger.info(f"Compilation {task_id_str} completed successfully with status SUCCESS")
        else:
            # Handle failure
            error_msg = json.dumps(results.get('errors', ['Unknown error']))
            
            update_fields = ["status = %s", "error_message = %s", "completed_at = %s"]
            update_values = ['FAILURE', error_msg, timezone.now(), task_id_str]  # Changed to 'FAILURE' for consistency
            
            update_sql = f"""
                UPDATE compilation_tasks 
                SET {', '.join(update_fields)}
                WHERE task_id = %s;
            """
            
            rows_affected = execute_update(update_sql, update_values)
            logger.info(f"Failure update affected {rows_affected} rows")
            
            logger.error(f"Compilation {task_id_str} failed: {error_msg}")
        
    except Exception as e:
        logger.error(f"Background compilation error: {str(e)}", exc_info=True)
        try:
            # Final attempt to mark as failed - use 'FAILURE' for consistency
            execute_update("""
                UPDATE compilation_tasks 
                SET status = 'FAILURE', error_message = %s, completed_at = %s 
                WHERE task_id = %s;
            """, [f"Background error: {str(e)}", timezone.now(), str(task_id)])
            logger.info(f"Marked task {task_id} as FAILURE due to background error")
        except Exception as final_error:
            logger.error(f"Could not update task status: {str(final_error)}")


# ============================================================================
# COMPILATION STATUS API
# ============================================================================
@csrf_exempt
@api_view(["GET"])
@authentication_classes([])   # 🔥 disables JWT here
@permission_classes([AllowAny])  # 🔥 allows public access
def compilation_status(request, task_id):
    """Get compilation task status with progress"""
    try:
        task = execute_query(
            "SELECT * FROM compilation_tasks WHERE task_id = %s;",
            [task_id], fetch_one=True
        )
        
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Parse JSON fields
        if task.get('methods_executed') and isinstance(task['methods_executed'], str):
            task['methods_executed'] = json.loads(task['methods_executed'])
        
        if task.get('metrics') and isinstance(task['metrics'], str):
            task['metrics'] = json.loads(task['metrics'])
        
        # Ensure progress field exists
        if 'progress' not in task:
            task['progress'] = 0
        
        # Find output files
        task['output_files'] = []
        for file_path in Config.COMPILED_DIR.glob('*'):
            if file_path.suffix in ['.csv', '.parquet']:
                task['output_files'].append({
                    'name': file_path.name,
                    'size': format_size(file_path.stat().st_size),
                    'path': str(file_path)
                })
        
        return Response(task)
        
    except Exception as e:
        logger.error(f"Status error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# DATABASE IMPORT API (USER CLICK)
# ============================================================================


# from concurrent.futures import ThreadPoolExecutor, as_completed

# import concurrent.futures
# from concurrent.futures import ThreadPoolExecutor, as_completed
# from django.db import connections
# import psycopg2
# from psycopg2.extras import execute_values
# import numpy as np


# @api_view(["POST"])
# @authentication_classes([RawJWTAuthentication])
# @role_required('admin', 'compiler')
# def import_to_database(request, task_id):
#     """Import data to database"""
#     try:
#         user = request.user if hasattr(request, 'user') else None
#         data = request.data
#         import_mode = data.get('import_mode', 'append')
#         month = data.get('month')
#         year = data.get('year')
#         session_id = data.get('session_id')
        
#         # Get compilation task
#         task = execute_query(
#             "SELECT * FROM compilation_tasks WHERE task_id = %s AND status IN ('SUCCESS', 'COMPLETED');",
#             [task_id], fetch_one=True
#         )
#         if not task:
#             return Response({'error': 'No successful compilation found'}, status=status.HTTP_400_BAD_REQUEST)
        
#         session_id = session_id or task.get('session_id')
#         month = month or task.get('month')
#         year = year or task.get('year')
        
#         # Create import task
#         import_task_id = str(uuid.uuid4())
#         progress_data = {
#             'total_tables': 0,
#             'completed_tables': 0,
#             'current_table': '',
#             'start_time': timezone.now().isoformat()
#         }
        
#         execute_insert("""
#             INSERT INTO database_import_tasks 
#             (task_id, compilation_task_id, status, progress, import_mode, 
#              started_at, created_by, imported_tables, failed_tables, summary,
#              total_records, imported_records, error_message)
#             VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
#             RETURNING *;
#         """, [
#             import_task_id, task_id, 'IN_PROGRESS', 0, import_mode, 
#             timezone.now(), user.id if user else None,
#             json.dumps([]), json.dumps([]), json.dumps(progress_data),
#             0, 0, ''
#         ])
        
#         # Start import thread
#         thread = threading.Thread(
#             target=run_import,
#             args=(import_task_id, session_id, task_id, month, year, import_mode)
#         )
#         thread.daemon = True
#         thread.start()
        
#         return Response({
#             'import_task_id': import_task_id,
#             'status': 'IN_PROGRESS',
#             'message': f'Importing data for {month}/{year}'
#         })
        
#     except Exception as e:
#         logger.error(f"Import error: {str(e)}")
#         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# # Your original table_configs preserved exactly as you wanted
# table_configs = {
#     'validated': [
#         ('rural_electricity', ['rural', 'elec'], 'price_month', 'price_year'),
#         ('urban_electricity', ['urban', 'elec'], 'price_month', 'price_year'),
#         ('rural_house_rent', ['rural', 'rent', 'hr'], 'price_month', 'price_year'),
#         ('urban_house_rent', ['urban', 'rent', 'hr'], 'price_month', 'price_year'),
#         ('pds_data', ['pds'], 'price_month', 'price_year'),
#         ('ott_data', ['ott'], 'price_month', 'price_year'),
#         ('postal_data', ['postal'], 'price_month', 'price_year'),
#         ('petrol_data', ['petrol'], 'price_month', 'price_year'),
#         ('diesel_data', ['diesel'], 'price_month', 'price_year'),
#         ('lpg_data', ['lpg'], 'price_month', 'price_year'),
#         ('cng_data', ['cng'], 'price_month', 'price_year'),
#         ('png_data', ['png'], 'price_month', 'price_year'),
#         ('telecom_data', ['telecom'], 'price_month', 'price_year'),
#         ('rural_market', ['rural', 'mkt', 'market'], 'price_month', 'price_year'),
#         ('urban_market', ['urban', 'mkt', 'market'], 'price_month', 'price_year'),
#         ('airfare_data', ['airfare', 'air'], 'price_month', 'price_year'),
#         ('online_shopping', ['online', 'shop'], 'price_month', 'price_year'),
#         ('railfare_data', ['rail', 'fare'], 'price_month', 'price_year'),
#         ('metro_data', ['metro'], 'price_month', 'price_year'),
#     ],
#     'output': [
#         ('house_rent_index', ['house', 'rent', 'index'], 'index_month', 'index_year'),
#         ('electricity_index', ['electricity', 'index'], 'index_month', 'index_year'),
#         ('pds_index', ['pds', 'index'], 'index_month', 'index_year'),
#         ('fuel_price_index', ['fuel', 'price', 'index'], 'index_month', 'index_year'),
#         ('telecom_index', ['telecom', 'index'], 'index_month', 'index_year'),
#         ('postal_ott_index', ['postal', 'ott', 'index'], 'index_month', 'index_year'),
#         ('railfare_index', ['rail', 'fare', 'index'], 'index_month', 'index_year'),
#         ('market_index', ['market', 'index'], 'index_month', 'index_year'),
#         ('all_india_index', ['all', 'india', 'index'], 'index_month', 'index_year'),
#     ]
# }


# def run_import(import_task_id, session_id, task_id, month, year, import_mode):
#     """Main import function with proper progress updates"""
#     try:
#         # Update initial progress
#         update_progress(import_task_id, 5, "Scanning directories...")
        
#         # Get tables with files
#         all_tables = []
        
#         # Validated data
#         validated_dir = Config.VALIDATED_DIR 
        
#         print(f"Looking for validated files in: {validated_dir}")
#         if validated_dir.exists():
#             validated_tables = get_tables_with_files('validated', validated_dir, month, year)
#             print(f"Validated tables found: {[t['full_name'] for t in validated_tables]}")
#             all_tables.extend(validated_tables)
#             logger.info(f"Found {len(validated_tables)} validated tables")
        
#         # Output data
#         output_dir = Config.COMPILED_DIR 
#         print(f"Looking for output files in: {output_dir}")
#         if output_dir.exists():
#             output_tables = get_tables_with_files('output', output_dir, month, year)
#             print(f"Output tables found: {[t['full_name'] for t in output_tables]}")
            
#             all_tables.extend(output_tables)
#             logger.info(f"Found {len(output_tables)} output tables")
        
#         total_tables = len(all_tables)
#         logger.info(f"Total tables to import: {total_tables}")
        
#         if total_tables == 0:
#             update_progress(import_task_id, 100, "No files found to import")
#             execute_update("""
#                 UPDATE database_import_tasks 
#                 SET status='COMPLETED', progress=100, completed_at=%s 
#                 WHERE task_id=%s;
#             """, [timezone.now(), import_task_id])
#             return
        
#         # Update total tables in progress
#         update_progress(import_task_id, 10, f"Found {total_tables} tables to import", 
#                        total_tables=total_tables)
        
#         # Import tables in parallel
#         imported_tables = []
#         failed_tables = []
#         table_stats = {}
#         completed = 0
        
#         with ThreadPoolExecutor(max_workers=min(8, total_tables)) as executor:
#             future_to_table = {}
#             for table_config in all_tables:
#                 future = executor.submit(import_table, table_config, import_mode)
#                 future_to_table[future] = table_config
        
#             for future in as_completed(future_to_table):
#                 table_config = future_to_table[future]
#                 table_name = table_config['full_name']
#                 completed += 1
                
#                 # Update current table progress
#                 update_progress(
#                     import_task_id, 
#                     10 + int((completed / total_tables) * 80),
#                     f"Processing {table_config['short_name']} ({completed}/{total_tables})",
#                     current_table=table_config['short_name'],
#                     completed_tables=completed
#                 )
                
#                 try:
#                     result = future.result(timeout=300)
#                     if result['success']:
#                         imported_tables.append(table_name)
#                         table_stats[table_name] = result['stats']
#                         logger.info(f"✅ {completed}/{total_tables}: {table_name} - {result['stats'].get('inserted', 0)} records")
#                     else:
#                         failed_tables.append(table_name)
#                         table_stats[table_name] = {'error': result.get('error')}
#                         logger.error(f"❌ {completed}/{total_tables}: {table_name} - {result.get('error')}")
#                 except Exception as e:
#                     failed_tables.append(table_name)
#                     table_stats[table_name] = {'error': str(e)}
#                     logger.error(f"❌ {completed}/{total_tables}: {table_name} - {str(e)}")
        
#         # Calculate totals
#         total_records = sum(s.get('records', 0) for s in table_stats.values())
#         imported_records = sum(s.get('inserted', 0) for s in table_stats.values())
#         status = 'COMPLETED' if not failed_tables else 'PARTIALLY_COMPLETED'
        
#         # Final summary
#         final_summary = {
#             'total_tables': total_tables,
#             'completed_tables': completed,
#             'imported_tables': imported_tables,
#             'failed_tables': failed_tables,
#             'table_stats': table_stats,
#             'month': month,
#             'year': year,
#             'end_time': timezone.now().isoformat()
#         }
        
#         # Final update
#         execute_update("""
#             UPDATE database_import_tasks 
#             SET status=%s, progress=100, completed_at=%s, 
#                 imported_tables=%s, failed_tables=%s, summary=%s,
#                 total_records=%s, imported_records=%s
#             WHERE task_id=%s;
#         """, [
#             status, 
#             timezone.now(), 
#             json.dumps(imported_tables), 
#             json.dumps(failed_tables),
#             json.dumps(final_summary, default=str), 
#             total_records, 
#             imported_records, 
#             import_task_id
#         ])
        
#         logger.info(f"Import completed. Tables: {total_tables}, Records: {total_records}")
        
#     except Exception as e:
#         logger.error(f"Import error: {str(e)}", exc_info=True)
#         execute_update("""
#             UPDATE database_import_tasks 
#             SET status='FAILED', error_message=%s, completed_at=%s 
#             WHERE task_id=%s;
#         """, [str(e), timezone.now(), import_task_id])


# def get_tables_with_files(data_type, directory, month, year):
#     """Get tables that have matching files using table_configs"""
#     schema = 'prices' if data_type == 'validated' else 'price_idx'
#     files = list(directory.glob('*.parquet')) + list(directory.glob('*.csv'))
    
#     if not files:
#         return []
    
#     tables_with_files = []
    
#     for table_name, keywords, month_col, year_col in table_configs[data_type]:
#         matching_files = []
#         file_names = [f.name.lower() for f in files]
        
#         # Check if any keyword matches any file
#         for f in files:
#             f_lower = f.name.lower()
#             if any(k in f_lower for k in keywords):
#                 matching_files.append(f)
        
#         if matching_files:
#             tables_with_files.append({
#                 'short_name': table_name,
#                 'full_name': f"{schema}.{table_name}",
#                 'schema': schema,
#                 'files': matching_files,
#                 'month_col': month_col,
#                 'year_col': year_col,
#                 'month': month,
#                 'year': year
#             })
#             logger.info(f"Found {len(matching_files)} files for {schema}.{table_name}: {[f.name for f in matching_files]}")
    
#     return tables_with_files


# def import_table(table_config, import_mode):
#     """Import single table"""
#     try:
#         # Read all files
#         dfs = []
#         for f in table_config['files']:
#             try:
#                 if str(f).endswith('.parquet'):
#                     df = pd.read_parquet(f)
#                 else:
#                     df = pd.read_csv(f)
#                 dfs.append(df)
#                 logger.debug(f"Read {len(df)} rows from {f.name}")
#             except Exception as e:
#                 logger.error(f"Error reading {f.name}: {str(e)}")
#                 continue
        
#         if not dfs:
#             return {'success': False, 'error': 'No valid data found'}
        
#         # Combine and clean
#         df = pd.concat(dfs, ignore_index=True).drop_duplicates()
#         logger.info(f"Combined {len(df)} unique rows for {table_config['full_name']}")
        
#         # Add month/year columns if missing
#         month_col, year_col = table_config['month_col'], table_config['year_col']
#         if month_col not in df.columns:
#             df[month_col] = table_config['month']
#         if year_col not in df.columns:
#             df[year_col] = table_config['year']
        
#         df['imported_at'] = timezone.now()
        
#         # Clean column names
#         df.columns = [c.lower().replace(' ', '_').replace('-', '_') for c in df.columns]
        
#         # FIX: Use connection instead of connections['final_db'].connection
#         from django.db import connection
        
#         with connections['final_db'].cursor() as cursor:
#             # Create schema if needed
#             cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {table_config['schema']};")
            
#             # Check if table exists
#             table_short = table_config['full_name'].split('.')[1]
#             cursor.execute("""
#                 SELECT EXISTS (
#                     SELECT FROM information_schema.tables 
#                     WHERE table_schema=%s AND table_name=%s
#                 );
#             """, [table_config['schema'], table_short])
            
#             # Create table if not exists
#             if not cursor.fetchone()[0]:
#                 create_table(cursor, table_config['full_name'], df)
#                 logger.info(f"Created table {table_config['full_name']}")
            
#             # Handle replace mode
#             if import_mode == 'replace':
#                 cursor.execute(f"DELETE FROM {table_config['full_name']} WHERE {month_col}=%s AND {year_col}=%s;",
#                              [table_config['month'], table_config['year']])
#                 logger.info(f"Deleted existing data for {table_config['month']}/{table_config['year']}")
            
#             # Prepare data for bulk insert
#             cols = list(df.columns)
#             data = []
#             for _, row in df.iterrows():
#                 row_data = []
#                 for val in row:
#                     if pd.isna(val):
#                         row_data.append(None)
#                     elif isinstance(val, (datetime, pd.Timestamp)):
#                         row_data.append(val)
#                     else:
#                         row_data.append(val)
#                 data.append(tuple(row_data))
            
#             # Bulk insert
#             from psycopg2.extras import execute_values
#             insert_sql = f"INSERT INTO {table_config['full_name']} ({', '.join(cols)}) VALUES %s"
#             execute_values(cursor, insert_sql, data, page_size=1000)
            
#             # Get final count
#             cursor.execute(f"SELECT COUNT(*) FROM {table_config['full_name']} WHERE {month_col}=%s AND {year_col}=%s;",
#                          [table_config['month'], table_config['year']])
#             final_count = cursor.fetchone()[0]
        
#         return {
#             'success': True,
#             'stats': {
#                 'inserted': len(df),
#                 'records': len(df),
#                 'files': len(table_config['files']),
#                 'total_in_table': final_count
#             }
#         }
        
#     except Exception as e:
#         logger.error(f"Error importing {table_config['full_name']}: {str(e)}")
#         return {'success': False, 'error': str(e)}


# def create_table(cursor, table_name, df):
#     """Create table from dataframe schema"""
#     columns = []
#     for col in df.columns:
#         if col in ['imported_at', 'created_at', 'updated_at']:
#             col_type = 'TIMESTAMP WITH TIME ZONE'
#         elif pd.api.types.is_integer_dtype(df[col]):
#             col_type = 'BIGINT'
#         elif pd.api.types.is_float_dtype(df[col]):
#             col_type = 'DOUBLE PRECISION'
#         elif pd.api.types.is_datetime64_any_dtype(df[col]):
#             col_type = 'TIMESTAMP'
#         else:
#             max_len = df[col].astype(str).str.len().max()
#             if pd.notna(max_len) and max_len < 1000:
#                 col_type = f'VARCHAR({int(max_len * 1.2)})'
#             else:
#                 col_type = 'TEXT'
#         columns.append(f'"{col}" {col_type}')
    
#     create_sql = f"CREATE TABLE {table_name} (id BIGSERIAL PRIMARY KEY, {', '.join(columns)})"
#     cursor.execute(create_sql)
    
#     # Add indexes for better performance
#     if 'price_month' in df.columns or 'index_month' in df.columns:
#         month_col = 'price_month' if 'price_month' in df.columns else 'index_month'
#         cursor.execute(f"CREATE INDEX idx_{table_name.split('.')[1]}_month ON {table_name}({month_col});")
#     if 'price_year' in df.columns or 'index_year' in df.columns:
#         year_col = 'price_year' if 'price_year' in df.columns else 'index_year'
#         cursor.execute(f"CREATE INDEX idx_{table_name.split('.')[1]}_year ON {table_name}({year_col});")

# def update_progress(task_id, progress, message, **kwargs):
#     """Update import progress in database"""
#     try:
#         # Get current summary
#         task = execute_query(
#             "SELECT summary FROM database_import_tasks WHERE task_id=%s;", 
#             [task_id], fetch_one=True
#         )
        
#         # Parse or create summary
#         if task and task.get('summary'):
#             if isinstance(task['summary'], str):
#                 summary = json.loads(task['summary'])
#             else:
#                 summary = task['summary']
#         else:
#             summary = {}
        
#         # Update summary
#         summary.update({
#             'progress': progress,
#             'message': message,
#             'last_update': timezone.now().isoformat(),
#             **kwargs
#         })
        
#         # FIX: Check if updated_at column exists first
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 SELECT column_name 
#                 FROM information_schema.columns 
#                 WHERE table_name='database_import_tasks' AND column_name='updated_at';
#             """)
#             has_updated_at = cursor.fetchone() is not None
        
#         if has_updated_at:
#             execute_update("""
#                 UPDATE database_import_tasks 
#                 SET progress=%s, summary=%s, updated_at=%s 
#                 WHERE task_id=%s;
#             """, [progress, json.dumps(summary, default=str), timezone.now(), task_id])
#         else:
#             # Fallback if column doesn't exist
#             execute_update("""
#                 UPDATE database_import_tasks 
#                 SET progress=%s, summary=%s 
#                 WHERE task_id=%s;
#             """, [progress, json.dumps(summary, default=str), task_id])
        
#     except Exception as e:
#         logger.error(f"Progress update error: {str(e)}")


# @api_view(['GET'])
# @role_required('admin', 'compiler')
# def database_import_status(request, task_id):
#     """Get import status"""
#     try:
#         task = execute_query(
#             "SELECT * FROM database_import_tasks WHERE task_id=%s;", 
#             [task_id], fetch_one=True
#         )
        
#         if not task:
#             return Response({'error': 'Task not found'}, status=404)
        
#         # Parse JSON fields
#         for field in ['imported_tables', 'failed_tables', 'summary']:
#             if task.get(field) and isinstance(task[field], str):
#                 try:
#                     task[field] = json.loads(task[field])
#                 except:
#                     task[field] = {} if field == 'summary' else []
        
#         # Format datetime fields
#         for field in ['started_at', 'completed_at', 'updated_at']:
#             if task.get(field) and hasattr(task[field], 'isoformat'):
#                 task[field] = task[field].isoformat()
        
#         # Add UI-friendly fields from summary
#         summary = task.get('summary', {})
#         task['current_table'] = summary.get('current_table', '')
#         task['completed_tables'] = summary.get('completed_tables', 0)
#         task['total_tables'] = summary.get('total_tables', 0)
#         task['progress_message'] = summary.get('message', '')
        
#         return Response(task)
        
#     except Exception as e:
#         logger.error(f"Status error: {str(e)}")
#         return Response({'error': str(e)}, status=500)






# ============================================================================
# ULTRA-FAST CONFIGURATION
# ============================================================================

# class Config:
#     VALIDATED_DIR = Path("data/input/validated")
#     COMPILED_DIR = Path("data/output")
#     MAX_WORKERS = multiprocessing.cpu_count() * 2  # Use all CPU cores
#     BATCH_SIZE = 10000  # Larger batch size for faster inserts
#     CHUNK_SIZE = 50000  # Chunk size for large dataframes

# Table configurations
# TABLE_CONFIGS = {
#     'validated': [
#         ('rural_electricity', ['rural', 'elec'], 'price_month', 'price_year'),
#         ('urban_electricity', ['urban', 'elec'], 'price_month', 'price_year'),
#         ('rural_house_rent', ['rural', 'rent', 'hr'], 'price_month', 'price_year'),
#         ('urban_house_rent', ['urban', 'rent', 'hr'], 'price_month', 'price_year'),
#         ('pds_data', ['pds'], 'price_month', 'price_year'),
#         ('ott_data', ['ott'], 'price_month', 'price_year'),
#         ('postal_data', ['postal'], 'price_month', 'price_year'),
#         ('petrol_data', ['petrol'], 'price_month', 'price_year'),
#         ('diesel_data', ['diesel'], 'price_month', 'price_year'),
#         ('lpg_data', ['lpg'], 'price_month', 'price_year'),
#         ('cng_data', ['cng'], 'price_month', 'price_year'),
#         ('png_data', ['png'], 'price_month', 'price_year'),
#         ('telecom_data', ['telecom'], 'price_month', 'price_year'),
#         ('rural_market', ['rural', 'mkt', 'market'], 'price_month', 'price_year'),
#         ('urban_market', ['urban', 'mkt', 'market'], 'price_month', 'price_year'),
#         ('airfare_data', ['airfare', 'air'], 'price_month', 'price_year'),
#         ('online_shopping', ['online', 'shop'], 'price_month', 'price_year'),
#         ('railfare_data', ['rail', 'fare'], 'price_month', 'price_year'),
#         ('metro_data', ['metro'], 'price_month', 'price_year'),
#     ],
#     'output': [
#         ('house_rent_index', ['house', 'rent', 'index'], 'index_month', 'index_year'),
#         ('electricity_index', ['electricity', 'index'], 'index_month', 'index_year'),
#         ('pds_index', ['pds', 'index'], 'index_month', 'index_year'),
#         ('fuel_price_index', ['fuel', 'price', 'index'], 'index_month', 'index_year'),
#         ('telecom_index', ['telecom', 'index'], 'index_month', 'index_year'),
#         ('postal_ott_index', ['postal', 'ott', 'index'], 'index_month', 'index_year'),
#         ('railfare_index', ['rail', 'fare', 'index'], 'index_month', 'index_year'),
#         ('market_index', ['market', 'index'], 'index_month', 'index_year'),
#         ('all_india_index', ['all', 'india', 'index'], 'index_month', 'index_year'),
#     ]
# }

# ============================================================================
# MAIN IMPORT ENDPOINT
# ============================================================================

# @api_view(["POST"])
# @authentication_classes([RawJWTAuthentication])
# @role_required('admin', 'compiler')
# import concurrent.futures
# from concurrent.futures import ThreadPoolExecutor, as_completed
# from django.db import connection, connections
# from psycopg2.extras import execute_values
# import pandas as pd
# import numpy as np
# import threading
# import uuid
# import json
# import logging
# import time
# from datetime import datetime
# from pathlib import Path
# import multiprocessing

# logger = logging.getLogger(__name__)

# # ============================================================================
# # CONFIGURATION
# # ============================================================================

# class Config:
#     """Ultra-fast configuration settings"""
#     VALIDATED_DIR = Path("data/input/validated")
#     COMPILED_DIR = Path("data/output")
#     MAX_WORKERS = min(32, multiprocessing.cpu_count() * 4)  # Maximum parallelism
#     BATCH_SIZE = 10000  # Optimal batch size for bulk inserts
#     TABLE_TIMEOUT = 120  # Seconds per table timeout

# Table configurations (preserved exactly)
TABLE_CONFIGS = {
   "validated": [
    ('rural_elect_prices', ['rural', 'elec'], 'price_month', 'price_year'),
    ('urban_elect_prices', ['urban', 'elec'], 'price_month', 'price_year'),
    
    ('rural_hr_prices', ['rural', 'rent', 'hr'], 'price_month', 'price_year'),
    ('urban_hr_prices', ['urban', 'rent', 'hr'], 'price_month', 'price_year'),
    
    ('pds_prices', ['pds'], 'price_month', 'price_year'),
    ('ott_prices', ['ott'], 'price_month', 'price_year'),
    ('postal_prices', ['postal'], 'price_month', 'price_year'),
    
    ('petrol_prices', ['petrol'], 'price_month', 'price_year'),
    ('diesel_prices', ['diesel'], 'price_month', 'price_year'),
    ('lpg_prices', ['lpg'], 'price_month', 'price_year'),
    ('cng_prices', ['cng'], 'price_month', 'price_year'),
    ('png_prices', ['png'], 'price_month', 'price_year'),
    
    ('telecom_prices', ['telecom'], 'price_month', 'price_year'),
    
    ('rural_mkt_prices', ['rural', 'mkt', 'market'], 'price_month', 'price_year'),
    ('urban_mkt_prices', ['urban', 'mkt', 'market'], 'price_month', 'price_year'),
    
    ('urban_airfare_prices', ['airfare', 'air'], 'price_month', 'price_year'),
    
    ('urban_mkt_online_prices', ['online', 'shop'], 'price_month', 'price_year'),
    
    ('railfare_prices', ['rail', 'fare'], 'price_month', 'price_year'),
    
    ('metro_prices', ['metro'], 'price_month', 'price_year'),
],
   "output" : [
    ('hr_category_index', ['house', 'rent', 'category'], 'index_month', 'index_year'),
    ('hr_ownership_index', ['house', 'rent', 'ownership'], 'index_month', 'index_year'),
    
    ('elect_dslab_price_index', ['electricity', 'dslab', 'index'], 'index_month', 'index_year'),
    
    ('pds_pidx', ['pds', 'index'], 'index_month', 'index_year'),
    
    ('telecom_operator_pidx', ['telecom', 'operator', 'index'], 'index_month', 'index_year'),
    
    ('railfare_pidx', ['rail', 'fare', 'index'], 'index_month', 'index_year'),
    
    ('elementary_idx', ['market', 'elementary', 'index'], 'index_month', 'index_year'),
    
    ('all_idx', ['all', 'india', 'index'], 'index_month', 'index_year'),
]
}

# ============================================================================
# DATABASE HELPERS
# ============================================================================

def execute_query(sql, params=None, fetch_one=False):
    """Execute SQL query and return results"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        if fetch_one:
            row = cursor.fetchone()
            if row:
                columns = [col[0] for col in cursor.description]
                return dict(zip(columns, row))
            return None
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]

def execute_update(sql, params=None):
    """Execute SQL update and return row count"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        return cursor.rowcount

def execute_insert(sql, params=None):
    """Execute SQL insert and return inserted record"""
    with connection.cursor() as cursor:
        cursor.execute(sql, params or [])
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, cursor.fetchone()))



@csrf_exempt
@api_view(["POST"])
@authentication_classes([])   # 🔥 disables JWT here
@permission_classes([AllowAny])  # 🔥 allows public access
def import_to_database(request, task_id):
    """Ultra-fast parallel import to database"""
    try:
        user = request.user if hasattr(request, 'user') else None
        data = request.data
        import_mode = data.get('import_mode', 'append')
        month = data.get('month')
        year = data.get('year')
        session_id = data.get('session_id')
        compile_type = data.get('compile_type') #//added by nihi
        # Get compilation task
        task = execute_query(
            "SELECT * FROM compilation_tasks WHERE task_id = %s AND status IN ('SUCCESS', 'COMPLETED');",
            [task_id], fetch_one=True
        )
        if not task:
            return Response({'error': 'No successful compilation found'}, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = session_id or task.get('session_id')
        month = month or task.get('month')
        year = year or task.get('year')
        compile_type = compile_type or task.get('compile_type', 'PROVISIONAL')  #added by nihi
        # Create import task
        import_task_id = str(uuid.uuid4())
        
        # Initialize progress tracking
        initial_summary = {
            'start_time': timezone.now().isoformat(),
            'message': 'Initializing import...',
            'validated': {'total': 0, 'completed': 0, 'current': '', 'imported': [], 'failed': []},
            'output': {'total': 0, 'completed': 0, 'current': '', 'imported': [], 'failed': []}
        }
        
        execute_insert("""
            INSERT INTO database_import_tasks 
            (task_id, compilation_task_id, status, progress, import_mode, 
             started_at, created_by, total_records, imported_records, error_message, summary)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            RETURNING *;
        """, [
            import_task_id, task_id, 'IN_PROGRESS', 0, import_mode, 
            timezone.now(), user.id if user else None,
            0, 0, '', json.dumps(initial_summary)
        ])
        
        # Start ultra-fast parallel import
        thread = threading.Thread(
            target=run_ultra_fast_import_safe,
            # args=(import_task_id, month, year, import_mode)
            args=(import_task_id, month, year, import_mode, compile_type)
        )
        thread.daemon = True
        thread.start()
        
        return Response({
            'import_task_id': import_task_id,
            'status': 'IN_PROGRESS',
            'message': f'Ultra-fast importing data for {month}/{year}'
        })
        
    except Exception as e:
        logger.error(f"Import error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)   
    


        
# def update_progress(task_id, progress, message):
#     try:
#         task = execute_query(
#             "SELECT summary FROM database_import_tasks WHERE task_id=%s",
#             [task_id],
#             fetch_one=True
#         )

#         summary = task.get("summary") if task else {}

#         if isinstance(summary, str):
#             summary = json.loads(summary)

#         summary["message"] = message

#         execute_update("""
#             UPDATE database_import_tasks
#             SET progress=%s,
#                 summary=%s
#             WHERE task_id=%s
#         """, [progress, json.dumps(summary), task_id])

#     except Exception as e:
#         logger.error(f"Progress update error: {str(e)}")
        
        
def update_progress(task_id, progress, progress_data):
    """Update import progress in database"""
    try:
        execute_update("""
            UPDATE database_import_tasks 
            SET progress=%s, summary=%s, updated_at=%s 
            WHERE task_id=%s;
        """, [progress, json.dumps(progress_data), timezone.now(), task_id])
    except Exception as e:
        logger.error(f"Progress update error: {str(e)}")
        
        
# def run_ultra_fast_import_safe(import_task_id, month, year, import_mode):  remove by nihi
def run_ultra_fast_import_safe(import_task_id, month, year, import_mode, compile_type):
    try:
        state = ImportState()
        # ctx = ImportContext(month, year, month, year)
        ctx = ImportContext(month, year, month, year, compile_type)

        state.total_tables = len(TABLE_CONFIGS["validated"]) + len(TABLE_CONFIGS["output"])

        sync_progress(import_task_id, state, "IN_PROGRESS", "Starting import...")

        # CLEAN
        # delete_all_tables("prices", TABLE_CONFIGS["validated"], month, year)
        # delete_all_tables("price_idx", TABLE_CONFIGS["output"], month, year)
        delete_all_tables("prices", TABLE_CONFIGS["validated"], month, year, compile_type)
        delete_all_tables("price_idx", TABLE_CONFIGS["output"], month, year, compile_type)

        # IMPORT VALIDATED
        process_directory(VALIDATED_DIR, TABLE_CONFIGS["validated"], "prices", ctx, state, import_task_id)

        # IMPORT OUTPUT
        process_directory(COMPILED_DIR, TABLE_CONFIGS["output"], "price_idx", ctx, state, import_task_id)

        # FINAL
        sync_progress(import_task_id, state, "COMPLETED", "Import completed")

        execute_update("""
            UPDATE database_import_tasks
            SET status='COMPLETED',
                progress=100,
                imported_tables=%s,
                failed_tables=%s,
                total_records=%s,
                imported_records=%s,
                validated=%s,
                output=%s,
                completed_at=%s
            WHERE task_id=%s
        """, [
            json.dumps(state.imported_tables),
            json.dumps(state.failed_tables),
            state.total_records,
            state.imported_records,
            json.dumps(state.validated),
            json.dumps(state.output),
            timezone.now(),
            import_task_id
        ])

    except Exception as e:
        execute_update("""
            UPDATE database_import_tasks
            SET status='FAILED',
                error_message=%s,
                completed_at=%s
            WHERE task_id=%s
        """, [str(e), timezone.now(), import_task_id])
        
        









def finalize_import(import_task_id, imported_tables, failed_tables, table_stats, 
                   total_records, imported_records, start_time, message=None):
    """Finalize import with complete summary"""
    status = 'COMPLETED' if not failed_tables else 'PARTIALLY_COMPLETED'
    
    # Separate stats by data type
    validated_stats = {k: v for k, v in table_stats.items() if k.startswith('prices.')}
    output_stats = {k: v for k, v in table_stats.items() if k.startswith('price_idx.')}
    
    final_summary = {
        'message': message or 'Import completed',
        'end_time': timezone.now().isoformat(),
        'elapsed': time.time() - start_time,
        'validated': {
            'total': len([t for t in imported_tables if t.startswith('prices.')]) + 
                     len([t for t in failed_tables if t.startswith('prices.')]),
            'imported': [t for t in imported_tables if t.startswith('prices.')],
            'failed': [t for t in failed_tables if t.startswith('prices.')],
            'stats': validated_stats
        },
        'output': {
            'total': len([t for t in imported_tables if t.startswith('price_idx.')]) + 
                     len([t for t in failed_tables if t.startswith('price_idx.')]),
            'imported': [t for t in imported_tables if t.startswith('price_idx.')],
            'failed': [t for t in failed_tables if t.startswith('price_idx.')],
            'stats': output_stats
        }
    }
    
    execute_update("""
        UPDATE database_import_tasks 
        SET status=%s, progress=100, completed_at=%s, 
            imported_tables=%s, failed_tables=%s, summary=%s,
            total_records=%s, imported_records=%s
        WHERE task_id=%s;
    """, [
        status, timezone.now(), 
        json.dumps(imported_tables), json.dumps(failed_tables),
        json.dumps(final_summary), 
        total_records, imported_records, import_task_id
    ])
    
    elapsed = time.time() - start_time
    logger.info(f"🚀 Import completed in {elapsed:.2f}s. Tables: {len(imported_tables)}/{len(imported_tables)+len(failed_tables)}")


# ============================================================================
# STATUS API
# ============================================================================

@csrf_exempt
@api_view(["GET"])  # 🔥 FIX HERE
@authentication_classes([])
@permission_classes([AllowAny])
def database_import_status(request, task_id):
    """Get detailed import status (FINAL SAFE VERSION)"""

    try:
        task = execute_query(
            "SELECT * FROM database_import_tasks WHERE task_id=%s;",
            [task_id],
            fetch_one=True
        )

        if not task:
            return Response({'error': 'Task not found'}, status=404)

        # -------------------------
        # SAFE JSON PARSER
        # -------------------------
        def safe_json(value, default):
            if not value:
                return default
            if isinstance(value, dict) or isinstance(value, list):
                return value
            if isinstance(value, str):
                try:
                    return json.loads(value)
                except:
                    return default
            return default

        imported_tables = safe_json(task.get('imported_tables'), [])
        failed_tables = safe_json(task.get('failed_tables'), [])
        summary = safe_json(task.get('summary'), {})

        # -------------------------
        # FIXED TABLE COUNT
        # -------------------------
        validated_total = summary.get('validated', {}).get('total', 0)
        output_total = summary.get('output', {}).get('total', 0)
        total_tables = validated_total + output_total

        completed_tables = len(imported_tables)

        # -------------------------
        # RESPONSE BUILD
        # -------------------------
        response = {
            "task_id": task["task_id"],
            "compilation_task_id": task.get("compilation_task_id"),
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "import_mode": task.get("import_mode", "append"),

            "imported_tables": imported_tables,
            "failed_tables": failed_tables,

            "total_records": task.get("total_records", 0),
            "imported_records": task.get("imported_records", 0),

            "error_message": task.get("error_message"),

            "started_at": task["started_at"].isoformat()
                if task.get("started_at") else None,

            "completed_at": task["completed_at"].isoformat()
                if task.get("completed_at") else None,

            # -------------------------
            # CORE TRACKING (FIXED)
            # -------------------------
            "current_table": summary.get("current_table", ""),
            "completed_tables": completed_tables,
            "total_tables": total_tables,

            "progress_message": summary.get("message", ""),

            "validated": summary.get("validated", {
                "total": 0,
                "completed": 0,
                "current": "",
                "imported": [],
                "failed": []
            }),

            "output": summary.get("output", {
                "total": 0,
                "completed": 0,
                "current": "",
                "imported": [],
                "failed": []
            }),

            "summary": summary,
            "eta_seconds": None
        }

        # -------------------------
        # SAFE ETA CALCULATION
        # -------------------------
        try:
            if response["status"] == "IN_PROGRESS":
                progress = float(response.get("progress", 0))

                if 0 < progress < 100:
                    start_time = summary.get("start_time")

                    if start_time:
                        start = datetime.fromisoformat(
                            start_time.replace("Z", "+00:00")
                        )

                        elapsed = (timezone.now() - start).total_seconds()

                        if elapsed > 0:
                            estimated_total = (elapsed * 100) / progress
                            remaining = estimated_total - elapsed
                            response["eta_seconds"] = max(0, int(remaining))
        except:
            pass

        return Response(response)

    except Exception as e:
        logger.error(f"Status error: {str(e)}")
        return Response({'error': str(e)}, status=500)







# ============================================================================
# DOWNLOAD API
# ============================================================================

@api_view(['GET'])
@role_required('admin', 'compiler')
def download_compiled(request, task_id):
    """Download compiled file"""
    try:
        # Find the compiled file
        output_files = list(Config.COMPILED_DIR.glob('*.csv')) + list(Config.COMPILED_DIR.glob('*.parquet'))
        if not output_files:
            return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)
        
        file_path = max(output_files, key=lambda p: p.stat().st_mtime)
        
        with open(file_path, 'rb') as f:
            response = HttpResponse(f.read(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{file_path.name}"'
            return response
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    



    # ###########################
    # @api_view(["GET"])
    # @authentication_classes([])
    # @permission_classes([AllowAny])
    # def get_compilation_filters(request):
    #     try:
    #         latest = execute_query("""
    #             SELECT price_month, price_year, price_data_status
    #             FROM prices.rural_elect_prices
    #             ORDER BY price_year DESC, price_month DESC
    #             LIMIT 1;
    #          """, fetch_one=True)

    #         if not latest:
    #             return Response({"options": []})

    #         month = int(latest["price_month"])
    #         year = int(latest["price_year"])
    #         status = latest["price_data_status"]

    #         options = []

    #         if status == "P":
    #            options = [
    #             {
    #                 "month": month,
    #                 "year": year,
    #                 "type": "PROVISIONAL"
    #             },
    #             {
    #                 "month": month,
    #                 "year": year,
    #                 "type": "FINAL"
    #             }
    #         ]

    #         elif status == "F":
    #           next_month = month + 1
    #           next_year = year

    #         if next_month > 12:
    #             next_month = 1
    #             next_year += 1

    #         options = [
    #             {
    #                 "month": month,
    #                 "year": year,
    #                 "type": "FINAL"
    #             },
    #             {
    #                 "month": next_month,
    #                 "year": next_year,
    #                 "type": "PROVISIONAL"
    #             }
    #         ]

    #         return Response({"options": options})

    #     except Exception as e:
    #             return Response({"error": str(e)}, status=500)

    