import pytest
from flask import Flask
from flask_socketio import SocketIO
import socketio as client_socketio
from unittest.mock import patch, MagicMock
from routes.pomodoro_routes import PomodoroNamespace, register_socketio
from models import db, PomodoroSession, PomodoroSessionParticipant, User
from services.auth_service import create_jwt_token
import bcrypt
from datetime import datetime

@pytest.fixture
def app():
    """Create test app with SocketIO"""
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    # Initialize extensions
    db.init_app(app)

    # Create SocketIO instance
    socketio = SocketIO(app, cors_allowed_origins='*')

    with app.app_context():
        db.create_all()

        # Register namespace
        if PomodoroNamespace:
            socketio.on_namespace(PomodoroNamespace('/pomodoro'))

        yield app, socketio

@pytest.fixture
def client(app):
    """Test client"""
    app, socketio = app
    return app.test_client()

@pytest.fixture
def socketio_client(app):
    """SocketIO test client"""
    app, socketio = app
    return socketio.test_client(app, namespace='/pomodoro')

def test_websocket_connection(socketio_client):
    """Test basic WebSocket connection"""
    assert socketio_client.is_connected('/pomodoro')

    # Test connect event
    received = socketio_client.get_received('/pomodoro')
    assert len(received) > 0
    assert received[0]['name'] == 'connect_response'

def test_join_session_success(app, socketio_client):
    """Test successful session join"""
    app, socketio = app

    with app.app_context():
        # Create test user
        user = User(
            email='test@example.com',
            secondary_email='test.secondary@example.com',
            name='Test User',
            neptun_code='ABC123'
        )
        user.password_hash = bcrypt.hashpw('password'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.add(user)
        db.session.commit()

        # Create test session
        session = PomodoroSession(
            host_user_id=user.id,
            mode='FOCUS',
            start_time=datetime.utcnow()
        )
        db.session.add(session)
        db.session.commit()

        # Create participant
        participant = PomodoroSessionParticipant(
            session_id=session.id,
            user_id=user.id
        )
        db.session.add(participant)
        db.session.commit()

        # Generate token
        token = create_jwt_token(user.id)

        # Test join session
        socketio_client.emit('join_session', {
            'token': f'Bearer {token}',
            'session_id': session.id
        }, namespace='/pomodoro')

        # Check response
        received = socketio_client.get_received('/pomodoro')
        join_responses = [msg for msg in received if msg['name'] == 'join_response']
        assert len(join_responses) > 0
        assert join_responses[-1]['args'][0]['message'] == 'Sikeresen csatlakozva'

def test_join_session_invalid_token(socketio_client):
    """Test join session with invalid token"""
    socketio_client.emit('join_session', {
        'token': 'Bearer invalid-token',
        'session_id': 1
    }, namespace='/pomodoro')

    received = socketio_client.get_received('/pomodoro')
    error_messages = [msg for msg in received if msg['name'] == 'error']
    assert len(error_messages) > 0
    assert 'Érvénytelen token' in error_messages[-1]['args'][0]['message']

def test_update_task(app, socketio_client):
    """Test task update"""
    app, socketio = app

    with app.app_context():
        # Create test data (similar to above)
        user = User(
            email='test2@example.com',
            secondary_email='test2.secondary@example.com',
            name='Test User 2',
            neptun_code='DEF456'
        )
        user.password_hash = bcrypt.hashpw('password'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.session.add(user)
        db.session.commit()

        session = PomodoroSession(host_user_id=user.id, mode='FOCUS', start_time=datetime.utcnow())
        db.session.add(session)
        db.session.commit()

        participant = PomodoroSessionParticipant(session_id=session.id, user_id=user.id, invite_status='accepted')
        db.session.add(participant)
        db.session.commit()

        token = create_jwt_token(user.id)

        # First join session
        socketio_client.emit('join_session', {
            'token': f'Bearer {token}',
            'session_id': session.id
        }, namespace='/pomodoro')

        # Then update task
        socketio_client.emit('update_task', {
            'token': f'Bearer {token}',
            'session_id': session.id,
            'task_text': 'Updated task'
        }, namespace='/pomodoro')

        # Check broadcast
        received = socketio_client.get_received('/pomodoro')
        task_updates = [msg for msg in received if msg['name'] == 'task_updated']
        assert len(task_updates) > 0
        assert task_updates[-1]['args'][0]['task_text'] == 'Updated task'