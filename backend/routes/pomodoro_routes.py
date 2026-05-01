from flask import Blueprint, request, jsonify
from datetime import datetime, timezone, timedelta
from models import db, PomodoroSession, PomodoroSessionParticipant, UserPomodoroSettings, GroupMember, Group
from services.auth_service import verify_jwt_token
from services.gamification_service import award_xp

# WebSocket functionality (optional)
try:
    from flask_socketio import emit, join_room, leave_room, Namespace
    SOCKETIO_AVAILABLE = True
except ImportError:
    print("WARNING: Flask-SocketIO not available, WebSocket features disabled")
    emit = None
    join_room = None
    leave_room = None
    Namespace = object  # dummy class
    SOCKETIO_AVAILABLE = False

# WebSocket functions
def get_socketio():
    """Get SocketIO instance from app"""
    if not SOCKETIO_AVAILABLE:
        return None
    from flask import current_app
    return getattr(current_app, 'socketio', None)

def emit_to_session(session_id, event, data):
    """Broadcast an event to all users in a session room"""
    if not SOCKETIO_AVAILABLE:
        return
    socketio = get_socketio()
    if socketio:
        socketio.emit(event, data, room=f"pomodoro_session_{session_id}", namespace="/pomodoro")

# WebSocket Namespace: /pomodoro (csak ha elérhető)
if SOCKETIO_AVAILABLE:
    class PomodoroNamespace(Namespace):
        def on_connect(self):
            print(f"Client connected: {request.sid}")
            emit("connect_response", {"data": "Csatlakozva a Pomodoro WebSocket-hez"})

        def on_disconnect(self):
            print(f"Client disconnected: {request.sid}")

        def on_join_session(self, data):
            """
            Felhasználó csatlakozik egy pomodoro sessionhez
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Session és participant ellenőrzés
            session = PomodoroSession.query.get(session_id)
            if not session:
                emit("error", {"message": "Session nem található"})
                return

            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            # Join room
            room = f"pomodoro_session_{session_id}"
            join_room(room)
            
            # Notify others
            emit("user_joined", {
                "user_id": user_id,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room, include_self=False)

            emit("join_response", {
                "message": "Sikeresen csatlakozva",
                "session_id": session_id,
                "user_id": user_id
            })

        def on_update_task(self, data):
            """
            Felhasználó frissíti a taskjét
            data: { token, session_id, task_text }
            """
            token = data.get("token")
            session_id = data.get("session_id")
            task_text = data.get("task_text", "").strip()

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Participant frissítés
            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            participant.task_text = task_text
            db.session.commit()

            # Broadcast az összes felhasználónak
            room = f"pomodoro_session_{session_id}"
            emit("task_updated", {
                "user_id": user_id,
                "task_text": task_text,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room)

        def on_leave_session(self, data):
            """
            Felhasználó hagyja el a sessiont
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Participant frissítés
            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            if participant.left_at is None:
                participant.left_at = datetime.now(timezone.utc)
                db.session.commit()

            # Leave room
            room = f"pomodoro_session_{session_id}"
            leave_room(room)

            # Notify others
            emit("user_left", {
                "user_id": user_id,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room, include_self=False)

            emit("leave_response", {
                "message": "Sikeresen kiléptél",
                "session_id": session_id
            })

        def on_session_finished(self, data):
            """
            Session véget ért
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            session = PomodoroSession.query.get(session_id)
            if not session:
                emit("error", {"message": "Session nem található"})
                return

            # Csak a host fejezheti be
            if session.host_user_id != user_id:
                emit("error", {"message": "Csak a session host fejezheti be"})
                return

            if session.end_time is None:
                session.end_time = datetime.now(timezone.utc)
                db.session.commit()

            # Notify all users
            room = f"pomodoro_session_{session_id}"
            emit("session_finished", {
                "session_id": session_id,
                "end_time": session.end_time.isoformat(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room)
else:
    PomodoroNamespace = None

def register_socketio(socketio):
    """Register WebSocket namespace with the SocketIO instance"""
    if SOCKETIO_AVAILABLE and PomodoroNamespace:
        socketio.on_namespace(PomodoroNamespace("/pomodoro"))
    else:
        print("WebSocket namespace registration skipped - SocketIO not available")

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
    invite_deadline = None
    if group_id:
        invite_deadline = datetime.utcnow() + timedelta(seconds=60)

    session = PomodoroSession(
        mode=mode,
        start_time=datetime.now(timezone.utc),
        cycle_count=0,
        host_user_id=user_id,
        group_id=group_id if group_id else None,
        invite_deadline=invite_deadline,
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
            joined_at=datetime.now(timezone.utc),
            invite_status="accepted" if uid == user_id else "pending",
        )
        db.session.add(participant)

    db.session.commit()

    # Award XP for starting a pomodoro session
    award_xp(user_id, 'start_pomodoro')

    return jsonify(
        {
            "message": "Pomodoro session elindítva",
            "session_id": session.id,
            "mode": session.mode,
            "participants": participants,
            "tasks": tasks,
            "invite_deadline": session.invite_deadline.isoformat() + "Z"
            if session.invite_deadline
            else None,
            "settings_used": {
                "focus": settings.focus_minutes,
                "short_break": settings.short_break_minutes,
                "long_break": settings.long_break_minutes,
                "cycles_before_long_break": settings.cycles_before_long_break,
                "auto_start_breaks": settings.auto_start_breaks,
                "auto_start_focus": settings.auto_start_focus,
            },
        },
    ), 201

    # 6) invite_received WS emit a meghívottaknak
    if group_id and invite_deadline:
        socketio_instance = get_socketio()
        if socketio_instance:
            grp = Group.query.get(group_id)
            for uid in participants:
                if uid != user_id:
                    socketio_instance.emit(
                        "invite_received",
                        {
                            "session_id": session.id,
                            "group_name": grp.name if grp else None,
                            "host_user_id": user_id,
                            "seconds_left": 60,
                            "invite_deadline": invite_deadline.isoformat() + "Z",
                        },
                        room=f"user_{uid}",
                        namespace="/pomodoro",
                    )

    return jsonify({
        "message": "Pomodoro session elindítva",
        "session_id": session.id,
        "mode": session.mode,
        "participants": participants,
        "tasks": tasks,
        "invite_deadline": (invite_deadline.isoformat() + "Z") if invite_deadline else None,
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
        "invite_deadline": (session.invite_deadline.isoformat() + "Z") if session.invite_deadline else None,
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

    emit_to_session(session_id, "user_left", {
        "user_id": user_id,
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # 5) Opcionális: ha mindenki kilépett → session lezárása
    active_participants = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        left_at=None
    ).count()

    if active_participants == 0:
        session.end_time = datetime.utcnow()
        db.session.commit()

        emit_to_session(session_id, "session_finished", {
            "session_id": session_id,
            "end_time": session.end_time.isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

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

    emit_to_session(session_id, "session_finished", {
        "session_id": session_id,
        "end_time": session.end_time.isoformat(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "message": "Session sikeresen befejezve",
        "session_id": session.id,
        "mode": session.mode,
        "start_time": session.start_time.isoformat(),
        "end_time": session.end_time.isoformat(),
        "host_user_id": session.host_user_id
    }), 200


@pomodoro_bp.route("/pomodoro/pending-invites", methods=["GET"])
def get_pending_invites():
    user_id, err, code = get_user_id()
    if err:
        return err, code

    now = datetime.utcnow()
    pending = PomodoroSessionParticipant.query.filter_by(
        user_id=user_id, invite_status="pending"
    ).join(PomodoroSession).filter(
        PomodoroSession.end_time == None,
        PomodoroSession.invite_deadline > now
    ).all()

    invites = []
    for p in pending:
        grp = Group.query.get(p.session.group_id) if p.session.group_id else None
        invites.append({
            "session_id": p.session_id,
            "group_name": grp.name if grp else None,
            "seconds_left": max(0, int(
                (p.session.invite_deadline - datetime.utcnow()).total_seconds()
            )),
            "host_user_id": p.session.host_user_id,
        })

    return jsonify({"invites": invites}), 200


@pomodoro_bp.route("/pomodoro/session/<int:session_id>/invite/accept", methods=["POST"])
def accept_invite(session_id):
    user_id, err, code = get_user_id()
    if err:
        return err, code

    active = (
        PomodoroSessionParticipant.query
        .filter_by(user_id=user_id, left_at=None)
        .join(PomodoroSession, PomodoroSession.id == PomodoroSessionParticipant.session_id)
        .filter(PomodoroSession.end_time == None, PomodoroSession.id != session_id)
        .first()
    )
    if active:
        return jsonify({"error": "Már van aktív sessioned.", "code": "ALREADY_IN_SESSION"}), 400

    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id, user_id=user_id, invite_status="pending"
    ).first()
    if not participant:
        return jsonify({"error": "Érvénytelen meghívó"}), 404

    session = PomodoroSession.query.get(session_id)
    if not session or session.end_time:
        return jsonify({"error": "A session már lezárult"}), 410
    if session.invite_deadline and session.invite_deadline < datetime.utcnow():
        return jsonify({"error": "A meghívó lejárt"}), 410

    participant.invite_status = "accepted"
    db.session.commit()

    emit_to_session(session_id, "user_joined", {
        "user_id": user_id,
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({"message": "Meghívó elfogadva", "session_id": session_id}), 200


@pomodoro_bp.route("/pomodoro/session/<int:session_id>/invite/decline", methods=["POST"])
def decline_invite(session_id):
    user_id, err, code = get_user_id()
    if err:
        return err, code

    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id, user_id=user_id
    ).first()
    if participant:
        participant.invite_status = "declined"
        db.session.commit()

    return jsonify({"message": "Meghívó elutasítva"}), 200


# ============================================
# WebSocket Events (Flask-SocketIO)
# ============================================

def get_socketio():
    """Get SocketIO instance from app"""
    if not SOCKETIO_AVAILABLE:
        return None
    from flask import current_app
    return getattr(current_app, 'socketio', None)

def emit_to_session(session_id, event, data):
    """Broadcast an event to all users in a session room"""
    if not SOCKETIO_AVAILABLE:
        return
    socketio = get_socketio()
    if socketio:
        socketio.emit(event, data, room=f"pomodoro_session_{session_id}", namespace="/pomodoro")

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/participants", methods=["GET"])
def get_session_participants(session_id):
    """
    Get all participants in a session (for WebSocket connection)
    """
    user_id, err, code = get_user_id()
    if err:
        return err, code

    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()

    if not participant:
        return jsonify({"error": "Nem vagy résztvevője ennek a sessionnek"}), 403

    participants_data = []
    for p in session.participants:
        participants_data.append({
            "user_id": p.user_id,
            "task_text": p.task_text,
            "joined_at": p.joined_at.isoformat(),
            "left_at": p.left_at.isoformat() if p.left_at else None
        })

    return jsonify(participants_data), 200


# WebSocket Namespace: /pomodoro (csak ha elérhető)
if SOCKETIO_AVAILABLE:
    class PomodoroNamespace(Namespace):
        def on_connect(self, auth=None):
            token = (auth or {}).get('token', '')
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id") if decoded else None
            except Exception:
                user_id = None

            if user_id:
                join_room(f"user_{user_id}")

            print(f"Client connected: {request.sid} user_id={user_id}")
            emit("connect_response", {"data": "Csatlakozva a Pomodoro WebSocket-hez"})

        def on_disconnect(self):
            print(f"Client disconnected: {request.sid}")

        def on_join_session(self, data):
            """
            Felhasználó csatlakozik egy pomodoro sessionhez
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Session és participant ellenőrzés
            session = PomodoroSession.query.get(session_id)
            if not session:
                emit("error", {"message": "Session nem található"})
                return

            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            # Join room
            room = f"pomodoro_session_{session_id}"
            join_room(room)
            
            # Notify others
            emit("user_joined", {
                "user_id": user_id,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room, include_self=False)

            emit("join_response", {
                "message": "Sikeresen csatlakozva",
                "session_id": session_id,
                "user_id": user_id
            })

        def on_update_task(self, data):
            """
            Felhasználó frissíti a taskjét
            data: { token, session_id, task_text }
            """
            token = data.get("token")
            session_id = data.get("session_id")
            task_text = data.get("task_text", "").strip()

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Participant frissítés
            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            participant.task_text = task_text
            db.session.commit()

            # Broadcast az összes felhasználónak
            room = f"pomodoro_session_{session_id}"
            emit("task_updated", {
                "user_id": user_id,
                "task_text": task_text,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room)

        def on_leave_session(self, data):
            """
            Felhasználó hagyja el a sessiont
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            # Participant frissítés
            participant = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                user_id=user_id
            ).first()

            if not participant:
                emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
                return

            if participant.left_at is None:
                participant.left_at = datetime.now(timezone.utc)
                db.session.commit()

            # Leave room
            room = f"pomodoro_session_{session_id}"
            leave_room(room)

            # Notify others
            emit("user_left", {
                "user_id": user_id,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room, include_self=False)

            emit("leave_response", {
                "message": "Sikeresen kiléptél",
                "session_id": session_id
            })

        def on_session_finished(self, data):
            """
            Session véget ért
            data: { token, session_id }
            """
            token = data.get("token")
            session_id = data.get("session_id")

            if not token or not session_id:
                emit("error", {"message": "Token és session_id kötelező"})
                return

            # Token ellenőrzés
            try:
                token_clean = token.split()[1] if token.startswith("Bearer") else token
                decoded = verify_jwt_token(token_clean)
                user_id = decoded.get("user_id")
            except:
                emit("error", {"message": "Érvénytelen token"})
                return

            session = PomodoroSession.query.get(session_id)
            if not session:
                emit("error", {"message": "Session nem található"})
                return

            # Csak a host fejezheti be
            if session.host_user_id != user_id:
                emit("error", {"message": "Csak a session host fejezheti be"})
                return

            if session.end_time is None:
                session.end_time = datetime.now(timezone.utc)
                db.session.commit()

            # Notify all users
            room = f"pomodoro_session_{session_id}"
            emit("session_finished", {
                "session_id": session_id,
                "end_time": session.end_time.isoformat(),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }, room=room)
else:
    PomodoroNamespace = None
    def on_connect(self):
        print(f"Client connected: {request.sid}")
        emit("connect_response", {"data": "Csatlakozva a Pomodoro WebSocket-hez"})

    def on_disconnect(self):
        print(f"Client disconnected: {request.sid}")

    def on_join_session(self, data):
        """
        Felhasználó csatlakozik egy pomodoro sessionhez
        data: { token, session_id }
        """
        token = data.get("token")
        session_id = data.get("session_id")

        if not token or not session_id:
            emit("error", {"message": "Token és session_id kötelező"})
            return

        # Token ellenőrzés
        try:
            token_clean = token.split()[1] if token.startswith("Bearer") else token
            decoded = verify_jwt_token(token_clean)
            user_id = decoded.get("user_id")
        except:
            emit("error", {"message": "Érvénytelen token"})
            return

        # Session és participant ellenőrzés
        session = PomodoroSession.query.get(session_id)
        if not session:
            emit("error", {"message": "Session nem található"})
            return

        participant = PomodoroSessionParticipant.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()

        if not participant:
            emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
            return

        # Join room
        room = f"pomodoro_session_{session_id}"
        join_room(room)
        
        # Notify others
        emit("user_joined", {
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, room=room, include_self=False)

        emit("join_response", {
            "message": "Sikeresen csatlakozva",
            "session_id": session_id,
            "user_id": user_id
        })

    def on_update_task(self, data):
        """
        Felhasználó frissíti a taskjét
        data: { token, session_id, task_text }
        """
        token = data.get("token")
        session_id = data.get("session_id")
        task_text = data.get("task_text", "").strip()

        if not token or not session_id:
            emit("error", {"message": "Token és session_id kötelező"})
            return

        # Token ellenőrzés
        try:
            token_clean = token.split()[1] if token.startswith("Bearer") else token
            decoded = verify_jwt_token(token_clean)
            user_id = decoded.get("user_id")
        except:
            emit("error", {"message": "Érvénytelen token"})
            return

        # Participant frissítés
        participant = PomodoroSessionParticipant.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()

        if not participant:
            emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
            return

        participant.task_text = task_text
        db.session.commit()

        # Broadcast az összes felhasználónak
        room = f"pomodoro_session_{session_id}"
        emit("task_updated", {
            "user_id": user_id,
            "task_text": task_text,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, room=room)

    def on_leave_session(self, data):
        """
        Felhasználó hagyja el a sessiont
        data: { token, session_id }
        """
        token = data.get("token")
        session_id = data.get("session_id")

        if not token or not session_id:
            emit("error", {"message": "Token és session_id kötelező"})
            return

        # Token ellenőrzés
        try:
            token_clean = token.split()[1] if token.startswith("Bearer") else token
            decoded = verify_jwt_token(token_clean)
            user_id = decoded.get("user_id")
        except:
            emit("error", {"message": "Érvénytelen token"})
            return

        # Participant frissítés
        participant = PomodoroSessionParticipant.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()

        if not participant:
            emit("error", {"message": "Nem vagy résztvevője ennek a sessionnek"})
            return

        if participant.left_at is None:
            participant.left_at = datetime.now(timezone.utc)
            db.session.commit()

        # Leave room
        room = f"pomodoro_session_{session_id}"
        leave_room(room)

        # Notify others
        emit("user_left", {
            "user_id": user_id,
            "session_id": session_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, room=room, include_self=False)

        emit("leave_response", {
            "message": "Sikeresen kiléptél",
            "session_id": session_id
        })

    def on_session_finished(self, data):
        """
        Session véget ért
        data: { token, session_id }
        """
        token = data.get("token")
        session_id = data.get("session_id")

        if not token or not session_id:
            emit("error", {"message": "Token és session_id kötelező"})
            return

        # Token ellenőrzés
        try:
            token_clean = token.split()[1] if token.startswith("Bearer") else token
            decoded = verify_jwt_token(token_clean)
            user_id = decoded.get("user_id")
        except:
            emit("error", {"message": "Érvénytelen token"})
            return

        session = PomodoroSession.query.get(session_id)
        if not session:
            emit("error", {"message": "Session nem található"})
            return

        # Csak a host fejezheti be
        if session.host_user_id != user_id:
            emit("error", {"message": "Csak a session host fejezheti be"})
            return

        if session.end_time is None:
            session.end_time = datetime.now(timezone.utc)
            db.session.commit()

        # Notify all users
        room = f"pomodoro_session_{session_id}"
        emit("session_finished", {
            "session_id": session_id,
            "end_time": session.end_time.isoformat(),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, room=room)


def register_socketio(socketio):
    """Register WebSocket namespace with the SocketIO instance"""
    if SOCKETIO_AVAILABLE and PomodoroNamespace:
        socketio.on_namespace(PomodoroNamespace("/pomodoro"))
    else:
        print("WebSocket namespace registration skipped - SocketIO not available")