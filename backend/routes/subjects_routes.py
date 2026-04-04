from flask import Blueprint, request, jsonify
import requests
import re
from config import Config
from services.auth_service import verify_jwt_token

subjects_bp = Blueprint("subjects", __name__)

@subjects_bp.route("/subjects/search", methods=["GET"])
def search_subjects():
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

    query = request.args.get("q", "").strip()
    year = request.args.get("year", "2025-2026-2")

    if not query:
        return jsonify([])

    try:
        resp = requests.post(
            f"{Config.TANREND_API_URL}/api",
            json={"year": year, "name": query},
            timeout=10
        )
    except Exception:
        return jsonify([]), 502

    if resp.status_code != 200:
        return jsonify([]), 502

    rows = resp.json()

    subjects_by_code = {}
    for row in rows:
        if len(row) < 3:
            continue

        raw_code = row[1].strip()
        code = raw_code.split("(")[0].strip()

        m = re.match(r"^(.*?)-(\d+)$", code)
        if m:
            code = m.group(1)

        name = row[2].strip()

        if code and name and code not in subjects_by_code:
            subjects_by_code[code] = {"code": code, "name": name}

    return jsonify(list(subjects_by_code.values())), 200
