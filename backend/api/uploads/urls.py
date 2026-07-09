from django.urls import path
from .views import (
    create_session,
    upload_file,
    bulk_process,
    session_status,
    task_status
)

urlpatterns = [
    path('sessions/', create_session, name='create-session'),
    path('sessions/<str:session_id>/upload/', upload_file, name='upload-file'),
    path('sessions/<str:session_id>/bulk-process/', bulk_process, name='bulk-process'),
    path('sessions/status/<str:session_id>/', session_status, name='session-status'),
    path('task/<str:task_id>/', task_status, name='task-status'),
]