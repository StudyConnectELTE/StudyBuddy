from models import db, User

XP_ACTIONS = {
    'registration': 50,
    'join_group': 20,
    'create_post': 10,
    'create_comment': 5,
    'start_pomodoro': 15,
    'complete_pomodoro_cycle': 5,  # maybe later
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
        'xp_to_next_level': ((user.level) * 100) - user.xp
    }