import os
import os.path as op

BASE_DIR = op.abspath(op.dirname(__file__))

class Config:
    # 1) Adatbázis URL több forrásból
    db_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("MYSQL_URL")
        or "mysql+pymysql://user:password@db:3306/studybuddy"
    )

    # 2) Railway/Render néha mysql:// prefixet ad → javítjuk
    if db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # 3) Upload mappa
    UPLOAD_FOLDER = op.join(BASE_DIR, "uploads")

    # 4) JWT és egyéb app beállítások
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")

    # 5) ELTE email regex 
    ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|inf\.elte\.hu)$"

    # 6) Tanrend API URL
    TANREND_API_URL = "https://elte-orarend.vercel.app"
