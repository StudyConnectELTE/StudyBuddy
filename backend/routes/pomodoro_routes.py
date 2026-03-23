from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from models import db, PomodoroSession, PomodoroSessionParticipant, UserPomodoroSettings, GroupMember
from services.auth_service import verify_jwt_token

pomodoro_bp = Blueprint("pomodoro", __name__)

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


@pomodoro_bp.route("/pomodoro/start", methods=["POST"])
def start_pomodoro(): 
    user_id, err, code = get_user_id()
    if err:
        return err, code

    data = request.get_json() or {}

    mode = data.get("mode", "FOCUS")  # FOCUS / SHORT_BREAK / LONG_BREAK
    group_id = data.get("group_id")   # opcionális
    tasks = data.get("tasks", [])     # lista: ["task1", "task2", ...]

    # 1) Ellenőrzés: van-e aktív session?
    active = (
        PomodoroSessionParticipant.query
        .filter_by(user_id=user_id, left_at=None)
        .join(PomodoroSession, PomodoroSession.id == PomodoroSessionParticipant.session_id)
        .filter(PomodoroSession.end_time == None)
        .first()
    )

    if active:
        return jsonify({"error": "Már van aktív Pomodoro sessioned!"}), 400

    # 2) User beállítások betöltése
    settings = UserPomodoroSettings.query.filter_by(user_id=user_id).first()

    if not settings:
        # ha nincs, létrehozunk defaultot
        settings = UserPomodoroSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()

    # 3) Ha group_id van → csoportos mód
    participants = [user_id]

    if group_id:
        group_members = GroupMember.query.filter_by(group_id=group_id).all()
        participants = [m.user_id for m in group_members]

    # 4) PomodoroSession létrehozása
    session = PomodoroSession(
        mode=mode,
        start_time=datetime.now(timezone.utc),
        cycle_count=0,
        host_user_id=user_id,
    )

    db.session.add(session)
    db.session.flush()  # session.id elérhető

    # 5) Résztvevők hozzáadása
    for uid in participants:
        task_text = None
        if isinstance(tasks, list) and len(tasks) > 0:
            # ha a frontend minden userhez külön taskot küldene, itt lehetne kezelni
            task_text = ", ".join(tasks)

        participant = PomodoroSessionParticipant(
            session_id=session.id,
            user_id=uid,
            task_text=task_text,
            joined_at=datetime.now(timezone.utc)
        )
        db.session.add(participant)

    db.session.commit()

    return jsonify({
        "message": "Pomodoro session elindítva",
        "session_id": session.id,
        "mode": session.mode,
        "participants": participants,
        "tasks": tasks,
        "settings_used": {
            "focus": settings.focus_minutes,
            "short_break": settings.short_break_minutes,
            "long_break": settings.long_break_minutes,
            "cycles_before_long_break": settings.cycles_before_long_break,
            "auto_start_breaks": settings.auto_start_breaks,
            "auto_start_focus": settings.auto_start_focus,
        }
    }), 201

@pomodoro_bp.route("/pomodoro/session/<int:session_id>", methods=["GET"])
def get_pomodoro_session(session_id):
    """
    Visszaadja:
    - session metaadatok
    - aktuális mode
    - start_time, end_time
    - résztvevők listája
    - task_text értékek
    """

    user_id, err, code = get_user_id()
    if err:
        return err, code

    # 1) Session lekérése
    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    # 2) Ellenőrzés: a user résztvevő-e
    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()

    if not participant:
        return jsonify({"error": "Nem vagy résztvevője ennek a sessionnek"}), 403

    # 3) Résztvevők összegyűjtése
    participants_data = []
    for p in session.participants:
        participants_data.append({
            "user_id": p.user_id,
            "task_text": p.task_text,
            "joined_at": p.joined_at.isoformat(),
            "left_at": p.left_at.isoformat() if p.left_at else None
        })

    # 4) Session metaadatok összeállítása
    response = {
        "session_id": session.id,
        "mode": session.mode,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat() if session.end_time else None,
        "cycle_count": session.cycle_count,
        "host_user_id": session.host_user_id,
        "participants": participants_data,
        "updated_at": session.updated_at.isoformat(),
    }

    return jsonify(response), 200

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/task", methods=["PATCH"])
def update_pomodoro_task(session_id):
    """
    A user módosíthatja vagy létrehozhatja a saját task_text mezőjét
    az aktuális sessionben.
    """

    user_id, err, code = get_user_id()
    if err:
        return err, code

    data = request.get_json() or {}
    new_task = data.get("task_text", "").strip()

    if not new_task:
        return jsonify({"error": "task_text mező kötelező"}), 400

    # 1) Session lekérése
    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    # 2) Ellenőrzés: a user résztvevő-e
    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()

    if not participant:
        return jsonify({"error": "Nem vagy résztvevője ennek a sessionnek"}), 403

    # 3) Ellenőrzés: a session aktív-e
    if session.end_time is not None:
        return jsonify({"error": "A session már befejeződött"}), 400

    # 4) Task módosítása / létrehozása
    participant.task_text = new_task
    
    db.session.commit()

    return jsonify({
        "message": "Task frissítve",
        "session_id": session_id,
        "user_id": user_id,
        "task_text": new_task
    }), 200

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/leave", methods=["POST"])
def leave_pomodoro_session(session_id):
    """
    A user kilép a sessionből:
    - left_at kitöltése
    - opcionálisan session lezárása, ha mindenki kilépett
    """

    user_id, err, code = get_user_id()
    if err:
        return err, code

    # 1) Session lekérése
    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    # 2) Résztvevő lekérése
    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()

    if not participant:
        return jsonify({"error": "Nem vagy résztvevője ennek a sessionnek"}), 403

    # 3) Ha már kilépett
    if participant.left_at is not None:
        return jsonify({"message": "Már korábban kiléptél"}), 200

    # 4) Kilépés rögzítése
    participant.left_at = datetime.utcnow()
    db.session.commit()

    # 5) Opcionális: ha mindenki kilépett → session lezárása
    active_participants = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        left_at=None
    ).count()

    if active_participants == 0:
        session.end_time = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "message": "Kiléptél a sessionből. Mivel mindenki kilépett, a session lezárult.",
            "session_id": session_id
        }), 200

    return jsonify({
        "message": "Kiléptél a sessionből.",
        "session_id": session_id
    }), 200

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/finish", methods=["POST"])
def finish_pomodoro_session(session_id):
    """
    Session befejezése:
    - csak a host fejezheti be
    - end_time kitöltése
    - updated_at automatikusan frissül
    """

    user_id, err, code = get_user_id()
    if err:
        return err, code

    # 1) Session lekérése
    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    # 2) Csak a host fejezheti be
    if session.host_user_id != user_id:
        return jsonify({"error": "Csak a session host fejezheti be a sessiont"}), 403

    # 3) Ha már befejezett
    if session.end_time is not None:
        return jsonify({"message": "A session már korábban befejeződött"}), 200

    # 4) Session lezárása
    session.end_time = datetime.utcnow()
    db.session.commit()

    return jsonify({
        "message": "Session sikeresen befejezve",
        "session_id": session.id,
        "mode": session.mode,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat(),
        "host_user_id": session.host_user_id
    }), 200
