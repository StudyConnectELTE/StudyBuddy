# app.py - TELJES JAVÍTOTT VÁLTOZAT (2026.02.06)
from flask import Flask, app, send_from_directory, render_template, jsonify, current_app
from flask_mail import Mail
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from flask_migrate import Migrate
import os  # ← FONTOS: LEGFELÜL!
from config import Config
from models import db
#from routes.auth_routes import auth_bp
from routes.auth_routes import auth_bp
from routes.groups_routes import groups_bp
from routes.subjects_routes import subjects_bp
from routes.profile_routes import profile_bp
from routes.posts_routes import posts_bp

def create_app():
    app = Flask(__name__)
    
    # 1. CONFIG ELŐBB (OS már importálva!)
    app.config.from_object(Config)
    
    # 2. MAILTRAP CONFIG
    app.config['MAIL_PORT'] = 2525
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USE_SSL'] = False
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', '..')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', '..')
    app.config['MAIL_DEFAULT_SENDER'] = 'noreply@studyconnect.hu'
    app.config['ELTE_EMAIL_REGEX'] = r'^[a-zA-Z0-9._%+-]+@(inf|student)\.elte\.hu$'
    
    # 3. MAX FÁJL MÉRET (BIZTONSÁG)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
    
    # 4. CORS - Frontend támogatása
    CORS(app, 
         origins=["http://localhost:3000", "http://localhost:5173", "https://elte-frontend-5bnk.vercel.app"], 
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=True)

    # 5. ERROR HANDLER-ek
    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        return jsonify({
            "error": e.name,
            "message": str(e.description),
            "code": e.code
        }), e.code

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "error": "Nincs ilyen endpoint",
            "code": 404
        }), 404

    # 6. DB + MAIL + MIGRATE
    db.init_app(app)
    mail = Mail(app)
    migrate = Migrate(app, db)

    # 7. TESZT ROUTES
    @app.route("/")
    def home():
        return "Welcome to StudyConnect API! ✅ Fájlok + Login + CORS OK!"

    @app.route("/test-ui")
    def test_ui():
        return "<h1>🔥 StudyConnect Backend - Minden működik!</h1><p>Fájlok: <a href='/uploads/posts/'>uploads/posts/</a></p>"

    @app.route("/test")
    def test_page():
        return render_template("test.html")

    # 8. 🔒 BIZTONSÁGOS FÁJLSZERVER - KRITIKUS!
    @app.route("/uploads/<path:filepath>")
    def uploaded_file(filepath):
        """📁 posts/ és comments/ fájlok kiszolgálása"""
        UPLOAD_FOLDER = "uploads"  # ← HARDCODE = BIZTOS MŰKÖDIK!
        
        # 1. DIRECTORY TRAVERSAL VÉDELEM
        if '..' in filepath or filepath.startswith('/'):
            print(f"🚫 BLOCKED: {filepath}")
            return "Unauthorized!", 403
        
        # 2. CSAK ENGEDÉLYEZETT FÁJLTÍPUSOK
        allowed_ext = {'.pdf', '.png', '.jpg', '.jpeg', '.gif', '.txt', '.docx'}
        if not any(filepath.lower().endswith(ext) for ext in allowed_ext):
            print(f"🚫 TYPE BLOCKED: {filepath}")
            return "Tiltott fájltípus!", 403
        
        # 3. BIZTONSÁGOS ÚTVONAL ÉPÍTÉS
        safe_path = os.path.join(UPLOAD_FOLDER, filepath)
        if not os.path.exists(safe_path):
            print(f"❌ 404: {safe_path}")
            return jsonify({"error": "Fájl nem található"}), 404
        
        print(f"✅ Serving: /uploads/{filepath}")
        return send_from_directory(UPLOAD_FOLDER, filepath)

    # 9. MAIN ROUTES REGISZTRÁLÁSA
    #app.register_blueprint(auth_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(subjects_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(posts_bp)
    #register(app)

    # 10. DB LÉTREHOZÁS (FEJLESZTÉSI)
    with app.app_context():
        db.create_all()

    return app

if __name__ == "__main__":    
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
    