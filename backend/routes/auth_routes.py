from flask import Blueprint, json, request, jsonify
import bcrypt
from models import db
from models import User
from services.auth_service import create_jwt_token, generate_temp_password,  verify_jwt_token
from services.validators import validate_secondary_email
from services.email_service import send_registration_email
from config import Config
import re
import os
import requests


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

@auth_bp.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return "", 200
    data = request.json
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Hibás email vagy jelszó!"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode()):
        return jsonify({"error": "Hibás email vagy jelszó!"}), 401

    token = create_jwt_token(user.id)

    return jsonify({
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "major": user.major,
            "hobbies": user.hobbies,
            "neptun_code": user.neptun_code,
            "secondary_email": user.secondary_email,
            "current_semester": user.current_semester
        },
        "message": "Sikeres bejelentkezés!", 
        "token": token,
    }), 200


@auth_bp.route("/forgot-password", methods=["POST", "OPTIONS"])
def forgot_password():
    if request.method == "OPTIONS":
        return "", 200
    
    data = request.get_json()
    if not data:
        return jsonify({"error": "Hibás JSON formátum"}), 400
    
    requested_email = data.get("email")
    if not requested_email:
        return jsonify({"message": "Email cím megadása kötelező!"}), 400
    
    user = User.query.filter_by(secondary_email=requested_email).first()
    
    if not user:
        return jsonify({"message": "Nincs ilyen másodlagos email cím regisztrálva!"}), 404
    
    temp_password = generate_temp_password()
    password_hash = bcrypt.hashpw(temp_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user.password_hash = password_hash
    db.session.commit()
    
    send_to_email = requested_email
    
    # Brevo email
    try:
        headers = {
            'accept': 'application/json',
            'api-key': os.getenv('BREVO_API_KEY'),
            'content-type': 'application/json'
        }
        
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json={
                'sender': {'name': 'StudyConnect', 'email': 'studyconnectnoreply@gmail.com'},
                'to': [{'email': send_to_email, 'name': user.name}],
                'subject': '🔑 StudyConnect - Új ideiglenes jelszó',
                'htmlContent': f"""
                <html>
                <body style='font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; padding: 40px 20px; line-height: 1.6; color: #333;'>
                    <h2 style='color: #2c3e50; margin: 0 0 30px 0; font-size: 24px; font-weight: 600;'>Új ideiglenes jelszó!</h2>
                    
                    <div style='background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 30px; margin: 0 0 30px 0;'>
                        <h3 style='margin: 0 0 20px 0; color: #495057; font-size: 16px; font-weight: 500;'>Új jelszavad:</h3>
                        <div style='background: white; border: 2px solid #dee2e6; border-radius: 6px; padding: 20px; text-align: center;'>
                            <h1 style='letter-spacing: 2px; font-size: 28px; margin: 0; font-weight: 700; color: #2c3e50; font-family: monospace;'>{temp_password}</h1>
                        </div>
                        <p style='margin: 20px 0 0 0; color: #6c757d; font-size: 14px;'>
                            Belépés után cseréld le a jelszót!
                        </p>
                    </div>
                    
                    <div style='background: #e9ecef; padding: 20px; border-radius: 6px;'>
                        <p style='margin: 0 0 10px 0; font-weight: 500; color: #495057;'>Belépés (ELTE emaillel):</p>
                        <p style='margin: 0; color: #6c757d; font-size: 14px;'>
                            <strong>localhost:3000/login</strong>
                        </p>
                    </div>
                    
                    <hr style='border: none; border-top: 1px solid #e9ecef; margin: 40px 0;'>
                    <p style='color: #6c757d; font-size: 14px; margin: 0;'>
                        Üdvözlettel,<br>
                        <strong>StudyConnect Team</strong>
                    </p>
                </body>
                </html>
                """
            }
        )
        
        print(f"FORGOT BREVO: {response.status_code} → {send_to_email}")
        if response.status_code in [201, 202]:
            print(f"Új jelszó elküldve: {send_to_email}")
        else:
            print(f"BREVO HIBA: {response.text[:200]}")
            
    except Exception as e:
        print(f"BREVO Exception: {str(e)}")
        return jsonify({"error": "Email küldési hiba!"}), 500
    
    return jsonify({
        "message": f"Új jelszó elküldve {send_to_email}-re! 📧"
    }), 200

@auth_bp.route('/change-password', methods=['PUT'])
def change_password():
    auth_header = request.headers.get('Authorization')
    print(f'🔍 Eljut idáig - Header: {auth_header}')
    
    if not auth_header:
        return jsonify({'error': 'Hiányzik Authorization header'}), 401
    
    try:
        token = auth_header.split(' ')[1]
        decoded = verify_jwt_token(token)
        print(f'🔍 JWT decoded: {decoded}')  # DEBUG!
        
        if not decoded:
            return jsonify({'error': 'Érvénytelen vagy lejárt token'}), 401
        
        # 👈 'userid' → 'id' !
        user_id = decoded['user_id']  # VAGY decoded.get('userid')
        print(f'🔍 User ID: {user_id}')
        
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'Felhasználó nem található'}), 404
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Mindkét jelszó megadása kötelező'}), 400
        
        if not bcrypt.checkpw(current_password.encode('utf-8'), user.password_hash.encode('utf-8')):
            return jsonify({'error': 'Hibás jelenlegi jelszó'}), 401
        
        if len(new_password) < 8:
            return jsonify({'error': 'Új jelszó legalább 8 karakter legyen'}), 400
        
        # Új jelszó hash-elése
        new_password_hash = bcrypt.hashpw(
            new_password.encode('utf-8'), 
            bcrypt.gensalt()
        ).decode('utf-8')
        
        user.password_hash = new_password_hash
        db.session.commit()
        
        return jsonify({
            'message': 'Jelszó sikeresen megváltoztatva',
            'user': {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "major": user.major,
                "hobbies": user.hobbies,
                "neptun_code": user.neptun_code,
                "secondary_email": user.secondary_email,
                "current_semester": user.current_semester
            }
        }), 200
        
    except Exception as e:
        print(f'Jelszóváltoztatás hiba: {e}')
        return jsonify({'error': 'Szerver hiba történt'}), 500
