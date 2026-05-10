"""
Fejlesztői tesztfelhasználók (kamu ELTE + másodlagos email).
Ugyanaz a jelszó: Pass1234*

Futtatás Dockerrel (a compose futtatása után):
  docker compose exec backend python seed_test_users.py

Bejelentkezés a frontendben: az \"ELTE email\" mezőbe az alábbi elsődleges címek.
"""

import bcrypt
from app import create_app
from models import db, User

PASSWORD = "Pass1234*"

# Két user: csoportos / Pomodoro tesztekhez mindkettő kellhet.
SEEDS = [
    {
        "email": "test.buddy.one@student.elte.hu",
        "secondary_email": "testbuddy.one.kamu@gmail.com",
        "name": "Teszt Egy",
        "neptun_code": "TBUDY1",
        "major": "Informatika",
        "current_semester": "1",
        "hobbies": "teszt",
    },
    {
        "email": "test.buddy.two@student.elte.hu",
        "secondary_email": "testbuddy.two.kamu@gmail.com",
        "name": "Teszt Kettő",
        "neptun_code": "TBUDY2",
        "major": "Informatika",
        "current_semester": "1",
        "hobbies": "teszt",
    },
]


def main():
    app, _ = create_app()
    pw_hash = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    with app.app_context():
        for row in SEEDS:
            u = User.query.filter_by(email=row["email"]).first()
            if u:
                u.password_hash = pw_hash
                u.secondary_email = row["secondary_email"]
                u.name = row["name"]
                print(f"Frissítve (jelszó): {row['email']}")
            else:
                u = User(
                    email=row["email"],
                    secondary_email=row["secondary_email"],
                    password_hash=pw_hash,
                    name=row["name"],
                    major=row["major"],
                    neptun_code=row["neptun_code"],
                    current_semester=row["current_semester"],
                    hobbies=row["hobbies"],
                )
                db.session.add(u)
                print(f"Létrehozva: {row['email']}")
        db.session.commit()

    print("\nJelszó mindkettőhöz:", PASSWORD)
    print("Login email példa:", SEEDS[0]["email"])


if __name__ == "__main__":
    main()
