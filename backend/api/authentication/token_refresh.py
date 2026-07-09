#token_refresh.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

@api_view(["POST"])
@permission_classes([AllowAny])
def custom_refresh_token(request):
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response({"error": "Refresh token required"}, status=400)

    try:
        refresh = RefreshToken(refresh_token)

        # 🔥 Generate new access token
        new_access = str(refresh.access_token)

        return Response({
            "access": new_access,
            "refresh": refresh_token  # reuse same refresh
        })

    except Exception:
        return Response(
            {"error": "Invalid or expired refresh token"},
            status=status.HTTP_401_UNAUTHORIZED
        )