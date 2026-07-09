# FastAPI/Django example endpoints

# 1. Upload data (accepts ZIP or individual files)
@router.post("/upload-data/")
async def upload_data(
    files: List[UploadFile] = File(...),
    zip_file: UploadFile = File(None),
    upload_type: str = Form(...),
    month: str = Form(...),
    year: int = Form(...),
    compile_type: str = Form(...)
):
    """Upload data files and trigger validation"""
    task = process_upload.delay(
        files=files,
        zip_file=zip_file,
        upload_type=upload_type,
        month=month,
        year=year,
        compile_type=compile_type
    )
    return {"task_id": task.id, "status": "PROCESSING"}

# 2. Check upload status
@router.get("/upload-status/{task_id}/")
async def get_upload_status(task_id: str):
    """Get upload and validation status"""
    task = AsyncResult(task_id)
    return {
        "status": task.status,
        "result": task.result if task.ready() else None,
        "error_message": str(task.info) if task.failed() else None
    }

# 3. Start compilation
@router.post("/start-compilation/")
async def start_compilation(
    task_id: str,
    month: str,
    year: int,
    compile_type: str,
    data_source: str
):
    """Start compilation process"""
    task = start_compilation_task.delay(
        task_id=task_id,
        month=month,
        year=year,
        compile_type=compile_type,
        data_source=data_source
    )
    return {"task_id": task.id, "status": "PENDING"}

# 4. Check compilation status
@router.get("/compilation-status/{task_id}/")
async def get_compilation_status(task_id: str):
    """Get compilation progress"""
    task = AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task.status,
        "progress": task.result.get("progress", 0) if task.result else 0,
        "current_stage": task.result.get("current_stage", "") if task.result else "",
        "error_message": str(task.info) if task.failed() else None,
        "started_at": task.date_created,
        "completed_at": task.date_done
    }
    
    
#task.py example tasks celery   
# tasks.py
from celery import shared_task
from celery.utils.log import get_task_logger
import zipfile
import pandas as pd
import io
import tempfile

logger = get_task_logger(__name__)

@shared_task(bind=True)
def process_upload(self, files=None, zip_file=None, **kwargs):
    """Process uploaded files"""
    self.update_state(state='PROGRESS', meta={'progress': 0})
    
    validation_results = []
    
    if zip_file:
        # Extract and process ZIP
        with tempfile.TemporaryDirectory() as tmpdir:
            with zipfile.ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(tmpdir)
                
                # Process each parquet file
                for file_path in Path(tmpdir).glob("*.parquet"):
                    result = validate_parquet_file(file_path)
                    validation_results.append(result)
    
    self.update_state(state='SUCCESS', meta={
        'progress': 100,
        'validation_results': validation_results
    })
    
    return validation_results

@shared_task(bind=True)
def start_compilation_task(self, task_id, **params):
    """Compilation process with stages"""
    stages = [
        "Initialization",
        "Data Extraction", 
        "Validation",
        "Processing",
        "Index Calculation",
        "Finalization"
    ]
    
    for i, stage in enumerate(stages):
        self.update_state(state='PROGRESS', meta={
            'progress': (i + 1) * 100 // len(stages),
            'current_stage': stage
        })
        
        # Process each stage
        process_compilation_stage(stage, params)
        
    return {
        'progress': 100,
        'current_stage': 'Completed',
        'result_url': f'/api/results/{task_id}'
    }