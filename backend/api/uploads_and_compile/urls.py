from django.urls import path, re_path

from . import views

urlpatterns = [
    # Upload endpoints
    path('upload/start', views.start_upload, name='start_upload'),
    path('upload/status/<uuid:session_id>', views.upload_status, name='upload_status'),
    
    # Compilation endpoints
    path('compile/start', views.start_compilation, name='start_compilation'),
    path('compile/status/<uuid:task_id>', views.compilation_status, name='compilation_status'),
    path('compile/download/<uuid:task_id>', views.download_compiled, name='download_compiled'),

    

    # Database import endpoints
    path('compilation/import/<uuid:task_id>', views.import_to_database, name='import_to_database'),
    path('database/import/status/<uuid:task_id>', views.database_import_status, name='database_import_status'),
    
    
    # Legacy endpoints (keep for backward compatibility if needed)
    # path('database/import-copy/<uuid:task_id>', views.import_with_copy, name='import_with_copy'),
]