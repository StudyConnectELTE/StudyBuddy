from flask import Blueprint, request, jsonify
from models import db
from models import User, Group, GroupMember
from services.auth_service import verify_jwt_token

groups_bp = Blueprint("groups", __name__)

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


@groups_bp.route("/groups/by-subject", methods=["GET"])
def groups_by_subject():
    user_id, err, code = get_user_id()
    if err:
        return err, code

    subject_name = request.args.get("name", "").strip()
    if not subject_name:
        return jsonify({"error": "Hiányzik a subject name"}), 400

    groups = Group.query.filter(Group.subject == subject_name).all()

    result = []
    for g in groups:
        members = GroupMember.query.filter_by(group_id=g.id).all()
        member_count = len(members)

        existing_member = GroupMember.query.filter_by(
            group_id=g.id, user_id=user_id
        ).first()

        result.append({
            "id": g.id,
            "name": g.name,
            "subject": g.subject,
            "description": g.description,
            "member_count": member_count,
            "is_member": existing_member is not None,
        })

    return jsonify(result), 200


@groups_bp.route("/groups/search", methods=["GET"])
def search_groups():
    user_id, err, code = get_user_id()
    if err:
        return err, code

    user = db.session.get(User, user_id)
    if user:
        user_interests = set(filter(None, (user.hobbies or "").split(",")))
    else:
        user_interests = set()
    subject = request.args.get("q", "").strip()
    if not subject:
        return jsonify({"error": "Hiányzik a keresési kifejezés"}), 400

    groups = Group.query.filter(Group.subject.ilike(f"%{subject}%")).all()

    #user_interests = set((user.hobbies or "").split(","))
    #user_interests = set(filter(None, (user.hobbies or "").split(",")))
    
    zero_member_group = None
    group_list = []
    best_group = None
    best_interest_count = -1

    for g in groups:
        members = GroupMember.query.filter_by(group_id=g.id).all()
        member_count = len(members)

        same_interest_count = 0
        for m in members:
            u = db.session.get(User, m.user_id)
            if u and u.hobbies:
                if user_interests.intersection(set(u.hobbies.split(","))):
                    same_interest_count += 1

        if member_count == 0 and zero_member_group is None:
            zero_member_group = g

        if same_interest_count > best_interest_count:
            best_interest_count = same_interest_count
            best_group = g

        existing_member = GroupMember.query.filter_by(
            group_id=g.id, user_id=user_id
        ).first()

        group_list.append({
            "id": g.id,
            "name": g.name,
            "subject": g.subject,
            "description": g.description,
            "member_count": member_count,
            "same_interest_members": same_interest_count,
            "is_member": existing_member is not None
        })

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
                "is_member": False
            },
            "all_groups": []
        })

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
            "id": new_group.id,
            "name": new_group.name,
            "subject": new_group.subject,
            "description": new_group.description,
            "member_count": 0,
            "same_interest_members": 0,
            "is_member": False
        })

    if best_interest_count == 0 or best_group is None:
        recommended = {
            "id": zero_member_group.id,
            "name": zero_member_group.name,
            "subject": zero_member_group.subject,
            "description": zero_member_group.description,
            "member_count": 0,
            "same_interest_members": 0,
            "is_member": False
        }
    else:
        existing_member = GroupMember.query.filter_by(
            group_id=best_group.id, user_id=user_id
        ).first()

        recommended = {
            "id": best_group.id,
            "name": best_group.name,
            "subject": best_group.subject,
            "description": best_group.description,
            "member_count": GroupMember.query.filter_by(group_id=best_group.id).count(),
            "same_interest_members": best_interest_count,
            "is_member": existing_member is not None
        }

    return jsonify({
        "recommended_group": recommended,
        "all_groups": group_list
    })


@groups_bp.route("/groups/join", methods=["POST"])
def join_group():
    user_id, err, code = get_user_id()
    if err:
        return err, code

    data = request.get_json()
    group_id = data.get("group_id")

    if not group_id:
        return jsonify({"error": "group_id szükséges"}), 400

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "A csoport nem létezik"}), 404

    subject = group.subject

    existing_subject_group = (
        GroupMember.query
        .join(Group, GroupMember.group_id == Group.id)
        .filter(GroupMember.user_id == user_id, Group.subject == subject)
        .first()
    )

    if existing_subject_group:
        return jsonify({
            "error": "Már van tanulócsoportod ehhez a tárgyhoz.",
            "subject": subject
        }), 400

    existing_exact = GroupMember.query.filter_by(
        user_id=user_id, group_id=group_id
    ).first()

    if existing_exact:
        return jsonify({"message": "Már tag vagy ebben a csoportban"}), 200

    new_member = GroupMember(user_id=user_id, group_id=group_id)
    db.session.add(new_member)
    db.session.commit()

    return jsonify({"message": "Sikeresen csatlakoztál a csoporthoz!"}), 201


@groups_bp.route("/groups/my-groups", methods=["GET"])
def my_groups():
    user_id, err, code = get_user_id()
    if err:
        return err, code

    memberships = GroupMember.query.filter_by(user_id=user_id).all()

    if not memberships:
        return jsonify({
            "groups": [],
            "message": "Még nem vagy tagja egyetlen tanulócsoportnak sem."
        }), 200

    result = []
    for m in memberships:
        g = Group.query.get(m.group_id)
        if g:
            result.append({
                "id": g.id,
                "name": g.name,
                "subject": g.subject,
                "description": g.description,
                "joined_at": m.joined_at.strftime("%Y-%m-%d %H:%M:%S")
            })

    return jsonify({"groups": result}), 200


@groups_bp.route("/groups/<int:group_id>/members", methods=["GET"])
def list_group_members(group_id):
    user_id, err, code = get_user_id()
    if err:
        return err, code

    group = Group.query.get(group_id)
    if not group:
        return jsonify({"error": "Csoport nem található"}), 404

    memberships = GroupMember.query.filter_by(group_id=group_id).all()

    members = []
    for gm in memberships:
        u = db.session.get(User, gm.user_id)
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
