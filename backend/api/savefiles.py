from rest_framework.decorators import api_view
from rest_framework.response import Response
import os
from django.conf import settings

@api_view(['POST'])
def save_file(request):
    file = request.FILES['file']
    upload_path = os.path.join(settings.MEDIA_ROOT, 'uploads', file.name)
    os.makedirs(os.path.dirname(upload_path), exist_ok=True)

    with open(upload_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)

    return Response({'file_path': upload_path}, status=200)