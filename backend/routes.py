from flask import request, jsonify, current_app  # pyright: ignore[reportMissingImports]
import re
import bcrypt  # pyright: ignore[reportMissingImports]
import jwt  # pyright: ignore[reportMissingImports]
from datetime import datetime, timedelta, timezone
from config import Config
from models import db, User, Group, GroupMember, Post, Comment, Event, PostView, PostAttachment, CommentAttachment
import os
import requests
from werkzeug.utils import secure_filename
#valami

TANREND_API_URL = "https://elte-orarend.vercel.app"


BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")

    SQLALCHEMY_DATABASE_URI = "mysql+mysqlconnector://user:password@studybuddy_db/studybuddy"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")

# Email minta
ELTE_EMAIL_REGEX = r"^[a-zA-Z0-9._%+-]+@(student\.elte\.hu|elte\.hu)$"


def create_jwt_token(user_id):
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
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
        avatar_url = data.get("avatar_url", None) 

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
    
    
    @app.route("/subjects/search", methods=["GET"])
    def search_subjects():
        # Token ellenőrzés – ugyanúgy, mint /groups/search-nél
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

        # Keresési paraméterek
        query = request.args.get("q", "").strip()
        year = request.args.get("year", "2025-2026-1")

        if not query:
            return jsonify([])

        # Hívjuk a Vercelre kitett tanrend JS API-t
        try:
            print(">>> TANREND_API_URL:", TANREND_API_URL)
            resp = requests.post(
                f"{TANREND_API_URL}/api",
                json={"year": year, "name": query},
                timeout=10
            )
            print(">>> Tanrend API status:", resp.status_code)
            print(">>> Tanrend API body:", resp.text[:300])
        except Exception as e:
            print("Tanrend API error (kivétel):", e)
            print("Tanrend API error:", e)
            return jsonify([]), 502

        if resp.status_code != 200:
            return jsonify([]), 502

        rows = resp.json()  # string[][]

        # Sorok → egyedi tárgyak: code + name
        subjects_by_code = {}
        for row in rows:
            
            if len(row) < 3:
                continue
            time_str = row[0]
            raw_code = row[1].strip()
            print("EZ ITT A KÓD")
            print(raw_code)
            code = raw_code.split("(")[0].strip()
            m = re.match(r"^(.*?)-(\d+)$", code)
            if m:
                code = m.group(1)

            name = row[2].strip()

            if not code or not name:
                continue

            print(code)
            if code not in subjects_by_code:
                subjects_by_code[code] = {
                    "code": code,
                    "name": name,
                }

        # Ezt kapja a frontend: [{ code, name }, ...]
        return jsonify(list(subjects_by_code.values())), 200
    

    @app.route("/groups/by-subject", methods=["GET"])
    def groups_by_subject():
        # Token check
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

        user_id = decoded["user_id"]

        subject_name = request.args.get("name", "").strip()
        if not subject_name:
            return jsonify({"error": "Hiányzik a subject name"}), 400

        groups = Group.query.filter(Group.subject == subject_name).all()

        group_list = []
        for g in groups:
            members = GroupMember.query.filter_by(group_id=g.id).all()
            member_count = len(members)

            existing_member = GroupMember.query.filter_by(
                group_id=g.id, user_id=user_id
            ).first()

            group_list.append({
                "id": g.id,
                "name": g.name,
                "subject": g.subject,
                "description": g.description,
                "member_count": member_count,
                "is_member": existing_member is not None,
            })

        return jsonify(group_list), 200


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
        
        
        
    @app.route("/groups/<int:group_id>/posts", methods=["POST"])
    def create_post(group_id):
        ################ Auth checks and case handling ##############################
        
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

        user_id = decoded["user_id"]

        group = Group.query.get(group_id)
        if not group:
            return jsonify({"error": "Csoport nem található"}), 404


        membership = GroupMember.query.filter_by(
            user_id=user_id, group_id=group_id
        ).first()
        if not membership:
            return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

        # Támogatjuk a multipart/form-data és JSON formátumot is
        if request.content_type and 'multipart/form-data' in request.content_type:
            title = request.form.get("title")
            content = request.form.get("content")
            # Több fájl kezelése - először próbáljuk a "files" tömböt, majd a régi "file" mezőt kompatibilitásért
            files = request.files.getlist("files")
            if not files or all(not f.filename for f in files):
                # Ha nincs "files" tömb, próbáljuk a régi "file" mezőt
                single_file = request.files.get("file")
                files = [single_file] if single_file and single_file.filename else []
        else:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs adat"}), 400
            title = data.get("title")
            content = data.get("content")
            files = []
        
        #####################################################################

        if not title or not content:
            return jsonify({"error": "title és content kötelező"}), 400

        new_post = Post(
            title=title,
            content=content,
            group_id=group_id,
            author_id=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )

        db.session.add(new_post)
        db.session.flush()  # Hogy megkapjuk az ID-t

        # Fájlok kezelése
        attachments_data = []
        if files:
            try:
                # Uploads mappa létrehozása ha nem létezik
                upload_dir = os.path.join(Config.UPLOAD_FOLDER, "posts")
                os.makedirs(upload_dir, exist_ok=True)
                
                for file in files:
                    if file and file.filename:
                        # Biztonságos fájlnév
                        filename = secure_filename(file.filename)
                        # Egyedi fájlnév generálása
                        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
                        unique_filename = f"{timestamp}_{filename}"
                        
                        file_path = os.path.join(upload_dir, unique_filename)
                        file.save(file_path)
                        
                        # Relatív URL a fájlhoz
                        file_url = f"/uploads/posts/{unique_filename}"
                        
                        attachment = PostAttachment(
                            post_id=new_post.id,
                            filename=filename,
                            file_url=file_url,
                            mime_type=file.content_type,
                            uploaded_at=datetime.now(timezone.utc)
                        )
                        db.session.add(attachment)
                        
                        attachments_data.append({
                            "id": attachment.id,
                            "filename": attachment.filename,
                            "file_url": attachment.file_url,
                            "mime_type": attachment.mime_type
                        })
            except Exception as e:
                db.session.rollback()
                return jsonify({"error": f"Fájl feltöltési hiba: {str(e)}"}), 500

        db.session.commit()

        post_response = {
            "id": new_post.id,
            "title": new_post.title,
            "content": new_post.content,
            "group_id": new_post.group_id,
            "author_id": new_post.author_id,
            "created_at": new_post.created_at.isoformat(),
            "updated_at": new_post.updated_at.isoformat()
        }
        
        if attachments_data:
            post_response["attachments"] = attachments_data

        return jsonify({
            "message": "Poszt sikeresen létrehozva",
            "post": post_response
        }), 201

    @app.route("/groups/<int:group_id>/posts", methods=["GET"])
    def list_posts(group_id):
        
        ###### Necessery checks############
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

        ##############################################x
        posts = (
            Post.query
            .filter_by(group_id=group_id, deleted_at=None)
            .order_by(Post.created_at.desc())
            .all()
        )

        posts_json = []
        for p in posts:
            post_data = {
                "id": p.id,
                "title": p.title,
                "content": p.content,
                "group_id": p.group_id,
                "author_id": p.author_id,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            # Attachment-ek hozzáadása
            attachments = PostAttachment.query.filter_by(post_id=p.id).all()
            if attachments:
                post_data["attachments"] = [
                    {
                        "id": att.id,
                        "filename": att.filename,
                        "file_url": att.file_url,
                        "mime_type": att.mime_type
                    }
                    for att in attachments
                ]
            posts_json.append(post_data)

        return jsonify({
            "group_id": group_id,
            "posts": posts_json
        }), 200

    @app.route("/posts/<int:post_id>", methods=["PUT", "DELETE"])
    def update_or_delete_post(post_id):
        ################### Auth check and case handling
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

        user_id = decoded["user_id"]

        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404

        # Csak a poszt szerzője módosíthatja vagy törölheti
        if post.author_id != user_id:
            return jsonify({"error": "Nincs jogosultságod a poszt módosításához"}), 403

        if request.method == "PUT":
            # Szerkesztés
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs JSON adat"}), 400

            title = data.get("title")
            content = data.get("content")

            if not title or not content:
                return jsonify({"error": "title és content kötelező"}), 400

            post.title = title
            post.content = content
            post.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Poszt sikeresen frissítve",
                "post": {
                    "id": post.id,
                    "title": post.title,
                    "content": post.content,
                    "group_id": post.group_id,
                    "author_id": post.author_id,
                    "created_at": post.created_at.isoformat() if post.created_at else None,
                    "updated_at": post.updated_at.isoformat() if post.updated_at else None,
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            post.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Poszt sikeresen törölve"
            }), 200

    @app.route("/posts/<int:post_id>/comments", methods=["POST", "OPTIONS"])
    def create_comment(post_id):
        if request.method == "OPTIONS":
            return "", 200

        ################### Auth check and case handling
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

        user_id = decoded["user_id"]

        
        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404

        # Támogatjuk a multipart/form-data és JSON formátumot is
        if request.content_type and 'multipart/form-data' in request.content_type:
            content = request.form.get("content")
            file = request.files.get("file")
        else:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs adat"}), 400
            content = data.get("content")
            file = None

        # Content vagy fájl kötelező
        if not content and not (file and file.filename):
            return jsonify({"error": "A komment tartalma vagy egy fájl megadása kötelező"}), 400
        
        # Ha nincs content, de van fájl, üres stringet használunk
        if not content:
            content = ""
        
        ################################################################

        new_comment = Comment(
            comment=content,
            post_id=post_id,
            author_id=user_id,
            created_at=datetime.now(timezone.utc)
        )

        db.session.add(new_comment)
        db.session.flush()  # Hogy megkapjuk az ID-t

        # Fájl kezelés
        attachment_data = None
        if file and file.filename:
            try:
                # Biztonságos fájlnév
                filename = secure_filename(file.filename)
                # Egyedi fájlnév generálása
                timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
                unique_filename = f"{timestamp}_{filename}"
                
                # Uploads mappa létrehozása ha nem létezik
                upload_dir = os.path.join(Config.UPLOAD_FOLDER, "comments")
                os.makedirs(upload_dir, exist_ok=True)
                
                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                
                # Relatív URL a fájlhoz
                file_url = f"/uploads/comments/{unique_filename}"
                
                attachment = CommentAttachment(
                    comment_id=new_comment.id,
                    filename=filename,
                    file_url=file_url,
                    mime_type=file.content_type,
                    uploaded_at=datetime.now(timezone.utc)
                )
                db.session.add(attachment)
                
                attachment_data = {
                    "id": attachment.id,
                    "filename": attachment.filename,
                    "file_url": attachment.file_url,
                    "mime_type": attachment.mime_type
                }
            except Exception as e:
                db.session.rollback()
                return jsonify({"error": f"Fájl feltöltési hiba: {str(e)}"}), 500

        db.session.commit()

        comment_response = {
            "id": new_comment.id,
            "content": new_comment.comment,
            "post_id": new_comment.post_id,
            "author_id": new_comment.author_id,
            "created_at": new_comment.created_at.isoformat(),
            "updated_at": new_comment.updated_at.isoformat() if new_comment.updated_at else None,
        }
        
        if attachment_data:
            comment_response["attachment"] = attachment_data

        return jsonify({
            "message": "Komment sikeresen létrehozva",
            "comment": comment_response
        }), 201

    @app.route("/posts/<int:post_id>/comments", methods=["GET"])
    def list_comments(post_id):
        
        
        ################# Case handling###############################xx

        post = Post.query.get(post_id)
        if not post or post.deleted_at is not None:
            return jsonify({"error": "Poszt nem található"}), 404
        
        #############################################

        comments = (
            Comment.query
            .filter_by(post_id=post_id, deleted_at=None)
            .order_by(Comment.created_at.asc())
            .all()
        )

        comments_json = []
        for c in comments:
            comment_data = {
                "id": c.id,
                "content": c.comment,
                "post_id": c.post_id,
                "author_id": c.author_id,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            # Attachment-ek hozzáadása
            attachments = CommentAttachment.query.filter_by(comment_id=c.id).all()
            if attachments:
                comment_data["attachments"] = [
                    {
                        "id": att.id,
                        "filename": att.filename,
                        "file_url": att.file_url,
                        "mime_type": att.mime_type
                    }
                    for att in attachments
                ]
            comments_json.append(comment_data)

        return jsonify({
            "post_id": post_id,
            "comments": comments_json
        }), 200

    @app.route("/comments/<int:comment_id>", methods=["PUT", "DELETE"])
    def update_or_delete_comment(comment_id):
        ################### Auth check and case handling
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

        user_id = decoded["user_id"]

        comment = Comment.query.get(comment_id)
        if not comment or comment.deleted_at is not None:
            return jsonify({"error": "Komment nem található"}), 404

        # Csak a komment szerzője módosíthatja vagy törölheti
        if comment.author_id != user_id:
            return jsonify({"error": "Nincs jogosultságod a komment módosításához"}), 403

        if request.method == "PUT":
            # Szerkesztés
            data = request.get_json()
            if not data:
                return jsonify({"error": "Nincs JSON adat"}), 400

            content = data.get("content")
            if not content:
                return jsonify({"error": "A comment content kötelező"}), 400

            comment.comment = content
            comment.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Komment sikeresen frissítve",
                "comment": {
                    "id": comment.id,
                    "content": comment.comment,
                    "post_id": comment.post_id,
                    "author_id": comment.author_id,
                    "created_at": comment.created_at.isoformat() if comment.created_at else None,
                    "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            comment.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Komment sikeresen törölve"
            }), 200
        



    @app.route("/groups/<int:group_id>/events", methods=["GET"])
    def list_events(group_id):
        # 1. Autentikáció és Jogosultság Ellenőrzés
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        # Csoport létezik-e és tag-e a felhasználó? (Csak tagok láthatják az eseményeket)
        group = Group.query.get(group_id)
        if not group: return jsonify({"error": "Csoport nem található"}), 404
        
        membership = GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()
        if not membership: return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

        # 2. Események lekérése szűréssel (opcionális: start/end dátum)
        # Bár az Event modelled event_date-et használ, a naptár frontendek (pl. FullCalendar) 
        # gyakran küldenek start és end paramétert a nézethez.
        
        # event_date az event_date_re szűrés
        
        events = (
            Event.query
            .filter_by(group_id=group_id, deleted_at=None)
            .order_by(Event.event_date.asc())
            .all()
        )

        events_json = [
            {
                "id": e.id,
                "title": e.title,
                "description": e.description,
                # Fontos: event_date néven adjuk vissza, de ISO formátumban
                "date": e.event_date.isoformat(), 
                "location": e.location,
                "creator_id": e.creator_id,
                "group_id": e.group_id,
            } 
            for e in events
        ]

        return jsonify({"events": events_json}), 200


    @app.route("/groups/<int:group_id>/events", methods=["POST"])
    def create_event(group_id):
        # Auth ellenőrzés (ugyanaz, mint fent)
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        group = Group.query.get(group_id)
        if not group: return jsonify({"error": "Csoport nem található"}), 404
        membership = GroupMember.query.filter_by(user_id=user_id, group_id=group_id).first()
        if not membership: return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403
        
        data = request.get_json()
        if not data: return jsonify({"error": "Nincs JSON adat"}), 400

        title = data.get("title")
        date_str = data.get("date") # Itt a frontend valószínűleg "date" vagy "event_date"-t küld
        content = data.get("description")

        if not title or not date_str:
            return jsonify({"error": "title és date kötelező"}), 400

        try:
            # A datetime-ot a timezone-nal együtt kell kezelni
            # datetime.fromisoformat nem kezeli a 'Z' végű UTC dátumokat, 
            # ezért a .replace('Z', '+00:00') trükköt használjuk, ha szükséges.
            event_dt = datetime.fromisoformat(date_str.replace('Z', '+00:00')).astimezone(timezone.utc)
        except ValueError:
            return jsonify({"error": "Hibás dátum formátum. Használd az ISO 8601 formátumot."}), 400
        
        
        new_event = Event(
            title=title,
            description=content,
            event_date=event_dt,
            location=data.get("location"),
            group_id=group_id,
            creator_id=user_id, # Az aktuális user az event létrehozója
            created_at=datetime.now(timezone.utc),
        )

        db.session.add(new_event)
        db.session.commit()

        return jsonify({
            "message": "Esemény sikeresen létrehozva",
            "event": {
                "id": new_event.id,
                "title": new_event.title,
                "date": new_event.event_date.isoformat(),
                "creator_id": new_event.creator_id,
            }
        }), 201

    @app.route("/events/<int:event_id>", methods=["PUT", "DELETE"])
    def update_or_delete_event(event_id):
        # Auth ellenőrzés
        auth_header = request.headers.get("Authorization")
        if not auth_header: return jsonify({"error": "Hiányzó token"}), 401
        try:
            token = auth_header.split(" ")[1]
            decoded = verify_jwt_token(token)
        except: return jsonify({"error": "Hibás token"}), 401
        if not decoded: return jsonify({"error": "Érvénytelen vagy lejárt token"}), 401
        user_id = decoded["user_id"]

        event = Event.query.get(event_id)
        if not event or event.deleted_at is not None:
            return jsonify({"error": "Esemény nem található"}), 404

        # Csak az esemény létrehozója módosíthatja
        if event.creator_id != user_id:
            return jsonify({"error": "Nincs jogosultságod az esemény módosításához"}), 403

        if request.method == "PUT":
            data = request.get_json()
            if not data: return jsonify({"error": "Nincs JSON adat"}), 400

            # Frissítési logika
            if "title" in data:
                event.title = data["title"]
            if "description" in data:
                event.description = data["description"]
            if "location" in data:
                event.location = data["location"]
            if "date" in data:
                try:
                    event_dt = datetime.fromisoformat(data["date"].replace('Z', '+00:00')).astimezone(timezone.utc)
                    event.event_date = event_dt
                except ValueError:
                    return jsonify({"error": "Hibás dátum formátum"}), 400

            event.updated_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({
                "message": "Esemény sikeresen frissítve",
                "event": {
                    "id": event.id,
                    "title": event.title,
                    "date": event.event_date.isoformat(),
                }
            }), 200

        elif request.method == "DELETE":
            # Soft delete
            event.deleted_at = datetime.now(timezone.utc)
            db.session.commit()

            return jsonify({"message": "Esemény sikeresen törölve"}), 200

    @app.route("/groups/unread-counts", methods=["GET"])
    def get_unread_post_counts():
        """Visszaadja az olvasatlan posztok számát csoportonként"""
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
        
        unread_counts = {}
        
        for membership in memberships:
            group_id = membership.group_id
            
            # A csoport összes posztja (nem törölt, és a user csatlakozása után készült)
            # KIZÁRJUK azokat a posztokat, amelyeket a felhasználó írt (author_id == user_id)
            all_posts = (
                Post.query
                .filter_by(group_id=group_id, deleted_at=None)
                .filter(Post.created_at >= membership.joined_at)
                .filter(Post.author_id != user_id)  # A saját posztjai ne számolódjanak
                .all()
            )
            
            # A user által már megtekintett posztok
            viewed_post_ids = {
                pv.post_id for pv in PostView.query.filter_by(user_id=user_id).all()
            }
            
            # Olvasatlan posztok száma (amit még nem látott)
            unread_count = sum(1 for post in all_posts if post.id not in viewed_post_ids)
            
            unread_counts[group_id] = unread_count
        
        return jsonify({"unread_counts": unread_counts}), 200

    @app.route("/groups/<int:group_id>/mark-posts-read", methods=["POST"])
    def mark_group_posts_read(group_id):
        """Jelöli meg a csoport összes posztját olvasottnak a felhasználó számára"""
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

        # Ellenőrizzük, hogy a user tagja-e a csoportnak
        membership = GroupMember.query.filter_by(
            user_id=user_id, group_id=group_id
        ).first()
        if not membership:
            return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

        # A csoport összes posztja (nem törölt)
        posts = Post.query.filter_by(group_id=group_id, deleted_at=None).all()
        
        # Már megtekintett posztok ID-i
        existing_views = PostView.query.filter_by(user_id=user_id).all()
        viewed_post_ids = {pv.post_id for pv in existing_views}
        
        # Új PostView rekordok létrehozása azokhoz a posztokhoz, amiket még nem látott
        new_views = []
        for post in posts:
            if post.id not in viewed_post_ids:
                post_view = PostView(
                    user_id=user_id,
                    post_id=post.id,
                    viewed_at=datetime.now(timezone.utc)
                )
                new_views.append(post_view)
        
        if new_views:
            db.session.add_all(new_views)
            db.session.commit()
        
        return jsonify({
            "message": "Posztok sikeresen olvasottnak jelölve",
            "marked_count": len(new_views)
        }), 200
        
    @app.route("/posts/<int:post_id>/attachments", methods=["POST"])
    def upload_post_attachment(post_id):
        # AUTH
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        token = auth_header.split(" ")[1]
        decoded = verify_jwt_token(token)
        if not decoded:
            return jsonify({"error": "Érvénytelen token"}), 401

        user_id = decoded["user_id"]

        post = Post.query.get(post_id)
        if not post or post.deleted_at:
            return jsonify({"error": "Poszt nem található"}), 404

        if post.author_id != user_id:
            return jsonify({"error": "Csak a poszt szerzője tölthet fel fájlt"}), 403

        # FILE CHECK
        if "file" not in request.files:
            return jsonify({"error": "Nincs fájl csatolva"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Üres fájlnév"}), 400

        filename = secure_filename(file.filename)
        # Egyedi fájlnév generálása (ugyanaz mint a create_post-ban)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"

        # Uploads mappa létrehozása ha nem létezik
        upload_dir = os.path.join(Config.UPLOAD_FOLDER, "posts")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)

        file_url = f"/uploads/posts/{unique_filename}"

        attachment = PostAttachment(
            post_id=post_id,
            filename=filename,
            file_url=file_url,
            mime_type=file.mimetype
        )

        db.session.add(attachment)
        db.session.commit()

        return jsonify({
            "message": "Fájl sikeresen feltöltve",
            "attachment": {
                "id": attachment.id,
                "filename": attachment.filename,
                "url": attachment.file_url
            }
        }), 201

    @app.route("/comments/<int:comment_id>/attachments", methods=["POST"])
    def upload_comment_attachment(comment_id):
        # AUTH
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        token = auth_header.split(" ")[1]
        decoded = verify_jwt_token(token)
        if not decoded:
            return jsonify({"error": "Érvénytelen token"}), 401

        user_id = decoded["user_id"]

        comment = Comment.query.get(comment_id)
        if not comment or comment.deleted_at:
            return jsonify({"error": "Komment nem található"}), 404

        if comment.author_id != user_id:
            return jsonify({"error": "Csak a komment szerzője tölthet fel fájlt"}), 403

        # FILE CHECK
        if "file" not in request.files:
            return jsonify({"error": "Nincs fájl csatolva"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Üres fájlnév"}), 400

        filename = secure_filename(file.filename)
        # Egyedi fájlnév generálása
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{timestamp}_{filename}"

        # Uploads mappa létrehozása ha nem létezik
        upload_dir = os.path.join(Config.UPLOAD_FOLDER, "comments")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)

        file_url = f"/uploads/comments/{unique_filename}"

        attachment = CommentAttachment(
            comment_id=comment_id,
            filename=filename,
            file_url=file_url,
            mime_type=file.content_type,
            uploaded_at=datetime.now(timezone.utc)
        )

        db.session.add(attachment)
        db.session.commit()

        return jsonify({
            "message": "Fájl sikeresen feltöltve",
            "attachment": {
                "id": attachment.id,
                "filename": attachment.filename,
                "file_url": attachment.file_url,
                "mime_type": attachment.mime_type
            }
        }), 201

    @app.route("/attachments/<int:attachment_id>", methods=["DELETE"])
    def delete_post_attachment(attachment_id):
        # AUTH
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"error": "Hiányzó token"}), 401

        token = auth_header.split(" ")[1]
        decoded = verify_jwt_token(token)
        if not decoded:
            return jsonify({"error": "Érvénytelen token"}), 401

        user_id = decoded["user_id"]

        attachment = PostAttachment.query.get(attachment_id)
        if not attachment:
            # Próbáljuk meg CommentAttachment-ként
            attachment = CommentAttachment.query.get(attachment_id)
            if not attachment:
                return jsonify({"error": "Fájl nem található"}), 404
            
            # Komment attachment ellenőrzés
            comment = Comment.query.get(attachment.comment_id)
            if not comment or comment.deleted_at:
                return jsonify({"error": "Komment nem található"}), 404
            
            if comment.author_id != user_id:
                return jsonify({"error": "Csak a komment szerzője törölheti a fájlt"}), 403
            
            # Fájl törlése a fájlrendszerből
            try:
                # file_url formátum: /uploads/comments/filename vagy /uploads/posts/filename
                file_url_clean = attachment.file_url.lstrip("/")
                file_path = os.path.join(Config.UPLOAD_FOLDER, file_url_clean.replace("uploads/", ""))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Fájl törlési hiba: {e}")
            
            db.session.delete(attachment)
            db.session.commit()
            
            return jsonify({"message": "Fájl sikeresen törölve"}), 200

        # Poszt attachment ellenőrzés
        post = Post.query.get(attachment.post_id)
        if not post or post.deleted_at:
            return jsonify({"error": "Poszt nem található"}), 404

        if post.author_id != user_id:
            return jsonify({"error": "Csak a poszt szerzője törölheti a fájlt"}), 403

        # Fájl törlése a fájlrendszerből
        try:
            # file_url formátum: /uploads/posts/filename
            file_url_clean = attachment.file_url.lstrip("/")
            file_path = os.path.join(Config.UPLOAD_FOLDER, file_url_clean.replace("uploads/", ""))
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"Fájl törlési hiba: {e}")

        db.session.delete(attachment)
        db.session.commit()

        return jsonify({"message": "Fájl sikeresen törölve"}), 200

