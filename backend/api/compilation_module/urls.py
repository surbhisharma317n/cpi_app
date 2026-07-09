from django.urls import path, re_path
from . import views
# urlpatterns = [
#     # Dataset endpoints
#     path('api/datasets/<uuid:dataset_id>/', views.dataset_detail, name='dataset-detail'),
#     path('api/datasets/', views.dataset_list, name='dataset-list'),
#     path('api/datasets/check-duplicate/', views.check_duplicate, name='check-duplicate'),
#     path('api/datasets/<uuid:dataset_id>/reuse/', views.reuse_dataset, name='reuse-dataset'),
    
#     # Upload endpoints
#     path('api/upload/', views.start_upload, name='start-upload'),
#     path('api/upload/status/<str:session_id>/', views.upload_status, name='upload-status'),
    
#     # Compilation endpoints
#     path('api/compilation/', views.start_compilation, name='start-compilation'),
#     path('api/compilation/status/<str:task_id>/', views.compilation_status, name='compilation-status'),
#     path('api/compilation/download/<str:task_id>/', views.download_compiled, name='download-compiled'),
    
#     # Database import endpoints
#     path('api/database/import/<str:task_id>/', views.import_to_database, name='import-to-database'),
#     path('api/database/import/status/<str:task_id>/', views.database_import_status, name='import-status'),
# ]


from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'datasets', views.DatasetViewSet, basename='dataset')
router.register(r'upload-sessions', views.UploadSessionViewSet, basename='upload-session')
router.register(r'compilations', views.CompilationTaskViewSet, basename='compilation')
router.register(r'aggregated-results', views.AggregatedResultViewSet, basename='aggregated-result')

urlpatterns = [
    path('', include(router.urls)),
]