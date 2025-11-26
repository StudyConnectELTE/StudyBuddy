from backend.app import app
from backend.models import db
from flask_migrate import Migrate
from flask.cli import FlaskGroup

# Inicializáld újra a Flask-Migrate-et itt is
migrate = Migrate(app, db) 
cli = FlaskGroup(app)

if __name__ == '__main__':
    cli()