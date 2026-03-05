from .auth_routes import auth_bp
from .profile_routes import profile_bp
from .subjects_routes import subjects_bp
from .groups_routes import groups_bp
from .posts_routes import posts_bp

def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(subjects_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(posts_bp)
