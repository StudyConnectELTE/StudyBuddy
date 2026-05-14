from models import db, User, Badge, UserBadge

# XP values:
# - complete_pomodoro: 10 XP awarded on session finish (not on start — prevents farming)
# - file_upload: 20 XP for posts that include a file attachment
# - first_post_bonus: 50 XP one-time bonus for the user's very first post
# - create_post: 10 XP for a text-only post
# - create_comment: 5 XP for posting a comment
# - join_group: 20 XP for joining a group
# - registration: 50 XP welcome bonus on sign-up
XP_ACTIONS = {
    'registration': 50,
    'join_group': 20,
    'create_post': 10,
    'first_post_bonus': 50,
    'create_comment': 5,
    'complete_pomodoro': 10,
    'file_upload': 20,
}

def calculate_level(xp):
    """Calculate level based on XP. Level increases every 100 XP."""
    return (xp // 100) + 1

def award_xp(user_id, action):
    """Award XP to a user for a specific action."""
    if action not in XP_ACTIONS:
        return False, f"Unknown action: {action}"
    
    xp_amount = XP_ACTIONS[action]
    user = User.query.get(user_id)
    if not user:
        return False, "User not found"
    
    old_level = user.level
    user.xp += xp_amount
    user.level = calculate_level(user.xp)
    db.session.commit()
    
    # Check for new badges if level increased
    badge_message = ""
    if user.level > old_level:
        success, msg = award_badge_if_eligible(user_id)
        if success and "Awarded badges" in msg:
            badge_message = f" {msg}"
    
    return True, f"Awarded {xp_amount} XP for {action}. New level: {user.level}.{badge_message}"

def get_user_gamification(user_id):
    """Get user's current XP and level."""
    user = User.query.get(user_id)
    if not user:
        return None
    
    return {
        'xp': user.xp,
        'level': user.level,
        'xp_to_next_level': (user.level * 100) - user.xp
    }


def award_badge_if_eligible(user_id):
    """Check and award badges based on user's current level."""
    user = User.query.get(user_id)
    if not user:
        return False, "User not found"
    
    awarded_badges = []
    
    # Get all badges that user qualifies for but hasn't received yet
    eligible_badges = Badge.query.filter(
        Badge.required_level <= user.level
    ).all()
    
    for badge in eligible_badges:
        # Check if user already has this badge
        existing = UserBadge.query.filter_by(user_id=user_id, badge_id=badge.id).first()
        if not existing:
            # Award the badge
            user_badge = UserBadge(user_id=user_id, badge_id=badge.id)
            db.session.add(user_badge)
            awarded_badges.append(badge.name)
    
    if awarded_badges:
        db.session.commit()
        return True, f"Awarded badges: {', '.join(awarded_badges)}"
    
    return True, "No new badges awarded"


def get_user_badges(user_id):
    """Get all badges awarded to a user."""
    user_badges = UserBadge.query.filter_by(user_id=user_id).all()
    badges = []
    for user_badge in user_badges:
        badge_data = {
            'id': user_badge.badge.id,
            'name': user_badge.badge.name,
            'description': user_badge.badge.description,
            'icon_url': user_badge.badge.icon_url,
            'required_level': user_badge.badge.required_level,
            'awarded_at': user_badge.awarded_at.isoformat()
        }
        badges.append(badge_data)
    
    return badges


def get_all_badges():
    """Get all available badges."""
    badges = Badge.query.all()
    badge_list = []
    for badge in badges:
        badge_data = {
            'id': badge.id,
            'name': badge.name,
            'description': badge.description,
            'icon_url': badge.icon_url,
            'required_level': badge.required_level
        }
        badge_list.append(badge_data)
    
    return badge_list