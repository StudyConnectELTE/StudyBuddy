from models import db, User

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
    
    user.xp += xp_amount
    user.level = calculate_level(user.xp)
    db.session.commit()
    
    return True, f"Awarded {xp_amount} XP for {action}. New level: {user.level}"

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