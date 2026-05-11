from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, CardPack, FlashCard
from services.auth_service import verify_jwt_token

flashcards_bp = Blueprint("flashcards", __name__, url_prefix="/flashcards")


def get_user_id():
    """
    JWT token kiolvasása az Authorization headerből.
    Ugyanaz a logika, mint a pomodoro route-okban.
    """
    auth = request.headers.get("Authorization")
    if not auth:
        return None, jsonify({"error": "Hiányzó token"}), 401

    try:
        token = auth.split(" ")[1]
    except Exception:
        return None, jsonify({"error": "Hibás token formátum"}), 401

    decoded = verify_jwt_token(token)
    if not decoded:
        return None, jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

    return decoded["user_id"], None, None


@flashcards_bp.route("/decks", methods=["POST"])
def create_deck():
    """
    Új flashcard pakli létrehozása az aktuális userhez.
    Body (JSON):
      - name: str (kötelező)
      - subject: str (kötelező)
      - description: str (opcionális)
      - color: str (opcionális, pl. "#3b82f6")
    """
    user_id, err, code = get_user_id()
    if err:
        return err, code

    data = request.get_json() or {}

    name = (data.get("name") or "").strip()
    subject = (data.get("subject") or "").strip()
    description = (data.get("description") or None)
    color = (data.get("color") or None)

    if not name:
        return jsonify({"error": "A pakli neve kötelező."}), 400

    if not subject:
        return jsonify({"error": "A tantárgy kötelező."}), 400

    new_pack = CardPack(
        user_id=user_id,
        name=name,
        subject=subject,
        description=description,
        color=color,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.session.add(new_pack)
    db.session.commit()

    response = {
        "id": new_pack.id,
        "name": new_pack.name,
        "subject": new_pack.subject,
        "description": new_pack.description,
        "color": new_pack.color,
        "cardCount": 0,
        "created_at": new_pack.created_at.isoformat() + "Z",
    }

    return jsonify(response), 201


@flashcards_bp.route("/decks", methods=["GET"])
def list_decks():
    """
    Aktuális user összes paklija, kártyaszámmal.
    """
    user_id, err, code = get_user_id()
    if err:
        return err, code

    packs = (
        CardPack.query
        .filter_by(user_id=user_id)
        .order_by(CardPack.created_at.desc())
        .all()
    )

    # cardCount: egyszerű count a kapcsolt FlashCardokból
    decks = []
    for pack in packs:
        card_count = (
            FlashCard.query.filter_by(pack_id=pack.id).count()
        )

        decks.append(
            {
                "id": pack.id,
                "name": pack.name,
                "subject": pack.subject,
                "description": pack.description,
                "color": pack.color,
                "cardCount": card_count,
                "created_at": pack.created_at.isoformat() + "Z",
            }
        )

    return jsonify(decks), 200