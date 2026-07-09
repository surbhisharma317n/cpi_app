
import jwt
from datetime import datetime, timedelta
from django.conf import settings

ALGORITHM = "HS256"  # or HS512 if you prefer
SECRET_KEY = settings.SECRET_KEY



def create_jwt_token(user_id, email, first_name="", last_name="", role="user",full_name='', permissions=[]):
    
    payload = {
        "user_id": user_id,
        "email": email,
      
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "full_name": full_name,
        "permissions": permissions,
        "exp": datetime.utcnow() + timedelta(hours=24),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
