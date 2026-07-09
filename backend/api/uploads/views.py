from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db import connection
from django.core.cache import cache
from celery.result import AsyncResult
import uuid
import os
from datetime import datetime
from .models import UploadSession, FileStatus

from .tasks import process_zip_file, process_parquet_file, bulk_process_session


# ================================
# Create Session
# ================================
# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def create_session(request):
#     session_id = f"session_{uuid.uuid4().hex[:12]}"

#     with connection.cursor() as cursor:
#         cursor.execute("""
#             INSERT INTO uploads_uploadsession 
#             (id, user_id, session_id, status, month, year, compile_type, 
#              created_at, updated_at)
#             VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
#             RETURNING session_id, created_at
#         """, [
#             str(uuid.uuid4()),
#             str(request.user.id),
#             session_id,
#             'PENDING',
#             request.data.get('month', 'JAN'),
#             request.data.get('year', datetime.now().year),
#             request.data.get('compile_type', 'PROVISIONAL')
#         ])

#         result = cursor.fetchone()

#     return Response({
#         'session_id': result[0],
#         'status': 'PENDING',
#         'created_at': result[1]
#     }, status=status.HTTP_201_CREATED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_session(request):
    session_id = f"session_{uuid.uuid4().hex[:12]}"

    session = UploadSession.objects.create(
        user_id=request.user.id,   # ✅ FIXED
        session_id=session_id,
        month=request.data.get("month", "JAN"),
        year=request.data.get("year", datetime.now().year),
        compile_type=request.data.get("compile_type", "PROVISIONAL"),
    )

    return Response({
        "session_id": session.session_id,
        "status": session.status,
        "created_at": session.created_at,
    }, status=status.HTTP_201_CREATED)

# ================================
# Upload File
# ================================
# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def upload_file(request, session_id):

#     file = request.FILES.get('file')
#     if not file:
#         return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

#     if not (file.name.endswith('.zip') or file.name.endswith('.parquet')):
#         return Response(
#             {'error': 'Only ZIP and Parquet files are allowed'},
#             status=status.HTTP_400_BAD_REQUEST
#         )

#     try:
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 SELECT id FROM uploads_uploadsession 
#                 WHERE session_id = %s AND user_id = %s
#             """, [session_id, str(request.user.id)])

#             session = cursor.fetchone()
#             if not session:
#                 return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

#             session_db_id = session[0]

#         # Save file
#         file_id = str(uuid.uuid4())
#         upload_dir = f"media/uploads/{datetime.now().strftime('%Y/%m/%d')}/{session_id}"
#         os.makedirs(upload_dir, exist_ok=True)

#         file_path = os.path.join(upload_dir, f"{file_id}_{file.name}")

#         with open(file_path, 'wb') as dest:
#             for chunk in file.chunks(8192):
#                 dest.write(chunk)

#         # Insert file record
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 INSERT INTO uploads_filestatus 
#                 (id, upload_session_id, file_id, file_name, status, 
#                  progress, size, message, created_at, updated_at)
#                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
#             """, [
#                 str(uuid.uuid4()),
#                 session_db_id,
#                 file_id,
#                 file.name,
#                 'pending',
#                 0,
#                 f"{file.size / 1024 / 1024:.1f} MB",
#                 'Queued for processing'
#             ])

#         # Update session
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 UPDATE uploads_uploadsession 
#                 SET total_files = total_files + 1, status = 'UPLOADING', updated_at = NOW()
#                 WHERE id = %s
#             """, [session_db_id])

#         # Start Celery Task
#         if file.name.endswith('.zip'):
#             task = process_zip_file.delay(
#                 session_id=session_id,
#                 file_path=file_path,
#                 file_id=file_id,
#                 user_id=str(request.user.id)
#             )
#         else:
#             task = process_parquet_file.delay(
#                 session_id=session_id,
#                 file_path=file_path,
#                 file_id=file_id,
#                 user_id=str(request.user.id)
#             )

#         return Response({
#             'message': 'File uploaded and processing started',
#             'file_id': file_id,
#             'task_id': task.id,
#         }, status=status.HTTP_202_ACCEPTED)

#     except Exception as e:
#         return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_file(request, session_id):

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided'}, status=400)

    try:
        session = UploadSession.objects.get(
            session_id=session_id,
            user_id=request.user.id
        )
    except UploadSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    file_id = str(uuid.uuid4())

    upload_dir = os.path.join("media", "uploads", session_id)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, f"{file_id}_{file.name}")

    with open(file_path, "wb") as dest:
        for chunk in file.chunks():
            dest.write(chunk)

    FileStatus.objects.create(
        upload_session=session,
        file_id=file_id,
        file_name=file.name,
        file_size_bytes=file.size
    )

    session.total_files += 1
    session.status = UploadSession.Status.UPLOADING
    session.save()

    task = process_zip_file.delay(
        session_id=session_id,
        file_path=file_path,
        file_id=file_id,
        user_id=request.user.id
    )

    return Response({
        "message": "File uploaded",
        "task_id": task.id
    }, status=202)

# ================================
# Bulk Process
# ================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_process(request, session_id):

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id FROM uploads_uploadsession 
            WHERE session_id = %s AND user_id = %s
        """, [session_id, str(request.user.id)])

        if not cursor.fetchone():
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    task = bulk_process_session.delay(
        session_id=session_id,
        user_id=str(request.user.id)
    )

    return Response({
        'message': 'Bulk processing started',
        'task_id': task.id
    }, status=status.HTTP_202_ACCEPTED)


# ================================
# Session Status
# ================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def session_status(request, session_id):

    cache_key = f"session_status_{session_id}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT session_id, status, total_files, processed_files,
                   failed_files, total_records, total_size_bytes,
                   created_at, updated_at
            FROM uploads_uploadsession
            WHERE session_id = %s AND user_id = %s
        """, [session_id, str(request.user.id)])

        session = cursor.fetchone()
        if not session:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    response_data = {
        'session_id': session[0],
        'status': session[1],
        'total_files': session[2],
        'processed_files': session[3],
        'failed_files': session[4],
        'total_records': session[5] or 0,
        'total_size_mb': round((session[6] or 0) / 1024 / 1024, 2),
        'progress': round(session[3] / session[2] * 100, 1) if session[2] > 0 else 0,
        'created_at': session[7],
        'updated_at': session[8],
    }

    cache.set(cache_key, response_data, 10)
    return Response(response_data)


# ================================
# Task Status
# ================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def task_status(request, task_id):

    task = AsyncResult(task_id)

    response = {
        'task_id': task_id,
        'status': task.status,
        'successful': task.successful(),
        'failed': task.failed(),
        'ready': task.ready(),
    }

    if task.successful():
        response['result'] = task.result
    elif task.failed():
        response['error'] = str(task.result)

    return Response(response)