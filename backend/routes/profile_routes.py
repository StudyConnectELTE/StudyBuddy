from flask import Blueprint, request, jsonify
from services.auth_service import verify_jwt_token
from models import db
from models import User

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["GET"])
def profile():
    auth = request.headers.get("Authorization")
    if not auth:
        return jsonify({"error": "Hiányzó token"}), 401

    token = auth.split()[1]
    decoded = verify_jwt_token(token)
    if not decoded:
        return jsonify({"error": "Érvénytelen token"}), 401

    user = db.session.get(User, decoded["user_id"])

    return jsonify({
        "email": user.email,
        "major": user.major,
        "name": user.name,
        "hobbies": user.hobbies,
        "secondary_email": user.secondary_email
    })
