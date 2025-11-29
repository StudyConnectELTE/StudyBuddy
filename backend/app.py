from flask import Flask
from config import Config
from models import db
from routes import register_routes

from flask import render_template



def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # SQLAlchemy inicializálás
    db.init_app(app)

    @app.route("/test-ui")
    def test_ui():
        return "<h1>Backend működik!</h1>"

    @app.route("/test")
    def test_page():
        return render_template("test.html")
    
    # Route-ok regisztrálása külön file-ból
    register_routes(app)

    # Adatbázis létrehozása, ha nem létezik
    with app.app_context():
        db.create_all()

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)