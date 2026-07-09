import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Create Celery app with minimal configuration
app = Celery('data_processing')

# Use string config for better compatibility
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# ✅ Optimized for ≤10 users with 2M+ records
app.conf.update(
    # Basic settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # ✅ Performance for large files (2M+ records)
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=50,  # Restart worker after 50 tasks
    task_acks_late=True,  # Only ack after task completes
    task_reject_on_worker_lost=True,  # Requeue if worker dies
    
    # ✅ Timeouts for large files
    task_time_limit=3600,  # 1 hour max
    task_soft_time_limit=3300,  # 55 minutes soft limit
    
    # ✅ Store results in Django DB (no Redis needed for results)
    result_backend='django-db',
    task_track_started=True,
    task_ignore_result=False,
)

# ✅ Lightweight worker settings for ≤10 users
app.conf.worker_concurrency = 2  # Only 2 worker processes
app.conf.worker_prefetch_multiplier = 1  # Don't prefetch

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')