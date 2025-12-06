from flask import request, jsonify
from models import db, User
import re
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from models import db, User, Group, GroupMember


# Email minta
ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|elte\.hu)$"


def create_jwt_token(user_id):
    expiration = datetime.utcnow() + timedelta(hours=1)
    payload = {
        "user_id": user_id,
        "exp": expiration
    }

    token = jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")
    return token


def verify_jwt_token(token):
    try:
        data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        return data
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def register_routes(app):

    @app.route("/register", methods=["POST","OPTIONS"])
    def register():
        if request.method == "OPTIONS":
            return "", 200
        data = request.get_json()
        if not data:
            return jsonify({
                "error": "Hibás JSON formátum",
                "code": 400
            }), 400
            

        email = data.get("email")
        password = data.get("password")
        name = data.get("name")
        major = data.get("major")  
        hobbies = data.get("hobbies", [])
        hobbies_str = ",".join(hobbies) if isinstance(hobbies, list) else str(hobbies)
        avatar_url = data.get("avatar_url") 

        if not re.match(ELTE_EMAIL_REGEX, email):
            return jsonify({"message": "Csak ELTE-s email használható!"}), 400

        if not major:
            return jsonify({"message": "A szak megadása kötelező!"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Ez az email már regisztrálva van!"}), 400

        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode()

        #bio_value = ",".join(interests) if isinstance(interests, list) else interests
        
        new_user = User(
            email=email,
            password_hash=password_hash,
            major=major,
            name=name,
            hobbies=hobbies_str,
            avatar_url=avatar_url
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "major": new_user.major,
            "hobbies": new_user.hobbies,
            "avatar_url": new_user.avatar_url
        },
        "token": create_jwt_token(new_user.id),
        "message": "Sikeres regisztráció!"
    }), 201

    @app.route("/login", methods=["POST", "OPTIONS"])
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
                "hobbies": user.hobbies
            },
            "message": "Sikeres bejelentkezés!", 
            "token": token,
        }), 200

    @app.route("/profile", methods=["GET"])
    def profile():
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Hiányzó Authorization header"}), 401

        try:
            token = auth_header.split(" ")[1]
        except:
            return jsonify({"error": "Hibás Authorization formátum"}), 401

        decoded = verify_jwt_token(token)

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user = User.query.get(decoded["user_id"])

        return jsonify({
            "email": user.email,
            "major": user.major,
            "name": user.name,
            "hobbies": user.hobbies,
            "avatar_url": user.avatar_url
        })

    @app.route("/groups/search", methods=["GET"])
    def search_groups():
        # Token check
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]
        user = User.query.get(user_id)

        subject = request.args.get("q", "").strip()
        if not subject:
            return jsonify({"error": "Hiányzik a keresési kifejezés"}), 400

        # 1) A tárgyhoz tartozó csoportok
        groups = Group.query.filter(Group.subject.ilike(f"%{subject}%")).all()

        user_interests = set((user.hobbies or "").split(","))

        zero_member_group = None
        group_list = []

        best_group = None
        best_interest_count = -1

        for g in groups:
            members = GroupMember.query.filter_by(group_id=g.id).all()
            member_count = len(members)

            same_interest_count = 0
            for m in members:
                u = User.query.get(m.user_id)
                if u and u.hobbies:
                    if user_interests.intersection(set(u.hobbies.split(","))):
                        same_interest_count += 1

            if member_count == 0 and zero_member_group is None:
                zero_member_group = g

            if same_interest_count > best_interest_count:
                best_interest_count = same_interest_count
                best_group = g

            group_list.append({
                "id": g.id,
                "name": g.name,
                "subject": g.subject,
                "description": g.description,
                "member_count": member_count,
                "same_interest_members": same_interest_count,
                "is_member": False
            })

            existing_member = GroupMember.query.filter_by(
                group_id=g.id,
                user_id=user_id
            ).first()
            group_list[-1]["is_member"] = existing_member is not None

        # 2) Ha nincs egyetlen csoport sem: automatikusan létrehozzuk
        if not groups:
            new_group = Group(
                name=f"{subject} Study Group #1",
                subject=subject,
                description=f"{subject} automatikusan létrehozott tanulócsoport.",
                creator_id=user_id
            )
            db.session.add(new_group)
            db.session.commit()

            return jsonify({
                "recommended_group": {
                    "id": new_group.id,
                    "name": new_group.name,
                    "subject": new_group.subject,
                    "description": new_group.description,
                    "member_count": 0,
                    "same_interest_members": 0,
                    "is_member": False  # ← EZ HIÁNYZIK!
                },
                "all_groups": []
            })

        # 3) Ha nincs üres csoport -> hozzunk létre egyet
        if zero_member_group is None:
            new_group = Group(
                name=f"{subject} Study Group #{len(groups)+1}",
                subject=subject,
                description=f"{subject} új automatikusan létrehozott tanulócsoport.",
                creator_id=user_id
            )
            db.session.add(new_group)
            db.session.commit()

            zero_member_group = new_group

            group_list.append({
                "id": zero_member_group.id,
                "name": zero_member_group.name,
                "subject": zero_member_group.subject,
                "description": zero_member_group.description,
                "member_count": 0,
                "same_interest_members": 0,
                "is_member": False
            })

            
            existing_member = GroupMember.query.filter_by(
                group_id=zero_member_group.id,  # zero_member_group.id!
                user_id=user_id
            ).first()

            if existing_member:
                group_list[-1]["is_member"] = True  

        # 4) Ha nincs olyan csoport, amelyikben lenne közös érdeklődés -> ajánlott legyen az üres
        if best_interest_count == 0 or best_group is None:
            recommended_group = {
                "id": zero_member_group.id,
                "name": zero_member_group.name,
                "subject": zero_member_group.subject,
                "description": zero_member_group.description,
                "member_count": 0,
                "same_interest_members": 0,
                "is_member": False
            }
        else:
            # külön kiszámoljuk, hogy mennyi same_interest volt abban a csoportban
            recommended_group = {
                "id": best_group.id,
                "name": best_group.name,
                "subject": best_group.subject,
                "description": best_group.description,
                "member_count": GroupMember.query.filter_by(group_id=best_group.id).count(),
                "same_interest_members": best_interest_count,
                "is_member": False
            }

            existing_member = GroupMember.query.filter_by(
                group_id=best_group.id,
                user_id=user_id
            ).first()

            if existing_member:
                recommended_group["is_member"] = True

        # 5) válasz
        return jsonify({
            "recommended_group": recommended_group,
            "all_groups": group_list
        })

            

    @app.route("/groups/join", methods=["POST", "OPTIONS"])
    def join_group():
        if request.method == "OPTIONS":
            return "", 200
    
        data = request.get_json()
    
        if not data:
            return jsonify({"error": "Nincs JSON adat"}), 400
        
        group_id = data.get("group_id")
    
        if not group_id:
            return jsonify({"error": "group_id szükséges"}), 400
        

        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        if not group_id:
            return jsonify({"error": "group_id szükséges"}), 400

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "A csoport nem létezik"}), 404

        subject = group.subject

        # ELLENŐRIZZÜK: van-e már CSOPORTJA EHHEZ A TÁRGYHOZ
        existing_subject_group = (
            GroupMember.query
            .join(Group, GroupMember.group_id == Group.id)
            .filter(
                GroupMember.user_id == user_id,
                Group.subject == subject   # ugyanaz a tárgy
            )
            .first()
        )

        if existing_subject_group:
            return jsonify({
                "error": "Már van tanulócsoportod ehhez a tárgyhoz.",
                "subject": subject
            }), 400

        # ELLENŐRIZZÜK: ebben a konkrét csoportban tag-e
        existing_exact = GroupMember.query.filter_by(
            user_id=user_id, group_id=group_id
        ).first()

        if existing_exact:
            return jsonify({"message": "Már tag vagy ebben a csoportban"}), 200

        # Csatlakozás
        new_member = GroupMember(
            user_id=user_id,
            group_id=group_id
        )
        db.session.add(new_member)
        db.session.commit()

        return jsonify({"message": "Sikeresen csatlakoztál a csoporthoz!"}), 201

    @app.route("/groups/my-groups", methods=["GET"])
    def my_groups():
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        user_id = decoded["user_id"]

        # A user összes csoportja
        memberships = GroupMember.query.filter_by(user_id=user_id).all()

        if not memberships:
            return jsonify({
                "groups": [],
                "message": "Még nem vagy tagja egyetlen tanulócsoportnak sem."
            }), 200

        group_list = []
        for m in memberships:
            group = Group.query.get(m.group_id)
            if group:
                group_list.append({
                    "id": group.id,
                    "name": group.name,
                    "subject": group.subject,
                    "description": group.description,
                    "joined_at": m.joined_at.strftime("%Y-%m-%d %H:%M:%S")
                })

        return jsonify({"groups": group_list}), 200

    @app.route("/groups/<int:group_id>/members", methods=["GET"])
    def list_group_mmbrs(group_id):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except Exception:
            return jsonify({"error": "Hibás token"}), 401

        if not decoded:
            return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "Csoport nem található"}), 404
        
        group_memberships = GroupMember.query.filter_by(group_id=group_id).all()

        members = []
        for gm in group_memberships:
            u = User.query.get(gm.user_id)
            if u:
                members.append({
                    "user_id": gm.user_id,
                    "name": u.name,
                    "email": u.email,
                    "major": u.major,
                })

        return jsonify({
            "group_id": group_id,
            "members": members
        }), 200
