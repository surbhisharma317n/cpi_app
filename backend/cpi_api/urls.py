"""
URL configuration for cpi_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    # path('auth/', include('rest_framework.urls')),  # For login/logout views
    path('api/auth/', include('djoser.urls')),  # Djoser endpoints for user management
    path('api/auth/', include('djoser.urls.authtoken')),  # Djoser endpoints for token authentication
    path('api/auth/', include('djoser.urls.jwt')),  # Djoser endpoints for JWT authentication
    # path('api/uploads/', include('api.uploads.urls')),  # Djoser endpoints for JWT authentication
    
    path('api/uploads/', include('api.uploads.urls')),
    path('api/cpi/', include('api.uploads_and_compile.urls')),
    # path('api/v1/', include('api.compilation_module.urls')),
   
]
# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
