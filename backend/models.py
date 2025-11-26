from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import relationship

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True) 
    password_hash = db.Column(db.String(200), nullable=False)
    
    major = db.Column(db.String(100), nullable=True) 
    bio = db.Column(db.Text, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)

    is_active = db.Column(db.Boolean, default=True, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    created_groups = relationship('Group', backref='creator', lazy=True, foreign_keys='Group.creator_id')
    created_events = relationship('Event', backref='creator', lazy=True, foreign_keys='Event.creator_id')
    
    memberships = relationship('GroupMember', backref='user', lazy='dynamic', cascade="all, delete-orphan")
    
    posts = relationship('Post', backref='author', lazy=True, cascade="all, delete-orphan")
    comments = relationship('Comment', backref='author', lazy=True, cascade="all, delete-orphan")
    
    notifications = relationship('Notification', backref='recipient', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"


class GroupMember(db.Model):
    __tablename__ = 'group_members'
    
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), primary_key=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True, index=True)
    
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    role = db.Column(db.String(50), default='member', nullable=False) 
    
    def __repr__(self):
        return f"<GroupMember Group:{self.group_id} User:{self.user_id}>"


class Group(db.Model):
    __tablename__ = 'groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    subject = db.Column(db.String(100), nullable=False, index=True) 
    description = db.Column(db.Text, nullable=True)
    
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    members = relationship('GroupMember', backref='group', lazy='dynamic', cascade="all, delete-orphan")
    events = relationship('Event', backref='group', lazy=True, cascade="all, delete-orphan")
    posts = relationship('Post', backref='group', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Group {self.name}>"


class Event(db.Model):
    __tablename__ = 'events'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    event_date = db.Column(db.DateTime, nullable=False, index=True)
    location = db.Column(db.String(200), nullable=True)
    
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False, index=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Event {self.title}>"


class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    comments = relationship('Comment', backref='post', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Post {self.title[:20]}>"


class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    comment = db.Column(db.Text, nullable=False) 
    
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False, index=True)
    author_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Comment ID:{self.id}>"


class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True) # Ki kapja
    
    type = db.Column(db.String(50), nullable=False, index=True) 
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, index=True)
    
    deleted_at = db.Column(db.DateTime, nullable=True, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Notification ID:{self.id} Type:{self.type}>"