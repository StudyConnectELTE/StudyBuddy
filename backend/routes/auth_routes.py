from flask import Blueprint, json, request, jsonify
import bcrypt
from models import db
from models import User
from services.auth_service import create_jwt_token, generate_temp_password
from services.validators import validate_secondary_email
from services.email_service import send_registration_email
from config import Config
import re

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    
    if request.method == "OPTIONS":
       return jsonify({"status": "ok"}), 200

    #data = request.get_json(silent=True)
    
    data = request.get_json(silent=True)

    print("????")
    print("DATA:", data)
    print(type(data))

    if not isinstance(data, dict):
        return jsonify({"message": "Invalid JSON body"}), 400
    
    if not data:
        return jsonify({"message": "Missing JSON body"}), 400
    
    email = data.get("email")
    #print("EMAIL:", email, type(email))
    if isinstance(email, dict):
        email = email.get("value")

    print("EMAIL:", email, type(email))
    print("_________")
    secondary = data.get("secondaryEmail")
    name = data.get("name")
    major = data.get("major")
    neptun = data.get("neptunCode")
    semester = data.get("semester")
    hobbies = data.get("hobbies", [])
    hobbies_str = ",".join(hobbies)

    if not re.match(Config.ELTE_EMAIL_REGEX, email):
        return jsonify({"message": "Csak ELTE-s email használható!"}), 400

    ok, msg = validate_secondary_email(email, secondary)
    if not ok:
        return jsonify({"message": msg}), 400

    temp_pw = generate_temp_password()
    pw_hash = bcrypt.hashpw(temp_pw.encode(), bcrypt.gensalt()).decode()

    user = User(
        email=email,
        secondary_email=secondary,
        password_hash=pw_hash,
        major=major,
        name=name,
        hobbies=hobbies_str,
        neptun_code=neptun,
        current_semester=semester
    )
    db.session.add(user)
    db.session.commit()

    send_registration_email(secondary, name, temp_pw)

    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "major": user.major,
            "hobbies": user.hobbies,
            "secondary_email": user.secondary_email
        },
        "token": create_jwt_token(user.id)
    }), 201
