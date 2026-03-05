from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from extensions import db
from models import Group, GroupMember, Post, PostAttachment
from services.auth_service import verify_jwt_token
from services.file_service import save_post_files

posts_bp = Blueprint("posts", __name__)

def get_user_id():
    auth = request.headers.get("Authorization")
    if not auth:
        return None, jsonify({"error": "Hiányzó token"}), 401

    try:
        token = auth.split()[1]
    except:
        return None, jsonify({"error": "Hibás token"}), 401

    decoded = verify_jwt_token(token)
    if not decoded:
        return None, jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

    return decoded["user_id"], None, None


@posts_bp.route("/groups/<int:group_id>/posts", methods=["POST"])
def create_post(group_id):
    user_id, err, code = get_user_id()
    if err:
        return err, code

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Csoport nem található"}), 404

    membership = GroupMember.query.filter_by(
        user_id=user_id, group_id=group_id
    ).first()

    if not membership:
        return jsonify({"error": "Nem vagy tagja a csoportnak"}), 403

    if request.content_type and "multipart/form-data" in request.content_type:
        title = request.form.get("title")
        content = request.form.get("content")
        files = request.files.getlist("files")

        if not files or all(not f.filename for f in files):
            single = request.files.get("file")
            files = [single] if single and single.filename else []
    else:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Nincs adat"}), 400
        title = data.get("title")
        content = data.get("content")
        files = []

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
    db.session.flush()

    attachments = save_post_files(files)

    for a in attachments:
        att = PostAttachment(
            post_id=new_post.id,
            filename=a["filename"],
            file_url=a["file_url"],
            mime_type=""
        )
        db.session.add(att)

    db.session.commit()

    return jsonify({
        "message": "Poszt létrehozva",
        "post_id": new_post.id,
        "attachments": attachments
    }), 201
