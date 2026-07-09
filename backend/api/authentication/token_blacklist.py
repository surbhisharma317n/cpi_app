from django.core.cache import cache
from django.http import JsonResponse


class TokenBlacklistMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip public endpoints
        public_paths = ['/api/login/', '/api/captcha/', '/api/token/refresh/']
        if request.path in public_paths:
            return self.get_response(request)

        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

            if cache.get(f"blacklist:{token}"):
                return JsonResponse(
                    {"error": "Session expired. Please login again."},
                    status=401
                )

        return self.get_response(request)