import jwt
import secrets
import string
from datetime import datetime, timedelta, timezone
from config import Config

def create_jwt_token(user_id):
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    payload = {"user_id": user_id, "exp": expiration}
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def verify_jwt_token(token):
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except:
        return None

def generate_temp_password(length=12):
    chars = string.ascii_letters + string.digits + "!@#$%^&*()"
    return ''.join(secrets.choice(chars) for _ in range(length))
