from flask import Blueprint, request, jsonify
from datetime import datetime, timezone, timedelta
from models import db, PomodoroSession, PomodoroSessionParticipant, UserPomodoroSettings, GroupMember, Group
from services.auth_service import verify_jwt_token
from services.gamification_service import award_xp
import calendar

# -------------------------------------------------------------------
# Statistic Helpers
# -------------------------------------------------------------------

def _to_naive_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def _month_range_utc(year: int, month: int):
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end

def _safe_iso(dt):
    if not dt:
        return None
    return _to_naive_utc(dt).isoformat() + "Z"

def _format_month_label_hu(year: int, month: int):
    hu_months = [
        "január", "február", "március", "április", "május", "június",
        "július", "augusztus", "szeptember", "október", "november", "december"
    ]
    return f"{year}. {hu_months[month - 1]}"

def _get_focus_minutes(session: PomodoroSession):
    start = _to_naive_utc(session.start_time)
    end = _to_naive_utc(session.end_time) or datetime.utcnow()
    if not start or end <= start:
        return 0
    return max(0, int((end - start).total_seconds() // 60))

def _get_user_id():
    auth = request.headers.get("Authorization")
    if not auth:
        return None, jsonify({"error": "Hiányzó token"}), 401

    try:
        token = auth.split()[1]
    except Exception:
        return None, jsonify({"error": "Hibás token"}), 401

    decoded = verify_jwt_token(token)
    if not decoded:
        return None, jsonify({"error": "Érvénytelen vagy lejárt token"}), 401

    return decoded["user_id"], None, None

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

            active_participants = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                left_at=None,
                invite_status="accepted"
            ).count()

            if active_participants == 0:
                session = PomodoroSession.query.get(session_id)
                if session and session.end_time is None:
                    session.end_time = datetime.now(timezone.utc)
                    db.session.commit()

                    emit("session_finished", {
                        "session_id": session_id,
                        "end_time": session.end_time.isoformat(),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, room=room)

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
                now = datetime.now(timezone.utc)
                session.end_time = now

                participants = PomodoroSessionParticipant.query.filter_by(
                    session_id=session_id
                ).all()

                for p in participants:
                    if p.left_at is None:
                        p.left_at = now

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
    except Exception:
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

    mode = data.get("mode", "FOCUS")
    group_id = data.get("group_id")
    tasks = data.get("tasks", [])

    active = (
        PomodoroSessionParticipant.query
        .filter_by(user_id=user_id, left_at=None, invite_status="accepted")
        .join(
            PomodoroSession,
            PomodoroSession.id == PomodoroSessionParticipant.session_id
        )
        .filter(PomodoroSession.end_time.is_(None))
        .first()
    )

    if active:
        return jsonify({"error": "Már van aktív Pomodoro sessioned!"}), 400

    settings = UserPomodoroSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserPomodoroSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()

    participants = [user_id]

    if group_id:
        group_members = GroupMember.query.filter_by(group_id=group_id).all()
        participants = [m.user_id for m in group_members]

        if user_id not in participants:
            participants.append(user_id)

    invite_deadline = None
    if group_id:
        invite_deadline = datetime.utcnow() + timedelta(seconds=60)

    session = PomodoroSession(
        mode=mode,
        start_time=datetime.utcnow(),
        cycle_count=0,
        host_user_id=user_id,
        group_id=group_id if group_id else None,
        invite_deadline=invite_deadline,
    )

    db.session.add(session)
    db.session.flush()

    for uid in participants:
        task_text = ", ".join(tasks) if isinstance(tasks, list) and tasks else None

        participant = PomodoroSessionParticipant(
            session_id=session.id,
            user_id=uid,
            task_text=task_text,
            joined_at=datetime.utcnow(),
            invite_status="accepted" if uid == user_id else "pending",
        )
        db.session.add(participant)

    db.session.commit()

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

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/cycle", methods=["PATCH"])
def update_pomodoro_cycle(session_id):
    user_id, err, code = get_user_id()
    if err:
        return err, code

    data = request.get_json() or {}
    cycle_count = data.get("cycle_count")

    if not isinstance(cycle_count, int) or cycle_count < 0:
        return jsonify({"error": "Érvényes cycle_count kötelező"}), 400

    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    participant = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()

    if not participant:
        return jsonify({"error": "Nem vagy résztvevője ennek a sessionnek"}), 403

    if session.end_time is not None:
        return jsonify({"error": "A session már befejeződött"}), 400

    session.cycle_count = cycle_count
    db.session.commit()

    emit_to_session(session_id, "cycle_updated", {
        "session_id": session_id,
        "cycle_count": session.cycle_count,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return jsonify({
        "message": "Cycle count frissítve",
        "session_id": session_id,
        "cycle_count": session.cycle_count,
    }), 200

@pomodoro_bp.route("/pomodoro/session/<int:session_id>/leave", methods=["POST"])
def leave_pomodoro_session(session_id):
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

    if participant.left_at is not None:
        return jsonify({"message": "Már korábban kiléptél"}), 200

    participant.left_at = datetime.utcnow()
    db.session.commit()

    emit_to_session(session_id, "user_left", {
        "user_id": user_id,
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    active_participants = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id,
        left_at=None,
        invite_status="accepted"
    ).count()

    if active_participants == 0 and session.end_time is None:
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
    user_id, err, code = get_user_id()
    if err:
        return err, code

    session = PomodoroSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session nem található"}), 404

    if session.host_user_id != user_id:
        return jsonify({"error": "Csak a session host fejezheti be a sessiont"}), 403

    if session.end_time is not None:
        return jsonify({"message": "A session már korábban befejeződött"}), 200

    now = datetime.utcnow()
    session.end_time = now

    participants = PomodoroSessionParticipant.query.filter_by(
        session_id=session_id
    ).all()

    for p in participants:
        if p.left_at is None:
            p.left_at = now

    db.session.commit()

    accepted_participants = [p for p in participants if p.invite_status == "accepted"]
    for p in accepted_participants:
        award_xp(p.user_id, "complete_pomodoro")

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


@pomodoro_bp.route("/pomodoro/log-focus", methods=["POST"])
def log_focus_complete():
    """Awards XP for completing a focus phase (works for both solo and group sessions)."""
    user_id, err, code = get_user_id()
    if err:
        return err, code
    award_xp(user_id, 'complete_pomodoro')
    return jsonify({"message": "Focus session logged", "xp_awarded": 10}), 200


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

@pomodoro_bp.route("/pomodoro/stats", methods=["GET"])
def get_pomodoro_stats():
    user_id, err, code = _get_user_id()
    if err:
        return err, code

    try:
        year = int(request.args.get("year"))
        month = int(request.args.get("month"))
    except (TypeError, ValueError):
        return jsonify({"error": "A year és month query paraméter kötelező és szám legyen."}), 400

    if month < 1 or month > 12:
        return jsonify({"error": "A month értéke 1 és 12 között lehet."}), 400

    month_start, month_end = _month_range_utc(year, month)
    days_in_month = calendar.monthrange(year, month)[1]

    # Az összes session, ahol a user accepted résztvevő volt
    accepted_parts = (
        PomodoroSessionParticipant.query
        .filter_by(user_id=user_id, invite_status="accepted")
        .all()
    )

    user_sessions = []
    for part in accepted_parts:
        session = part.session
        if not session or not session.start_time:
            continue
        user_sessions.append((session, part))

    # Havi aggregálás alapja: a session starttime hónapja
    monthly_sessions = []
    for session, part in user_sessions:
        start = _to_naive_utc(session.start_time)
        if month_start <= start < month_end:
            monthly_sessions.append((session, part))

    # Napi alapstruktúra
    daily_map = {}
    for day in range(1, days_in_month + 1):
        date_obj = datetime(year, month, day)
        date_key = date_obj.date().isoformat()
        daily_map[date_key] = {
            "day": day,
            "date": date_key,
            "focusMinutes": 0,
            "tasks": 0,
            "groupSessions": 0,
            "taskList": [],
        }

    total_focus_minutes = 0
    total_tasks = 0
    total_group_sessions = 0

    for session, part in monthly_sessions:
        start = _to_naive_utc(session.start_time)
        date_key = start.date().isoformat()

        if date_key not in daily_map:
            continue

        focus_minutes = _get_focus_minutes(session) if str(session.mode) == "FOCUS" or getattr(session.mode, "value", None) == "FOCUS" else 0
        total_focus_minutes += focus_minutes
        daily_map[date_key]["focusMinutes"] += focus_minutes

        if session.group_id is not None:
            total_group_sessions += 1
            daily_map[date_key]["groupSessions"] += 1

        task_text = (part.task_text or "").strip()
        if task_text:
            split_tasks = [t.strip() for t in task_text.split(",") if t.strip()]
            for idx, title in enumerate(split_tasks):
                task_item = {
                    "id": f"{session.id}-{idx}",
                    "title": title,
                    "createdAt": _safe_iso(part.joined_at or session.start_time),
                }
                daily_map[date_key]["taskList"].append(task_item)
                daily_map[date_key]["tasks"] += 1
                total_tasks += 1

    daily = [daily_map[k] for k in sorted(daily_map.keys())]
    active_days = sum(1 for d in daily if d["focusMinutes"] > 0 or d["tasks"] > 0 or d["groupSessions"] > 0)

    # Streak számítás: minden nap számít aktívnak, ahol volt focus session
    all_focus_dates = set()
    for session, _part in user_sessions:
        mode_value = getattr(session.mode, "value", str(session.mode))
        if mode_value != "FOCUS" or not session.start_time:
            continue
        all_focus_dates.add(_to_naive_utc(session.start_time).date())

    longest_streak = 0
    current_streak = 0

    if all_focus_dates:
        sorted_dates = sorted(all_focus_dates)

        temp_streak = 1
        longest_streak = 1

        for i in range(1, len(sorted_dates)):
            if sorted_dates[i] == sorted_dates[i - 1] + timedelta(days=1):
                temp_streak += 1
            else:
                temp_streak = 1
            longest_streak = max(longest_streak, temp_streak)

        today = datetime.utcnow().date()
        cursor = today
        while cursor in all_focus_dates:
            current_streak += 1
            cursor -= timedelta(days=1)

    response = {
        "monthLabel": _format_month_label_hu(year, month),
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "totalFocusMinutes": total_focus_minutes,
        "totalTasks": total_tasks,
        "totalGroupSessions": total_group_sessions,
        "activeDays": active_days,
        "daily": daily,
    }

    return jsonify(response), 200


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

            active_participants = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id,
                left_at=None,
                invite_status="accepted"
            ).count()

            if active_participants == 0:
                session = PomodoroSession.query.get(session_id)
                if session and session.end_time is None:
                    session.end_time = datetime.now(timezone.utc)
                    db.session.commit()

                    emit("session_finished", {
                        "session_id": session_id,
                        "end_time": session.end_time.isoformat(),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }, room=room)

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
                now = datetime.now(timezone.utc)
                session.end_time = now

                participants = PomodoroSessionParticipant.query.filter_by(
                    session_id=session_id,
                ).all()

                for p in participants:
                    if p.left_at is None:
                        p.left_at = now

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

        active_participants = PomodoroSessionParticipant.query.filter_by(
            session_id=session_id,
            left_at=None,
            invite_status="accepted"
        ).count()

        if active_participants == 0:
            session = PomodoroSession.query.get(session_id)
            if session and session.end_time is None:
                session.end_time = datetime.now(timezone.utc)
                db.session.commit()

                emit("session_finished", {
                    "session_id": session_id,
                    "end_time": session.end_time.isoformat(),
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }, room=room)

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
            now = datetime.now(timezone.utc)
            session.end_time = now

            participants = PomodoroSessionParticipant.query.filter_by(
                session_id=session_id
            ).all()

            for p in participants:
                if p.left_at is None:
                    p.left_at = now

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